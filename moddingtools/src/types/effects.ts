// ============================================================
// SISTEMA MODULAR DE EFECTOS DE CARTAS (real, alineado con CARGAS)
// ============================================================
import { CardTag, Player } from './game';

export type CardEffectKind =
  | 'damage' | 'heal' | 'hot' | 'defense_buff' | 'dot' | 'buff_self' | 'debuff'
  | 'stun' | 'silence' | 'skip_turn' | 'extra_turn' | 'draw_cards' | 'discard'
  | 'reveal_hand' | 'reflect' | 'shield' | 'stack_effect' | 'cleanse' | 'dispel'
  | 'lifesteal' | 'execute' | 'transfer_hp' | 'multi_target' | 'choice'
  | 'conditional' | 'set_tag' | 'custom'
  | 'overheal'
  | 'restore_original_hp'
  | 'armor_break'
  | 'tag_convert'
  | 'combo_amp';

export type TargetSelector =
  | 'self' | 'enemy' | 'ally' | 'all_enemies' | 'all_allies' | 'all_allies_no_self'
  | 'all_players' | 'random_enemy' | 'random_ally' | 'lowest_hp_enemy'
  | 'highest_hp_enemy' | 'multi_enemy';

export interface EffectCondition {
  targetHasTag?: CardTag;
  targetHpBelow?: number;
  targetHpAbove?: number;
  attackerHpBelow?: number;
  attackerHpAbove?: number;
  targetHasStatus?: 'stunned' | 'silenced' | 'shielded' | 'invisible' | 'has_dots';
  attackerHasTag?: CardTag;
  cardsPlayedThisTurn?: number;
  turnAbove?: number;
  custom?: string;
}

export type EffectStackMode =
  | 'combine_value_duration' // veneno: suma daño/curación por turno y suma duración
  | 'add_duration'           // sólo suma duración
  | 'add_stacks'             // suma stacks hasta maxStacks
  | 'refresh'                // conserva valor/stacks y refresca duración
  | 'replace'                // reemplaza el efecto anterior
  | 'strongest'              // conserva el valor más fuerte y mayor duración
  | 'cancel_opposite';       // positivos/negativos se neutralizan

export interface CardEffectBase {
  kind: CardEffectKind;
  target?: TargetSelector;
  amount?: number;
  formula?: string;
  duration?: number;
  ignoresDefense?: boolean;
  stackKey?: string;
  maxStacks?: number;
  maxDuration?: number;
  stackMode?: EffectStackMode;
  label?: string;
  applyTags?: CardTag[];
}

export interface ChoiceEffect extends CardEffectBase {
  kind: 'choice';
  choices: { label: string; effects: CardEffect[] }[];
}

export interface MultiTargetEffect extends CardEffectBase {
  kind: 'multi_target';
  effects: CardEffect[];
  count?: number;
}

export interface ConditionalEffect extends CardEffectBase {
  kind: 'conditional';
  condition: EffectCondition;
  ifTrue: CardEffect[];
  ifFalse?: CardEffect[];
}

export interface StatEffect extends CardEffectBase {
  kind: 'buff_self' | 'debuff';
  stat: 'damage' | 'defense' | 'hp_regen';
}

export type CardEffect =
  | CardEffectBase
  | ChoiceEffect
  | MultiTargetEffect
  | ConditionalEffect
  | StatEffect;

export interface EffectResult {
  effectKind: CardEffectKind;
  targetIds: string[];
  amount?: number;
  message: string;
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'system' | 'special';
}

export interface EffectContext {
  attacker: Player;
  primaryTarget?: Player;
  allPlayers: Player[];
  turn: number;
  cardsPlayedThisTurn: number;
  applyDamage: (playerId: string, amount: number, ignoreDef?: boolean) => void;
  applyHeal: (playerId: string, amount: number) => void;
  applyDefense: (playerId: string, amount: number) => void;
  applyStatus: (playerId: string, effect: any) => void;
  drawCards: (playerId: string, count: number) => void;
  discardCards: (playerId: string, count: number) => void;
  revealHand: (playerId: string) => void;
  log: (msg: string, type?: string) => void;
  requestChoice?: (choices: { label: string; effects: CardEffect[] }[]) => Promise<number>;
}

// ─── Metadata para la UI de DevBuild ───────────────────────
export const EFFECT_KIND_LABELS: Record<CardEffectKind, { label: string; icon: string; color: string }> = {
  damage: { label: 'Daño', icon: '⚔️', color: '#ef4444' },
  heal: { label: 'Curación', icon: '💚', color: '#22c55e' },
  hot: { label: 'Cura/turno', icon: '🌿', color: '#16a34a' },
  defense_buff: { label: 'Defensa', icon: '🛡️', color: '#3b82f6' },
  dot: { label: 'Daño/turno', icon: '🔥', color: '#f97316' },
  buff_self: { label: 'Buff propio', icon: '💪', color: '#a855f7' },
  debuff: { label: 'Debuff', icon: '💀', color: '#7c3aed' },
  stun: { label: 'Aturdir', icon: '💫', color: '#eab308' },
  silence: { label: 'Silenciar', icon: '🔇', color: '#64748b' },
  skip_turn: { label: 'Saltar turno', icon: '⏭️', color: '#94a3b8' },
  extra_turn: { label: 'Turno extra', icon: '🔄', color: '#06b6d4' },
  draw_cards: { label: 'Robar cartas', icon: '🎴', color: '#0ea5e9' },
  discard: { label: 'Descartar', icon: '🗑️', color: '#78716c' },
  reveal_hand: { label: 'Revelar mano', icon: '👁️', color: '#8b5cf6' },
  reflect: { label: 'Reflejar', icon: '↩️', color: '#ec4899' },
  shield: { label: 'Escudo', icon: '🔰', color: '#2563eb' },
  stack_effect: { label: 'Acumulable', icon: '📚', color: '#d946ef' },
  cleanse: { label: 'Limpiar', icon: '✨', color: '#10b981' },
  dispel: { label: 'Disipar', icon: '🌀', color: '#f43f5e' },
  lifesteal: { label: 'Robo de vida', icon: '🩸', color: '#dc2626' },
  execute: { label: 'Ejecutar', icon: '☠️', color: '#991b1b' },
  transfer_hp: { label: 'Transferir HP', icon: '🔁', color: '#be123c' },
  multi_target: { label: 'Multi-objetivo', icon: '🎯', color: '#f59e0b' },
  choice: { label: 'Elección', icon: '🔀', color: '#14b8a6' },
  conditional: { label: 'Condicional', icon: '❓', color: '#6366f1' },
  set_tag: { label: 'Marcar tag', icon: '🏷️', color: '#84cc16' },
  custom: { label: 'Custom (JS)', icon: '⚙️', color: '#475569' },
};


export interface CargasV2EffectFields {

  // CARGAS Mechanics v2
  overheal?: boolean;
  overhealLimitPct?: number;
  defensePenaltyPct?: number;
  fromTag?: CardTag | string;
  toTag?: CardTag | string;
  uiHint?: 'burst' | 'combo' | 'broken' | 'support' | 'control';
  balanceScore?: number;

}
