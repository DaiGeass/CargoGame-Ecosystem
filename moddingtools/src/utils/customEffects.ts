// ============================================================
// REGISTRO DE EFECTOS PERSONALIZADOS (real, alineado con CARGAS)
// ============================================================
import { CardEffect, type EffectContext } from '../types/effects';

const customEffects: Map<string, (effect: CardEffect, ctx: EffectContext) => void | Promise<void>> = new Map();

export function registerCustomEffect(
  kind: string,
  handler: (effect: CardEffect, ctx: EffectContext) => void | Promise<void>
): void {
  if (customEffects.has(kind)) console.warn(`[CustomEffects] Sobrescribiendo efecto registrado: ${kind}`);
  customEffects.set(kind, handler);
}

export function getCustomEffectHandler(
  kind: string
): ((effect: CardEffect, ctx: EffectContext) => void | Promise<void>) | undefined {
  return customEffects.get(kind);
}

export function listCustomEffects(): string[] {
  return Array.from(customEffects.keys());
}

export function unregisterCustomEffect(kind: string): boolean {
  return customEffects.delete(kind);
}

export function clearCustomEffects(): void {
  customEffects.clear();
}
