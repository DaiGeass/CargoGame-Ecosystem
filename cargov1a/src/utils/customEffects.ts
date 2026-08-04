// ============================================================
// REGISTRO DE EFECTOS PERSONALIZADOS (para mods)
// ============================================================
// Permite que mods registren nuevos tipos de efecto sin tocar
// el código base del juego. Los efectos personalizados se
// ejecutan junto con los efectos nativos.
//
// USO PARA MODDERS:
//   import { registerCustomEffect } from './utils/customEffects';
//
//   registerCustomEffect('mi_efecto', (effect, ctx) => {
//     // effect.amount, effect.duration, effect.customData
//     // ctx.attacker, ctx.primaryTarget, ctx.allPlayers
//     // ctx.applyDamage, ctx.applyHeal, ctx.log, etc.
//     ctx.log(`${ctx.attacker.name} usa mi efecto personalizado!`, 'special');
//   });
//
//   // En tu carta:
//   {
//     id: 'mi_carta',
//     effects: [
//       { kind: 'mi_efecto', amount: 50, customData: { ... } }
//     ]
//   }
// ============================================================

import { CardEffect, type EffectContext } from '../types/effects';

// Mapa de efectos personalizados registrados
const customEffects: Map<string, (effect: CardEffect, ctx: EffectContext) => void | Promise<void>> = new Map();

/**
 * Registra un nuevo tipo de efecto personalizado.
 * @param kind - Identificador único del efecto (ej: 'teleport', 'swap_hp')
 * @param handler - Función que ejecuta el efecto
 *
 * @example
 * registerCustomEffect('teleport', (effect, ctx) => {
 *   ctx.log(`${ctx.attacker.name} se teletransporta!`, 'special');
 *   // Lógica personalizada...
 * });
 */
export function registerCustomEffect(
  kind: string,
  handler: (effect: CardEffect, ctx: EffectContext) => void | Promise<void>
): void {
  if (customEffects.has(kind)) {
    console.warn(`[CustomEffects] Sobrescribiendo efecto registrado: ${kind}`);
  }
  customEffects.set(kind, handler);
}

/**
 * Obtiene un handler de efecto personalizado por kind.
 * @returns El handler o undefined si no está registrado
 */
export function getCustomEffectHandler(
  kind: string
): ((effect: CardEffect, ctx: EffectContext) => void | Promise<void>) | undefined {
  return customEffects.get(kind);
}

/**
 * Lista todos los efectos personalizados registrados.
 * Útil para debugging o mostrar en UI.
 */
export function listCustomEffects(): string[] {
  return Array.from(customEffects.keys());
}

/**
 * Elimina un efecto personalizado registrado.
 * Útil para mods que se desinstalan.
 */
export function unregisterCustomEffect(kind: string): boolean {
  return customEffects.delete(kind);
}

/**
 * Limpia todos los efectos personalizados registrados.
 * Útil para resetear el estado entre sesiones.
 */
export function clearCustomEffects(): void {
  customEffects.clear();
}

// ============================================================
// EJEMPLOS DE EFECTOS PERSONALIZADOS
// ============================================================
// Descomenta y adapta estos ejemplos para tus mods:

/*
// ─── Ejemplo 1: Teletransporte (intercambia posición con objetivo) ──
registerCustomEffect('teleport', (effect, ctx) => {
  ctx.log(`✨ ${ctx.attacker.name} se teletransporta hacia ${ctx.primaryTarget?.name || 'destino'}!`, 'special');
  // Aquí iría la lógica de intercambio de posición
});

// ─── Ejemplo 2: Intercambio de HP ──
registerCustomEffect('swap_hp', (effect, ctx) => {
  const attackerHp = ctx.attacker.currentHp;
  const targetHp = ctx.primaryTarget?.currentHp || 0;
  ctx.log(`🔄 ${ctx.attacker.name} intercambia HP con ${ctx.primaryTarget?.name}!`, 'special');
  // Aquí iría la lógica de intercambio
});

// ─── Ejemplo 3: Robar habilidad ──
registerCustomEffect('steal_ability', (effect, ctx) => {
  ctx.log(`🎭 ${ctx.attacker.name} roba una habilidad!`, 'special');
  // Aquí iría la lógica de robo de habilidad
});

// ─── Ejemplo 4: Daño basado en estadística ──
registerCustomEffect('stat_damage', (effect, ctx) => {
  const stat = effect.customData?.stat || 'defense';
  const multiplier = effect.customData?.multiplier || 1;
  const statValue = ctx.primaryTarget?.[stat as keyof Player] || 0;
  const damage = Math.floor(statValue * multiplier);
  ctx.applyDamage(ctx.primaryTarget!.id, damage);
  ctx.log(`💥 ${ctx.attacker.name} causa ${damage} daño basado en ${stat}!`, 'damage');
});

// ─── Ejemplo 5: Invocar criatura temporal ──
registerCustomEffect('summon_creature', (effect, ctx) => {
  const creatureName = effect.customData?.name || 'Espíritu';
  const creatureHp = effect.customData?.hp || 100;
  const duration = effect.duration || 2;
  ctx.log(`👻 ${ctx.attacker.name} invoca ${creatureName} (${creatureHp} HP, ${duration}t)!`, 'summon');
  // Aquí iría la lógica de invocación
});
*/
