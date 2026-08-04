// ============================================================
// PLANTILLAS DE EJEMPLO PARA MODS
// ============================================================
// Estructuras de referencia para que los modders sepan
// cómo deben verse sus archivos JSON al crear mods.
// ============================================================

import { PlayableCard, CharacterCard } from '../types/game';

// ─── Plantilla: Carta de daño básica ───────────────────────
export const CARD_TEMPLATE_DAMAGE: Partial<PlayableCard> = {
  id: 'mi_carta_id',
  name: 'Mi Carta de Daño',
  type: 'damage',
  value: -50,
  description: '-50 daño directo',
  effectTiming: 'immediate',
  duration: 0,
  isInstant: false,
  targetMode: 'enemy',
  imageFront: '/placeholders/mi_carta.png',
  tags: ['mi_tag'],
};

// ─── Plantilla: Carta DoT ───────────────────────────────────
export const CARD_TEMPLATE_DOT: Partial<PlayableCard> = {
  id: 'mi_dot_id',
  name: 'Veneno Personalizado',
  type: 'damage_over_time',
  value: -20,
  description: '-20/t x4 (ignora defensa)',
  effectTiming: 'start_of_turn',
  duration: 4,
  isInstant: false,
  ignoresDefense: true,
  targetMode: 'enemy',
  imageFront: '/placeholders/mi_dot.png',
  tags: ['veneno', 'custom'],
};

// ─── Plantilla: Carta con Sinergia ──────────────────────────
export const CARD_TEMPLATE_SYNERGY: Partial<PlayableCard> = {
  id: 'mi_sinergia_id',
  name: 'Golpe Condicional',
  type: 'damage',
  value: -40,
  description: '-40 daño, +30 si objetivo tiene DoT',
  effectTiming: 'immediate',
  duration: 0,
  isInstant: false,
  targetMode: 'enemy',
  imageFront: '/placeholders/mi_sinergia.png',
  synergies: [
    {
      condition: { targetStatus: 'has_dots' },
      bonusDamage: 30,
    },
  ],
};

// ─── Plantilla: Personaje completo ──────────────────────────
export const CHARACTER_TEMPLATE: Partial<CharacterCard> = {
  id: 'mi_personaje_id',
  name: 'Mi Personaje',
  classType: 'warrior',
  hp: 3000,
  defense: 50,
  damage: 45,
  avatar: '🧙',
  color: '#8b5cf6',
  passiveDescription: '+X daño con [mi_tag]',
  teamPassiveDescription: '+Y daño aliados con [mi_tag_equipo]',
  imageFront: '/placeholders/mi_char_front.png',
  imageBack: '/placeholders/mi_char_back.png',
  media: {
    imageFront: '/placeholders/mi_char_front.png',
    imageBack: '/placeholders/mi_char_back.png',
    iconImage: null,
    soundOnIntro: null,
  },
  abilities: [],
};

// ─── Plantilla: Carta con IMAGEN y SONIDO ───────────────────
// Todos los media assets pueden ser null si no quieres usarlos.
// Rutas válidas: '/placeholders/x.png' | 'https://...' | 'data:...' | null
export const CARD_TEMPLATE_MEDIA: Partial<PlayableCard> = {
  id: 'mi_carta_media',
  name: 'Carta Multimedia',
  type: 'special',
  value: 0,
  description: 'Ejemplo con imagen, icono y sonidos',
  effectTiming: 'immediate',
  duration: 0,
  isInstant: false,
  targetMode: 'enemy',
  imageFront: '/placeholders/mi_carta_media.png',
  media: {
    image: '/placeholders/mi_carta_media.png',
    iconImage: null,          // o '/placeholders/icono.png'
    soundOnHover: null,       // o '/audio/hover.mp3'
    soundOnPlay: null,        // o 'data:audio/mp3;base64,...'
    soundOnResolve: null,
  },
};

// ─── Plantilla: Carta con Tema Visual inline (sin registrar key) ──
export const CARD_TEMPLATE_INLINE_THEME: Partial<PlayableCard> = {
  id: 'mi_tema_inline',
  name: 'Carta con tema inline',
  type: 'damage',
  value: -45,
  description: 'Usa colores directos en vez de tema registrado',
  effectTiming: 'immediate',
  duration: 0,
  isInstant: false,
  targetMode: 'enemy',
  imageFront: null,
  customTheme: {
    bg: '#1a0a2e',
    bgGrad: '#3d0a4e',
    border: '#9d4edd',
    glow: 'rgba(157,78,221,0.4)',
    text: '#e0aaff',
    icon: '🌌',
    label: 'Cósmico',
  },
};

// ─── Plantilla: Carta con FÓRMULA matemática ────────────────
// El valor se calcula dinámicamente al jugar la carta.
// Operadores: + - * / ^ %   Funciones: sqrt abs min max floor ceil round rand
// Variables: attacker.hp, target.hp, attacker.lostHp, target.dots, turn...
export const CARD_TEMPLATE_FORMULA: Partial<PlayableCard> = {
  id: 'mi_formula_id',
  name: 'Golpe Dinámico',
  type: 'damage',
  value: -10, // valor de respaldo (no se usa si hay fórmula)
  description: 'Daño = 20% del HP del enemigo',
  effectTiming: 'immediate',
  duration: 0,
  isInstant: false,
  targetMode: 'enemy',
  imageFront: '/placeholders/mi_formula.png',
  rarity: 'rare',
  formula: {
    expression: 'target.hp * 0.2',
    resultType: 'damage', // 'damage' | 'heal' | 'defense'
    description: '20% del HP actual',
  },
};

// ─── Plantilla: Carta con fórmula condicional (ternario) ────
export const CARD_TEMPLATE_FORMULA_CONDITIONAL: Partial<PlayableCard> = {
  id: 'mi_ejecucion_id',
  name: 'Ejecución',
  type: 'damage',
  value: -10,
  description: 'x3 daño si enemigo bajo 30% HP',
  effectTiming: 'immediate',
  duration: 0,
  isInstant: false,
  targetMode: 'enemy',
  imageFront: '/placeholders/mi_ejec.png',
  rarity: 'epic',
  formula: {
    expression: 'target.hpPct < 30 ? attacker.dmg * 3 : attacker.dmg',
    resultType: 'damage',
  },
};

// ─── Plantilla: Manifest de Mod ─────────────────────────────
export const MANIFEST_TEMPLATE = {
  name: 'Mi Mod Épico',
  author: 'Tu Nombre',
  version: '1.0.0',
  description: 'Agrega X cartas y Y personajes nuevos',
  cards: ['cards.json'],
  characters: ['characters.json'],
  combos: ['combos.json'],
  icon: 'images/mod_icon.png',
};
