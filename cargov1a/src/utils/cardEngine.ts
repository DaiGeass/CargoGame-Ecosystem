// ============================================================
// MOTOR DE CÁLCULO DE CARTAS
// ============================================================
// Centraliza cómo una carta contribuye al combate para evitar bugs
// de cálculo en múltiples sitios del store.
//
// OBJETIVOS:
//   - Evitar doble descuento de defensa
//   - Separar daño normal vs daño que ignora defensa
//   - Evitar que DoTs hagan daño inmediato por error
//   - Permitir fusionar ataque básico + varias cartas correctamente
//   - Hacer más fácil crear cartas nuevas / mods
//
// REGLA IMPORTANTE:
//   Una carta `damage_over_time` por defecto SOLO aplica DoT.
//   Si quieres una carta que haga daño inmediato + DoT,
//   usa `effects[]` (motor modular) o crea 2 efectos.
// ============================================================

import { PlayableCard, Player, ResolutionPreview } from '../types/game';
import { evalCardValue } from '../store/gameStore';

export interface DotContribution {
  name: string;
  value: number;
  duration: number;
  ignoresDefense: boolean;
}

export interface CardContribution {
  // Daño bruto total (normal + ignora defensa), solo para mostrar/logs
  rawDamage: number;
  // Parte del daño que SÍ interactúa con la defensa del objetivo
  normalDamage: number;
  // Parte del daño que ignora defensa completamente
  ignoreDefenseDamage: number;
  // Curación directa
  rawHeal: number;
  // Efectos DoT a aplicar al resolver
  dots: DotContribution[];
}

export const EMPTY_CONTRIBUTION: CardContribution = {
  rawDamage: 0,
  normalDamage: 0,
  ignoreDefenseDamage: 0,
  rawHeal: 0,
  dots: [],
};

export function getCardTags(card: PlayableCard): string[] {
  return [...(card.tags || []), ...(card.synergyTags || [])];
}

/**
 * Contribución base de una carta ANTES de pasivas/sinergias.
 *
 * - damage: daño inmediato
 * - heal: curación inmediata
 * - damage_over_time: SOLO DoT (sin daño inmediato) ← FIX BUG
 * - otras cartas: 0 (las maneja applyImmediateEffects o effects[])
 */
export function getBaseContribution(
  card: PlayableCard,
  attacker: Player,
  target: Player,
  turn: number,
  cardsPlayedThisTurn: number,
): CardContribution {
  const value = evalCardValue(card, attacker, target, turn, cardsPlayedThisTurn);

  // Las cartas modulares (`effects[]`) se resuelven por otro motor
  if (card.effects?.length) return EMPTY_CONTRIBUTION;

  if (card.type === 'damage') {
    const dmg = Math.abs(value);
    return {
      rawDamage: dmg,
      normalDamage: card.ignoresDefense ? 0 : dmg,
      ignoreDefenseDamage: card.ignoresDefense ? dmg : 0,
      rawHeal: 0,
      dots: [],
    };
  }

  if (card.type === 'heal') {
    return {
      rawDamage: 0,
      normalDamage: 0,
      ignoreDefenseDamage: 0,
      rawHeal: Math.abs(value),
      dots: [],
    };
  }

  if (card.type === 'damage_over_time') {
    // FIX: DoTs NO hacen daño inmediato por defecto.
    const dotValue = Math.abs(value);
    const dot: DotContribution = {
      name: card.name,
      value: -dotValue,
      duration: card.duration,
      ignoresDefense: card.ignoresDefense ?? true,
    };
    return {
      rawDamage: 0,
      normalDamage: 0,
      ignoreDefenseDamage: 0,
      rawHeal: 0,
      dots: [dot],
    };
  }

  return EMPTY_CONTRIBUTION;
}

/**
 * Combina dos contribuciones (útil para varias cartas contra el mismo target).
 */
export function mergeContribution(a: CardContribution, b: CardContribution): CardContribution {
  return {
    rawDamage: a.rawDamage + b.rawDamage,
    normalDamage: a.normalDamage + b.normalDamage,
    ignoreDefenseDamage: a.ignoreDefenseDamage + b.ignoreDefenseDamage,
    rawHeal: a.rawHeal + b.rawHeal,
    dots: [...a.dots, ...b.dots],
  };
}

/**
 * Convierte una contribución acumulada en un preview final contra un objetivo.
 *
 * La defensa se descuenta UNA sola vez sobre el total de daño normal.
 * El daño que ignora defensa entra completo.
 */
export function contributionToPreview(
  attackerId: string,
  target: Player,
  cards: PlayableCard[],
  contribution: CardContribution,
  comboTriggered?: string,
  type: ResolutionPreview['type'] = 'cards',
): ResolutionPreview & { normalDamage?: number; ignoreDefenseDamage?: number } {
  const defenseReduction = Math.min(target.currentDefense, contribution.normalDamage);
  const netDamage = Math.max(0, contribution.normalDamage - target.currentDefense) + contribution.ignoreDefenseDamage;

  return {
    attackerId,
    targetId: target.id,
    cards,
    rawDamage: contribution.rawDamage,
    rawHeal: contribution.rawHeal,
    netDamage,
    defenseReduction,
    dotApplied: contribution.dots,
    comboTriggered,
    type,
    normalDamage: contribution.normalDamage,
    ignoreDefenseDamage: contribution.ignoreDefenseDamage,
  };
}

/**
 * Fusiona un preview existente con una contribución nueva.
 * Recalcula netDamage correctamente sin sumar daños ya netos.
 */
export function mergePreviewWithContribution(
  existing: ResolutionPreview & { normalDamage?: number; ignoreDefenseDamage?: number },
  target: Player,
  newCards: PlayableCard[],
  add: CardContribution,
  comboTriggered?: string,
): ResolutionPreview & { normalDamage?: number; ignoreDefenseDamage?: number } {
  const totalNormal = (existing.normalDamage || 0) + add.normalDamage;
  const totalIgnore = (existing.ignoreDefenseDamage || 0) + add.ignoreDefenseDamage;
  const defenseReduction = Math.min(target.currentDefense, totalNormal);
  const netDamage = Math.max(0, totalNormal - target.currentDefense) + totalIgnore;

  return {
    ...existing,
    cards: [...existing.cards, ...newCards],
    rawDamage: existing.rawDamage + add.rawDamage,
    rawHeal: existing.rawHeal + add.rawHeal,
    netDamage,
    defenseReduction,
    dotApplied: [...existing.dotApplied, ...add.dots],
    comboTriggered: existing.comboTriggered ?? comboTriggered,
    normalDamage: totalNormal,
    ignoreDefenseDamage: totalIgnore,
  };
}

/**
 * Construye el preview del ataque básico.
 */
export function buildBasicAttackPreview(attacker: Player, target: Player): ResolutionPreview & { normalDamage?: number; ignoreDefenseDamage?: number } {
  const normalDamage = attacker.baseDamage;
  const defenseReduction = Math.min(target.currentDefense, normalDamage);
  const netDamage = Math.max(1, normalDamage - target.currentDefense);

  return {
    attackerId: attacker.id,
    targetId: target.id,
    cards: [],
    rawDamage: attacker.baseDamage,
    rawHeal: 0,
    netDamage,
    defenseReduction,
    dotApplied: [],
    type: 'basic_attack',
    normalDamage,
    ignoreDefenseDamage: 0,
  };
}
