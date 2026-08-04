// ============================================================
// CARGAS ability runtime behavior
// Unifica habilidades base + habilidades custom DevBuild/ModdingTools
// ============================================================

import { getAbilityBehavior } from '../data/abilities';

export type RuntimeAbilityBehavior = {
  category: 'instant' | 'end_turn' | 'defense' | 'buff_self' | 'passive' | string;
  effect: 'damage' | 'heal' | 'defense' | 'buff' | 'debuff' | 'special' | string;
  timingLabel: string;
  targetMode?: string;
  area?: string;
  ignoresDefense?: boolean;
  reflectAtEnd?: boolean;
  passive?: boolean;
  [key: string]: any;
};

const n = (value: any, fallback = 0): number => {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
};

export function getAbilityRuntimeBehavior(ab: any): RuntimeAbilityBehavior {
  const registryBehavior = getAbilityBehavior(String(ab?.name || '')) as any;

  const customBehavior =
    ab?.behavior && typeof ab.behavior === 'object'
      ? ab.behavior
      : {};

  const damage = n(ab?.damage ?? ab?.value, 0);
  const healing = n(ab?.healing ?? ab?.heal, 0);
  const defense = n(ab?.defense ?? ab?.defenseChange, 0);

  const directEffect =
    ab?.effect ||
    customBehavior.effect ||
    (healing > 0 ? 'heal' : undefined) ||
    (defense !== 0 ? 'defense' : undefined) ||
    (damage > 0 ? 'damage' : undefined);

  const directCategory =
    ab?.category ||
    customBehavior.category ||
    (ab?.passive ? 'passive' : undefined);

  const targetMode =
    ab?.targetMode ||
    ab?.canTarget ||
    customBehavior.targetMode ||
    registryBehavior.targetMode;

  return {
    ...registryBehavior,
    ...customBehavior,

    category:
      directCategory ||
      customBehavior.category ||
      registryBehavior.category ||
      'instant',

    effect:
      directEffect ||
      customBehavior.effect ||
      registryBehavior.effect ||
      'damage',

    targetMode,

    area:
      ab?.area ||
      customBehavior.area ||
      registryBehavior.area ||
      targetModeToArea(targetMode),

    ignoresDefense:
      Boolean(ab?.ignoresDefense) ||
      Boolean(customBehavior.ignoresDefense) ||
      Boolean(registryBehavior.ignoresDefense),

    reflectAtEnd:
      Boolean(ab?.reflectAtEnd) ||
      Boolean(customBehavior.reflectAtEnd) ||
      Boolean(registryBehavior.reflectAtEnd),

    passive:
      Boolean(ab?.passive) ||
      Boolean(customBehavior.passive) ||
      Boolean(registryBehavior.passive),

    timingLabel:
      customBehavior.timingLabel ||
      registryBehavior.timingLabel ||
      timingLabelFor(directCategory, directEffect),
  };
}

export function targetModeToArea(targetMode?: string): string | undefined {
  if (targetMode === 'all_enemies') return 'all_enemies';
  if (targetMode === 'all_allies') return 'all_allies';
  if (targetMode === 'all_allies_no_self') return 'all_allies_no_self';
  if (targetMode === 'all_allies_or_self') return 'all_allies_or_self';
  return undefined;
}

function timingLabelFor(category?: string, effect?: string): string {
  if (category === 'passive') return '🔒 Pasiva';
  if (category === 'defense') return '🛡️ Reactiva';
  if (category === 'end_turn') return '🌙 Fin del turno';
  if (category === 'buff_self') return '💪 Buff';
  if (effect === 'heal') return '💚 Cura';
  if (effect === 'defense') return '🛡️ Defensa';
  if (effect === 'buff') return '💪 Buff';
  if (effect === 'debuff') return '🕸️ Debuff';
  return '⚡ Inmediato';
}

export function isMultiAbilityTarget(targetMode?: string): boolean {
  return (
    targetMode === 'all_enemies' ||
    targetMode === 'all_allies' ||
    targetMode === 'all_allies_no_self' ||
    targetMode === 'all_allies_or_self'
  );
}
