// ============================================================
// SISTEMA MODULAR DE EFECTOS DE CARTAS
// ============================================================
// Este sistema permite definir CUALQUIER carta combinando efectos
// declarativos sin tocar código. Ideal para mods y DLCs.
//
// 🛠️ CÓMO AGREGAR UN NUEVO TIPO DE EFECTO:
//   1. Añade su tipo en `CardEffectKind`
//   2. Define su interfaz aquí (extiende CardEffectBase)
//   3. Impleméntalo en src/utils/effects.ts → applyEffect()
//   4. ¡Ya está disponible en cartas y mods!
//
// EJEMPLO en JSON:
//   {
//     "id": "mi_carta",
//     "effects": [
//       { "kind": "damage", "amount": 50 },
//       { "kind": "dot", "amount": 20, "duration": 3, "stackKey": "fire" },
//       { "kind": "buff_self", "stat": "damage", "amount": 10, "duration": 2 }
//     ]
//   }
// ============================================================

import { CardTag, Player } from './game';

// ─── Tipos base ────────────────────────────────────────────
export type CardEffectKind =
  | 'damage'           // Daño directo (puede usar fórmula)
  | 'heal'             // Curación inmediata
  | 'hot'              // Heal over time (curación por turno)
  | 'defense_buff'     // Sumar defensa acumulada
  | 'dot'              // Daño/efecto por turno
  | 'buff_self'        // Buff al lanzador (stat temporal)
  | 'debuff'           // Debuff al objetivo
  | 'stun'             // Aturde (pierde próximo turno)
  | 'silence'          // No puede usar habilidades
  | 'skip_turn'        // Salta el turno del objetivo
  | 'extra_turn'       // El lanzador juega otro turno
  | 'draw_cards'       // Robar N cartas
  | 'discard'          // Descartar cartas del objetivo
  | 'reveal_hand'      // Revela mano enemiga
  | 'reflect'          // Refleja próximo daño
  | 'shield'           // Bloquea próximo daño
  | 'stack_effect'     // Aplica un efecto acumulable
  | 'cleanse'          // Limpia debuffs propios
  | 'dispel'           // Quita buffs del objetivo
  | 'lifesteal'        // Daño que cura al lanzador
  | 'execute'          // Mata instantáneo si HP < umbral
  | 'transfer_hp'      // Transfiere HP entre jugadores
  | 'multi_target'     // Aplica efectos hijos a N objetivos
  | 'choice'           // Da N opciones al jugador
  | 'conditional'      // Aplica efectos si se cumple condición
  | 'set_tag'          // Marca al objetivo con un tag (para sinergias)
  | 'custom'
  | 'overheal'
  | 'restore_original_hp'
  | 'armor_break'
  | 'tag_convert'
  | 'combo_amp';          // Hook para mods con código JS

// ─── Selector de objetivo ─────────────────────────────────
export type TargetSelector =
  | 'self'                    // El lanzador
  | 'enemy'                   // 1 enemigo (el seleccionado)
  | 'ally'                    // 1 aliado
  | 'all_enemies'             // Todos los enemigos vivos
  | 'all_allies'              // Todos los aliados vivos (incluido self)
  | 'all_allies_no_self'      // Aliados sin contarse a sí mismo
  | 'all_players'             // Todos los jugadores vivos
  | 'random_enemy'            // 1 enemigo aleatorio
  | 'random_ally'             // 1 aliado aleatorio
  | 'lowest_hp_enemy'         // Enemigo con menos HP
  | 'highest_hp_enemy'        // Enemigo con más HP
  | 'multi_enemy';            // Varios enemigos elegidos por el jugador

// ─── Condiciones (para conditional, stack_effect, etc.) ──
export interface EffectCondition {
  targetHasTag?: CardTag;
  targetHpBelow?: number;     // %
  targetHpAbove?: number;     // %
  attackerHpBelow?: number;
  attackerHpAbove?: number;
  targetHasStatus?: 'stunned' | 'silenced' | 'shielded' | 'invisible' | 'has_dots';
  attackerHasTag?: CardTag;
  cardsPlayedThisTurn?: number;
  turnAbove?: number;
  custom?: string;            // Expresión booleana evaluada por el motor de fórmulas
}

// ─── Efecto base ──────────────────────────────────────────
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
  target?: TargetSelector;     // Si se omite, hereda del targetMode de la carta
  amount?: number;             // Valor numérico (o usa formula)
  formula?: string;            // Ej: "target.hp * 0.2"
  duration?: number;           // Turnos que dura
  // Si true, este daño/efecto ignora la defensa del objetivo
  ignoresDefense?: boolean;
  // Para efectos acumulables: cartas con mismo stackKey se acumulan
  stackKey?: string;
  maxStacks?: number;
  maxDuration?: number;
  stackMode?: EffectStackMode;
  // Para mostrar al jugador
  label?: string;
  // Tags que la carta aplica al objetivo (para sinergias)
  applyTags?: CardTag[];
}

// ─── Efecto: choice (da opciones) ─────────────────────────
export interface ChoiceEffect extends CardEffectBase {
  kind: 'choice';
  choices: { label: string; effects: CardEffect[] }[];
}

// ─── Efecto: multi_target ─────────────────────────────────
export interface MultiTargetEffect extends CardEffectBase {
  kind: 'multi_target';
  effects: CardEffect[];       // Efectos a aplicar a cada objetivo
  count?: number;              // Cuántos objetivos (default: 1)
}

// ─── Efecto: conditional ──────────────────────────────────
export interface ConditionalEffect extends CardEffectBase {
  kind: 'conditional';
  condition: EffectCondition;
  ifTrue: CardEffect[];
  ifFalse?: CardEffect[];
}

// ─── Efecto: stat (buff_self / debuff) ────────────────────
export interface StatEffect extends CardEffectBase {
  kind: 'buff_self' | 'debuff';
  stat: 'damage' | 'defense' | 'hp_regen';
}

// ─── Unión de todos ───────────────────────────────────────
export type CardEffect =
  | CardEffectBase
  | ChoiceEffect
  | MultiTargetEffect
  | ConditionalEffect
  | StatEffect;

// ─── Resultado de aplicar un efecto (para logs/UI) ────────
export interface EffectResult {
  effectKind: CardEffectKind;
  targetIds: string[];
  amount?: number;
  message: string;
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'system' | 'special';
}

// ─── Contexto para resolver efectos ────────────────────────
export interface EffectContext {
  attacker: Player;
  primaryTarget?: Player;
  allPlayers: Player[];
  turn: number;
  cardsPlayedThisTurn: number;
  // Callback para que el motor delegue mutaciones al store
  applyDamage: (playerId: string, amount: number, ignoreDef?: boolean) => void;
  applyHeal: (playerId: string, amount: number) => void;
  applyDefense: (playerId: string, amount: number) => void;
  applyStatus: (playerId: string, effect: any) => void;
  drawCards: (playerId: string, count: number) => void;
  discardCards: (playerId: string, count: number) => void;
  revealHand: (playerId: string) => void;
  log: (msg: string, type?: string) => void;
  // Para choice: pide al jugador (o bot) que elija
  requestChoice?: (choices: { label: string; effects: CardEffect[] }[]) => Promise<number>;
}


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
