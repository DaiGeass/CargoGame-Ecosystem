// ============================================================
// TIPOS PRINCIPALES DEL JUEGO - "CARGAS" (DevBuild)
// ============================================================

export type CardType =
  | 'damage'
  | 'damage_over_time'
  | 'heal'
  | 'defense'
  | 'dodge'
  | 'utility'
  | 'special'
  | 'elemental'
  | 'summon'
  | 'curse'
  | 'buff'
  | 'counter'
  | 'channel'
  | 'ritual'
  | 'reaction'
  | 'terrain';

export const CARD_TYPES: CardType[] = [
  'damage', 'damage_over_time', 'heal', 'defense', 'dodge', 'utility',
  'special', 'elemental', 'summon', 'curse', 'buff', 'counter',
  'channel', 'ritual', 'reaction', 'terrain',
];

export type EffectTiming =
  | 'immediate'
  | 'start_of_turn'
  | 'end_of_turn'
  | 'on_damage_taken'
  | 'out_of_turn';

export type CharacterClass = 'archer' | 'warrior' | 'mage' | 'assassin' | 'healer' | 'tank';

export const CHARACTER_CLASSES: CharacterClass[] = ['archer', 'warrior', 'mage', 'assassin', 'healer', 'tank'];

export type CardTag = string;

export type MediaAssetUrl = string | null;

export interface CardMedia {
  image?: MediaAssetUrl;
  iconImage?: MediaAssetUrl;
  soundOnHover?: MediaAssetUrl;
  soundOnPlay?: MediaAssetUrl;
  soundOnResolve?: MediaAssetUrl;
}

export interface CharacterMedia {
  imageFront?: MediaAssetUrl;
  imageBack?: MediaAssetUrl;
  iconImage?: MediaAssetUrl;
  soundOnIntro?: MediaAssetUrl;
}

export interface CardTheme {
  key?: string;
  bg?: string;
  bgGrad?: string;
  border?: string;
  glow?: string;
  text?: string;
  bgGradient?: string;
  borderColor?: string;
  icon?: string;
  label?: string;
}

export interface CardSynergy {
  condition: {
    targetHasTag?: CardTag;
    targetStatus?: 'has_dots' | 'low_hp' | 'high_def' | 'stunned' | 'silenced';
    attackerHasTag?: CardTag;
    attackerStatus?: 'low_hp' | 'high_hp';
    cardsPlayedThisTurn?: number;
  };
  bonusDamage?: number;
  bonusHeal?: number;
  bonusDefense?: number;
  applyExtraEffect?: {
    name: string;
    value: number;
    timing: EffectTiming;
    duration: number;
    ignoresDefense: boolean;
    specialRules?: string;
    description: string;
    tags?: CardTag[];
  };
}

export interface CardFormula {
  expression: string;
  resultType: 'damage' | 'heal' | 'defense';
  description?: string;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
  isTeamAbility: boolean;
  passive: string;
  canTarget: 'self' | 'ally' | 'enemy' | 'any' | 'ally_or_self';
}

export interface CharacterPassive {
  id: string;
  name: string;
  description: string;
  scope?: 'self' | 'team' | 'global';
  timing?: 'always' | 'start_of_turn' | 'end_of_turn' | 'on_damage_dealt' | 'on_damage_taken' | 'on_heal' | 'on_combo';
  effects?: import('./effects').CardEffect[];
  tags?: CardTag[];
  enabled?: boolean;
}

export interface CharacterCard {
  id: string;
  name: string;
  classType: CharacterClass;
  hp: number;
  defense: number;
  damage: number;
  imageFront: MediaAssetUrl;
  imageBack: MediaAssetUrl;
  media?: CharacterMedia;
  abilities: Ability[];
  // CARGAS character v2: permite más de una pasiva y personajes complejos.
  passives?: CharacterPassive[];
  teamPassives?: CharacterPassive[];
  advancedMechanics?: any[];
  maxActiveAbilities?: number;
  uiHints?: {
    role?: string;
    difficulty?: 'easy' | 'normal' | 'hard' | 'expert';
    tags?: string[];
    notes?: string;
  };
  passiveDescription: string;
  teamPassiveDescription?: string;
  avatar: string;
  color: string;
}

export interface PlayableCard {
  id: string;
  name: string;
  type: CardType;
  value: number;
  formula?: CardFormula;
  effects?: import('./effects').CardEffect[];
  description: string;
  effectTiming: EffectTiming;
  duration: number;
  isInstant: boolean;
  instantCondition?: string;
  targetMode: 'enemy' | 'ally' | 'self' | 'any' | 'ally_or_self'
            | 'all_enemies' | 'all_allies' | 'multi_enemy';
  targetCount?: number;
  ignoresDefense?: boolean;
  imageFront: MediaAssetUrl;
  media?: CardMedia;
  tags?: CardTag[];
  synergyTags?: CardTag[];
  customTheme?: CardTheme;
  synergies?: CardSynergy[];
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export const TARGET_MODES = ['enemy', 'ally', 'self', 'any', 'ally_or_self', 'all_enemies', 'all_allies', 'multi_enemy'] as const;
export const EFFECT_TIMINGS: EffectTiming[] = ['immediate', 'start_of_turn', 'end_of_turn', 'on_damage_taken', 'out_of_turn'];

// ─── Mods / Packs ──────────────────────────────────────────
// Los tipos de mod (ModManifest, LoadedMod, ComboMod) viven en
// src/data/mods.ts (sistema real, alineado con el juego CARGAS).
export type ContentSource = 'base' | 'mod' | 'dlc';

export interface SourcedCard extends PlayableCard {
  __source: ContentSource;
  __sourceId: string;
  __sourceName: string;
}

// ─── Estado de jugador (necesario para los motores reales) ──
export type GameMode = 'ffa' | 'teams';
export type PlayerControl = 'human' | 'bot';
export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface ActiveEffect {
  id: string;
  name: string;
  value: number;
  timing: EffectTiming;
  duration: number;
  stacks: number;
  sourcePlayerId: string;
  targetPlayerId: string;
  isStackable: boolean;
  ignoresDefense: boolean;
  specialRules?: string;
  description: string;
  tags?: CardTag[];
}

export interface PlayerStats {
  damageDealt: number;
  damageReceived: number;
  healDone: number;
  healReceived: number;
  dotsApplied: number;
  cardsPlayed: number;
  kills: number;
  defensesUsed: number;
  critsLanded: number;
}

export interface Player {
  id: string;
  name: string;
  characterId: string;
  currentHp: number;
  currentDefense: number;
  baseDefense: number;
  maxHp: number;
  baseDamage: number;
  hand: PlayableCard[];
  activeEffects: ActiveEffect[];
  abilitiesUsed: string[];
  abilityCooldowns: Record<string, number>;
  isAlive: boolean;
  teamId?: string;
  position: number;
  control: PlayerControl;
  botDifficulty?: BotDifficulty;
  avatar?: string;
  stats: PlayerStats;
}

export function makeDefaultStats(): PlayerStats {
  return { damageDealt: 0, damageReceived: 0, healDone: 0, healReceived: 0, dotsApplied: 0, cardsPlayed: 0, kills: 0, defensesUsed: 0, critsLanded: 0 };
}
