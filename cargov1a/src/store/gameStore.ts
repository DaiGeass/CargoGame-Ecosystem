// ============================================================
// GAME STORE - Estado y lógica del juego
// ============================================================

import { create } from 'zustand';
import {
  GameState, Player, PlayableCard, ActiveEffect,
  GameMode, PlayerControl, BotDifficulty, ResolutionPreview, PlayerStats,
  DEFAULT_RULES, DEFAULT_VISUAL_CONFIG,
} from '../types/game';
import { getAllCharacters, getAllCombos } from '../data/cards';
import { getAllCharactersWithSource } from '../data/contentRegistry';
import { getAllCardsWithSource } from '../data/contentRegistry';
import { getAbilityRuntimeBehavior } from '../utils/abilityRuntime';
import { applyRuntimeCharacterPassives, applyRuntimePassiveEvent } from '../utils/passiveRuntime';
import { readPersistedJSON, writePersistedJSON } from '../services/persistence';
import { evalFormula, FormulaContext } from '../utils/formulas';
import { applyEffects } from '../utils/effects';
import {
  EMPTY_CONTRIBUTION,
  getBaseContribution,
  mergeContribution,
  contributionToPreview,
  mergePreviewWithContribution,
  buildBasicAttackPreview,
} from '../utils/cardEngine';

// ─── Evalúa el valor de una carta (soporta fórmulas dinámicas) ──
// Si la carta tiene `formula`, evalúa la expresión en el contexto actual.
// Si no, usa el `value` estático tradicional.
// Devuelve un número positivo (cura/defensa) o negativo (daño).
export function evalCardValue(
  card: PlayableCard,
  attacker?: Player,
  target?: Player,
  turn: number = 1,
  cardsPlayed: number = 0
): number {
  if (card.formula) {
    const ctx: FormulaContext = { attacker, target, turn, cardsPlayed };
    const result = evalFormula(card.formula.expression, ctx);
    // El resultType determina el signo:
    //   damage → siempre negativo (daño)
    //   heal   → siempre positivo (cura)
    //   defense → siempre positivo
    if (card.formula.resultType === 'damage') return -Math.abs(result);
    return Math.abs(result);
  }
  return card.value;
}

// ─── Aplicar cambio de defensa respetando el floor de baseDefense ──
// La defensa base nunca baja de su valor inicial; solo el "exceso" acumulado
// por buffs puede perderse.
export function clampDefense(player: Player): Player {
  if (player.currentDefense < player.baseDefense) {
    return { ...player, currentDefense: player.baseDefense };
  }
  return player;
}

function uid(): string { return Math.random().toString(36).slice(2, 10); }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Restricciones del mazo: qué cartas se excluyen y qué fuentes se permiten.
export type AdvancedDeckCardRule = {
  enabled?: boolean;
  copies?: number;
  weight?: number;
};

export type AdvancedDeckConfig = {
  enabled: boolean;
  cards: Record<string, AdvancedDeckCardRule>;
};

interface DeckBuildOptions {
  blockedCardBaseIds?: string[];   // IDs base excluidos del mazo
  enabledSourceIds?: string[];     // fuentes permitidas (vacío = todas)
  advancedDeck?: AdvancedDeckConfig; // copias/pesos por carta
}

function makeDeckCopy(base: any, index: number): PlayableCard {
  const { __source, __sourceId, __sourceName, ...card } = base as any;
  return { ...card, id: `${card.id}__${index}` };
}

function baseCardId(card: any): string {
  return String(card.id).split('__')[0];
}

function weightedPick<T extends any>(pool: Array<{ item: T; weight: number }>): T | null {
  const total = pool.reduce((sum, x) => sum + Math.max(0, Number(x.weight || 0)), 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  for (const x of pool) {
    roll -= Math.max(0, Number(x.weight || 0));
    if (roll <= 0) return x.item;
  }

  return pool[pool.length - 1]?.item || null;
}

function buildAdvancedDeck(size: number, sourceCards: any[], config: AdvancedDeckConfig): PlayableCard[] {
  const rules = config.cards || {};
  const enabledCards = sourceCards.filter(base => {
    const rule = rules[baseCardId(base)] || {};
    return rule.enabled !== false;
  });

  const deck: PlayableCard[] = [];

  // 1) Copias exactas primero.
  for (const base of enabledCards) {
    const rule = rules[baseCardId(base)] || {};
    const copies = Math.max(0, Math.floor(Number(rule.copies || 0)));

    for (let i = 0; i < copies && deck.length < size; i++) {
      deck.push(makeDeckCopy(base, deck.length));
    }
  }

  // Si las copias exactas llenaron el mazo, cortar y barajar.
  if (deck.length >= size) return shuffle(deck.slice(0, size));

  // 2) Rellenar con probabilidad/peso.
  const weightedPool = enabledCards
    .map(base => {
      const rule = rules[baseCardId(base)] || {};
      const weight = rule.weight === undefined ? 1 : Math.max(0, Number(rule.weight));
      return { item: base, weight };
    })
    .filter(x => x.weight > 0);

  while (deck.length < size && weightedPool.length > 0) {
    const picked = weightedPick(weightedPool);
    if (!picked) break;
    deck.push(makeDeckCopy(picked, deck.length));
  }

  // 3) Fallback defensivo si el usuario desactivó todo.
  if (deck.length === 0) {
    const fallback = sourceCards.length ? sourceCards : getAllCardsWithSource().filter(c => c.__source === 'base');

    if (!fallback.length) {
      console.warn('[Deck] AdvancedDeck sin cartas disponibles.');
      return [];
    }

    while (deck.length < size && fallback.length > 0) {
      const base = fallback[Math.floor(Math.random() * fallback.length)];
      deck.push(makeDeckCopy(base, deck.length));
    }
  }

  return shuffle(deck);
}

function buildDeck(size: number, opts?: DeckBuildOptions): PlayableCard[] {
  let sourceCards = getAllCardsWithSource();

  if (opts?.blockedCardBaseIds?.length) {
    const blocked = new Set(opts.blockedCardBaseIds);
    sourceCards = sourceCards.filter(c => !blocked.has(baseCardId(c)));
  }

  if (opts?.enabledSourceIds?.length) {
    const allowed = new Set(opts.enabledSourceIds);
    sourceCards = sourceCards.filter(c => allowed.has(c.__sourceId));
  }

  if (!sourceCards.length) {
    sourceCards = getAllCardsWithSource().filter(c => c.__source === 'base');
  }

  if (!sourceCards.length) {
    console.warn('[Deck] No hay cartas disponibles para construir el mazo.');
    return [];
  }

  if (opts?.advancedDeck?.enabled) {
    return buildAdvancedDeck(size, sourceCards, opts.advancedDeck);
  }

  const deck: PlayableCard[] = [];
  while (deck.length < size) {
    const base = sourceCards[Math.floor(Math.random() * sourceCards.length)];
    deck.push(makeDeckCopy(base, deck.length));
  }

  return shuffle(deck);
}

function dealHand(deck: PlayableCard[], size: number) {
  return { hand: deck.slice(0, size), remaining: deck.slice(size) };
}

function nextAlive(players: Player[], cur: number): number {
  const n = players.length;
  let i = (cur + 1) % n;
  let attempts = 0;
  while (!players[i].isAlive && attempts < n) { i = (i + 1) % n; attempts++; }
  return i;
}

// ─── Pasivas ofensivas por familia de carta ────────────────
// FIX: ahora también chequea synergyTags (no solo tags)
// Soporta cartas con fórmulas dinámicas vía evalCardValue()
function passiveCardDamage(attacker: Player, card: PlayableCard, target?: Player, turn: number = 1, cardsPlayed: number = 0): number {
  const cardValue = evalCardValue(card, attacker, target, turn, cardsPlayed);
  if (!(card.type === 'damage' || card.type === 'damage_over_time') || cardValue >= 0) return 0;
  const id = baseCardId(card);
  const allTags = [...(card.tags || []), ...(card.synergyTags || [])];
  let bonus = 0;
  
  if (attacker.characterId === 'arquero' && (id.includes('arco') || id.includes('flecha') || allTags.includes('ranged') || allTags.includes('arco') || allTags.includes('flecha'))) bonus += 75;
  if (attacker.characterId === 'guerrero' && (id.includes('espada') || id.includes('hachazo') || id.includes('lanza') || id.includes('mandoble') || id.includes('martillo') || allTags.includes('melee') || allTags.includes('weapon'))) bonus += 45;
  if (attacker.characterId === 'mago' && (id.includes('rayo') || id.includes('meteorito') || id.includes('proyectil') || id.includes('onda') || id.includes('maldicion') || allTags.includes('spell') || allTags.includes('fire') || allTags.includes('frost') || allTags.includes('dark') || allTags.includes('magia') || allTags.includes('hechizo'))) bonus += 35;
  if (attacker.characterId === 'asesino' && (id.includes('daga') || id.includes('veneno') || id.includes('sangria') || allTags.includes('poison') || allTags.includes('bleed') || allTags.includes('veneno') || allTags.includes('daga'))) bonus += 35;
  if (attacker.characterId === 'druida' && (card.type === 'damage_over_time' || allTags.includes('nature'))) bonus += 25;
  if (attacker.characterId === 'barbaro') {
    const hpLost = attacker.maxHp - attacker.currentHp;
    bonus += Math.floor(hpLost / 100);
  }
  // Pasivas adicionales para los otros personajes (basadas en sus tags)
  if (attacker.characterId === 'caballero') bonus += 0; // +20 def es defensivo
  if (attacker.characterId === 'explorador') bonus += 0; // robar carta es otro hook
  if (attacker.characterId === 'sargento') bonus += 0; // defensivo
  if (attacker.characterId === 'espadachin' && (allTags.includes('espada') || allTags.includes('melee') || id.includes('espada'))) bonus += 50;
  if (attacker.characterId === 'campeon') {
    const hpLost = attacker.maxHp - attacker.currentHp;
    bonus += Math.floor(hpLost / 50);
  }
  if (attacker.characterId === 'ladron' && (allTags.includes('daga') || id.includes('daga'))) bonus += 50;
  if (attacker.characterId === 'lancero' && (allTags.includes('lanza') || id.includes('lanza'))) bonus += 70;
  if (attacker.characterId === 'ballestero' && (allTags.includes('arco') || allTags.includes('ballesta') || id.includes('arco') || id.includes('ballesta'))) bonus += 50;
  if (attacker.characterId === 'pirata' && (allTags.includes('pirata') || allTags.includes('ladron') || id.includes('pirata'))) bonus += 80;
  if (attacker.characterId === 'mosquetero' && (allTags.includes('fuego') || allTags.includes('polvora') || id.includes('pistola') || id.includes('canon'))) bonus += 60;
  if (attacker.characterId === 'cruzado') bonus += 0; // defensivo
  if (attacker.characterId === 'ninja') bonus += 0; // requiere tracking de ataque anterior
  if (attacker.characterId === 'samurai') bonus += 0; // reflect damage on hit
  if (attacker.characterId === 'mercenario') bonus += 0; // special mechanic

  return Math.abs(cardValue) + bonus;
}

function mitigateDamage(target: Player, dmg: number): number {
  if (target.characterId === 'tanque' || target.characterId === 'sargento') {
    // Sargento: -50% daño si HP >50%
    if (target.characterId === 'sargento' && target.currentHp > target.maxHp * 0.5) {
      return Math.floor(dmg * 0.5);
    }
    return Math.floor(dmg * 0.80);
  }
  if (target.characterId === 'guerrero' && target.currentHp < target.maxHp * 0.30) return Math.max(0, dmg - 10);
  if (target.characterId === 'druida') return Math.max(0, dmg - 5);
  if (target.characterId === 'caballero') return Math.max(0, dmg - 5); // +20 def ya aplicada, mitigación menor extra
  if (target.characterId === 'cruzado') return Math.floor(dmg * 0.85);
  return dmg;
}

function applyImmediateEffects(atk: Player, tgt: Player, cards: PlayableCard[], set: any, get: any, targetId: string) {
  cards.forEach(card => {
    if (card.type === 'defense') {
      const e: ActiveEffect = {
        id: uid(), name: card.name, value: card.value, timing: 'immediate',
        duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId,
        isStackable: true, ignoresDefense: false, description: card.description,
      };
      set((s: GameState) => ({
        players: s.players.map((p: Player) =>
          p.id === targetId
            ? { ...p, currentDefense: Math.max(p.baseDefense, p.currentDefense + card.value), activeEffects: [...p.activeEffects, e] }
            : p
        ),
      }));
      const sign = card.value > 0 ? '+' : '';
      get().log(`🛡️ ${card.name} → ${tgt.name}: ${sign}${card.value} def (inmediato)`, 'defense');
      return;
    }
    if (card.type === 'utility') {
      const st = get();
      const atkP = st.players.find((p: Player) => p.id === atk.id);
      const tgtP = st.players.find((p: Player) => p.id === targetId);
      if (!atkP || !tgtP) return;
      if (card.id.includes('ver_carta')) {
        const rh = new Set(st.revealedHands); rh.add(targetId);
        set({ revealedHands: rh, viewingHandOf: targetId });
        get().log(`👁️ ${atkP.name} ve la mano de ${tgtP.name}`, 'utility');
      } else if (card.id.includes('robar_carta')) {
        if (tgtP.hand.length) {
          const ri = Math.floor(Math.random() * tgtP.hand.length);
          const stolen = tgtP.hand[ri];
          set((s: GameState) => ({ players: s.players.map((p: Player) =>
            p.id === atk.id ? { ...p, hand: [...p.hand, stolen] } :
            p.id === targetId ? { ...p, hand: p.hand.filter((_: PlayableCard, i: number) => i !== ri) } : p
          ) }));
          get().log(`🃏 ${atkP.name} robó carta de ${tgtP.name}`, 'utility');
          get().refillHand(targetId);
        }
      } else if (card.id.includes('intercambio')) {
        const h1 = [...atkP.hand], h2 = [...tgtP.hand];
        set((s: GameState) => ({ players: s.players.map((p: Player) =>
          p.id === atk.id ? { ...p, hand: h2 } : p.id === targetId ? { ...p, hand: h1 } : p
        ) }));
        get().log(`🔄 ${atkP.name} y ${tgtP.name} intercambiaron manos`, 'utility');
      } else if (card.id.includes('barajeo')) {
        set((s: GameState) => ({ deck: { cards: shuffle(s.deck.cards) } }));
        get().log(`🔀 Mazo barajeado`, 'utility');
      } else if (card.id.includes('robo_extra')) {
        const nc = st.deck.cards.slice(0, 2); const rem = st.deck.cards.slice(2);
        set((s: GameState) => ({ deck: { cards: rem }, players: s.players.map((p: Player) => p.id === atk.id ? { ...p, hand: [...p.hand, ...nc] } : p) }));
        get().log(`🃏 ${atkP.name} robó 2 cartas extra`, 'utility');
      } else if (card.id.includes('descarte_propio')) {
        const oldH = [...atkP.hand]; const nc = st.deck.cards.slice(0, 7); const rem = st.deck.cards.slice(7);
        set((s: GameState) => ({ deck: { cards: [...rem, ...oldH] }, players: s.players.map((p: Player) => p.id === atk.id ? { ...p, hand: nc } : p) }));
        get().log(`🔀 ${atkP.name} descartó y robó 7 nuevas`, 'utility');
      } else if (card.id.includes('descarte')) {
        const td = shuffle(tgtP.hand).slice(0, 2);
        set((s: GameState) => ({ deck: { cards: [...s.deck.cards, ...td] }, players: s.players.map((p: Player) =>
          p.id === targetId ? { ...p, hand: p.hand.filter((c: PlayableCard) => !(td as PlayableCard[]).find((d: PlayableCard) => d.id === c.id)) } : p
        ) }));
        get().log(`🗑️ ${tgtP.name} descartó ${td.length} cartas`, 'utility');
        get().refillHand(targetId);
      }
      return;
    }
    if (card.type === 'special') {
      if (card.id.includes('contraataque') || card.id.includes('represalia') || card.id.includes('absorber')) return;
      if (card.id.includes('esquive') || card.id.includes('dodge')) return;
      const tgtP = get().players.find((p: Player) => p.id === targetId);
      if (!tgtP) return;
      if (card.id.includes('racha_7')) {
        set({ maxCardsPerTurn: 7 });
        get().log(`🎉 ${atk.name} activó Racha de 7!`, 'buff');
      } else if (card.id.includes('silencio')) {
        const e: ActiveEffect = { id: uid(), name: 'Silencio', value: 0, timing: 'immediate', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: 'Sin habilidades', specialRules: 'silenced' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
        get().log(`🤐 ${tgtP.name} silenciado ${card.duration}t`, 'debuff');
      } else if (card.id.includes('aturdir') || card.id.includes('aturdimiento')) {
        const e: ActiveEffect = { id: uid(), name: 'Aturdido', value: 0, timing: 'start_of_turn', duration: 1, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: 'Pierde turno', specialRules: 'stunned' };
        get().log(`😵 ${tgtP.name} aturdido!`, 'debuff');
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
      } else if (card.id.includes('invisible')) {
        const e: ActiveEffect = { id: uid(), name: 'Invisible', value: 0, timing: 'immediate', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: 'No puede ser objetivo', specialRules: 'invisible' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
        get().log(`👻 ${tgtP.name} invisible ${card.duration}t`, 'buff');
      } else if (card.id.includes('furia')) {
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, baseDamage: p.baseDamage + 50, currentDefense: Math.max(p.baseDefense, p.currentDefense - 20) } : p) }));
        get().log(`🔥 ${tgtP.name} en Furia: +50 dmg -20 def`, 'buff');
      } else if (card.id.includes('regeneracion')) {
        const e: ActiveEffect = { id: uid(), name: 'Regeneración', value: 25, timing: 'start_of_turn', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: '+25 HP/turno' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
        get().log(`✨ ${tgtP.name} regenerando ${card.value}/t x${card.duration}`, 'heal');
      } else if (card.id.includes('multiplicador') || card.id.includes('potenciar')) {
        const e: ActiveEffect = { id: uid(), name: card.name, value: card.value, timing: 'immediate', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: card.description, specialRules: 'damage_multiplier' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
        get().log(`⚡ ${tgtP.name} recibe ${card.name}: x${card.value}`, 'buff');
      } else if (card.id.includes('escudo_espejo')) {
        const e: ActiveEffect = { id: uid(), name: 'Escudo Espejo', value: 0, timing: 'immediate', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: 'Refleja daño', specialRules: 'reflect' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
        get().log(`🪞 ${tgtP.name} tiene Escudo Espejo`, 'buff');
      } else if (card.id.includes('trampa')) {
        const e: ActiveEffect = { id: uid(), name: card.name, value: card.value, timing: 'on_damage_taken', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: true, ignoresDefense: false, description: card.description, specialRules: 'trampa' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
        get().log(`⚠️ ${tgtP.name} colocó una ${card.name}`, 'debuff');
      } else if (card.id.includes('congelar')) {
        const e: ActiveEffect = { id: uid(), name: 'Congelado', value: 0, timing: 'immediate', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: '+1 CD habilidades', specialRules: 'frozen' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
        get().log(`❄️ ${tgtP.name} congelado: +1 CD`, 'debuff');
      } else if (card.id.includes('marcador')) {
        const e: ActiveEffect = { id: uid(), name: 'Marcado', value: 25, timing: 'immediate', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: '+25% daño recibido', specialRules: 'marked' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
        get().log(`🎯 ${tgtP.name} marcado: +25% daño recibido`, 'debuff');
      } else if (card.id.includes('bendicion_guerra')) {
        const e1: ActiveEffect = { id: uid() + '_1', name: 'Bend.Guerra (dmg)', value: 20, timing: 'immediate', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: '+20 daño', specialRules: 'bonus_dmg' };
        const e2: ActiveEffect = { id: uid() + '_2', name: 'Bend.Guerra (def)', value: 10, timing: 'immediate', duration: card.duration, stacks: 1, sourcePlayerId: atk.id, targetPlayerId: targetId, isStackable: false, ignoresDefense: false, description: '+10 defensa' };
        set((s: GameState) => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, baseDamage: p.baseDamage + 20, currentDefense: p.currentDefense + 10, activeEffects: [...p.activeEffects, e1, e2] } : p) }));
        get().log(`🙏 ${tgtP.name} recibe Bendición de Guerra`, 'buff');
      }
    }
  });
}


function isTurnCombatModifier(e: any): boolean {
  return e?.specialRules === 'turn_combat_modifier';
}

function parseMultiplier(text: string): number {
  const x = text.match(/x\s*(\d+(?:\.\d+)?)/i);
  if (x) return Number(x[1]);

  const mul = text.match(/multiplica(?:r|dor|do)?[^0-9]*(\d+(?:\.\d+)?)/i);
  if (mul) return Number(mul[1]);

  if (/triplica|triple/i.test(text)) return 3;
  if (/duplica|doble/i.test(text)) return 2;

  return 1;
}

function inferTurnCombatModifier(ab: any, behavior: any, text: string, dmg: number): any | null {
  const explicit = behavior?.turnModifier || ab?.turnModifier || ab?.combatModifier;
  if (explicit && typeof explicit === 'object') {
    return {
      ...explicit,
      sourceAbilityId: ab.id,
      sourceName: ab.name,
    };
  }

  const lower = text.toLowerCase();

  const wantsNextAttack =
    lower.includes('siguiente') ||
    lower.includes('próximo') ||
    lower.includes('proximo') ||
    lower.includes('este turno') ||
    lower.includes('turno') ||
    lower.includes('ataque') ||
    lower.includes('cartas') ||
    lower.includes('daño total') ||
    lower.includes('total');

  const hasMultiplier =
    /x\s*\d/i.test(text) ||
    lower.includes('multiplica') ||
    lower.includes('triplica') ||
    lower.includes('duplica') ||
    lower.includes('doble') ||
    lower.includes('triple');

  const hasPierce =
    lower.includes('perfor') ||
    lower.includes('ignora defensa') ||
    lower.includes('ignora la defensa') ||
    lower.includes('armadura') ||
    lower.includes('daño verdadero') ||
    lower.includes('true damage');

  const addsDamageAsBuff =
    dmg > 0 &&
    (
      behavior?.effect === 'buff' ||
      behavior?.category === 'buff_self' ||
      wantsNextAttack ||
      lower.includes('+') ||
      lower.includes('aumenta') ||
      lower.includes('potencia')
    );

  const addTags: string[] = [];
  const removeTags: string[] = [];

  const addTagMatch = text.match(/(?:añade|agrega|gana)\s+tag\s+([a-z0-9_-]+)/i);
  if (addTagMatch) addTags.push(addTagMatch[1]);

  const removeTagMatch = text.match(/(?:quita|remueve|elimina)\s+tag\s+([a-z0-9_-]+)/i);
  if (removeTagMatch) removeTags.push(removeTagMatch[1]);

  if (!hasMultiplier && !hasPierce && !addsDamageAsBuff && addTags.length === 0 && removeTags.length === 0) {
    return null;
  }

  const multiplier = parseMultiplier(text);
  const mod: any = {
    sourceAbilityId: ab.id,
    sourceName: ab.name,
    multiplier: multiplier > 1 ? multiplier : undefined,
    bonusDamage: undefined,
    pierceDamage: undefined,
    convertAllToIgnore: undefined,
    addTags,
    removeTags,
  };

  if (hasPierce && dmg > 0) {
    mod.pierceDamage = dmg;
  } else if (addsDamageAsBuff && dmg > 0) {
    mod.bonusDamage = dmg;
  }

  // Perforar armadura se interpreta como: el paquete final del turno ignora defensa.
  // Esto permite el caso: 70 normal + 120 pierce = 190; x3 = 570 todo pierce.
  if (hasPierce && (lower.includes('perfor') || lower.includes('armadura') || lower.includes('todo'))) {
    mod.convertAllToIgnore = true;
  }

  return mod;
}

function applyTurnCombatModifiersToPendingActions(set: any, get: any): void {
  const st = get();
  const cp = st.players[st.currentPlayerIndex];
  if (!cp) return;

  const modifiers = cp.activeEffects.filter((e: any) => isTurnCombatModifier(e));
  if (!modifiers.length) return;

  let appliedCount = 0;

  set((s: GameState) => {
    const liveCp = s.players[s.currentPlayerIndex];
    if (!liveCp) return s;

    const liveModifiers = liveCp.activeEffects.filter((e: any) => isTurnCombatModifier(e));
    if (!liveModifiers.length) return s;

    const nextPending = s.pendingActions.map((preview: any) => {
      if (preview.attackerId !== liveCp.id) return preview;

      const target = s.players.find((p: Player) => p.id === preview.targetId);
      if (!target) return preview;

      let normal = Number(preview.normalDamage ?? Math.max(0, (preview.rawDamage || 0) - (preview.ignoreDefenseDamage || 0)));
      let ignore = Number(preview.ignoreDefenseDamage ?? 0);
      let rawHeal = Number(preview.rawHeal ?? 0);

      const applicable = liveModifiers.filter((effect: any) => {
        const data = effect.modifier || {};
        const mt = data.targetId || '*';
        return mt === '*' || mt === preview.targetId;
      });

      if (!applicable.length) return preview;

      let multiplier = 1;
      let convertAllToIgnore = false;
      const names: string[] = [];

      for (const effect of applicable) {
        const data = effect.modifier || {};
        names.push(data.sourceName || effect.name);

        if (data.bonusDamage) {
          normal += Number(data.bonusDamage);
        }

        if (data.pierceDamage) {
          ignore += Number(data.pierceDamage);
        }

        if (data.multiplier && Number(data.multiplier) > 1) {
          multiplier *= Number(data.multiplier);
        }

        if (data.convertAllToIgnore) {
          convertAllToIgnore = true;
        }
      }

      if (multiplier > 1) {
        normal = Math.floor(normal * multiplier);
        ignore = Math.floor(ignore * multiplier);
        rawHeal = Math.floor(rawHeal * multiplier);
      }

      if (convertAllToIgnore) {
        ignore += normal;
        normal = 0;
      }

      const defenseReduction = Math.min(target.currentDefense, normal);
      const netDamage = Math.max(0, normal - target.currentDefense) + ignore;

      appliedCount += applicable.length;

      return {
        ...preview,
        rawDamage: normal + ignore,
        rawHeal,
        normalDamage: normal,
        ignoreDefenseDamage: ignore,
        defenseReduction,
        netDamage,
        comboTriggered: preview.comboTriggered || names.join(' + '),
      };
    });

    return {
      pendingActions: nextPending,
      players: s.players.map((p: Player) =>
        p.id === liveCp.id
          ? { ...p, activeEffects: p.activeEffects.filter((e: any) => !isTurnCombatModifier(e)) }
          : p
      ),
    };
  });

  if (appliedCount > 0) {
    get().log(`⚙️ Modificadores de combate aplicados al paquete final del turno`, 'ability');
  }
}

function clearTurnCombatModifiersForCurrentPlayer(set: any, get: any): void {
  const st = get();
  const cp = st.players[st.currentPlayerIndex];
  if (!cp) return;

  const hasMods = cp.activeEffects.some((e: any) => isTurnCombatModifier(e));
  if (!hasMods) return;

  set((s: GameState) => ({
    players: s.players.map((p: Player) =>
      p.id === cp.id
        ? { ...p, activeEffects: p.activeEffects.filter((e: any) => !isTurnCombatModifier(e)) }
        : p
    ),
  }));

  get().log(`⌛ Modificadores de combate expiraron sin ataque`, 'system');
}


type StatusStackMode =
  | 'combine_value_duration'
  | 'add_duration'
  | 'add_stacks'
  | 'refresh'
  | 'replace'
  | 'strongest'
  | 'cancel_opposite';

function statusStackKey(e: any): string {
  const tag = e?.stackKey || e?.tags?.[0] || e?.specialRules || e?.name;
  return [
    e?.targetPlayerId || '',
    e?.timing || '',
    tag || '',
    e?.ignoresDefense ? 'ignore' : 'normal',
  ].join('::');
}

function inferStackMode(e: any): StatusStackMode {
  if (e?.stackMode) return e.stackMode;

  // Por defecto: DoT/HoT acumulable suma valor por turno + duración.
  // Esto da: 25/t x3 + 25/t x3 = 50/t x6.
  if (
    e?.isStackable &&
    e?.value !== 0 &&
    (e?.timing === 'start_of_turn' || e?.timing === 'end_of_turn')
  ) {
    return 'combine_value_duration';
  }

  // Control duro no aumenta poder, sólo duración.
  if (
    e?.specialRules === 'stunned' ||
    e?.specialRules === 'silenced' ||
    e?.specialRules === 'frozen' ||
    e?.specialRules === 'invisible'
  ) {
    return 'add_duration';
  }

  if (e?.isStackable) return 'add_stacks';
  return 'refresh';
}

function clampNum(n: number, max?: number): number {
  if (!max || max <= 0) return n;
  return Math.min(n, max);
}

function mergeStatusEffect(existing: any, incoming: any): any {
  const mode = inferStackMode(incoming);
  const maxStacks = incoming.maxStacks || existing.maxStacks;
  const maxDuration = incoming.maxDuration || existing.maxDuration;

  if (mode === 'replace') {
    return { ...incoming, id: existing.id };
  }

  if (mode === 'refresh') {
    return {
      ...existing,
      duration: Math.max(existing.duration || 0, incoming.duration || 0),
      description: incoming.description || existing.description,
    };
  }

  if (mode === 'add_duration') {
    return {
      ...existing,
      duration: clampNum((existing.duration || 0) + (incoming.duration || 0), maxDuration),
      stacks: existing.stacks || 1,
      description: incoming.description || existing.description,
    };
  }

  if (mode === 'add_stacks') {
    return {
      ...existing,
      stacks: clampNum((existing.stacks || 1) + (incoming.stacks || 1), maxStacks),
      duration: Math.max(existing.duration || 0, incoming.duration || 0),
      description: incoming.description || existing.description,
    };
  }

  if (mode === 'strongest') {
    const oldAbs = Math.abs(existing.value || 0) * (existing.stacks || 1);
    const newAbs = Math.abs(incoming.value || 0) * (incoming.stacks || 1);
    return {
      ...existing,
      value: newAbs > oldAbs ? incoming.value : existing.value,
      stacks: newAbs > oldAbs ? (incoming.stacks || 1) : (existing.stacks || 1),
      duration: Math.max(existing.duration || 0, incoming.duration || 0),
      description: newAbs > oldAbs ? incoming.description : existing.description,
    };
  }

  if (mode === 'cancel_opposite') {
    const oldTotal = (existing.value || 0) * (existing.stacks || 1);
    const newTotal = (incoming.value || 0) * (incoming.stacks || 1);
    const net = oldTotal + newTotal;

    if (net === 0) {
      return { ...existing, value: 0, stacks: 0, duration: 0, _remove: true };
    }

    return {
      ...existing,
      value: net,
      stacks: 1,
      duration: Math.max(existing.duration || 0, incoming.duration || 0),
      description: `${Math.abs(net)}/t x${Math.max(existing.duration || 0, incoming.duration || 0)}`,
    };
  }

  // combine_value_duration:
  // Guarda el TOTAL por tick en value y deja stacks=1.
  // Así processStartEffects/processEndEffects no duplica daño.
  const oldTotal = (existing.value || 0) * (existing.stacks || 1);
  const newTotal = (incoming.value || 0) * (incoming.stacks || 1);
  const total = oldTotal + newTotal;

  return {
    ...existing,
    value: total,
    stacks: 1,
    duration: clampNum((existing.duration || 0) + (incoming.duration || 0), maxDuration),
    ignoresDefense: existing.ignoresDefense || incoming.ignoresDefense,
    isStackable: true,
    description: `${Math.abs(total)}/t x${clampNum((existing.duration || 0) + (incoming.duration || 0), maxDuration)}`,
  };
}

function applyOrStackStatusEffect(set: any, get: any, playerId: string, effect: any): void {
  const incoming = {
    ...effect,
    targetPlayerId: effect.targetPlayerId || playerId,
    stacks: effect.stacks || 1,
  };

  const incomingKey = statusStackKey(incoming);

  set((s: GameState) => ({
    players: s.players.map((p: Player) => {
      if (p.id !== playerId) return p;

      const idx = p.activeEffects.findIndex((e: any) =>
        e.isStackable &&
        incoming.isStackable &&
        statusStackKey(e) === incomingKey
      );

      if (idx < 0) {
        return { ...p, activeEffects: [...p.activeEffects, incoming] };
      }

      const merged = mergeStatusEffect(p.activeEffects[idx], incoming);
      const nextEffects = [...p.activeEffects];

      if (merged._remove || merged.duration <= 0 || merged.stacks <= 0) {
        nextEffects.splice(idx, 1);
      } else {
        nextEffects[idx] = merged;
      }

      return { ...p, activeEffects: nextEffects };
    }),
  }));

  const after = get().players.find((p: Player) => p.id === playerId);
  const merged = after?.activeEffects.find((e: any) => statusStackKey(e) === incomingKey);
  if (merged) {
    get().log(
      `📚 ${merged.name}: ${merged.value}/t · ${merged.duration}t${merged.ignoresDefense ? ' · ignora defensa' : ''}`,
      merged.value < 0 ? 'dot' : merged.value > 0 ? 'heal' : 'buff'
    );
  }
}

export interface BotDecision {
  action: 'play_cards' | 'basic_attack' | 'skip';
  cardIds?: string[];
  targetId?: string;
}

export function botDecide(bot: Player, state: GameState, diff: BotDifficulty): BotDecision {
  const enemies = state.players.filter(p =>
    p.isAlive && p.id !== bot.id && (state.gameMode === 'ffa' || p.teamId !== bot.teamId)
  );
  if (!enemies.length) return { action: 'skip' };
  const target = [...enemies].sort((a, b) => a.currentHp - b.currentHp)[0];
  const dmgCards = bot.hand.filter(c => c.type === 'damage' || c.type === 'damage_over_time');
  const healCards = bot.hand.filter(c => c.type === 'heal');
  const random = diff === 'easy' ? 0.7 : diff === 'normal' ? 0.4 : 0.1;

  if (Math.random() < random) {
    const pick = bot.hand.slice(0, Math.min(3, bot.hand.length));
    return { action: 'play_cards', cardIds: pick.map(c => c.id), targetId: target.id };
  }
  if (bot.currentHp < bot.maxHp * 0.35 && healCards.length) {
    return { action: 'play_cards', cardIds: healCards.slice(0, 1).map(c => c.id), targetId: bot.id };
  }
  const pick = (dmgCards.length ? dmgCards : bot.hand).slice(0, Math.min(diff === 'hard' ? 3 : 2, bot.hand.length));
  return { action: 'play_cards', cardIds: pick.map(c => c.id), targetId: target.id };
}

export interface PlayerConfig {
  name: string;
  character: string;
  team: string;
  control: PlayerControl;
  botDifficulty?: BotDifficulty;
  networkPlayerId?: string;
}

interface LogEntry { message: string; type: string; ts: number; }

interface GameStore extends GameState {
  setupGame(mode: GameMode, configs: PlayerConfig[], deckSize: number, rules?: Partial<import('../types/game').GameRules>, startingMode?: GameState['startingPlayerMode'], deckOptions?: DeckBuildOptions): void;
  startTurn(): void;
  endTurn(): void;
  nextPlayer(): void;
  tickGlobal(): void;
  selectCard(id: string): void;
  deselectCard(id: string): void;
  clearSelection(): void;
  selectTarget(id: string | null): void;
  prepareAction(cardIds: string[], targetId: string): void;
  playModularCards(cardIds: string[], targetId: string): Promise<void>;
  prepareBasicAttack(targetId: string): void;
  executeAction(preview: ResolutionPreview): void;
  resolveNextAction(): void;
  finishTurn(): void;
  cancelPreparedTurn(): void;
  useAbility(abilityId: string, targetId: string): void;
  executeBasicAttack(targetId: string): void;
  defendWithCard(cardId: string): void;
  skipDefense(): void;
  refillHand(playerId: string): void;
  applyResolved(): void;
  addStat(playerId: string, stat: keyof PlayerStats, amount: number): void;
  processStartEffects(): void;
  processEndEffects(): void;
  checkWin(): void;
  reduceCooldowns(): void;
  executeBotTurn(): Promise<void>;
  isBot(): boolean;
  log(msg: string, type?: string): void;
  reset(): void;
  setVisualConfig(config: Partial<import('../types/game').VisualConfig>): void;
  resetVisualConfig(): void;
  getVisualConfig(): import('../types/game').VisualConfig;
}


function allowsOverhealFromCards(cards: any[] = []): { ok: boolean; limitPct: number } {
  for (const c of cards || []) {
    if (c?.overheal) return { ok: true, limitPct: Number(c.overhealLimitPct || 150) };

    for (const e of c?.effects || []) {
      if (e?.kind === 'overheal' || e?.overheal) {
        return { ok: true, limitPct: Number(e.overhealLimitPct || c.overhealLimitPct || 150) };
      }
    }

    if (c?.tags?.includes('overheal') || c?.tags?.includes('sobrecuracion')) {
      return { ok: true, limitPct: Number(c.overhealLimitPct || 150) };
    }
  }

  return { ok: false, limitPct: 100 };
}

function healWithOverheal(player: any, amount: number, cards: any[] = []): number {
  const info = allowsOverhealFromCards(cards);
  const limit = info.ok
    ? Math.max(player.maxHp, Math.floor(player.maxHp * (info.limitPct / 100)))
    : player.maxHp;

  return Math.min(limit, player.currentHp + Math.max(0, Number(amount || 0)));
}

const INIT: Omit<GameStore,
  'setupGame'|'startTurn'|'endTurn'|'nextPlayer'|'tickGlobal'|
  'selectCard'|'deselectCard'|'clearSelection'|'selectTarget'|
  'prepareAction'|'playModularCards'|'prepareBasicAttack'|'executeAction'|'resolveNextAction'|'finishTurn'|'cancelPreparedTurn'|
  'defendWithCard'|'skipDefense'|'refillHand'|'applyResolved'|'addStat'|'useAbility'|'executeBasicAttack'|
  'processStartEffects'|'processEndEffects'|'checkWin'|'reduceCooldowns'|
  'executeBotTurn'|'isBot'|'log'|'reset'|'setVisualConfig'|'resetVisualConfig'|'getVisualConfig'
> = {
  gameMode: 'ffa', teamCount: 0, maxPlayers: 2, players: [],
  deck: { cards: [] }, discardPile: [],
  currentPlayerIndex: 0, globalTurnNumber: 0,
  cardsPlayedThisTurn: 0, maxCardsPerTurn: 3,
  phase: 'setup', deckSize: 50,
  rules: DEFAULT_RULES,
  resolutionPreview: undefined, defensePhase: undefined,
  pendingActions: [], isResolvingEndTurn: false,
  revealedHands: new Set(),
  selectedTargetId: null, selectedCardIds: [],
  playedCardsOnBoard: [],
  isResolvingChain: false, responseChain: [],
  pendingInstantCard: null,
  winner: null, gameLog: [] as LogEntry[],
  canUseBasicAttack: true, viewingHandOf: null,
  startingPlayerMode: 'first',
  lastLoserIndex: 0,
  visualConfig: DEFAULT_VISUAL_CONFIG,
  defenseChainDepth: 0,
  maxChainDepth: 5,
  basicAttackUsed: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...INIT,

  setupGame(mode, configs, deckSize, rulesOverride, startingMode = 'first', deckOptions) {
    const rules = { ...DEFAULT_RULES, ...(rulesOverride || {}) };
    let deck = buildDeck(deckSize, deckOptions);
    const allChars = getAllCharactersWithSource();
    const players: Player[] = configs.map((cfg, i) => {
      const char = allChars.find(c => c.id === cfg.character) || allChars[0];
      const p = { hp: char.hp, def: char.defense, dmg: char.damage };
      // Pasivas iniciales
      const hp = cfg.character === 'sanador' || cfg.character === 'medico' ? p.hp + 200
               : cfg.character === 'druida'  ? p.hp + 100
               : p.hp;
      const def = cfg.character === 'tanque' || cfg.character === 'sargento' ? p.def + 25
                : cfg.character === 'caballero' ? p.def + 20
                : cfg.character === 'cruzado' ? p.def + 30
                : p.def;
      const dmg = cfg.character === 'barbaro' || cfg.character === 'campeon' ? p.dmg + 20 : p.dmg;
      p.dmg = dmg;
      const { hand, remaining } = dealHand(deck, rules.startingHandSize);
      deck = remaining;
      return {
        id: `p${i}`, networkPlayerId: cfg.networkPlayerId, name: cfg.name, characterId: char.id,
        currentHp: hp, maxHp: hp,
        currentDefense: def, baseDefense: def,
        baseDamage: p.dmg,
        hand, activeEffects: [], abilitiesUsed: [],
        abilityCooldowns: {}, // cooldowns por jugador (vacío = todas listas)
        isAlive: true, teamId: mode === 'teams' ? cfg.team : undefined,
        position: i, control: cfg.control, botDifficulty: cfg.botDifficulty,
        avatar: char.avatar,
        stats: {
          damageDealt: 0, damageReceived: 0,
          healDone: 0, healReceived: 0,
          dotsApplied: 0, cardsPlayed: 0,
          kills: 0, defensesUsed: 0, critsLanded: 0,
        },
      };
    });
    // Los cooldowns ahora son por jugador (Player.abilityCooldowns), no globales.
    let startIdx = 0;
    if (startingMode === 'random') startIdx = Math.floor(Math.random() * players.length);

    set({
      ...INIT, gameMode: mode,
      teamCount: mode === 'teams' ? new Set(configs.map(c => c.team)).size : 0,
      maxPlayers: configs.length, players, deck: { cards: deck }, deckSize,
      rules, maxCardsPerTurn: rules.maxCardsPerTurn,
      startingPlayerMode: startingMode,
      currentPlayerIndex: startIdx,
      phase: 'playing', globalTurnNumber: 1, revealedHands: new Set(),
      gameLog: [{ message: `🎮 Partida: ${configs.length}p · ${mode === 'ffa' ? 'FFA' : 'Equipos'} · Mazo ${deckSize} · 💥 Crítico ${rules.criticalChance}% x${rules.criticalMultiplier}`, type: 'system', ts: Date.now() }],
    });
    get().startTurn();
  },

  startTurn() {
      // Runtime passives: always + start_of_turn
      {
        const __rt = get();
        const __cp = __rt.players?.[__rt.currentPlayerIndex];
        if (__cp?.id) {
          applyRuntimeCharacterPassives(set, get, 'always', __cp.id);
          applyRuntimeCharacterPassives(set, get, 'start_of_turn', __cp.id);
        }
      }

    const { players, currentPlayerIndex } = get();
    const cp = players[currentPlayerIndex];
    if (!cp?.isAlive) { get().nextPlayer(); return; }
    set({ 
      cardsPlayedThisTurn: 0, 
      maxCardsPerTurn: get().rules.maxCardsPerTurn, 
      selectedCardIds: [], 
      selectedTargetId: null, 
      canUseBasicAttack: true, 
      resolutionPreview: undefined, 
      defensePhase: undefined, 
      pendingActions: [], 
      isResolvingEndTurn: false,
      basicAttackUsed: false,
    });
    get().log(`━━━ Turno: ${cp.avatar || ''} ${cp.name} ━━━`, 'turn');
    get().processStartEffects();
  },

  endTurn() {
    const { pendingActions } = get();

    if (pendingActions.length > 0) {
      // Aplica x2/x3, perforar armadura, bonus al daño total y tags
      // justo antes de entrar a fase de resolución/defensa.
      applyTurnCombatModifiersToPendingActions(set, get);

      set({ isResolvingEndTurn: true, selectedCardIds: [], selectedTargetId: null });
      get().resolveNextAction();
    } else {
      clearTurnCombatModifiersForCurrentPlayer(set, get);
      get().finishTurn();
    }
  },

  resolveNextAction() {
    const { pendingActions } = get();
    if (!pendingActions.length) { get().finishTurn(); return; }
    const [next, ...rest] = pendingActions;
    set({ pendingActions: rest });
    get().executeAction(next);
  },

  finishTurn() {
    const { playedCardsOnBoard, players, currentPlayerIndex } = get();
    const cp = players[currentPlayerIndex];
    if (cp) {
      const myPlayed = playedCardsOnBoard.find(x => x.playerId === cp.id);
      if (myPlayed) {
        set(s => ({
          deck: { cards: [...s.deck.cards, ...myPlayed.cards] },
          playedCardsOnBoard: s.playedCardsOnBoard.filter(x => x.playerId !== cp.id),
        }));
      }
    }
    set({ isResolvingEndTurn: false });
    get().processEndEffects();
    get().nextPlayer();
  },

  cancelPreparedTurn() {
    const { players, currentPlayerIndex, playedCardsOnBoard } = get();
    const cp = players[currentPlayerIndex];
    if (!cp) return;
    const myPlayed = playedCardsOnBoard.find(x => x.playerId === cp.id);
    if (myPlayed?.cards.length) {
      set(s => ({
        deck: { cards: [...s.deck.cards, ...myPlayed.cards] },
        playedCardsOnBoard: s.playedCardsOnBoard.filter(x => x.playerId !== cp.id),
        pendingActions: [],
        selectedCardIds: [],
        selectedTargetId: null,
        cardsPlayedThisTurn: 0,
        canUseBasicAttack: true,
      }));
      get().log(`↩️ ${cp.name} retiró sus jugadas preparadas.`, 'system');
    }
  },

  nextPlayer() {
    const { players, currentPlayerIndex, rules } = get();
    const cp = players[currentPlayerIndex];

    // ── EXTRA TURN: si el jugador actual tiene el efecto, repite turno ──
    const extraTurnEffect = cp?.activeEffects.find(e => e.specialRules === 'extra_turn');
    if (extraTurnEffect) {
      get().log(`⌛ ${cp.name} juega otro turno (extra_turn)`, 'buff');
      // Consumir el efecto y permanecer en el mismo jugador
      set(s => ({
        players: s.players.map(p => p.id === cp.id ? {
          ...p, activeEffects: p.activeEffects.filter(e => e.id !== extraTurnEffect.id),
        } : p),
        cardsPlayedThisTurn: 0,
        maxCardsPerTurn: rules.maxCardsPerTurn,
        selectedCardIds: [], selectedTargetId: null,
        canUseBasicAttack: true, basicAttackUsed: false,
        resolutionPreview: undefined, defensePhase: undefined,
        pendingActions: [], isResolvingEndTurn: false, defenseChainDepth: 0,
      }));
      get().startTurn();
      return;
    }

    const ni = nextAlive(players, currentPlayerIndex);
    const wrapped = ni <= currentPlayerIndex;
    set({
      currentPlayerIndex: ni,
      cardsPlayedThisTurn: 0,
      maxCardsPerTurn: rules.maxCardsPerTurn, // FIX: usa el valor de reglas
      selectedCardIds: [],
      selectedTargetId: null,
      canUseBasicAttack: true,
      resolutionPreview: undefined,
      defensePhase: undefined,
      pendingActions: [],
      isResolvingEndTurn: false,
      defenseChainDepth: 0,  // FIX: resetear cadena al cambiar de jugador
      basicAttackUsed: false,
    });
    if (wrapped) get().tickGlobal();
    get().checkWin();
    if (get().phase !== 'gameOver') get().startTurn();
  },

  tickGlobal() {
    set(s => ({ globalTurnNumber: s.globalTurnNumber + 1 }));
    get().reduceCooldowns();
    get().log(`🔄 Ronda ${get().globalTurnNumber}`, 'system');
  },

  selectCard(id) {
    set(s => {
      if (s.selectedCardIds.includes(id)) return s;
      if (s.selectedCardIds.length >= (s.maxCardsPerTurn - s.cardsPlayedThisTurn)) return s;
      return { selectedCardIds: [...s.selectedCardIds, id] };
    });
  },
  deselectCard(id) { set(s => ({ selectedCardIds: s.selectedCardIds.filter(x => x !== id) })); },
  clearSelection() { set({ selectedCardIds: [], selectedTargetId: null }); },
  selectTarget(id) { set({ selectedTargetId: id }); },

  prepareAction(cardIds, targetId) {
    const { players, currentPlayerIndex, cardsPlayedThisTurn, maxCardsPerTurn } = get();
    const atk = players[currentPlayerIndex];
    const tgt = players.find(p => p.id === targetId);
    if (!atk || !tgt || !cardIds.length) return;

    const cards = cardIds.map(id => atk.hand.find(c => c.id === id)).filter(Boolean) as PlayableCard[];
    if (!cards.length) return;
    if (cardsPlayedThisTurn + cards.length > maxCardsPerTurn) {
      get().log(`⚠️ Máximo ${maxCardsPerTurn} cartas por turno`, 'system');
      return;
    }

    // ─── CARTAS MODULARES (effects[]) ─────────────────────────
    // Se procesan APARTE con el motor de efectos. Si una carta tiene
    // 'choice', se aplica de inmediato (pidiendo elección por UI).
    // El resto pasan al flujo tradicional.
    const modularCards = cards.filter(c => c.effects && c.effects.length > 0);
    if (modularCards.length > 0) {
      // Llama al método que aplica todos los efectos modulares
      get().playModularCards(modularCards.map(c => c.id), targetId);
      // Filtrar las modulares de las cards a procesar tradicionalmente
      const remaining = cards.filter(c => !c.effects || c.effects.length === 0);
      if (remaining.length === 0) return;
      // continuar solo con las no-modulares
      cards.length = 0;
      cards.push(...remaining);
    }

    const instantCards = cards.filter(c => c.type === 'utility' || c.type === 'defense' ||
      (c.type === 'special' && !c.id.includes('contraataque') && !c.id.includes('represalia') && !c.id.includes('absorber') && !c.id.includes('esquive') && !c.id.includes('dodge')));
    if (instantCards.length > 0) {
      applyImmediateEffects(atk, tgt, instantCards, set, get, targetId);
    }

    const dmgCards = cards.filter(c => c.type === 'damage' || c.type === 'heal' || c.type === 'damage_over_time' ||
      (c.type === 'special' && (c.id.includes('contraataque') || c.id.includes('represalia') || c.id.includes('absorber') || c.id.includes('esquive') || c.id.includes('dodge'))));

    let contribution = { ...EMPTY_CONTRIBUTION, dots: [] as any[] };

    const currentTurn = get().globalTurnNumber;
    dmgCards.forEach(c => {
      const cv = evalCardValue(c, atk, tgt, currentTurn, cardsPlayedThisTurn);
      let base = getBaseContribution(c, atk, tgt, currentTurn, cardsPlayedThisTurn);

      // Pasivas ofensivas para daño directo
      if (c.type === 'damage' && cv < 0) {
        const totalWithPassive = passiveCardDamage(atk, c, tgt, currentTurn, cardsPlayedThisTurn);
        const baseAbs = Math.abs(cv);
        const bonus = Math.max(0, totalWithPassive - baseAbs);
        base.rawDamage += bonus;
        if (c.ignoresDefense) base.ignoreDefenseDamage += bonus;
        else base.normalDamage += bonus;
      }

      // Médico/Sanador: amplificar curas
      if (c.type === 'heal' && cv > 0) {
        if (atk.characterId === 'medico' || atk.characterId === 'sanador') {
          const extra = Math.floor(base.rawHeal * 0.5);
          base.rawHeal += extra;
        }
      }

      // FIX CRÍTICO: daño_over_time NO debe pegar daño inmediato.
      // Solo se potencia el valor del DoT por las pasivas del personaje.
      if (c.type === 'damage_over_time' && base.dots.length > 0) {
        const totalWithPassive = passiveCardDamage(atk, c, tgt, currentTurn, cardsPlayedThisTurn);
        const baseAbs = Math.abs(cv);
        const bonus = Math.max(0, totalWithPassive - baseAbs);
        base.dots = base.dots.map(dot => ({
          ...dot,
          value: dot.value < 0 ? -(Math.abs(dot.value) + bonus) : dot.value + bonus,
        }));
      }

      contribution = mergeContribution(contribution, base);
    });

    // Motor de sinergias declarativas
    dmgCards.forEach(c => {
      if (c.synergies && c.synergies.length > 0) {
        c.synergies.forEach(syn => {
          let conditionMet = true;
          const cond = syn.condition;
          if (cond.targetHasTag) {
            const hasTag = tgt.activeEffects.some(e => e.tags?.includes(cond.targetHasTag!));
            if (!hasTag) conditionMet = false;
          }
          if (cond.targetStatus) {
            if (cond.targetStatus === 'has_dots') {
              const hasDots = tgt.activeEffects.some(e => e.timing === 'start_of_turn' || e.timing === 'end_of_turn');
              if (!hasDots) conditionMet = false;
            } else if (cond.targetStatus === 'low_hp') {
              if (tgt.currentHp >= tgt.maxHp * 0.3) conditionMet = false;
            } else if (cond.targetStatus === 'high_def') {
              if (tgt.currentDefense < 30) conditionMet = false;
            } else if (cond.targetStatus === 'stunned') {
              if (!tgt.activeEffects.some(e => e.specialRules === 'stunned')) conditionMet = false;
            } else if (cond.targetStatus === 'silenced') {
              if (!tgt.activeEffects.some(e => e.specialRules === 'silenced')) conditionMet = false;
            }
          }
          if (cond.attackerHasTag) {
            const hasTag = atk.activeEffects.some(e => e.tags?.includes(cond.attackerHasTag!));
            if (!hasTag) conditionMet = false;
          }
          if (cond.attackerStatus) {
            if (cond.attackerStatus === 'low_hp') {
              if (atk.currentHp >= atk.maxHp * 0.3) conditionMet = false;
            } else if (cond.attackerStatus === 'high_hp') {
              if (atk.currentHp < atk.maxHp * 0.8) conditionMet = false;
            }
          }
          if (cond.cardsPlayedThisTurn && (cardsPlayedThisTurn + cards.length) < cond.cardsPlayedThisTurn) {
            conditionMet = false;
          }

          if (conditionMet) {
            if (syn.bonusDamage) {
              contribution.rawDamage += syn.bonusDamage;
              contribution.normalDamage += syn.bonusDamage;
            }
            if (syn.bonusHeal) contribution.rawHeal += syn.bonusHeal;
            if (syn.applyExtraEffect) {
              const extra = syn.applyExtraEffect;
              if (extra.timing === 'start_of_turn' || extra.timing === 'end_of_turn') {
                contribution.dots.push({ name: extra.name, value: extra.value, duration: extra.duration, ignoresDefense: extra.ignoresDefense });
              }
            }
            get().log(`✨ ¡Sinergia activada para ${c.name}!`, 'combo');
          }
        });
      }
    });

    // Sinergias heredadas
    if (dmgCards.some(c => c.id.includes('golpe_sombrio'))) {
      const hasDoTs = tgt.activeEffects.some(e => e.timing === 'start_of_turn' || e.timing === 'end_of_turn');
      if (hasDoTs) {
        contribution.rawDamage += 20;
        contribution.normalDamage += 20;
        get().log(`💥 Sinergia: Golpe Sombrío explota los DoTs`, 'combo');
      }
    }
    if (dmgCards.some(c => c.id.includes('corte_preciso'))) {
      const hpPercent = (tgt.currentHp / tgt.maxHp) * 100;
      if (hpPercent < 30) {
        contribution.rawDamage = Math.floor(contribution.rawDamage * 3);
        contribution.normalDamage = Math.floor(contribution.normalDamage * 3);
        contribution.ignoreDefenseDamage = Math.floor(contribution.ignoreDefenseDamage * 3);
        get().log(`💥 ¡Corte Preciso letal! x3 daño`, 'crit');
      }
    }

    const baseIds = dmgCards.map(c => c.id.split('__')[0]);
    const allCombos = getAllCombos();
    const combo = contribution.rawDamage > 0 ? allCombos.find(cb => cb.requiredCards.every(r => baseIds.includes(r))) : undefined;
    if (combo) {
      contribution.rawDamage += combo.bonusValue;
      contribution.normalDamage += combo.bonusValue;
    }

    if (dmgCards.length > 0) {
      const preview = contributionToPreview(atk.id, tgt, dmgCards, contribution, combo?.name, 'cards');

      set(s => {
        const existingAction = s.pendingActions.find(p => p.targetId === targetId) as (ResolutionPreview & { normalDamage?: number; ignoreDefenseDamage?: number }) | undefined;
        const merged = existingAction
          ? mergePreviewWithContribution(existingAction, tgt, dmgCards, contribution, combo?.name)
          : preview;
        const newActions = existingAction
          ? s.pendingActions.map(p => p.targetId === targetId ? merged : p)
          : [...s.pendingActions, preview];

        const existing = s.playedCardsOnBoard.find(x => x.playerId === atk.id);
        const newPlayed = existing
          ? s.playedCardsOnBoard.map(x => x.playerId === atk.id ? { ...x, cards: [...x.cards, ...cards] } : x)
          : [...s.playedCardsOnBoard, { playerId: atk.id, cards: [...cards] }];

        const allCards = instantCards.concat(dmgCards);
        const playedIds = allCards.map(c => c.id);
        return {
          players: s.players.map(p => p.id === atk.id ? { ...p, hand: p.hand.filter(c => !playedIds.includes(c.id)) } : p),
          playedCardsOnBoard: newPlayed,
          pendingActions: newActions,
          cardsPlayedThisTurn: s.cardsPlayedThisTurn + cards.length,
          selectedCardIds: [], selectedTargetId: null,
        };
      });
      get().refillHand(atk.id);
      get().log(`🎴 ${atk.name} preparó ${dmgCards.length} carta(s) de daño contra ${tgt.name}`, 'system');
    } else {
      set(s => {
        const existing = s.playedCardsOnBoard.find(x => x.playerId === atk.id);
        const newPlayed = existing
          ? s.playedCardsOnBoard.map(x => x.playerId === atk.id ? { ...x, cards: [...x.cards, ...cards] } : x)
          : [...s.playedCardsOnBoard, { playerId: atk.id, cards: [...cards] }];
        const allIds = cards.map(c => c.id);
        return {
          players: s.players.map(p => p.id === atk.id ? { ...p, hand: p.hand.filter(c => !allIds.includes(c.id)) } : p),
          playedCardsOnBoard: newPlayed,
          cardsPlayedThisTurn: s.cardsPlayedThisTurn + cards.length,
          selectedCardIds: [], selectedTargetId: null,
        };
      });
      get().refillHand(atk.id);
      get().log(`🎴 ${atk.name} usó ${cards.length} carta(s) de efecto inmediato`, 'system');
    }
  },

  // ─── JUGAR CARTAS MODULARES ────────────────────────────────
  // Procesa cartas que tienen `effects[]` definidos usando el motor
  // declarativo (src/utils/effects.ts). Esto NO entra en pendingActions:
  // los efectos se aplican inmediatamente al jugar la carta.
  // Las cartas usadas vuelven al mazo como siempre.
  async playModularCards(cardIds, targetId) {
    const { players, currentPlayerIndex, cardsPlayedThisTurn, maxCardsPerTurn, globalTurnNumber } = get();
    const atk = players[currentPlayerIndex];
    const tgt = players.find(p => p.id === targetId);
    if (!atk || !cardIds.length) return;
    const cards = cardIds.map(id => atk.hand.find(c => c.id === id)).filter(Boolean) as PlayableCard[];
    if (!cards.length) return;
    if (cardsPlayedThisTurn + cards.length > maxCardsPerTurn) {
      get().log(`⚠️ Máximo ${maxCardsPerTurn} cartas por turno`, 'system');
      return;
    }

    // Construir el EffectContext con callbacks al store
    const ctx: any = {
      attacker: atk,
      primaryTarget: tgt,
      allPlayers: get().players,
      turn: globalTurnNumber,
      cardsPlayedThisTurn,
      applyDamage: (pid: string, amount: number, ignoreDef?: boolean) => {
        const liveTarget = get().players.find(p => p.id === pid);
        if (!liveTarget) return;
        // Si no ignora defensa, la defensa reduce el daño una vez para este efecto
        const afterDefense = ignoreDef ? amount : Math.max(0, amount - liveTarget.currentDefense);
        const final = mitigateDamage(liveTarget, afterDefense);
        set(s => ({
          players: s.players.map(p => p.id === pid ? {
            ...p,
            currentHp: Math.max(0, p.currentHp - final),
            isAlive: p.currentHp - final > 0,
          } : p),
        }));
        if (final > 0) {
          get().addStat(atk.id, 'damageDealt', final);
          get().addStat(pid, 'damageReceived', final);
        }
      },
      applyHeal: (pid: string, amount: number) => {
        set(s => ({
          players: s.players.map(p => p.id === pid ? {
            ...p, currentHp: healWithOverheal(p, amount, []),
          } : p),
        }));
        get().addStat(atk.id, 'healDone', amount);
        get().addStat(pid, 'healReceived', amount);
      },
      applyDefense: (pid: string, amount: number) => {
        set(s => ({
          players: s.players.map(p => p.id === pid ? {
            ...p, currentDefense: Math.max(p.baseDefense, p.currentDefense + amount),
          } : p),
        }));
      },
      applyStatus: (pid: string, effect: any) => {
        if (effect._overheal) {
          const amount = Number(effect.amount || effect.value || 0);
          const limitPct = Number(effect.overhealLimitPct || 150);

          set(s => ({
            players: s.players.map((p: Player) => {
              if (p.id !== pid) return p;
              const limit = Math.max(p.maxHp, Math.floor(p.maxHp * (limitPct / 100)));
              return { ...p, currentHp: Math.min(limit, p.currentHp + amount) };
            }),
          }));

          get().log(`💖 Sobrecuración: +${amount} HP extra`, 'heal');
          return;
        }

        if (effect._restoreOriginalHp) {
          const penaltyPct = Number(effect.defensePenaltyPct || 25);

          set(s => ({
            players: s.players.map((p: Player) => {
              if (p.id !== pid) return p;

              if (p.currentHp > p.maxHp) {
                return { ...p, currentHp: p.maxHp };
              }

              const newDefense = Math.max(0, Math.floor(p.currentDefense * (1 - penaltyPct / 100)));
              return { ...p, currentDefense: newDefense };
            }),
          }));

          const target = get().players.find((p: Player) => p.id === pid);
          if (target?.currentHp && target.currentHp > target.maxHp) {
            get().log(`🫀 ${target.name} vuelve a su HP original`, 'system');
          } else {
            get().log(`🫀 Restauración fallida: -${penaltyPct}% defensa`, 'debuff');
          }
          return;
        }

        // Comandos especiales: _cleanse y _dispel
        if (effect._cleanse) {
          set(s => ({ players: s.players.map(p => p.id === pid ? {
            ...p,
            activeEffects: p.activeEffects.filter(e =>
              e.value >= 0 &&
              e.specialRules !== 'stunned' &&
              e.specialRules !== 'silenced'
            ),
          } : p) }));
          return;
        }

        if (effect._dispel) {
          set(s => ({ players: s.players.map(p => p.id === pid ? {
            ...p,
            activeEffects: p.activeEffects.filter(e => e.value <= 0),
          } : p) }));
          return;
        }

        applyOrStackStatusEffect(set, get, pid, effect);
      },
      drawCards: (pid: string, n: number) => {
        const deck = get().deck.cards;
        const drawn = deck.slice(0, n);
        const rem = deck.slice(n);
        set(s => ({
          deck: { cards: rem },
          players: s.players.map(p => p.id === pid ? { ...p, hand: [...p.hand, ...drawn] } : p),
        }));
      },
      discardCards: (pid: string, n: number) => {
        const target = get().players.find(p => p.id === pid);
        if (!target) return;
        const discarded = target.hand.slice(0, n);
        set(s => ({
          deck: { cards: [...s.deck.cards, ...discarded] },
          players: s.players.map(p => p.id === pid ? { ...p, hand: p.hand.slice(n) } : p),
        }));
        get().refillHand(pid);
      },
      revealHand: (pid: string) => {
        const rh = new Set(get().revealedHands); rh.add(pid);
        set({ revealedHands: rh, viewingHandOf: pid });
      },
      log: (msg: string, type: string = 'system') => get().log(msg, type),
      requestChoice: async (choices: any[]) => {
        // Si el atacante es humano, mostrar modal de elección via cardChoiceRequest
        if (atk.control === 'human') {
          return new Promise<number>(resolve => {
            set({ cardChoiceRequest: { choices, resolve } } as any);
          });
        }
        // Bot: elige aleatoriamente
        return Math.floor(Math.random() * choices.length);
      },
    };

    // Mover cartas al tablero y aplicar efectos
    set(s => {
      const existing = s.playedCardsOnBoard.find(x => x.playerId === atk.id);
      const newPlayed = existing
        ? s.playedCardsOnBoard.map(x => x.playerId === atk.id ? { ...x, cards: [...x.cards, ...cards] } : x)
        : [...s.playedCardsOnBoard, { playerId: atk.id, cards: [...cards] }];
      const playedIds = cards.map(c => c.id);
      return {
        players: s.players.map(p => p.id === atk.id ? { ...p, hand: p.hand.filter(c => !playedIds.includes(c.id)) } : p),
        playedCardsOnBoard: newPlayed,
        cardsPlayedThisTurn: s.cardsPlayedThisTurn + cards.length,
        selectedCardIds: [], selectedTargetId: null,
      };
    });
    get().refillHand(atk.id);

    // Aplicar efectos secuencialmente
    for (const card of cards) {
      if (!card.effects) continue;
      get().log(`🎴 ${atk.name} jugó ${card.name}`, 'system');
      get().addStat(atk.id, 'cardsPlayed', 1);
      await applyEffects(card.effects, ctx);
    }

    get().checkWin();
  },

  prepareBasicAttack(targetId) {
    const { players, currentPlayerIndex, canUseBasicAttack, rules } = get();
    if (!canUseBasicAttack || !rules.allowBasicAttack) return;
    const atk = players[currentPlayerIndex];
    const tgt = players.find(p => p.id === targetId);
    if (!atk || !tgt) return;

    const preview = buildBasicAttackPreview(atk, tgt);
    set(s => {
      const existingAction = s.pendingActions.find(p => p.targetId === targetId) as (ResolutionPreview & { normalDamage?: number; ignoreDefenseDamage?: number }) | undefined;
      const merged = existingAction
        ? mergePreviewWithContribution(existingAction, tgt, [], {
            rawDamage: preview.rawDamage,
            normalDamage: preview.normalDamage || atk.baseDamage,
            ignoreDefenseDamage: preview.ignoreDefenseDamage || 0,
            rawHeal: 0,
            dots: [],
          })
        : preview;
      const newActions = existingAction
        ? s.pendingActions.map(p => p.targetId === targetId ? merged : p)
        : [...s.pendingActions, preview];
      return { pendingActions: newActions, canUseBasicAttack: false, basicAttackUsed: true };
    });
    get().log(`⚔️ ${atk.name} preparó ataque básico contra ${tgt.name}`, 'system');
  },

  // ── GOLPE (ataque básico) ──────────────────────────────────
  // FIX: Ahora el "Golpe" se prepara como una acción pendiente que
  // se RESUELVE junto con las cartas al terminar el turno (permitiendo
  // que el objetivo se defienda). Es un alias de prepareBasicAttack.
  executeBasicAttack(targetId: string) {
    get().prepareBasicAttack(targetId);
  },

  // ── USAR HABILIDAD ────────────────────────────────────────
  // Motor estable:
  // - No fuerza todo a instantáneo.
  // - Respeta abilities.ts: instant / end_turn / defense / buff_self / passive.
  // - Respeta canTarget de la habilidad.
  // - Soporta AOE por behavior.area o por texto ("todos", "aliados", etc).
  // - Sólo cobra cooldown si la habilidad se pudo usar.
  // - Las pasivas NO se ejecutan aquí: se aplican por hooks del juego.
  async useAbility(abilityId, targetId) {
    const { players, currentPlayerIndex, gameMode } = get();
    const cp = players[currentPlayerIndex];
    if (!cp) return;

    const allChars = getAllCharactersWithSource();
    const char = allChars.find(c => c.id === cp.characterId);
    if (!char) return;

    const ab = char.abilities.find(a => a.id === abilityId);
    if (!ab) return;

    const behaviorBase = getAbilityRuntimeBehavior(ab as any);

    const abDamage = Number((ab as any).damage ?? (ab as any).value ?? 0) || 0;
    const abHealing = Number((ab as any).healing ?? (ab as any).heal ?? 0) || 0;
    const abDefense = Number((ab as any).defense ?? (ab as any).defenseChange ?? 0) || 0;

    const text = `${ab.name} ${ab.description || ''} ${behaviorBase.timingLabel || ''}`.toLowerCase();

    // Si DevBuild/ModdingBuild marca una habilidad como pasiva, no debe ser botón.
    if (behaviorBase.passive || behaviorBase.category === 'passive' || (ab as any).passive === true) {
      get().log(`ℹ️ ${ab.name} es pasiva y se aplica automáticamente`, 'system');
      return;
    }

    if (cp.activeEffects.some(e => e.specialRules === 'silenced')) {
      get().log(`🤐 ${cp.name} silenciado, no puede usar habilidades`, 'system');
      return;
    }

    const currentCd = cp.abilityCooldowns?.[abilityId] || 0;
    if (currentCd > 0) {
      get().log(`⏳ ${ab.name} en cooldown (${currentCd}t restantes)`, 'system');
      return;
    }

    const canTarget = ((ab as any).canTarget || behaviorBase.targetMode || (
      behaviorBase.category === 'defense' || behaviorBase.category === 'buff_self' ? 'self' : 'enemy'
    )) as string;

    if (ab.isTeamAbility && gameMode !== 'teams') {
      get().log(`⚠️ ${ab.name} solo en modo equipos`, 'system');
      return;
    }

    if (ab.isTeamAbility && !players.some(p => p.id !== cp.id && p.teamId === cp.teamId && p.isAlive)) {
      get().log(`⚠️ Sin aliados disponibles`, 'system');
      return;
    }

    const isEnemy = (p: Player) =>
      p.id !== cp.id && p.isAlive && (gameMode === 'ffa' || p.teamId !== cp.teamId);

    const isAlly = (p: Player) =>
      p.id !== cp.id && p.isAlive && gameMode === 'teams' && p.teamId === cp.teamId;

    const mentionsAll = text.includes('todos') || text.includes('todas') || text.includes('área') || text.includes('area');
    const mentionsAllies = text.includes('aliados') || text.includes('equipo');
    const mentionsEnemies = text.includes('enemigos') || text.includes('rivales');

    let area = behaviorBase.area || 'single';
    if (behaviorBase.targetMode === 'all_enemies' || (ab as any).canTarget === 'all_enemies' || (ab as any).targetMode === 'all_enemies') area = 'all_enemies';
    if (behaviorBase.targetMode === 'all_allies' || (ab as any).canTarget === 'all_allies' || (ab as any).targetMode === 'all_allies') area = 'all_allies';
    if (behaviorBase.targetMode === 'all_allies_no_self' || (ab as any).canTarget === 'all_allies_no_self' || (ab as any).targetMode === 'all_allies_no_self') area = 'all_allies_no_self';
    if (area === 'single' && mentionsAll && mentionsEnemies) area = 'all_enemies';
    if (area === 'single' && mentionsAll && mentionsAllies) area = 'all_allies';

    let targets: Player[] = [];

    if (behaviorBase.category === 'defense' || behaviorBase.category === 'buff_self' || canTarget === 'self') {
      targets = [cp];
    } else if (area === 'all_enemies') {
      targets = players.filter(isEnemy);
    } else if (area === 'all_allies') {
      targets = players.filter(p => p.isAlive && (p.id === cp.id || (gameMode === 'teams' && p.teamId === cp.teamId)));
    } else if (area === 'all_allies_no_self') {
      targets = players.filter(isAlly);
    } else if (area === 'all_allies_or_self') {
      targets = players.filter(p => p.isAlive && (p.id === cp.id || (gameMode === 'teams' && p.teamId === cp.teamId)));
    } else {
      const tgt = players.find(p => p.id === targetId);
      if (!tgt || !tgt.isAlive) {
        get().log(`⚠️ Selecciona un objetivo válido primero`, 'system');
        return;
      }

      if (canTarget === 'enemy' && !isEnemy(tgt)) {
        get().log(`⚠️ ${ab.name} necesita un enemigo`, 'system');
        return;
      }

      if (canTarget === 'ally' && !isAlly(tgt)) {
        get().log(`⚠️ ${ab.name} necesita un aliado`, 'system');
        return;
      }

      targets = [tgt];
    }

    if (!targets.length) {
      get().log(`⚠️ ${ab.name} no encontró objetivos válidos`, 'system');
      return;
    }

    // Extraer números de la descripción. Mantiene compatibilidad con mods actuales.
    let dmg = 0;
    let heal = 0;
    let defChange = 0;

    const dm = ab.description.match(/([+-]?\d+)\s*daño/i);
    const hm = ab.description.match(/(?:cura|curar|sana|sanar|\+)?\s*([+-]?\d+)\s*HP/i);
    const dfm = ab.description.match(/([+-]?\d+)\s*(?:defensa|def)/i);

    if (dm) dmg = Math.abs(parseInt(dm[1]));
    if (hm) heal = Math.abs(parseInt(hm[1]));
    if (dfm) defChange = parseInt(dfm[1]);

    // Valores explícitos de habilidades custom creadas en DevBuild/ModdingTools.
    // Si vienen definidos en la habilidad, tienen prioridad sobre la inferencia por texto.
    if (abDamage > 0) dmg = abDamage;
    if (abHealing > 0) heal = abHealing;
    if (abDefense !== 0) defChange = abDefense;

    // Inferencia suave si la habilidad sólo declara effect/category.
    if (behaviorBase.effect === 'damage' && dmg === 0) dmg = Math.max(100, abDamage || 0);
    if (behaviorBase.effect === 'heal' && heal === 0) heal = Math.max(100, abHealing || 0);
    if (behaviorBase.effect === 'defense' && defChange === 0) defChange = abDefense || 40;
    if (behaviorBase.effect === 'buff' && defChange === 0 && abDefense !== 0) defChange = abDefense;

    if (dmg > 0 && cp.characterId === 'mago') dmg = Math.floor(dmg * 1.15);

    const ignoresDefense =
      !!behaviorBase.ignoresDefense ||
      text.includes('ignora defensa') ||
      text.includes('ignora la defensa') ||
      text.includes('daño verdadero') ||
      text.includes('true damage');

    const reflectAtEnd =
      !!behaviorBase.reflectAtEnd ||
      text.includes('refleja') ||
      text.includes('rebota') ||
      ab.name === 'Escudo Sagrado' ||
      ab.name === 'Kōsokudō' ||
      ab.name === 'Tetsu no Kōtei';

    // Cobrar cooldown sólo después de validar.
    set(s => ({
      players: s.players.map((p: Player) =>
        p.id === cp.id
          ? { ...p, abilityCooldowns: { ...p.abilityCooldowns, [abilityId]: ab.cooldown } }
          : p
      ),
    }));

    // Ability declarative effects runtime - Fase 4
    // Si una habilidad custom trae effects[], usa el mismo motor declarativo de cartas.
    // Esto permite damage/heal/defense_buff/armor_break/overheal/restore/cleanse/dispel/multi_target/etc.
    const abilityEffects = Array.isArray((ab as any).effects)
      ? ((ab as any).effects as any[]).filter(Boolean)
      : [];

    if (abilityEffects.length > 0) {
      const primaryTarget = targets[0] || cp;

      const defaultEffectTarget =
        area === 'all_enemies' ? 'all_enemies' :
        area === 'all_allies' ? 'all_allies' :
        area === 'all_allies_no_self' ? 'all_allies_no_self' :
        area === 'all_allies_or_self' ? 'all_allies' :
        undefined;

      const normalizedEffects = abilityEffects.map((effect: any) => ({
        ...effect,
        target: effect.target || defaultEffectTarget,
        sourceLabel: effect.sourceLabel || ab.name,
      }));

      const ctx: any = {
        attacker: cp,
        target: primaryTarget,
        players: get().players,
        currentTurn: get().globalTurnNumber || 1,
        cardsPlayedThisTurn: get().cardsPlayedThisTurn || 0,

        log: (message: string, type?: any) => get().log(message, type || 'ability'),

        random: () => Math.random(),

        applyDamage: (pid: string, amount: number, ignoreDef?: boolean) => {
          const liveTarget = get().players.find((p: Player) => p.id === pid);
          if (!liveTarget || !liveTarget.isAlive) return;

          const raw = Math.max(0, Number(amount || 0));
          const final = ignoreDef ? raw : mitigateDamage(liveTarget, raw);

          set(st => ({
            players: st.players.map((p: Player) =>
              p.id === pid
                ? { ...p, currentHp: Math.max(0, p.currentHp - final), isAlive: p.currentHp - final > 0 }
                : p
            ),
          }));

          if (final > 0) {
            get().addStat(cp.id, 'damageDealt', final);
            get().addStat(pid, 'damageReceived', final);
          }
        },

        applyHeal: (pid: string, amount: number) => {
          const heal = Math.max(0, Number(amount || 0));
          if (heal <= 0) return;

          set(st => ({
            players: st.players.map((p: Player) =>
              p.id === pid
                ? { ...p, currentHp: healWithOverheal(p, heal, []) }
                : p
            ),
          }));

          get().addStat(cp.id, 'healDone', heal);
          get().addStat(pid, 'healReceived', heal);
        },

        applyStatus: (pid: string, effect: any) => {
          const liveTarget = get().players.find((p: Player) => p.id === pid);
          if (!liveTarget) return;

          if (effect?._overheal) {
            const amount = Math.max(0, Number(effect.amount || effect.value || 0));
            const limitPct = Number(effect.overhealLimitPct || 150);

            set(st => ({
              players: st.players.map((p: Player) => {
                if (p.id !== pid) return p;

                const cap = Math.floor(p.maxHp * (limitPct / 100));
                return { ...p, currentHp: Math.min(cap, p.currentHp + amount) };
              }),
            }));

            get().log(`💖 ${ab.name}: sobrecuración +${amount} HP → ${liveTarget.name}`, 'heal');
            get().addStat(cp.id, 'healDone', amount);
            get().addStat(pid, 'healReceived', amount);
            return;
          }

          if (effect?._restoreOriginalHp) {
            const penaltyPct = Number(effect.defensePenaltyPct || 25);

            set(st => ({
              players: st.players.map((p: Player) => {
                if (p.id !== pid) return p;

                if (p.currentHp < p.maxHp) {
                  return { ...p, currentHp: p.maxHp };
                }

                const penalty = Math.floor(p.baseDefense * (penaltyPct / 100));
                return {
                  ...p,
                  currentDefense: Math.max(0, p.currentDefense - penalty),
                };
              }),
            }));

            get().log(`🫀 ${ab.name}: restauración original → ${liveTarget.name}`, 'system');
            return;
          }

          if (effect?._cleanse) {
            set(st => ({
              players: st.players.map((p: Player) =>
                p.id === pid
                  ? {
                      ...p,
                      activeEffects: p.activeEffects.filter((e: ActiveEffect) =>
                        e.value >= 0 &&
                        e.specialRules !== 'stunned' &&
                        e.specialRules !== 'silenced'
                      ),
                    }
                  : p
              ),
            }));

            get().log(`✨ ${ab.name}: limpia debuffs → ${liveTarget.name}`, 'buff');
            return;
          }

          if (effect?._dispel) {
            set(st => ({
              players: st.players.map((p: Player) =>
                p.id === pid
                  ? {
                      ...p,
                      activeEffects: p.activeEffects.filter((e: ActiveEffect) =>
                        e.value < 0 ||
                        e.specialRules === 'stunned' ||
                        e.specialRules === 'silenced'
                      ),
                    }
                  : p
              ),
            }));

            get().log(`🧹 ${ab.name}: disipa buffs → ${liveTarget.name}`, 'debuff');
            return;
          }

          applyOrStackStatusEffect(set, get, pid, {
            id: effect?.id || uid(),
            name: effect?.name || effect?.label || ab.name,
            value: Number(effect?.value ?? effect?.amount ?? 0),
            timing: effect?.timing || effect?.effectTiming || 'immediate',
            duration: Number(effect?.duration || 1),
            stacks: Number(effect?.stacks || 1),
            sourcePlayerId: cp.id,
            targetPlayerId: pid,
            isStackable: Boolean(effect?.isStackable || effect?.stackKey),
            ignoresDefense: Boolean(effect?.ignoresDefense),
            description: effect?.description || ab.description || '',
            specialRules: effect?.specialRules || effect?.rule || effect?.kind,
            modifier: effect?.modifier,
          } as any);
        },

        requestChoice: async (choices: any[]) => {
          return new Promise<number>(resolve => {
            set({ cardChoiceRequest: { choices, resolve } } as any);
          });
        },
      };

      await applyEffects(normalizedEffects as any, ctx as any);

      get().log(`✨ ${ab.name}: efectos declarativos aplicados (${normalizedEffects.length})`, 'ability');
      return;
    }

    // MODIFICADOR DE COMBATE DE TURNO:
    // x2/x3, +daño al total, perforar armadura, convertir daño a ignora defensa.
    // No aplica daño ahora; modifica pendingActions justo antes de resolver.
    const turnModifier = inferTurnCombatModifier(ab as any, behaviorBase, text, dmg);

    if (turnModifier) {
      const modifierTargetId =
        canTarget === 'enemy' && targets[0]?.id
          ? targets[0].id
          : '*';

      const e: ActiveEffect = {
        id: uid(),
        name: `⚙️ ${ab.name}`,
        value: Number(turnModifier.multiplier || turnModifier.bonusDamage || turnModifier.pierceDamage || 0),
        timing: 'end_of_turn',
        duration: 1,
        stacks: 1,
        sourcePlayerId: cp.id,
        targetPlayerId: cp.id,
        isStackable: true,
        ignoresDefense: !!turnModifier.convertAllToIgnore,
        description: ab.description,
        specialRules: 'turn_combat_modifier',
        modifier: {
          ...turnModifier,
          targetId: modifierTargetId,
        } as any,
      } as any;

      set(s => ({
        players: s.players.map((p: Player) =>
          p.id === cp.id ? { ...p, activeEffects: [...p.activeEffects, e] } : p
        ),
      }));

      const parts = [
        turnModifier.bonusDamage ? `+${turnModifier.bonusDamage} daño total` : null,
        turnModifier.pierceDamage ? `+${turnModifier.pierceDamage} daño perforante` : null,
        turnModifier.multiplier ? `x${turnModifier.multiplier} al total` : null,
        turnModifier.convertAllToIgnore ? `todo ignora defensa` : null,
      ].filter(Boolean).join(' · ');

      get().log(`⚙️ ${cp.name} preparó ${ab.name}: ${parts || 'modificador de combate'}`, 'ability');
      return;
    }

    // DEFENSE: se arma; NO aplica ahora.
    if (behaviorBase.category === 'defense') {
      const shieldValue = defChange || (reflectAtEnd ? 0 : 40);
      const e: ActiveEffect = {
        id: uid(),
        name: `🛡️ ${ab.name}`,
        value: shieldValue,
        timing: 'on_damage_taken',
        duration: 2,
        stacks: 1,
        sourcePlayerId: cp.id,
        targetPlayerId: cp.id,
        isStackable: false,
        ignoresDefense: false,
        description: ab.description,
        specialRules: reflectAtEnd ? 'armed_reflect' : 'armed_defense',
      };

      set(s => ({
        players: s.players.map((p: Player) =>
          p.id === cp.id ? { ...p, activeEffects: [...p.activeEffects, e] } : p
        ),
      }));

      get().log(`🛡️ ${cp.name} arma ${ab.name}; se activará al recibir daño`, 'defense');
      get().checkWin();
      return;
    }

    // END_TURN: se guarda en los objetivos y se aplica al final del turno del usuario.
    if (behaviorBase.category === 'end_turn') {
      targets.forEach(tgt => {
        const value =
          behaviorBase.effect === 'heal' ? Math.abs(heal || 100) :
          behaviorBase.effect === 'defense' ? Math.abs(defChange || 40) :
          -(Math.abs(dmg || 100));

        const e: ActiveEffect = {
          id: uid(),
          name: `⏳ ${ab.name}`,
          value,
          timing: 'end_of_turn',
          duration: 1,
          stacks: 1,
          sourcePlayerId: cp.id,
          targetPlayerId: tgt.id,
          isStackable: true,
          ignoresDefense,
          description: ab.description,
          specialRules: reflectAtEnd ? 'deferred_reflect' : 'deferred_ability',
        };

        set(s => ({
          players: s.players.map((p: Player) =>
            p.id === tgt.id ? { ...p, activeEffects: [...p.activeEffects, e] } : p
          ),
        }));
      });

      get().log(`⏳ ${cp.name} prepara ${ab.name}; se aplicará al final del turno (${targets.length} objetivo(s))`, 'ability');
      get().checkWin();
      return;
    }

    // INSTANT / BUFF_SELF: aplica ahora.
    get().log(`✨ ${cp.name} usó ${ab.name} → ${targets.map(t => t.name).join(', ')}`, 'ability');

    targets.forEach(tgt => {
      if (dmg > 0 && behaviorBase.effect === 'damage') {
        const finalDmg = ignoresDefense ? dmg : mitigateDamage(tgt, dmg);
        set(s => ({
          players: s.players.map((p: Player) =>
            p.id === tgt.id
              ? { ...p, currentHp: Math.max(0, p.currentHp - finalDmg), isAlive: p.currentHp - finalDmg > 0 }
              : p
          ),
        }));
        get().log(`💥 ${ab.name}: -${finalDmg} HP → ${tgt.name}${ignoresDefense ? ' (ignora defensa)' : ''}`, 'damage');
        get().addStat(cp.id, 'damageDealt', finalDmg);
        get().addStat(tgt.id, 'damageReceived', finalDmg);
      }

      if (heal > 0 && behaviorBase.effect === 'heal') {
        const finalHeal = (tgt.characterId === 'sanador' || tgt.characterId === 'medico') ? Math.floor(heal * 1.25) : heal;
        set(s => ({
          players: s.players.map((p: Player) =>
            p.id === tgt.id ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + finalHeal) } : p
          ),
        }));
        get().log(`💚 ${ab.name}: +${finalHeal} HP → ${tgt.name}`, 'heal');
        get().addStat(cp.id, 'healDone', finalHeal);
        get().addStat(tgt.id, 'healReceived', finalHeal);
      }

      if (defChange !== 0 && (behaviorBase.effect === 'defense' || behaviorBase.category === 'buff_self')) {
        const e: ActiveEffect = {
          id: uid(),
          name: `${ab.name} (${defChange > 0 ? '+' : ''}${defChange} def)`,
          value: defChange,
          timing: 'immediate',
          duration: 2,
          stacks: 1,
          sourcePlayerId: cp.id,
          targetPlayerId: tgt.id,
          isStackable: false,
          ignoresDefense: false,
          description: ab.description,
          specialRules: reflectAtEnd ? 'reflect' : undefined,
        };

        set(s => ({
          players: s.players.map((p: Player) =>
            p.id === tgt.id
              ? {
                  ...p,
                  currentDefense: Math.max(p.baseDefense, p.currentDefense + defChange),
                  activeEffects: [...p.activeEffects, e],
                }
              : p
          ),
        }));
        get().log(`🛡️ ${ab.name}: ${defChange > 0 ? '+' : ''}${defChange} def → ${tgt.name}`, 'defense');
      }

      // Debuffs especiales declarativos por nombre/descripcion.
      if (behaviorBase.effect === 'debuff' || text.includes('silencio') || text.includes('aturd')) {
        if (text.includes('silencio')) {
          const e: ActiveEffect = {
            id: uid(), name: 'Silenciado', value: 0, timing: 'immediate', duration: 2,
            stacks: 1, sourcePlayerId: cp.id, targetPlayerId: tgt.id,
            isStackable: false, ignoresDefense: false, description: 'Sin habilidades',
            specialRules: 'silenced',
          };
          set(s => ({ players: s.players.map((p: Player) => p.id === tgt.id ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
          get().log(`🤐 ${tgt.name} silenciado`, 'debuff');
        }

        if (text.includes('aturd')) {
          const e: ActiveEffect = {
            id: uid(), name: 'Aturdido', value: 0, timing: 'start_of_turn', duration: 1,
            stacks: 1, sourcePlayerId: cp.id, targetPlayerId: tgt.id,
            isStackable: false, ignoresDefense: false, description: 'Pierde turno',
            specialRules: 'stunned',
          };
          set(s => ({ players: s.players.map((p: Player) => p.id === tgt.id ? { ...p, activeEffects: [...p.activeEffects, e] } : p) }));
          get().log(`😵 ${tgt.name} aturdido`, 'debuff');
        }
      }
    });

    get().checkWin();
  },

  executeAction(preview) {
    const { players, rules } = get();
    const { targetId, netDamage, dotApplied } = preview;
    const target = players.find(p => p.id === targetId);
    if (!target) { set({ phase: 'playing' }); return; }

    const defCards = target.hand.filter(c =>
      c.type === 'defense' || (rules.allowInstantCards && c.isInstant && (c.effectTiming === 'on_damage_taken' || c.type === 'dodge'))
    );

    if ((netDamage > 0 || dotApplied.length > 0) && defCards.length > 0 && target.control === 'human') {
      set({
        phase: 'defending', resolutionPreview: preview,
        defensePhase: {
          attackerId: preview.attackerId, targetId,
          pendingDamage: netDamage, pendingDots: dotApplied,
          dodged: false, multiplierApplied: 1,
        },
      });
    } else if (target.control === 'bot' && defCards.length > 0 && Math.random() > 0.6) {
      const defCard = defCards[0];
      get().log(`🤖 ${target.name} juega ${defCard.name}`, 'instant');
      set({
        phase: 'defending', resolutionPreview: preview,
        defensePhase: {
          attackerId: preview.attackerId, targetId,
          pendingDamage: netDamage, pendingDots: dotApplied,
          dodged: false, multiplierApplied: 1,
        },
      });
      setTimeout(() => get().defendWithCard(defCard.id), 800);
    } else {
      set({ resolutionPreview: preview });
      get().applyResolved();
    }
  },

  defendWithCard(cardId) {
    const { players, defensePhase, defenseChainDepth, maxChainDepth } = get();
    if (!defensePhase) return;
    
    // FIX: aplicar límite de cadena de defensa
    if (defenseChainDepth >= maxChainDepth) {
      get().log(`⚠️ Cadena de defensa máxima alcanzada`, 'system');
      get().skipDefense();
      return;
    }
    
    const defender = players.find(p => p.id === defensePhase.targetId);
    if (!defender) { get().skipDefense(); return; }
    const card = defender.hand.find(c => c.id === cardId);
    if (!card) { get().skipDefense(); return; }

    set(s => ({
      players: s.players.map(p => p.id === defender.id ? { ...p, hand: p.hand.filter(c => c.id !== cardId) } : p),
      deck: { cards: [...s.deck.cards, card] },
      defenseChainDepth: defenseChainDepth + 1,
    }));
    get().refillHand(defender.id);

    if (card.type === 'dodge') {
      get().log(`💨 ${defender.name} esquivó con ${card.name}!`, 'instant');
      set({ phase: 'playing', defensePhase: undefined, resolutionPreview: undefined, selectedCardIds: [], selectedTargetId: null });
      if (get().isResolvingEndTurn) setTimeout(() => get().resolveNextAction(), 350);
      return;
    }
    // ═══════════════════════════════════════════════════════════
    // 🔄 CARTAS DE CONTRAATAQUE → INICIAN UNA CADENA DE DEFENSA
    // ═══════════════════════════════════════════════════════════
    // En lugar de aplicar el daño rebotado directamente, ahora el
    // ATACANTE ORIGINAL pasa a ser defensor y puede responder con
    // su propia carta de defensa/contraataque. Esto crea un bucle
    // que continúa hasta que:
    //   1. Un jugador no tiene cartas de defensa, o
    //   2. Se alcanza maxChainDepth (anti-bucle infinito), o
    //   3. Alguien decide recibir el daño.
    const counterMultiplier =
      card.type === 'counter' || card.id.includes('contra_total') ? (card.value || 5) :
      card.id.includes('represalia') ? 3 :
      card.id.includes('contraataque') ? 2 : 0;

    if (counterMultiplier > 0) {
      const bounce = defensePhase.pendingDamage * counterMultiplier;
      const newAttackerId = defender.id;        // el que contraatacó ahora "ataca"
      const newTargetId = defensePhase.attackerId; // el atacante original ahora defiende
      const newTarget = get().players.find(p => p.id === newTargetId);

      get().log(`🔄 ${defender.name} contraataca x${counterMultiplier} (${bounce} dmg) → cadena de defensa nivel ${defenseChainDepth + 1}`, 'instant');

      // ¿El nuevo objetivo puede responder y no excede la profundidad?
      const newTargetDefCards = newTarget?.hand.filter(c =>
        c.type === 'defense' || (c.isInstant && (c.effectTiming === 'on_damage_taken' || c.type === 'dodge'))
      ) ?? [];

      const canChain = newTarget && newTargetDefCards.length > 0 && defenseChainDepth + 1 < maxChainDepth;

      if (canChain) {
        // Iniciar nueva fase de defensa con los roles invertidos
        const newDefPhase = {
          attackerId: newAttackerId,
          targetId: newTargetId,
          pendingDamage: bounce,
          pendingDots: [],
          dodged: false,
          multiplierApplied: counterMultiplier,
        };
        // Preview para mostrar la carta del contraataque
        set({
          phase: 'defending',
          defensePhase: newDefPhase,
          resolutionPreview: {
            attackerId: newAttackerId, targetId: newTargetId, cards: [card],
            rawDamage: bounce, rawHeal: 0, netDamage: bounce, defenseReduction: 0,
            dotApplied: [], type: 'cards',
          },
          selectedCardIds: [], selectedTargetId: null,
        });

        // Si el nuevo defensor es un bot, decide automáticamente
        if (newTarget!.control === 'bot') {
          setTimeout(() => {
            const st = get();
            if (st.phase !== 'defending' || st.defensePhase?.targetId !== newTargetId) return;
            const dc = newTarget!.hand.filter(c => c.type === 'defense' || (c.isInstant && (c.effectTiming === 'on_damage_taken' || c.type === 'dodge')));
            if (dc.length > 0 && Math.random() > 0.5) {
              get().defendWithCard(dc[0].id);
            } else {
              get().skipDefense();
            }
          }, 900);
        }
        return;
      }

      // No se puede encadenar: aplicar el daño rebotado directo
      set(s => ({
        players: s.players.map((p: Player) => p.id === newTargetId ? { ...p, currentHp: Math.max(0, p.currentHp - bounce), isAlive: p.currentHp - bounce > 0 } : p),
        phase: 'playing', defensePhase: undefined, resolutionPreview: undefined,
        selectedCardIds: [], selectedTargetId: null, defenseChainDepth: 0,
      }));
      get().log(`💥 ${bounce} de daño rebotado a ${newTarget?.name}`, 'damage');
      get().checkWin();
      if (get().phase !== 'gameOver' && get().isResolvingEndTurn) setTimeout(() => get().resolveNextAction(), 350);
      return;
    }
    if (card.type === 'special' && card.id.includes('absorber')) {
      const healed = defensePhase.pendingDamage;
      get().log(`🌊 ${defender.name} absorbió ${healed} HP!`, 'instant');
      set(s => ({
        players: s.players.map((p: Player) => p.id === defender.id ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + healed) } : p),
        phase: 'playing', defensePhase: undefined, resolutionPreview: undefined, selectedCardIds: [], selectedTargetId: null,
      }));
      if (get().isResolvingEndTurn) setTimeout(() => get().resolveNextAction(), 350);
      return;
    }
    if (card.type === 'defense') {
      const newDmg = Math.max(0, defensePhase.pendingDamage - card.value);
      get().log(`🛡️ ${defender.name} usó ${card.name}: daño ${newDmg}`, 'defense');
      set(s => ({
        defensePhase: { ...defensePhase, pendingDamage: newDmg },
        players: s.players.map((p: Player) => p.id === defender.id ? { ...p, currentDefense: Math.max(p.baseDefense, p.currentDefense + card.value) } : p),
      }));
      get().addStat(defender.id, 'defensesUsed', 1);
      get().applyResolved();
      return;
    }
    get().skipDefense();
  },

  skipDefense() { 
    set({ phase: 'playing', defensePhase: undefined, defenseChainDepth: 0 }); 
    get().applyResolved(); 
  },

  addStat(playerId: string, stat: keyof PlayerStats, amount: number) {
    set(s => ({
      players: s.players.map((p: Player) => {
        if (p.id !== playerId) return p;

        const newStats = { ...p.stats } as any;
        newStats[stat] = Number(newStats[stat] || 0) + Number(amount || 0);

        return { ...p, stats: newStats };
      }),
    }));

    // Runtime passive events from addStat.
    // Centraliza cartas, habilidades, efectos, diferidos, DoT, curas, etc.
    if (Number(amount || 0) > 0) {
      if (stat === 'damageDealt') {
        applyRuntimePassiveEvent(set, get, 'on_damage_dealt', playerId);
      }

      if (stat === 'damageReceived') {
        applyRuntimePassiveEvent(set, get, 'on_damage_taken', playerId);
      }

      if (stat === 'healDone') {
        applyRuntimePassiveEvent(set, get, 'on_heal', playerId);
      }
    }
  },

  applyResolved() {
    const { resolutionPreview, players, defensePhase } = get();
    if (!resolutionPreview) { set({ phase: 'playing', resolutionPreview: undefined, defensePhase: undefined, selectedCardIds: [], selectedTargetId: null }); return; }

    const { attackerId, targetId, rawHeal, dotApplied, comboTriggered } = resolutionPreview;
    const atk = players.find(p => p.id === attackerId);
    const tgt = players.find(p => p.id === targetId);
    if (!tgt) { set({ phase: 'playing', resolutionPreview: undefined, defensePhase: undefined, selectedCardIds: [], selectedTargetId: null }); return; }

    let finalDamage = defensePhase?.pendingDamage ?? resolutionPreview.netDamage;

    // ── HABILIDAD DE DEFENSA ARMADA: se dispara al recibir daño ──
    // Si el objetivo armó una habilidad defensiva (Muro de Acero, etc),
    // ésta reduce/anula el daño y se consume.
    const armedDef = tgt.activeEffects.find(e => e.specialRules === 'armed_defense');
    if (armedDef && finalDamage > 0) {
      const reduced = Math.max(0, finalDamage - armedDef.value);
      get().log(`🛡️ ${armedDef.name.replace('🛡️ ', '')} se activa: ${finalDamage} → ${reduced} daño`, 'defense');
      finalDamage = reduced;
      // Consumir la habilidad armada
      set(s => ({ players: s.players.map((p: Player) => p.id === targetId ? { ...p, activeEffects: p.activeEffects.filter(e => e.id !== armedDef.id) } : p) }));
      get().addStat(targetId, 'defensesUsed', 1);
    }

    let mitigated = mitigateDamage(tgt, finalDamage);

    const { rules } = get();
    let wasCrit = false;
    if (mitigated > 0 && Math.random() * 100 < rules.criticalChance) {
      mitigated = Math.floor(mitigated * rules.criticalMultiplier);
      wasCrit = true;
      if (atk) get().addStat(atk.id, 'critsLanded', 1);
    }

    const blocked = mitigated === 0 && finalDamage > 0;

    if (mitigated > 0 || rawHeal > 0) {
      set(s => ({
        players: s.players.map((p: Player) => {
          if (p.id === targetId && mitigated > 0) {
            const newHp = Math.max(0, p.currentHp - mitigated);
            return { ...p, currentHp: newHp, isAlive: newHp > 0 };
          }
          if (p.id === targetId && rawHeal > 0 && targetId === attackerId) return { ...p, currentHp: healWithOverheal(p, rawHeal, resolutionPreview.cards || []) };
          if (p.id === attackerId && rawHeal > 0 && targetId !== attackerId) return { ...p, currentHp: healWithOverheal(p, rawHeal, resolutionPreview.cards || []) };
          return p;
        }),
      }));
      if (blocked) {
        get().log(`🛡️ ${tgt.name} BLOQUEÓ el ataque!`, 'defense');
      } else if (wasCrit) {
        get().log(`💥 ¡CRÍTICO! ${atk?.name} → ${tgt.name}: -${mitigated} HP (x${rules.criticalMultiplier})`, 'crit');
      } else if (mitigated > 0) {
        get().log(`⚔️ ${atk?.name} → ${tgt.name}: -${mitigated} HP`, 'damage');
      }
      if (rawHeal > 0) {
        get().log(`💚 Curación: +${rawHeal} HP`, 'heal');
        if (atk) get().addStat(atk.id, 'healDone', rawHeal);
        get().addStat(targetId, 'healReceived', rawHeal);
      }
    }
    if (mitigated > 0 && atk) {
      get().addStat(atk.id, 'damageDealt', mitigated);
      get().addStat(targetId, 'damageReceived', mitigated);
    }
    if (atk && resolutionPreview.cards.length > 0) {
      get().addStat(atk.id, 'cardsPlayed', resolutionPreview.cards.length);
    }

    dotApplied.forEach(dot => {
      const timing = (dot.name.toLowerCase().includes('fuego') || dot.name.toLowerCase().includes('quem')) ? 'end_of_turn' : 'start_of_turn';
      const e: ActiveEffect = {
        id: uid(),
        name: dot.name,
        value: dot.value,
        timing,
        duration: dot.duration,
        stacks: 1,
        sourcePlayerId: attackerId,
        targetPlayerId: targetId,
        isStackable: true,
        ignoresDefense: dot.ignoresDefense,
        description: dot.name,
        tags: [dot.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')],
      };
      applyOrStackStatusEffect(set, get, targetId, e);
      get().log(`☠️ ${tgt.name} recibió ${dot.name} (${dot.value}/t x${dot.duration})`, 'dot');
      if (atk) get().addStat(atk.id, 'dotsApplied', 1);
    });

    if (comboTriggered) get().log(`🎉 ¡COMBO ${comboTriggered}!`, 'combo');

    const tgtAfter = get().players.find(p => p.id === targetId);
    if (tgtAfter && !tgtAfter.isAlive && tgt?.isAlive) {
      if (atk) get().addStat(atk.id, 'kills', 1);
      get().log(`💀 ${atk?.name} eliminó a ${tgt.name}!`, 'kill');
    }

    set({ phase: 'playing', resolutionPreview: undefined, defensePhase: undefined, selectedCardIds: [], selectedTargetId: null });
    get().checkWin();
    if (get().phase !== 'gameOver' && get().isResolvingEndTurn) setTimeout(() => get().resolveNextAction(), 350);
  },

  processStartEffects() {
    const { players, currentPlayerIndex } = get();
    const cp = players[currentPlayerIndex];
    if (!cp) return;

    const stun = cp.activeEffects.find(e => e.specialRules === 'stunned');
    if (stun) {
      get().log(`😵 ${cp.name} aturdido, pierde turno!`, 'system');
      set(s => ({ players: s.players.map((p: Player) => p.id === cp.id ? { ...p, activeEffects: p.activeEffects.filter(e => e.id !== stun.id) } : p) }));
      setTimeout(() => get().endTurn(), 1200);
      return;
    }

    const startFx = cp.activeEffects.filter(e => e.timing === 'start_of_turn' && e.value < 0);
    let totalDot = 0;
    startFx.forEach(e => { const v = Math.abs(e.value) * e.stacks; totalDot += v; get().log(`  ☠️ ${e.name} → ${cp.name}: -${v}`, 'dot'); });
    if (totalDot > 0) {
      set(s => ({ players: s.players.map((p: Player) => p.id === cp.id ? { ...p, currentHp: Math.max(0, p.currentHp - totalDot), isAlive: p.currentHp - totalDot > 0 } : p) }));
    }

    const regenFx = cp.activeEffects.filter(e => e.timing === 'start_of_turn' && e.value > 0);
    let totalRegen = 0;
    regenFx.forEach(e => { const v = e.value * e.stacks; totalRegen += v; get().log(`  💚 ${e.name} → ${cp.name}: +${v} HP`, 'heal'); });
    if (totalRegen > 0) {
      set(s => ({ players: s.players.map((p: Player) => p.id === cp.id ? { ...p, currentHp: healWithOverheal(p, totalRegen, []) } : p) }));
    }

    if (cp.characterId === 'druida' && cp.isAlive) {
      set(s => ({ players: s.players.map((p: Player) => p.id === cp.id ? { ...p, currentHp: healWithOverheal(p, 30, []) } : p) }));
      get().log(`  🌿 Regeneración natural: +30 HP`, 'heal');
    }

    // Explorador: roba carta extra al inicio
    if (cp.characterId === 'explorador' && cp.isAlive) {
      const nc = get().deck.cards.slice(0, 1);
      const rem = get().deck.cards.slice(1);
      set(s => ({
        deck: { cards: rem },
        players: s.players.map((p: Player) => p.id === cp.id ? { ...p, hand: [...p.hand, ...nc] } : p),
      }));
      get().log(`  🔍 ${cp.name} descubre una carta extra`, 'utility');
    }

    set(s => ({
      players: s.players.map((p: Player) =>
        p.id === cp.id ? { ...p, activeEffects: p.activeEffects.map(e => ({ ...e, duration: e.duration > 0 ? e.duration - 1 : e.duration })).filter(e => e.duration !== 0) } : p
      ),
    }));
    get().checkWin();
  },

  // ── EFECTOS DE FIN DE TURNO ───────────────────────────────
  // Procesa:
  //   1. DoTs de fuego/quemadura (end_of_turn) en el jugador actual
  //   2. Habilidades DIFERIDAS (deferred_ability) que el jugador actual
  //      lanzó este turno y se aplican ahora a sus objetivos
  processEndEffects() {
      // Runtime passives: end_of_turn
      {
        const __rt = get();
        const __cp = __rt.players?.[__rt.currentPlayerIndex];
        if (__cp?.id) {
          applyRuntimeCharacterPassives(set, get, 'end_of_turn', __cp.id);
        }
      }

    const { players, currentPlayerIndex } = get();
    const cp = players[currentPlayerIndex];
    if (!cp) return;

    // 1) DoTs end_of_turn sobre el jugador actual (fuego, quemadura propia)
    const ownEndFx = cp.activeEffects.filter(e => e.timing === 'end_of_turn' && e.specialRules !== 'deferred_ability');
    let totalBurn = 0;
    ownEndFx.forEach(e => { const v = Math.abs(e.value) * e.stacks; totalBurn += v; get().log(`  🔥 ${e.name} → ${cp.name}: -${v}`, 'dot'); });
    if (totalBurn > 0) {
      set(s => ({ players: s.players.map((p: Player) => p.id === cp.id ? { ...p, currentHp: Math.max(0, p.currentHp - totalBurn), isAlive: p.currentHp - totalBurn > 0 } : p) }));
    }

    // 2) Habilidades diferidas lanzadas por el jugador actual → aplican ahora
    get().players.forEach(p => {
      const deferred = p.activeEffects.filter(e => (e.specialRules === 'deferred_ability' || e.specialRules === 'deferred_reflect') && e.sourcePlayerId === cp.id);
      deferred.forEach(e => {
        if (e.value < 0) {
          const target = get().players.find(x => x.id === p.id);
          if (!target) return;
          const raw = Math.abs(e.value);
          const dmg = e.ignoresDefense ? raw : mitigateDamage(target, raw);
          set(s => ({ players: s.players.map((pl: Player) => pl.id === p.id ? { ...pl, currentHp: Math.max(0, pl.currentHp - dmg), isAlive: pl.currentHp - dmg > 0 } : pl) }));
          get().log(`⏳ ${e.name.replace('⏳ ', '')} se activa → ${p.name}: -${dmg} HP${e.ignoresDefense ? ' (ignora defensa)' : ''}`, 'ability');
          get().addStat(cp.id, 'damageDealt', dmg);
        } else if (e.value > 0) {
          set(s => ({ players: s.players.map((pl: Player) => pl.id === p.id ? { ...pl, currentHp: healWithOverheal(pl, e.value, []) } : pl) }));
          get().log(`⏳ ${e.name.replace('⏳ ', '')} se activa → ${p.name}: +${e.value} HP`, 'heal');
        }
      });
      // Remover las diferidas ya aplicadas
      if (deferred.length > 0) {
        set(s => ({ players: s.players.map((pl: Player) => pl.id === p.id ? { ...pl, activeEffects: pl.activeEffects.filter(e => !((e.specialRules === 'deferred_ability' || e.specialRules === 'deferred_reflect') && e.sourcePlayerId === cp.id)) } : pl) }));
      }
    });

    get().checkWin();
  },

  refillHand(playerId) {
    const { players, deck, rules } = get();
    const p = players.find(x => x.id === playerId);
    if (!p) return;
    const needed = rules.maxHandSize - p.hand.length;
    if (needed <= 0) return;
    let cardsToDraw = deck.cards;
    if (cardsToDraw.length < needed) {
      cardsToDraw = shuffle(cardsToDraw);
    }
    const newCards = cardsToDraw.slice(0, needed);
    const remaining = cardsToDraw.slice(needed);
    set(s => ({ deck: { cards: remaining }, players: s.players.map((x: Player) => x.id === playerId ? { ...x, hand: [...x.hand, ...newCards] } : x) }));
  },

  checkWin() {
    const { players, gameMode } = get();
    const alive = players.filter(p => p.isAlive);
    if (gameMode === 'ffa' && alive.length <= 1) {
      set({ winner: alive[0]?.id ?? null, phase: 'gameOver' });
      get().log(`🏆 ¡${alive[0]?.name ?? 'Nadie'} gana!`, 'victory');
    }
    if (gameMode === 'teams') {
      const teams = new Set(alive.map(p => p.teamId).filter(Boolean));
      if (teams.size <= 1) {
        set({ winner: Array.from(teams)[0] ?? null, phase: 'gameOver' });
        get().log(`🏆 ¡Equipo ${Array.from(teams)[0]} gana!`, 'victory');
      }
    }
  },

  // ── REDUCIR COOLDOWNS POR JUGADOR ──────────────────────────
  // Se llama en cada ronda global (cuando todos jugaron). Reduce
  // 1 turno todos los cooldowns activos de cada jugador.
  reduceCooldowns() {
    set(s => ({
      players: s.players.map((p: Player) => {
        const newCds: Record<string, number> = {};
        for (const [abId, cd] of Object.entries(p.abilityCooldowns)) {
          const reduced = Math.max(0, (cd as number) - 1);
          if (reduced > 0) newCds[abId] = reduced; // solo guardar los que siguen en CD
        }
        return { ...p, abilityCooldowns: newCds };
      }),
    }));
  },

  async executeBotTurn() {
    const { players, currentPlayerIndex } = get();
    const bot = players[currentPlayerIndex];
    if (!bot || bot.control !== 'bot' || !bot.isAlive) return;
    const diff = bot.botDifficulty ?? 'normal';
    get().log(`🤖 ${bot.name} (${diff})`, 'system');
    await delay(700);

    // ── BOT: usa una habilidad si está disponible (dificultad normal/hard) ──
    if (diff !== 'easy') {
      const char = getAllCharactersWithSource().find(c => c.id === bot.characterId);
      const enemies = get().players.filter(p => p.isAlive && p.id !== bot.id && (get().gameMode === 'ffa' || p.teamId !== bot.teamId));
      if (char && enemies.length > 0) {
        const readyAbilities = char.abilities.filter(a =>
          (bot.abilityCooldowns?.[a.id] || 0) === 0 &&
          !a.isTeamAbility // bots no usan habilidades de equipo (complejidad)
        );
        if (readyAbilities.length > 0 && Math.random() < (diff === 'hard' ? 0.7 : 0.4)) {
          const ab = readyAbilities[Math.floor(Math.random() * readyAbilities.length)];
          const tgt = enemies[Math.floor(Math.random() * enemies.length)];
          get().useAbility(ab.id, tgt.id);
          await delay(500);
        }
      }
    }

    const dec = botDecide(bot, get(), diff);
    if (dec.action === 'play_cards' && dec.cardIds && dec.targetId) {
      get().prepareAction(dec.cardIds, dec.targetId);
      await delay(600);
      if (get().phase === 'defending') {
        await delay(3000);
        if (get().phase === 'defending') get().skipDefense();
        await delay(300);
      }
    }
    if (get().canUseBasicAttack && Math.random() > 0.4) {
      const enemies = get().players.filter(p => p.isAlive && p.id !== bot.id && (get().gameMode === 'ffa' || p.teamId !== bot.teamId));
      if (enemies.length) {
        const tgt = enemies[Math.floor(Math.random() * enemies.length)];
        get().prepareBasicAttack(tgt.id);
        await delay(500);
        if (get().phase === 'defending') {
          await delay(3000);
          if (get().phase === 'defending') get().skipDefense();
          await delay(200);
        }
      }
    }
    if (get().phase !== 'gameOver') get().endTurn();
  },

  isBot() { const { players, currentPlayerIndex } = get(); return players[currentPlayerIndex]?.control === 'bot'; },

  log(msg, type = 'system') { set(s => ({ gameLog: [...s.gameLog, { message: msg, type, ts: Date.now() }] as any })); },

  reset() { set({ ...INIT, revealedHands: new Set(), gameLog: [] }); },

  setVisualConfig(config) {
    set(state => {
      const newConfig = { ...state.visualConfig, ...config };
      // Persiste en disco (Tauri) + disco compartido
      writePersistedJSON('visualConfig', newConfig);
      return { visualConfig: newConfig };
    });
  },

  resetVisualConfig() {
    const config = DEFAULT_VISUAL_CONFIG;
    writePersistedJSON('visualConfig', config);
    set({ visualConfig: config });
  },

  getVisualConfig() { return get().visualConfig; },
}));

// Inicializar configuración visual guardada (desde caché de persistencia).
// loadPersistedData() en App.tsx puebla la caché desde disco antes de esto.
try {
  const savedConfig = readPersistedJSON<any>('visualConfig', null);
  const parsed = savedConfig;
  if (parsed) {
    useGameStore.getState().setVisualConfig(parsed);
  }
} catch {}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
