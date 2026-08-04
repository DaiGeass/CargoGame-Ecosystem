// ============================================================
// MOTOR DE EFECTOS DE CARTAS (modular y extensible)
// ============================================================
// Aplica la lista de `effects` de una carta usando el `EffectContext`.
// El context recibe callbacks del store, así no acopla este motor al
// estado de Zustand. Esto permite usarlo desde tests, mods, etc.
//
// 🛠️ PARA MODDERS / DEVS:
//   Para añadir un nuevo CardEffectKind:
//     1. Añade el tipo en src/types/effects.ts → CardEffectKind
//     2. Define su interfaz si necesita campos extras
//     3. Implementa el case en applyEffect() abajo
//     4. ¡Listo! Cualquier carta puede usarlo.
//
//   Los mods pueden registrar handlers personalizados con:
//     registerEffectHandler('mi_efecto', (effect, ctx) => { ... })
// ============================================================

import { CardEffect, EffectContext, EffectCondition, ChoiceEffect, MultiTargetEffect, ConditionalEffect, StatEffect } from '../types/effects';
import { Player, ActiveEffect } from '../types/game';
import { evalFormula } from './formulas';

// ─── Registro de handlers personalizados (para mods) ──────
const customHandlers: Record<string, (effect: CardEffect, ctx: EffectContext) => void | Promise<void>> = {};

/**
 * Permite a mods registrar nuevos tipos de efecto.
 * Ejemplo: registerEffectHandler('teleport', (eff, ctx) => { ... })
 */
export function registerEffectHandler(
  kind: string,
  handler: (effect: CardEffect, ctx: EffectContext) => void | Promise<void>
) {
  customHandlers[kind] = handler;
}

// ─── Utilidades ───────────────────────────────────────────
function attachStackMeta(e: any, effect: any, fallbackMode?: string): any {
  e.stackKey = effect.stackKey;
  e.stackMode = effect.stackMode || fallbackMode;
  e.maxStacks = effect.maxStacks;
  e.maxDuration = effect.maxDuration;
  return e;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

/**
 * Resuelve un selector de objetivo a una lista de IDs de jugadores.
 */
export function resolveTargets(
  selector: string | undefined,
  ctx: EffectContext,
  fallbackId?: string
): string[] {
  const { attacker, primaryTarget, allPlayers } = ctx;
  const alive = allPlayers.filter(p => p.isAlive);
  const enemies = alive.filter(p => p.id !== attacker.id && p.teamId !== attacker.teamId);
  const allies = alive.filter(p => p.teamId === attacker.teamId || p.id === attacker.id);

  switch (selector) {
    case 'self': return [attacker.id];
    case 'enemy': return primaryTarget ? [primaryTarget.id] : (fallbackId ? [fallbackId] : []);
    case 'ally': return primaryTarget ? [primaryTarget.id] : (fallbackId ? [fallbackId] : [attacker.id]);
    case 'all_enemies': return enemies.map(p => p.id);
    case 'all_allies': return allies.map(p => p.id);
    case 'all_allies_no_self': return allies.filter(p => p.id !== attacker.id).map(p => p.id);
    case 'all_players': return alive.map(p => p.id);
    case 'random_enemy':
      return enemies.length > 0 ? [enemies[Math.floor(Math.random() * enemies.length)].id] : [];
    case 'random_ally':
      return allies.length > 0 ? [allies[Math.floor(Math.random() * allies.length)].id] : [];
    case 'lowest_hp_enemy': {
      if (!enemies.length) return [];
      const sorted = [...enemies].sort((a, b) => a.currentHp - b.currentHp);
      return [sorted[0].id];
    }
    case 'highest_hp_enemy': {
      if (!enemies.length) return [];
      const sorted = [...enemies].sort((a, b) => b.currentHp - a.currentHp);
      return [sorted[0].id];
    }
    case 'multi_enemy':
      // El jugador eligió varios objetivos previamente (en primaryTarget no aplica)
      return enemies.map(p => p.id);
    default:
      return primaryTarget ? [primaryTarget.id] : (fallbackId ? [fallbackId] : []);
  }
}

/**
 * Evalúa una condición contra el contexto.
 */
export function evalCondition(cond: EffectCondition, ctx: EffectContext, target?: Player): boolean {
  const { attacker, cardsPlayedThisTurn, turn } = ctx;
  if (cond.targetHasTag && target) {
    if (!target.activeEffects.some(e => e.tags?.includes(cond.targetHasTag!))) return false;
  }
  if (cond.attackerHasTag) {
    if (!attacker.activeEffects.some(e => e.tags?.includes(cond.attackerHasTag!))) return false;
  }
  if (cond.targetHpBelow !== undefined && target) {
    if ((target.currentHp / target.maxHp) * 100 >= cond.targetHpBelow) return false;
  }
  if (cond.targetHpAbove !== undefined && target) {
    if ((target.currentHp / target.maxHp) * 100 <= cond.targetHpAbove) return false;
  }
  if (cond.attackerHpBelow !== undefined) {
    if ((attacker.currentHp / attacker.maxHp) * 100 >= cond.attackerHpBelow) return false;
  }
  if (cond.attackerHpAbove !== undefined) {
    if ((attacker.currentHp / attacker.maxHp) * 100 <= cond.attackerHpAbove) return false;
  }
  if (cond.targetHasStatus && target) {
    if (cond.targetHasStatus === 'has_dots') {
      if (!target.activeEffects.some(e => e.timing === 'start_of_turn' || e.timing === 'end_of_turn')) return false;
    } else {
      if (!target.activeEffects.some(e => e.specialRules === cond.targetHasStatus)) return false;
    }
  }
  if (cond.cardsPlayedThisTurn !== undefined && cardsPlayedThisTurn < cond.cardsPlayedThisTurn) return false;
  if (cond.turnAbove !== undefined && turn <= cond.turnAbove) return false;
  if (cond.custom) {
    const result = evalFormula(cond.custom, { attacker, target, turn, cardsPlayed: cardsPlayedThisTurn });
    if (!result) return false;
  }
  return true;
}

/**
 * Resuelve el `amount` final de un efecto (usa formula si existe).
 */
export function resolveAmount(effect: CardEffect, ctx: EffectContext, target?: Player): number {
  if (effect.formula) {
    return evalFormula(effect.formula, {
      attacker: ctx.attacker,
      target: target || ctx.primaryTarget,
      turn: ctx.turn,
      cardsPlayed: ctx.cardsPlayedThisTurn,
    });
  }
  return effect.amount ?? 0;
}

// ─── Aplicar UNA lista de efectos ──────────────────────────
export async function applyEffects(effects: CardEffect[], ctx: EffectContext): Promise<void> {
  for (const effect of effects) {
    await applyEffect(effect, ctx);
  }
}

// ─── Aplicar UN efecto individual ──────────────────────────
export async function applyEffect(effect: CardEffect, ctx: EffectContext): Promise<void> {
  // Handler personalizado (mods)
  if (customHandlers[effect.kind]) {
    await customHandlers[effect.kind](effect, ctx);
    return;
  }

  const targets = resolveTargets(effect.target, ctx);

  switch (effect.kind) {
    case 'overheal': {
      const amount = resolveAmount(effect, ctx);
      for (const target of targets) {
        ctx.applyStatus(target.id, {
          _overheal: true,
          amount,
          overhealLimitPct: (effect as any).overhealLimitPct ?? 150,
          label: effect.label || 'Sobrecuración',
        });
      }
      ctx.log?.(`💖 Sobrecuración: +${amount} HP extra`, 'heal');
      break;
    }

    case 'restore_original_hp': {
      for (const target of targets) {
        ctx.applyStatus(target.id, {
          _restoreOriginalHp: true,
          defensePenaltyPct: (effect as any).defensePenaltyPct ?? 25,
          label: effect.label || 'Restaurar HP original',
        });
      }
      break;
    }

    case 'armor_break': {
      const amount = Math.abs(resolveAmount(effect, ctx));
      for (const target of targets) {
        ctx.applyDefense(target.id, -amount);
      }
      ctx.log?.(`🪓 Rompearmadura: -${amount} defensa`, 'debuff');
      break;
    }

    case 'tag_convert': {
      for (const target of targets) {
        ctx.applyStatus(target.id, {
          id: 'tag_convert_' + Date.now(),
          name: effect.label || 'Conversión de tag',
          value: 0,
          timing: 'end_of_turn',
          duration: effect.duration || 1,
          stacks: 1,
          sourcePlayerId: ctx.attacker.id,
          targetPlayerId: target.id,
          isStackable: false,
          ignoresDefense: false,
          specialRules: 'tag_convert',
          description: effect.label || 'Convierte tags para sinergias',
          tags: [(effect as any).toTag || 'converted'],
        });
      }
      break;
    }

    case 'combo_amp': {
      ctx.applyStatus(ctx.attacker.id, {
        id: 'combo_amp_' + Date.now(),
        name: effect.label || 'Amplificador de combo',
        value: resolveAmount(effect, ctx),
        timing: 'end_of_turn',
        duration: effect.duration || 1,
        stacks: 1,
        sourcePlayerId: ctx.attacker.id,
        targetPlayerId: ctx.attacker.id,
        isStackable: true,
        ignoresDefense: false,
        specialRules: 'combo_amp',
        description: 'Aumenta jugadas/combo y se muestra como mecánica rota',
        tags: ['combo', 'broken'],
      });
      break;
    }

    case 'damage': {
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const dmg = Math.abs(resolveAmount(effect, ctx, tgt));
        ctx.applyDamage(tid, dmg, !!effect.ignoresDefense);
        ctx.log(`💥 ${ctx.attacker.name} → ${tgt.name}: -${dmg} HP${effect.ignoresDefense ? ' (ignora defensa)' : ''}`, 'damage');
      }
      break;
    }
    case 'heal': {
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const heal = Math.abs(resolveAmount(effect, ctx, tgt));
        ctx.applyHeal(tid, heal);
        ctx.log(`💚 ${tgt.name}: +${heal} HP`, 'heal');
      }
      break;
    }
    case 'hot': {
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const healPerTurn = Math.abs(resolveAmount(effect, ctx, tgt));
        const e: ActiveEffect = {
          id: uid(),
          name: effect.label || 'Regeneración',
          value: healPerTurn,
          timing: 'start_of_turn',
          duration: effect.duration || 3,
          stacks: 1,
          sourcePlayerId: ctx.attacker.id,
          targetPlayerId: tid,
          isStackable: true,
          ignoresDefense: false,
          description: `+${healPerTurn}/t x${effect.duration || 3}`,
          tags: effect.applyTags || [effect.stackKey || 'regen'],
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`🌿 ${tgt.name} recibe ${e.name} (+${healPerTurn}/t x${e.duration})`, 'heal');
      }
      break;
    }
    case 'defense_buff': {
      for (const tid of targets) {
        const amount = resolveAmount(effect, ctx);
        ctx.applyDefense(tid, amount);
      }
      break;
    }
    case 'dot': {
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const dmgPerTurn = Math.abs(resolveAmount(effect, ctx, tgt));
        const e: ActiveEffect = {
          id: uid(),
          name: effect.label || 'DoT',
          value: -dmgPerTurn,
          timing: 'start_of_turn',
          duration: effect.duration || 3,
          stacks: 1,
          sourcePlayerId: ctx.attacker.id,
          targetPlayerId: tid,
          isStackable: true,
          ignoresDefense: true,
          description: `${dmgPerTurn}/t x${effect.duration || 3}`,
          tags: effect.applyTags || [effect.stackKey || 'dot'],
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`☠️ ${tgt.name} recibe ${e.name} (${dmgPerTurn}/t x${e.duration})`, 'damage');
      }
      break;
    }
    case 'buff_self':
    case 'debuff': {
      const stat = (effect as StatEffect).stat || 'damage';
      const isBuff = effect.kind === 'buff_self';
      const targetList = isBuff ? [ctx.attacker.id] : targets;
      for (const tid of targetList) {
        const amount = resolveAmount(effect, ctx);
        const e: ActiveEffect = {
          id: uid(),
          name: effect.label || (isBuff ? 'Buff' : 'Debuff'),
          value: isBuff ? amount : -amount,
          timing: 'immediate',
          duration: effect.duration || 2,
          stacks: 1,
          sourcePlayerId: ctx.attacker.id,
          targetPlayerId: tid,
          isStackable: !!effect.stackKey,
          ignoresDefense: false,
          description: effect.label || '',
          tags: effect.applyTags || [stat],
          specialRules: isBuff ? 'bonus_' + stat : 'debuff_' + stat,
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`${isBuff ? '💪' : '👿'} ${effect.label || stat} → ${tid}: ${isBuff ? '+' : '-'}${amount}`, isBuff ? 'buff' : 'debuff');
      }
      break;
    }
    case 'stun': {
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const e: ActiveEffect = {
          id: uid(), name: 'Aturdido', value: 0,
          timing: 'start_of_turn', duration: effect.duration || 1, stacks: 1,
          sourcePlayerId: ctx.attacker.id, targetPlayerId: tid,
          isStackable: false, ignoresDefense: false,
          description: 'Pierde próximo turno',
          specialRules: 'stunned',
          tags: effect.applyTags,
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`😵 ${tgt.name} aturdido`, 'debuff');
      }
      break;
    }
    case 'silence': {
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const e: ActiveEffect = {
          id: uid(), name: 'Silenciado', value: 0,
          timing: 'immediate', duration: effect.duration || 2, stacks: 1,
          sourcePlayerId: ctx.attacker.id, targetPlayerId: tid,
          isStackable: false, ignoresDefense: false,
          description: 'Sin habilidades',
          specialRules: 'silenced',
          tags: effect.applyTags,
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`🤐 ${tgt.name} silenciado`, 'debuff');
      }
      break;
    }
    case 'skip_turn': {
      // Equivalente a stun de 1 turno pero con un tag distinto
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const e: ActiveEffect = {
          id: uid(), name: 'Salto de turno', value: 0,
          timing: 'start_of_turn', duration: 1, stacks: 1,
          sourcePlayerId: ctx.attacker.id, targetPlayerId: tid,
          isStackable: false, ignoresDefense: false,
          description: 'Pierde el próximo turno',
          specialRules: 'stunned',
          tags: effect.applyTags,
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`⏭️ ${tgt.name} saltará su próximo turno`, 'debuff');
      }
      break;
    }
    case 'extra_turn': {
      const e: ActiveEffect = {
        id: uid(), name: 'Turno extra', value: 0,
        timing: 'immediate', duration: 1, stacks: 1,
        sourcePlayerId: ctx.attacker.id, targetPlayerId: ctx.attacker.id,
        isStackable: false, ignoresDefense: false,
        description: 'Jugarás otro turno',
        specialRules: 'extra_turn',
        tags: effect.applyTags,
      };
      ctx.applyStatus(ctx.attacker.id, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
      ctx.log(`⌛ ${ctx.attacker.name} jugará un turno extra`, 'buff');
      break;
    }
    case 'draw_cards': {
      for (const tid of targets) {
        const n = effect.amount || 1;
        ctx.drawCards(tid, n);
      }
      break;
    }
    case 'discard': {
      for (const tid of targets) {
        const n = effect.amount || 1;
        ctx.discardCards(tid, n);
      }
      break;
    }
    case 'reveal_hand': {
      for (const tid of targets) {
        ctx.revealHand(tid);
      }
      break;
    }
    case 'shield': {
      for (const tid of targets) {
        const e: ActiveEffect = {
          id: uid(), name: 'Escudo', value: resolveAmount(effect, ctx) || 9999,
          timing: 'on_damage_taken', duration: effect.duration || 1, stacks: 1,
          sourcePlayerId: ctx.attacker.id, targetPlayerId: tid,
          isStackable: false, ignoresDefense: false,
          description: 'Bloquea próximo ataque',
          specialRules: 'armed_defense',
          tags: effect.applyTags,
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`🛡️ Escudo activado en ${tid}`, 'defense');
      }
      break;
    }
    case 'reflect': {
      for (const tid of targets) {
        const e: ActiveEffect = {
          id: uid(), name: 'Espejo', value: effect.amount || 2,
          timing: 'on_damage_taken', duration: effect.duration || 2, stacks: 1,
          sourcePlayerId: ctx.attacker.id, targetPlayerId: tid,
          isStackable: false, ignoresDefense: false,
          description: `Refleja x${effect.amount || 2}`,
          specialRules: 'reflect',
          tags: effect.applyTags,
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`🪞 Reflejo activado en ${tid}`, 'buff');
      }
      break;
    }
    case 'lifesteal': {
      // damage + heal al atacante
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const dmg = Math.abs(resolveAmount(effect, ctx, tgt));
        ctx.applyDamage(tid, dmg);
        ctx.applyHeal(ctx.attacker.id, Math.floor(dmg / 2));
        ctx.log(`🩸 ${ctx.attacker.name} drena ${dmg} de ${tgt.name} (+${Math.floor(dmg/2)} HP)`, 'damage');
      }
      break;
    }
    case 'execute': {
      const threshold = effect.amount || 20; // % HP
      for (const tid of targets) {
        const tgt = ctx.allPlayers.find(p => p.id === tid);
        if (!tgt) continue;
        const pct = (tgt.currentHp / tgt.maxHp) * 100;
        if (pct < threshold) {
          ctx.applyDamage(tid, tgt.currentHp + 1, true);
          ctx.log(`💀 ${tgt.name} EJECUTADO!`, 'damage');
        } else {
          ctx.log(`⚠️ ${tgt.name} resistió (HP ${pct.toFixed(0)}% > ${threshold}%)`, 'system');
        }
      }
      break;
    }
    case 'cleanse': {
      // Limpia efectos negativos del atacante o del objetivo según selector
      for (const tid of targets.length ? targets : [ctx.attacker.id]) {
        ctx.applyStatus(tid, { _cleanse: true });
        ctx.log(`✨ Efectos negativos limpiados en ${tid}`, 'buff');
      }
      break;
    }
    case 'dispel': {
      for (const tid of targets) {
        ctx.applyStatus(tid, { _dispel: true });
        ctx.log(`💨 Buffs disipados en ${tid}`, 'debuff');
      }
      break;
    }
    case 'transfer_hp': {
      // Resta HP al atacante y se lo da al objetivo
      const amt = Math.abs(resolveAmount(effect, ctx));
      ctx.applyDamage(ctx.attacker.id, amt, true);
      for (const tid of targets) {
        ctx.applyHeal(tid, amt);
      }
      ctx.log(`💞 ${ctx.attacker.name} transfiere ${amt} HP`, 'heal');
      break;
    }
    case 'set_tag': {
      // Marca al objetivo con un tag para sinergias futuras
      for (const tid of targets) {
        const e: ActiveEffect = {
          id: uid(), name: effect.label || 'Marca', value: 0,
          timing: 'immediate', duration: effect.duration || 3, stacks: 1,
          sourcePlayerId: ctx.attacker.id, targetPlayerId: tid,
          isStackable: false, ignoresDefense: false,
          description: 'Marcado',
          tags: effect.applyTags || ['marked'],
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`🏷️ ${tid} marcado con [${(effect.applyTags || ['marked']).join(',')}]`, 'debuff');
      }
      break;
    }
    case 'stack_effect': {
      // Apila N veces el efecto definido en applyTags/stackKey
      const stacks = resolveAmount(effect, ctx) || 1;
      for (const tid of targets) {
        const e: ActiveEffect = {
          id: uid(), name: effect.label || `Apilado x${stacks}`,
          value: effect.amount || -10,
          timing: 'start_of_turn', duration: effect.duration || 3,
          stacks: Math.min(stacks, effect.maxStacks || 99),
          sourcePlayerId: ctx.attacker.id, targetPlayerId: tid,
          isStackable: true, ignoresDefense: true,
          description: `${effect.label || ''} (x${stacks})`,
          tags: effect.applyTags || [effect.stackKey || 'stack'],
        };
        ctx.applyStatus(tid, attachStackMeta(e as any, effect as any, effect.kind === 'dot' || effect.kind === 'hot' ? 'combine_value_duration' : effect.kind === 'stack_effect' ? 'add_stacks' : undefined));
        ctx.log(`📚 ${effect.label || 'Efecto'} apilado x${stacks} en ${tid}`, 'special');
      }
      break;
    }
    case 'multi_target': {
      const mt = effect as MultiTargetEffect;
      const tgtList = resolveTargets(effect.target || 'all_enemies', ctx);
      for (const tid of tgtList) {
        // Sub-context con el target específico
        const sub: EffectContext = { ...ctx, primaryTarget: ctx.allPlayers.find(p => p.id === tid) || ctx.primaryTarget };
        await applyEffects(mt.effects, sub);
      }
      break;
    }
    case 'choice': {
      const ch = effect as ChoiceEffect;
      if (!ctx.requestChoice) {
        // Sin handler de UI: aplicar la primera opción por defecto
        await applyEffects(ch.choices[0].effects, ctx);
        return;
      }
      const idx = await ctx.requestChoice(ch.choices);
      if (idx >= 0 && idx < ch.choices.length) {
        ctx.log(`🎲 ${ctx.attacker.name} eligió: ${ch.choices[idx].label}`, 'system');
        await applyEffects(ch.choices[idx].effects, ctx);
      }
      break;
    }
    case 'conditional': {
      const cnd = effect as ConditionalEffect;
      const ok = evalCondition(cnd.condition, ctx, ctx.primaryTarget);
      const list = ok ? cnd.ifTrue : (cnd.ifFalse || []);
      if (list.length) await applyEffects(list, ctx);
      break;
    }
    case 'custom':
      // Hook para mods. Si no hay handler registrado, no hace nada.
      console.warn(`Efecto 'custom' sin handler: ${effect.label}`);
      break;
    default:
      console.warn(`Tipo de efecto desconocido: ${(effect as any).kind}`);
  }
}
