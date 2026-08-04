// ============================================================
// TIPOS PRINCIPALES DEL JUEGO - "CARGAS"
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

export type EffectTiming =
  | 'immediate'
  | 'start_of_turn'
  | 'end_of_turn'
  | 'on_damage_taken'
  | 'out_of_turn';

export type GameMode = 'ffa' | 'teams';
export type PlayerControl = 'human' | 'bot';
export type BotDifficulty = 'easy' | 'normal' | 'hard';
export type CharacterClass = 'archer' | 'warrior' | 'mage' | 'assassin' | 'healer' | 'tank';

export type CardTag = string;

// ─── Assets multimedia reutilizables ───────────────────────
// Soporte modular para imágenes y sonidos tanto en el código base
// como en mods/DLC. Todos los campos pueden ser `null` si no se quieren usar.
//
// RUTAS SOPORTADAS:
//   - '/placeholders/x.png'              → asset público del proyecto
//   - 'https://...'                      → asset remoto
//   - 'data:image/png;base64,...'        → embebido (ideal para mods ZIP)
//   - null                               → sin asset
//
// Para mods ZIP/.cargasmod, el importador puede convertir imágenes/sonidos
// internas a data URLs para que funcionen incluso empaquetado.
export type MediaAssetUrl = string | null;

export interface CardMedia {
  /** Imagen principal/frontal de la carta (PNG/JPG/WebP/data URL) */
  image?: MediaAssetUrl;
  /** Icono pequeño opcional (PNG/SVG/data URL) */
  iconImage?: MediaAssetUrl;
  /** Sonido al seleccionar o hacer hover */
  soundOnHover?: MediaAssetUrl;
  /** Sonido al preparar/jugar la carta */
  soundOnPlay?: MediaAssetUrl;
  /** Sonido al revelar/resolver */
  soundOnResolve?: MediaAssetUrl;
}

export interface CharacterMedia {
  /** Arte frontal del personaje */
  imageFront?: MediaAssetUrl;
  /** Arte reverso del personaje */
  imageBack?: MediaAssetUrl;
  /** Avatar/icono del personaje */
  iconImage?: MediaAssetUrl;
  /** Sonido temático al entrar en juego */
  soundOnIntro?: MediaAssetUrl;
}

// ─── Tema de carta ─────────────────────────────────────────
// Formas de definir un tema:
//   1. Por clave (key): referencia a un tema registrado en cardThemes.ts
//      customTheme: { key: 'cosmic' }
//   2. Inline CSS directo (recomendado para mods JSON)
//      customTheme: { bg: '#1a0a2e', bgGrad: '#3d0a4e', border: '#9d4edd', glow: 'rgba(...)', text: '#e0aaff', icon: '🌌', label: 'Cósmico' }
//   3. Legacy Tailwind classes (retrocompatibilidad)
//      customTheme: { bgGradient: 'from-...', borderColor: '...', icon: '🌌', label: 'Cósmico' }
//
// 🛠️ Para mods: la forma más segura es (1) o (2), porque no depende del JIT de Tailwind.
export interface CardTheme {
  /** Clave de un tema registrado en cardThemes.ts (preferido) */
  key?: string;
  /** Inline CSS directo (recomendado para mods) */
  bg?: string;
  bgGrad?: string;
  border?: string;
  glow?: string;
  text?: string;
  /** Legacy Tailwind classes (si no hay key ni colores directos) */
  bgGradient?: string;
  borderColor?: string;
  icon?: string;
  label?: string;
}

export interface VisualConfig {
  bgPrimary: string;
  bgSecondary: string;
  bgAccent: string;
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  fontMain: string;
  fontHeading: string;
  borderRadius: string;
  cardOpacity: number;
  panelOpacity: number;
  cardScale: number;
  panelScale: number;
  enableAnimations: boolean;
  animationSpeed: number;
  highContrast: boolean;
  colorblindMode: boolean;
  fontSize: string;
}

export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  // bgPrimary ahora es un gradiente CSS completo (no clases Tailwind dinámicas)
  bgPrimary: 'linear-gradient(135deg, #020617 0%, #1e1b4b 50%, #020617 100%)',
  bgSecondary: '',
  bgAccent: '',
  textPrimary: 'text-white',
  textSecondary: 'text-slate-300',
  textAccent: 'text-amber-400',
  fontMain: 'font-sans',
  fontHeading: 'font-black',
  borderRadius: 'rounded-xl',
  cardOpacity: 0.95,
  panelOpacity: 0.92,
  cardScale: 1.05,
  panelScale: 1.02,
  enableAnimations: true,
  animationSpeed: 1,
  highContrast: false,
  colorblindMode: false,
  fontSize: 'text-base',
};

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

// ─── FÓRMULAS MATEMÁTICAS (nuevo sistema de cartas moddables) ──
// Permite definir el valor de una carta con una fórmula que se
// evalúa en tiempo de ejecución según el contexto del juego.
//
// Ejemplos:
//   { expression: "target.hp * 0.2", resultType: "damage" }
//     → daño = 20% del HP del objetivo
//
//   { expression: "sqrt(attacker.lostHp) * 10", resultType: "damage" }
//     → daño = √(HP perdido) × 10
//
//   { expression: "attacker.dmg ^ 1.5", resultType: "damage" }
//     → daño = daño_base ^ 1.5
//
// Variables: attacker.hp, target.hp, attacker.lostHp, target.dots, turn, etc.
// Operadores: + - * / ^ %
// Funciones: sqrt, abs, min, max, floor, ceil, round, rand
// Comparaciones: < > <= >= == != y ternario (a ? b : c)
export interface CardFormula {
  expression: string;
  resultType: 'damage' | 'heal' | 'defense';
  description?: string;
}

export type GamePhase =
  | 'setup'
  | 'playing'
  | 'resolving'
  | 'defending'
  | 'gameOver';

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

export interface Ability {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  // currentCooldown YA NO se usa para el estado real del juego.
  // El cooldown real se guarda POR JUGADOR en Player.abilityCooldowns.
  // Se mantiene aquí solo como valor de plantilla (siempre 0).
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
  // Compatibilidad legacy: pueden ser null si no quieres arte.
  imageFront: MediaAssetUrl;
  imageBack: MediaAssetUrl;
  // Nuevo contenedor modular de media (preferido para mods/DLC)
  media?: CharacterMedia;
  abilities: Ability[];            // 3 individuales + 3 de equipo (SIN pasivas)
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
  passiveDescription: string;      // Pasiva INDIVIDUAL (automática, no es botón)
  teamPassiveDescription?: string; // Pasiva de EQUIPO (automática, no es botón)
  avatar: string;
  color: string;
}

export interface PlayableCard {
  id: string;
  name: string;
  type: CardType;
  // Valor estático (negativo = daño, positivo = cura/defensa).
  // Si están definidos `formula` o `effects`, tienen prioridad sobre `value`.
  value: number;
  // Fórmula matemática opcional (para cartas dinámicas/moddables)
  formula?: CardFormula;
  // ⭐ SISTEMA MODULAR DE EFECTOS (opcional, recomendado para mods)
  // Lista de efectos componibles que se aplican al jugar la carta.
  // Si está presente, IGNORA value/formula y usa el motor de efectos.
  // Ver src/types/effects.ts y src/utils/effects.ts.
  effects?: import('./effects').CardEffect[];
  description: string;
  effectTiming: EffectTiming;
  duration: number;
  isInstant: boolean;
  instantCondition?: string;
  // Modo de objetivo (incluye multi-target para cartas modulares)
  targetMode: 'enemy' | 'ally' | 'self' | 'any' | 'ally_or_self'
            | 'all_enemies' | 'all_allies' | 'multi_enemy';
  // Cuántos objetivos puede elegir el jugador (cuando es multi_enemy)
  targetCount?: number;
  ignoresDefense?: boolean;
  // Compatibilidad legacy: ruta directa de imagen principal.
  imageFront: MediaAssetUrl;
  // Nuevo contenedor modular de media (preferido para mods/DLC)
  media?: CardMedia;
  tags?: CardTag[];
  synergyTags?: CardTag[];
  customTheme?: CardTheme;
  synergies?: CardSynergy[];
  // Rareza visual (para mods)
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
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
  currentDefense: number;    // Defensa acumulada (puede bajar con efectos)
  baseDefense: number;       // Defensa base INMUTABLE (nunca baja de aquí)
  maxHp: number;
  baseDamage: number;
  hand: PlayableCard[];
  activeEffects: ActiveEffect[];
  abilitiesUsed: string[];
  // Cooldowns POR JUGADOR: { [abilityId]: turnosRestantes }
  // Esto garantiza que cada jugador tenga su propio cooldown aunque
  // varios usen el mismo personaje. Se reduce en cada ronda global.
  abilityCooldowns: Record<string, number>;
  isAlive: boolean;
  teamId?: string;
  position: number;
  control: PlayerControl;
  botDifficulty?: BotDifficulty;
  avatar?: string;
  stats: PlayerStats;
}

export interface Deck {
  cards: PlayableCard[];
}

export interface ResolutionPreview {
  attackerId: string;
  targetId: string;
  cards: PlayableCard[];
  abilityId?: string;
  // Daño bruto mostrado al jugador (antes de defensa)
  rawDamage: number;
  rawHeal: number;
  // Daño final después de aplicar defensa/ignorar defensa
  netDamage: number;
  // Cuánta defensa absorbió el golpe
  defenseReduction: number;
  // Daño que sí interactúa con defensa
  normalDamage?: number;
  // Daño que ignora defensa completamente
  ignoreDefenseDamage?: number;
  dotApplied: { name: string; value: number; duration: number; ignoresDefense: boolean }[];
  comboTriggered?: string;
  type: 'cards' | 'basic_attack' | 'ability';
}

export interface DefensePhase {
  attackerId: string;
  targetId: string;
  pendingDamage: number;
  pendingDots: { name: string; value: number; duration: number; ignoresDefense: boolean }[];
  dodged: boolean;
  multiplierApplied: number;
}

export interface ResponseChain {
  id: string;
  playerId: string;
  cardId: string;
  playerName: string;
  cardName: string;
  effect: string;
  multiplier: number;
}

export interface GameRules {
  criticalChance: number;
  criticalMultiplier: number;
  defenseTimerSecs: number;
  allowInstantCards: boolean;
  startingHandSize: number;
  maxHandSize: number;
  maxCardsPerTurn: number;
  dotsStackable: boolean;
  allowBasicAttack: boolean;
  fogOfWar: boolean;
  respawnAllowed: boolean;
}

export const DEFAULT_RULES: GameRules = {
  criticalChance: 15,
  criticalMultiplier: 2,
  defenseTimerSecs: 12,
  allowInstantCards: true,
  startingHandSize: 7,
  maxHandSize: 7,
  maxCardsPerTurn: 3,
  dotsStackable: true,
  allowBasicAttack: true,
  fogOfWar: true,
  respawnAllowed: true,
};

export interface GameState {
  gameMode: GameMode;
  teamCount: number;
  maxPlayers: number;
  players: Player[];
  deck: Deck;
  discardPile: PlayableCard[];
  currentPlayerIndex: number;
  globalTurnNumber: number;
  cardsPlayedThisTurn: number;
  maxCardsPerTurn: number;
  phase: GamePhase;
  deckSize: number;
  rules: GameRules;
  resolutionPreview?: ResolutionPreview;
  defensePhase?: DefensePhase;
  pendingActions: ResolutionPreview[];
  isResolvingEndTurn: boolean;
  revealedHands: Set<string>;
  selectedTargetId: string | null;
  selectedCardIds: string[];
  playedCardsOnBoard: { playerId: string; cards: PlayableCard[] }[];
  isResolvingChain: boolean;
  responseChain: ResponseChain[];
  pendingInstantCard: PlayableCard | null;
  winner: string | null;
  gameLog: { message: string; type: string; ts: number }[];
  canUseBasicAttack: boolean;
  viewingHandOf: string | null;
  startingPlayerMode: 'first' | 'random' | 'loser_goes_first';
  lastLoserIndex: number;
  visualConfig: VisualConfig;
  defenseChainDepth: number;
  maxChainDepth: number;
  basicAttackUsed: boolean;
  // Pedido pendiente al jugador para elegir entre opciones (cartas con `choice`)
  // Cuando está definido, la UI muestra un modal con las opciones.
  cardChoiceRequest?: { choices: { label: string; effects: any[] }[]; resolve: (idx: number) => void };
}
