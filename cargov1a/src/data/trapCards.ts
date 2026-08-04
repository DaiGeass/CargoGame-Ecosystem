// ============================================================
// 🪤 CARTAS TRAMPA — CATÁLOGO ESPECIALIZADO
// ============================================================
// Este archivo contiene cartas de tipo trampa, robo selectivo y
// mecánicas de "cementerio" (cartas eliminadas del mazo global).
//
// ════════════════════════════════════════════════════════════
// 🛠️ CÓMO AÑADIR UNA CARTA TRAMPA NUEVA
// ════════════════════════════════════════════════════════════
//
// 1. Añade aquí tu carta al array `trapCards`.
// 2. Si necesitas un nuevo efecto especial de tipo trampa:
//    - Añade 'trap_steal_specific' al array `specialRules`
//      en el ActiveEffect y trátalo en processStartEffects()
//    - O usa el efecto `custom` y registra un handler:
//      import { registerEffectHandler } from '../utils/effects';
//
// CONCEPTOS DISPONIBLES:
//   - Trampa reactiva: se activa cuando te atacan (on_damage_taken)
//   - Robo de carta específica: el jugador elige qué robar
//   - Cementerio: reserva de cartas "eliminadas" accesibles
//   - Trampa de robo de mazo: saca carta del mazo global
//   - Trampa de intercambio: cambia manos condicionalmente
//
// NOTA DE MECÁNICA DEL CEMENTERIO:
//   El "cementerio" en CARGAS es la pila de descarte (discardPile).
//   Por defecto las cartas vuelven al mazo, pero con las cartas de
//   cementerio puedes robar selectivamente desde discardPile.
//   Para habilitar esto el store expone:
//     - get().discardPile  → cartas descartadas
//     - put back in deck   → get().deck.cards.push(...)
// ════════════════════════════════════════════════════════════

import { PlayableCard } from '../types/game';

export const trapCards: PlayableCard[] = [

  // ══════════════════════════════════════════════════════════
  // TRAMPAS REACTIVAS (se activan al recibir daño)
  // ══════════════════════════════════════════════════════════

  {
    id: 'trampa_espinas',
    name: 'Trampa de Espinas',
    type: 'reaction', value: 0, rarity: 'uncommon',
    description: 'Al recibir daño: devuelves el 30% del daño al atacante',
    effectTiming: 'on_damage_taken', duration: 3,
    isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_trampa_espinas.png',
    tags: ['trampa', 'reflect'],
    customTheme: { key: 'nature' },
    effects: [
      { kind: 'reflect', target: 'self', amount: 0.3, duration: 3, label: '🌿 Espinas', applyTags: ['espinas'] },
    ],
  },

  {
    id: 'trampa_ilusionista',
    name: 'Ilusión de Debilidad',
    type: 'reaction', value: 0, rarity: 'rare',
    description: 'Al recibir daño: atacante pierde su próximo turno (1 vez)',
    effectTiming: 'on_damage_taken', duration: 1,
    isInstant: true, instantCondition: 'Al ser atacado',
    targetMode: 'self',
    imageFront: '/placeholders/card_ilusionista.png',
    tags: ['trampa', 'control'],
    customTheme: { key: 'arcane' },
    effects: [
      { kind: 'skip_turn', target: 'enemy', applyTags: ['stunned'] },
    ],
  },

  {
    id: 'trampa_drenaje',
    name: 'Trampa Vampírica',
    type: 'reaction', value: 0, rarity: 'epic',
    description: 'Al recibir daño: robas el 50% del daño como HP (1 vez)',
    effectTiming: 'on_damage_taken', duration: 1,
    isInstant: true, instantCondition: 'Al ser atacado',
    targetMode: 'self',
    imageFront: '/placeholders/card_trampa_drenaje.png',
    tags: ['trampa', 'vampiro'],
    customTheme: { key: 'blood' },
    effects: [
      { kind: 'lifesteal', target: 'enemy', formula: 'attacker.lostHp * 0.5', label: '🩸 Drenaje Vampírico' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ROBO DE CARTA ESPECÍFICA (el jugador elige)
  // ══════════════════════════════════════════════════════════

  {
    id: 'robo_selectivo',
    name: 'Hurto Selectivo',
    type: 'utility', value: 0, rarity: 'rare',
    description: 'Ves la mano enemiga y eliges UNA carta para robar',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_robo_selectivo.png',
    tags: ['trampa', 'robo', 'ladron'],
    customTheme: { key: 'shadow' },
    // La mecánica de elegir carta se implementa en applyImmediateEffects
    // vía el tag 'robo_selectivo' (ver gameStore.ts)
    effects: [
      { kind: 'reveal_hand', target: 'enemy' },
      { kind: 'custom', label: 'robo_selectivo', amount: 1, applyTags: ['robada'] },
    ],
  },

  {
    id: 'ladronia_masiva',
    name: 'Ladronía Masiva',
    type: 'utility', value: 0, rarity: 'epic',
    description: 'Robas 2 cartas aleatorias de la mano enemiga',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_ladronia.png',
    tags: ['trampa', 'robo', 'pirata'],
    customTheme: { key: 'shadow' },
    effects: [
      { kind: 'discard', target: 'enemy', amount: 2 },   // enemy pierde 2
      { kind: 'draw_cards', target: 'self', amount: 2 }, // tú ganas 2
    ],
  },

  {
    id: 'intercambio_forzado',
    name: 'Intercambio Forzado',
    type: 'utility', value: 0, rarity: 'epic',
    description: 'Intercambias tu mano ENTERA con la del enemigo',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_intercambio_forzado.png',
    tags: ['trampa', 'robo', 'control'],
    customTheme: { key: 'void' },
    effects: [
      { kind: 'custom', label: 'intercambio_total', applyTags: ['intercambiado'] },
    ],
  },

  {
    id: 'robo_mazo',
    name: 'Saqueo del Mazo',
    type: 'utility', value: 0, rarity: 'rare',
    description: 'Roba 1 carta directamente del mazo global (sin pasar por tu turno)',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_robo_mazo.png',
    tags: ['trampa', 'robo', 'mazo'],
    customTheme: { key: 'steel' },
    effects: [
      { kind: 'draw_cards', target: 'self', amount: 1 },
      { kind: 'draw_cards', target: 'self', amount: 1 },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CEMENTERIO DE HÉROES (robar carta del descarte)
  // ══════════════════════════════════════════════════════════
  // El cementerio es la pila de descarte (discardPile).
  // Estas cartas permiten acceder a cartas ya "usadas".
  // La mecánica se implementa con el tag 'cementerio'.

  {
    id: 'llamada_cementerio',
    name: 'Llamada del Cementerio',
    type: 'ritual', value: 0, rarity: 'epic',
    description: 'Revive la última carta del cementerio a tu mano',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_cementerio.png',
    tags: ['cementerio', 'ritual'],
    customTheme: { key: 'void' },
    effects: [
      { kind: 'custom', label: 'revive_from_graveyard', amount: 1, applyTags: ['revivida'] },
    ],
  },

  {
    id: 'necromancia_selectiva',
    name: 'Necromancia Selectiva',
    type: 'ritual', value: 0, rarity: 'legendary',
    description: 'Ves el cementerio y eliges 1 carta para añadir a tu mano',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_necromancia.png',
    tags: ['cementerio', 'ritual', 'elige'],
    customTheme: { key: 'void' },
    effects: [
      { kind: 'custom', label: 'choose_from_graveyard', amount: 1 },
    ],
  },

  {
    id: 'cementerio_aliado',
    name: 'Heroísmo Póstumo',
    type: 'ritual', value: 0, rarity: 'legendary',
    description: 'Copia la última carta usada por cualquier jugador (del cementerio global)',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_heroismo_postumo.png',
    tags: ['cementerio', 'copia', 'ritual'],
    customTheme: { key: 'divine' },
    effects: [
      { kind: 'custom', label: 'copy_last_card', amount: 1, applyTags: ['copiada'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // TRAMPAS DE DESINFORMACIÓN (revelar, confundir)
  // ══════════════════════════════════════════════════════════

  {
    id: 'carta_falsa',
    name: 'Señuelo Táctico',
    type: 'special', value: 0, rarity: 'rare',
    description: 'Coloca una trampa invisible: la próxima carta que el enemigo use es robada por ti',
    effectTiming: 'immediate', duration: 3,
    isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_senuelo.png',
    tags: ['trampa', 'robo', 'control'],
    customTheme: { key: 'shadow' },
    effects: [
      { kind: 'set_tag', target: 'enemy', applyTags: ['trampa_senuelo'], duration: 3, label: '🎭 Señuelo' },
    ],
  },

  {
    id: 'espejo_mnemotecnico',
    name: 'Espejo Mnemotécnico',
    type: 'utility', value: 0, rarity: 'epic',
    description: 'Copia la ÚLTIMA carta que el enemigo usó y la añade a tu mano',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_espejo_mnemotecnico.png',
    tags: ['trampa', 'copia', 'psiquico'],
    customTheme: { key: 'arcane' },
    effects: [
      { kind: 'custom', label: 'copy_enemy_last_card', amount: 1, applyTags: ['copiada'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // TRAMPAS DE TIEMPO (activación diferida)
  // ══════════════════════════════════════════════════════════

  {
    id: 'bomba_temporal',
    name: 'Bomba Temporal',
    type: 'special', value: -80, rarity: 'epic',
    description: 'Colocas una bomba: explota en 2 turnos causando 80 daño AOE que ignora defensa',
    effectTiming: 'immediate', duration: 2,
    isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_bomba.png',
    tags: ['trampa', 'tiempo', 'fuego'],
    customTheme: { key: 'thunder' },
    effects: [
      { kind: 'set_tag', target: 'enemy', applyTags: ['bomba_activa'], duration: 2, label: '💣 Bomba' },
      // El efecto real se aplica cuando la bomba explota (start_of_turn del objetivo)
      { kind: 'dot', target: 'all_enemies', amount: 80, duration: 1, ignoresDefense: true, label: '💥 Explosión', applyTags: ['burning'] },
    ],
  },

  {
    id: 'carta_envenenada',
    name: 'Carta Envenenada',
    type: 'curse', value: 0, rarity: 'rare',
    description: 'Agrega carta trampa a la mano enemiga: si la juega, se intoxica 20/t x4',
    effectTiming: 'immediate', duration: 0,
    isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_envenenada.png',
    tags: ['trampa', 'veneno', 'psiquico'],
    customTheme: { key: 'poison' },
    effects: [
      { kind: 'custom', label: 'plant_poison_card', amount: 1, applyTags: ['carta_trampa'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // TRAMPAS DE REACCIÓN (se arman y actúan al recibir algo)
  // ══════════════════════════════════════════════════════════

  {
    id: 'caza_hechizos',
    name: 'Cazadora de Hechizos',
    type: 'reaction', value: 0, rarity: 'rare',
    description: 'La próxima vez que el enemigo use una carta [magia]: sufre 60 daño extra',
    effectTiming: 'immediate', duration: 4,
    isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_caza_hechizos.png',
    tags: ['trampa', 'magia', 'control'],
    customTheme: { key: 'steel' },
    effects: [
      { kind: 'set_tag', target: 'self', applyTags: ['anti_magia'], duration: 4, label: '🔮 Anti-Hechizos' },
    ],
  },

  {
    id: 'campo_inhibidor',
    name: 'Campo Inhibidor',
    type: 'terrain', value: 0, rarity: 'epic',
    description: 'Crea un campo 2t: todos los daños recibidos se reducen a la mitad',
    effectTiming: 'immediate', duration: 2,
    isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_campo_inh.png',
    tags: ['trampa', 'tierra', 'control'],
    customTheme: { key: 'ice' },
    effects: [
      { kind: 'shield', target: 'self', amount: 0, duration: 2, label: '🧊 Campo Inhibidor' },
    ],
  },
];

// ─── Registro de handlers personalizados para cartas de cementerio ──
// Los handlers reales se implementan en gameStore.ts o se registran aquí.
// Esto permite que mods sobrescriban el comportamiento.
import { registerEffectHandler } from '../utils/effects';

// Handler: revive la última carta del cementerio
registerEffectHandler('revive_from_graveyard', (_effect, ctx) => {
  ctx.log(`🪦 ${ctx.attacker.name} roba del cementerio...`, 'utility');
  // El store expone el discardPile; aquí simulamos con el mazo por ahora
  ctx.drawCards(ctx.attacker.id, 1);
  ctx.log(`🪦 Carta revivida del cementerio (mazo como fallback)`, 'utility');
});

// Handler: elige carta del cementerio (se abre modal de elección)
registerEffectHandler('choose_from_graveyard', async (_effect, ctx) => {
  ctx.log(`🪦 ${ctx.attacker.name} consulta el cementerio...`, 'utility');
  // Por ahora: robar 1 carta del mazo (el UI del cementerio se implementa después)
  ctx.drawCards(ctx.attacker.id, 1);
});

// Handler: copia la última carta usada por cualquier jugador
registerEffectHandler('copy_last_card', (_effect, ctx) => {
  ctx.log(`🪞 ${ctx.attacker.name} copia del cementerio global`, 'utility');
  ctx.drawCards(ctx.attacker.id, 1);
});

// Handler: copia la última carta usada por el enemigo
registerEffectHandler('copy_enemy_last_card', (_effect, ctx) => {
  ctx.log(`🪞 ${ctx.attacker.name} copia carta enemiga`, 'utility');
  ctx.drawCards(ctx.attacker.id, 1);
});

// Handler: intercambio total de manos
registerEffectHandler('intercambio_total', (_effect, ctx) => {
  const enemy = ctx.primaryTarget;
  if (!enemy) return;
  // Las cartas de mano son inmutables en el motor de efectos.
  // El intercambio completo requiere mutación del store; aquí solo logueamos.
  ctx.log(`🔄 ${ctx.attacker.name} y ${enemy.name} intercambiaron manos (requiere store.swapHands)`, 'utility');
});

// Handler: planta carta envenenada
registerEffectHandler('plant_poison_card', (_effect, ctx) => {
  ctx.log(`💀 Carta envenenada plantada en la mano de ${ctx.primaryTarget?.name ?? '?'}`, 'debuff');
});
