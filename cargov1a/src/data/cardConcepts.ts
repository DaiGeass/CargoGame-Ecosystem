// ============================================================
// 🎴 CARTAS CONCEPTUALES — CATÁLOGO DE EJEMPLO Y REFERENCIA
// ============================================================
// Este archivo es la MEJOR REFERENCIA para aprender a crear cartas.
// Cada sección muestra un CONCEPTO distinto con ejemplos comentados.
//
// 📚 ÍNDICE DE CONCEPTOS:
//   1. Daño que ignora defensa
//   2. Daño + Daño por turno (DoT combinado)
//   3. Curación por turno (HoT)
//   4. Multi-objetivo (AOE)
//   5. Cartas con elección (choice)
//   6. Manipulación de turnos (skip / extra)
//   7. Efectos acumulables (stacks)
//   8. Cartas condicionales (sinergias)
//   9. Robo de vida (lifesteal)
//  10. Ejecución (execute)
//  11. Marcado con tags (set_tag)
//  12. Cartas con fórmulas matemáticas
//  13. Combinaciones complejas
//
// ════════════════════════════════════════════════════════════
// 🛠️ CÓMO CREAR UNA CARTA — GUÍA RÁPIDA
// ════════════════════════════════════════════════════════════
// Una carta es un objeto PlayableCard. Campos OBLIGATORIOS:
//
//   id:          string único (ej: 'mi_carta')
//   name:        nombre visible
//   type:        'damage' | 'heal' | 'defense' | 'damage_over_time'
//                | 'utility' | 'special' | 'elemental' | 'curse'
//                | 'buff' | 'counter' | 'ritual' | 'summon' ...
//   value:       número base (negativo = daño, positivo = cura/def)
//   description: texto que ve el jugador
//   effectTiming:'immediate' | 'start_of_turn' | 'end_of_turn' | 'on_damage_taken'
//   duration:    turnos que dura (0 = instantáneo)
//   isInstant:   true si se puede jugar en defensa
//   targetMode:  'enemy' | 'ally' | 'self' | 'ally_or_self'
//                | 'all_enemies' | 'all_allies' | 'multi_enemy'
//   imageFront:  ruta de imagen ('/placeholders/x.png')
//
// Campos OPCIONALES:
//   tags:        familias para sinergias/pasivas (ej: ['fuego','magia'])
//   rarity:      'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
//   ignoresDefense: true → el daño no resta defensa
//   formula:     { expression: 'target.hp * 0.2', resultType: 'damage' }
//   effects:     CardEffect[] → SISTEMA MODULAR (ver abajo)
//
// ════════════════════════════════════════════════════════════
// 🧩 SISTEMA MODULAR DE EFECTOS (`effects[]`) — LO MÁS POTENTE
// ════════════════════════════════════════════════════════════
// Si una carta define `effects`, IGNORA value/formula y ejecuta
// una lista de efectos componibles en orden. Cada efecto tiene:
//
//   kind:    tipo de efecto (ver lista completa abajo)
//   target:  a quién afecta ('enemy','all_enemies','self','ally'...)
//   amount:  cantidad (o usa formula)
//   formula: expresión matemática opcional
//   duration:turnos
//   ignoresDefense: true → ignora defensa
//   stackKey/maxStacks: para efectos acumulables
//   applyTags: tags que marca en el objetivo
//   label:   nombre visible del efecto
//
// TIPOS DE EFECTO (`kind`):
//   damage       → daño directo
//   heal         → curación inmediata
//   hot          → curación por turno
//   dot          → daño por turno
//   defense_buff → +defensa
//   buff_self    → buff propio (stat)
//   debuff       → debuff al objetivo
//   stun         → aturde (pierde turno)
//   silence      → no puede usar habilidades
//   skip_turn    → salta el próximo turno
//   extra_turn   → juegas otro turno
//   draw_cards   → robar cartas
//   discard      → descartar cartas del objetivo
//   reveal_hand  → revela mano
//   shield       → bloquea próximo daño
//   reflect      → refleja daño
//   lifesteal    → daño que te cura
//   execute      → mata si HP < umbral%
//   transfer_hp  → transfiere HP
//   cleanse      → limpia debuffs propios
//   dispel       → quita buffs del enemigo
//   set_tag      → marca con tags (sinergias)
//   stack_effect → efecto acumulable
//   multi_target → aplica sub-efectos a varios
//   choice       → da opciones al jugador
//   conditional  → if/else según condición
//   custom       → hook JS (mods avanzados)
//
// ════════════════════════════════════════════════════════════

import { PlayableCard } from '../types/game';

export const conceptCards: PlayableCard[] = [

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 1: DAÑO QUE IGNORA DEFENSA
  // ══════════════════════════════════════════════════════════
  // Usa `ignoresDefense: true` en cartas simples, o el efecto
  // `{ kind:'damage', ignoresDefense:true }` en cartas modulares.

  {
    id: 'punzon_etereo',
    name: 'Punzón Etéreo',
    type: 'damage', value: -55, rarity: 'rare',
    description: '55 daño que IGNORA toda la defensa',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy', ignoresDefense: true,
    imageFront: '/placeholders/card_punzon_etereo.png',
    tags: ['pierce', 'magia'],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 2: DAÑO INMEDIATO + DAÑO POR TURNO (combinado)
  // ══════════════════════════════════════════════════════════
  // Con `effects[]` puedes mezclar un golpe directo + un DoT.

  {
    id: 'tajo_infectado',
    name: 'Tajo Infectado',
    type: 'damage', value: -40, rarity: 'epic',
    description: '40 daño + infección 15/t durante 3 turnos',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_tajo_infectado.png',
    tags: ['daga', 'veneno'],
    effects: [
      { kind: 'damage', target: 'enemy', amount: 40, label: 'Tajo' },
      { kind: 'dot', target: 'enemy', amount: 15, duration: 3, ignoresDefense: true, stackKey: 'infect', applyTags: ['veneno'], label: 'Infección' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 3: CURACIÓN POR TURNO (HoT)
  // ══════════════════════════════════════════════════════════

  {
    id: 'savia_vital',
    name: 'Savia Vital',
    type: 'heal', value: 30, rarity: 'uncommon',
    description: 'Cura 30 ahora + 25/t durante 4 turnos',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'ally_or_self',
    imageFront: '/placeholders/card_savia_vital.png',
    tags: ['cura', 'nature'],
    effects: [
      { kind: 'heal', target: 'self', amount: 30 },
      { kind: 'hot', target: 'self', amount: 25, duration: 4, label: 'Savia Regenerativa', applyTags: ['regen'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 4: MULTI-OBJETIVO (AOE)
  // ══════════════════════════════════════════════════════════
  // targetMode: 'all_enemies' o usa `target: 'all_enemies'` en efectos.

  {
    id: 'onda_sismica',
    name: 'Onda Sísmica',
    type: 'elemental', value: -35, rarity: 'epic',
    description: '35 daño a TODOS los enemigos + aturde a los de bajo HP',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'all_enemies',
    imageFront: '/placeholders/card_onda_sismica.png',
    tags: ['tierra', 'aoe'],
    effects: [
      { kind: 'damage', target: 'all_enemies', amount: 35, label: 'Sismo' },
      { kind: 'conditional', target: 'all_enemies',
        condition: { targetHpBelow: 40 },
        ifTrue: [{ kind: 'stun', target: 'all_enemies', duration: 1, applyTags: ['stunned'] }],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 5: CARTA CON ELECCIÓN (choice)
  // ══════════════════════════════════════════════════════════
  // El jugador elige una rama. El bot elige al azar.

  {
    id: 'encrucijada',
    name: 'Encrucijada del Destino',
    type: 'special', value: 0, rarity: 'legendary',
    description: 'ELIGE: 120 daño · O · curarte 100 + escudo · O · robar 3 cartas',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'any',
    imageFront: '/placeholders/card_encrucijada.png',
    tags: ['choice', 'destino'],
    effects: [
      { kind: 'choice', label: 'Elige tu destino', choices: [
        { label: '⚔️ Furia (120 daño)', effects: [
          { kind: 'damage', target: 'enemy', amount: 120 },
        ]},
        { label: '🛡️ Refugio (+100 HP, +40 def)', effects: [
          { kind: 'heal', target: 'self', amount: 100 },
          { kind: 'defense_buff', target: 'self', amount: 40 },
        ]},
        { label: '🃏 Sabiduría (robar 3)', effects: [
          { kind: 'draw_cards', target: 'self', amount: 3 },
        ]},
      ]},
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 6: MANIPULACIÓN DE TURNOS
  // ══════════════════════════════════════════════════════════

  {
    id: 'distorsion_temporal',
    name: 'Distorsión Temporal',
    type: 'special', value: 0, rarity: 'legendary',
    description: 'Saltas al enemigo su turno Y tú juegas un turno extra',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_distorsion.png',
    tags: ['tiempo', 'control'],
    effects: [
      { kind: 'skip_turn', target: 'enemy', applyTags: ['skipped'] },
      { kind: 'extra_turn', target: 'self' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 7: EFECTOS ACUMULABLES (stacks)
  // ══════════════════════════════════════════════════════════
  // Cada vez que juegas la carta, suma stacks (hasta maxStacks).

  {
    id: 'maldicion_creciente',
    name: 'Maldición Creciente',
    type: 'curse', value: 0, rarity: 'rare',
    description: 'Veneno acumulable: +12/t por copia (máx 8 stacks)',
    effectTiming: 'start_of_turn', duration: 5, isInstant: false,
    ignoresDefense: true, targetMode: 'enemy',
    imageFront: '/placeholders/card_maldicion_creciente.png',
    tags: ['veneno', 'stack'],
    effects: [
      { kind: 'stack_effect', target: 'enemy', amount: -12, duration: 5,
        stackKey: 'curse_stack', maxStacks: 8, label: '☠️ Maldición', applyTags: ['veneno', 'curse'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 8: CARTA CONDICIONAL (sinergia)
  // ══════════════════════════════════════════════════════════

  {
    id: 'castigo_justiciero',
    name: 'Castigo Justiciero',
    type: 'damage', value: -45, rarity: 'epic',
    description: '45 daño. Si el enemigo está envenenado: x2 daño',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_castigo.png',
    tags: ['sagrado'],
    effects: [
      { kind: 'conditional',
        condition: { targetHasTag: 'veneno' },
        ifTrue: [{ kind: 'damage', target: 'enemy', amount: 90, label: 'Castigo Doble' }],
        ifFalse: [{ kind: 'damage', target: 'enemy', amount: 45, label: 'Castigo' }],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 9: ROBO DE VIDA (lifesteal)
  // ══════════════════════════════════════════════════════════

  {
    id: 'mordisco_vampirico',
    name: 'Mordisco Vampírico',
    type: 'damage', value: -50, rarity: 'rare',
    description: '50 daño y te curas la mitad del daño causado',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_mordisco.png',
    tags: ['oscuro', 'vampiro'],
    effects: [
      { kind: 'lifesteal', target: 'enemy', amount: 50, label: 'Mordisco' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 10: EJECUCIÓN (execute)
  // ══════════════════════════════════════════════════════════

  {
    id: 'guillotina',
    name: 'Guillotina',
    type: 'damage', value: -30, rarity: 'legendary',
    description: '30 daño. Ejecuta instantáneamente si el enemigo < 25% HP',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_guillotina.png',
    tags: ['ejecutar', 'melee'],
    effects: [
      { kind: 'damage', target: 'enemy', amount: 30 },
      { kind: 'execute', target: 'enemy', amount: 25 },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 11: MARCAR CON TAGS (sinergias entre cartas)
  // ══════════════════════════════════════════════════════════
  // set_tag marca al objetivo. Otras cartas leen ese tag.

  {
    id: 'marca_presa',
    name: 'Marca de la Presa',
    type: 'curse', value: 0, rarity: 'uncommon',
    description: 'Marca al enemigo como [presa] por 4t. Sinergia con cazadores',
    effectTiming: 'immediate', duration: 4, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_marca_presa.png',
    tags: ['hunt', 'tag'],
    effects: [
      { kind: 'set_tag', target: 'enemy', applyTags: ['presa'], duration: 4, label: '🎯 Presa' },
    ],
  },
  {
    id: 'tiro_cazador',
    name: 'Tiro del Cazador',
    type: 'damage', value: -40, rarity: 'rare',
    description: '40 daño. Si el enemigo es [presa]: +60 daño extra',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_tiro_cazador.png',
    tags: ['arco', 'hunt'],
    effects: [
      { kind: 'conditional',
        condition: { targetHasTag: 'presa' },
        ifTrue: [{ kind: 'damage', target: 'enemy', amount: 100, label: 'Tiro Letal' }],
        ifFalse: [{ kind: 'damage', target: 'enemy', amount: 40, label: 'Tiro' }],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 12: FÓRMULAS MATEMÁTICAS
  // ══════════════════════════════════════════════════════════
  // Variables: attacker.hp, attacker.maxHp, attacker.dmg, attacker.lostHp,
  //            target.hp, target.maxHp, target.dots, turn, etc.
  // Operadores: + - * / ^ %  ·  Funciones: sqrt, min, max, floor, abs, rand

  {
    id: 'venganza_sangrienta',
    name: 'Venganza Sangrienta',
    type: 'damage', value: -10, rarity: 'epic',
    description: 'Daño = 50 + (HP perdido / 20)',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_venganza.png',
    tags: ['rabia'],
    formula: { expression: '50 + attacker.lostHp / 20', resultType: 'damage' },
  },
  {
    id: 'juicio_final',
    name: 'Juicio Final',
    type: 'damage', value: -10, rarity: 'legendary',
    description: 'Daño = 30% del HP máximo del enemigo',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy', ignoresDefense: true,
    imageFront: '/placeholders/card_juicio.png',
    tags: ['sagrado', 'pierce'],
    formula: { expression: 'target.maxHp * 0.3', resultType: 'damage' },
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 13: COMBINACIÓN COMPLEJA (todo junto)
  // ══════════════════════════════════════════════════════════
  // Muestra cómo encadenar varios efectos en una sola carta épica.

  {
    id: 'apocalipsis',
    name: 'Apocalipsis',
    type: 'ritual', value: 0, rarity: 'legendary',
    description: 'A todos los enemigos: 60 daño + fuego 20/t x3. Tú: +50 daño 2t y robas 1 carta',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'all_enemies',
    imageFront: '/placeholders/card_apocalipsis.png',
    tags: ['fuego', 'magia', 'aoe', 'combo'],
    effects: [
      { kind: 'multi_target', target: 'all_enemies', effects: [
        { kind: 'damage', amount: 60, label: 'Cataclismo' },
        { kind: 'dot', amount: 20, duration: 3, stackKey: 'fire', applyTags: ['fuego'], label: 'Incendio' },
      ]},
      { kind: 'buff_self', target: 'self', amount: 50, duration: 2, label: '🔥 Poder Apocalíptico' } as any,
      { kind: 'draw_cards', target: 'self', amount: 1 },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 14: ESCUDO REACTIVO + REFLEJO
  // ══════════════════════════════════════════════════════════

  {
    id: 'aegis_reflectante',
    name: 'Aegis Reflectante',
    type: 'defense', value: 0, rarity: 'epic',
    description: 'Bloquea el próximo ataque y refleja x2 el daño',
    effectTiming: 'immediate', duration: 2, isInstant: false,
    targetMode: 'self',
    imageFront: '/placeholders/card_aegis.png',
    tags: ['shield', 'reflect'],
    effects: [
      { kind: 'shield', target: 'self', amount: 200, duration: 2, label: 'Aegis' },
      { kind: 'reflect', target: 'self', amount: 2, duration: 2, label: 'Reflejo' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CONCEPTO 15: CONTROL DE MANO (descarte + robo)
  // ══════════════════════════════════════════════════════════

  {
    id: 'saqueo_mental',
    name: 'Saqueo Mental',
    type: 'utility', value: 0, rarity: 'rare',
    description: 'El enemigo descarta 2 cartas y tú robas 2',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/card_saqueo.png',
    tags: ['psiquico', 'control'],
    effects: [
      { kind: 'discard', target: 'enemy', amount: 2 },
      { kind: 'draw_cards', target: 'self', amount: 2 },
    ],
  },
];

// ─── COMBOS NUEVOS para estas cartas ──────────────────────
// Un combo se activa al jugar TODAS las requiredCards en el mismo turno.
import { Combo } from './cards';

export const conceptCombos: Combo[] = [
  {
    id: 'combo_caza', name: 'Cacería Perfecta',
    requiredCards: ['marca_presa', 'tiro_cazador'],
    description: 'Marca de la Presa + Tiro del Cazador',
    effectDescription: '+60 daño devastador', isTeamCombo: false, bonusValue: 60,
  },
  {
    id: 'combo_vampirico', name: 'Sed Insaciable',
    requiredCards: ['mordisco_vampirico', 'tajo_infectado'],
    description: 'Mordisco + Tajo Infectado',
    effectDescription: '+50 daño y robo de vida', isTeamCombo: false, bonusValue: 50,
  },
];
