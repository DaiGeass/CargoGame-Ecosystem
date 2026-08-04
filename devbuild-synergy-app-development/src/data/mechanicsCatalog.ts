// ============================================================
// MECHANICS CATALOG — CARGAS ecosystem v2
// Catálogo compartido para Juego, DevBuild y ModdingTool.
// No muta estado: sólo describe, normaliza y ayuda a validar mods.
// ============================================================

export type MechanicDanger = 'safe' | 'medium' | 'broken' | 'experimental';

export interface MechanicDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  danger: MechanicDanger;
  description: string;
  moddingHint?: string;
}

export const MECHANIC_EFFECTS: Record<string, MechanicDef> = {
  damage: {
    id: 'damage', label: 'Daño', icon: '⚔️', color: '#ef4444', danger: 'safe',
    description: 'Hace daño al objetivo. Puede ignorar defensa.',
  },
  heal: {
    id: 'heal', label: 'Curación', icon: '💚', color: '#22c55e', danger: 'safe',
    description: 'Cura HP hasta el máximo normal.',
  },
  overheal: {
    id: 'overheal', label: 'Sobrecuración', icon: '💖', color: '#f472b6', danger: 'medium',
    description: 'Cura por encima del HP máximo hasta un límite porcentual.',
    moddingHint: 'Usa amount y overhealLimitPct. Ej: { kind:"overheal", amount:80, overhealLimitPct:150 }',
  },
  restore_original_hp: {
    id: 'restore_original_hp', label: 'Restaurar HP original', icon: '🫀', color: '#fb7185', danger: 'medium',
    description: 'Si el objetivo tiene HP extra, baja a su maxHp. Si no tiene HP extra, penaliza defensa.',
    moddingHint: 'Ej: { kind:"restore_original_hp", defensePenaltyPct:25 }',
  },
  dot: {
    id: 'dot', label: 'Daño por turno', icon: '☠️', color: '#f97316', danger: 'safe',
    description: 'Daño periódico acumulable por stackKey.',
  },
  hot: {
    id: 'hot', label: 'Cura por turno', icon: '🌿', color: '#16a34a', danger: 'safe',
    description: 'Curación periódica.',
  },
  armor_break: {
    id: 'armor_break', label: 'Rompearmadura', icon: '🪓', color: '#fb923c', danger: 'medium',
    description: 'Reduce defensa actual sin bajar de cero.',
  },
  tag_convert: {
    id: 'tag_convert', label: 'Conversión de tags', icon: '🔁', color: '#38bdf8', danger: 'experimental',
    description: 'Convierte o agrega tags para sinergias.',
  },
  combo_amp: {
    id: 'combo_amp', label: 'Amplificador de combo', icon: '🌈', color: '#a78bfa', danger: 'broken',
    description: 'Aumenta el valor de combos o jugadas encadenadas.',
  },
};

export const STACK_MODE_CATALOG: Record<string, MechanicDef> = {
  combine_value_duration: {
    id: 'combine_value_duration', label: 'Suma valor y duración', icon: '📚', color: '#d946ef', danger: 'broken',
    description: 'Ejemplo: 2 venenos de 25 x3 se vuelven 50 x6.',
  },
  add_duration: {
    id: 'add_duration', label: 'Sólo suma duración', icon: '⏳', color: '#facc15', danger: 'safe',
    description: 'Mantiene valor, aumenta turnos.',
  },
  add_stacks: {
    id: 'add_stacks', label: 'Suma stacks', icon: '🧱', color: '#60a5fa', danger: 'medium',
    description: 'Aumenta stacks hasta maxStacks.',
  },
  refresh: {
    id: 'refresh', label: 'Refresca', icon: '🔄', color: '#2dd4bf', danger: 'safe',
    description: 'Conserva valor y reinicia duración.',
  },
  replace: {
    id: 'replace', label: 'Reemplaza', icon: '♻️', color: '#94a3b8', danger: 'safe',
    description: 'El efecto nuevo reemplaza al anterior.',
  },
  strongest: {
    id: 'strongest', label: 'Conserva el más fuerte', icon: '💪', color: '#f59e0b', danger: 'medium',
    description: 'Usa mayor valor y mayor duración.',
  },
  cancel_opposite: {
    id: 'cancel_opposite', label: 'Neutraliza opuestos', icon: '⚖️', color: '#e5e7eb', danger: 'medium',
    description: 'Buff/debuff opuestos se reducen entre sí.',
  },
};

export function mechanicDef(kind: string | undefined): MechanicDef | null {
  if (!kind) return null;
  return MECHANIC_EFFECTS[kind] || STACK_MODE_CATALOG[kind] || null;
}

export function normalizeEffectForCargas(effect: any): any {
  if (!effect || typeof effect !== 'object') return effect;

  const out = { ...effect };

  if (out.kind === 'heal' && out.overheal) {
    out.kind = 'overheal';
  }

  if (out.kind === 'restore_hp_original') {
    out.kind = 'restore_original_hp';
  }

  if (out.kind === 'break_armor' || out.kind === 'defense_break') {
    out.kind = 'armor_break';
  }

  if (out.amount !== undefined) out.amount = Number(out.amount || 0);
  if (out.duration !== undefined) out.duration = Number(out.duration || 0);
  if (out.overhealLimitPct !== undefined) out.overhealLimitPct = Number(out.overhealLimitPct || 150);
  if (out.defensePenaltyPct !== undefined) out.defensePenaltyPct = Number(out.defensePenaltyPct || 25);

  if (!out.label) {
    const def = mechanicDef(out.kind);
    if (def) out.label = def.label;
  }

  if (Array.isArray(out.effects)) out.effects = out.effects.map(normalizeEffectForCargas);
  if (Array.isArray(out.ifTrue)) out.ifTrue = out.ifTrue.map(normalizeEffectForCargas);
  if (Array.isArray(out.ifFalse)) out.ifFalse = out.ifFalse.map(normalizeEffectForCargas);
  if (Array.isArray(out.choices)) {
    out.choices = out.choices.map((c: any) => ({
      ...c,
      effects: Array.isArray(c.effects) ? c.effects.map(normalizeEffectForCargas) : [],
    }));
  }

  return out;
}

export function normalizeCardForCargas(card: any): any {
  if (!card || typeof card !== 'object') return card;
  return {
    ...card,
    effects: Array.isArray(card.effects) ? card.effects.map(normalizeEffectForCargas) : card.effects,
    tags: Array.isArray(card.tags) ? card.tags : [],
    synergyTags: Array.isArray(card.synergyTags) ? card.synergyTags : [],
    imageFront: card.imageFront ?? card.media?.front ?? null,
  };
}

export function estimateBrokenScore(card: any): number {
  let score = 0;
  const effects = Array.isArray(card?.effects) ? card.effects : [];

  for (const e of effects) {
    const amount = Math.abs(Number(e.amount || 0));
    if (amount >= 100) score += 2;
    if (amount >= 200) score += 4;
    if (e.ignoresDefense) score += 2;
    if (e.kind === 'overheal') score += 2;
    if (e.kind === 'combo_amp') score += 3;
    if (e.stackMode === 'combine_value_duration') score += 3;
    if (e.maxStacks && e.maxStacks > 5) score += 2;
  }

  if (Array.isArray(card?.synergies) && card.synergies.length > 2) score += 2;
  if (Array.isArray(card?.tags) && card.tags.includes('pierce')) score += 1;

  return score;
}

export function brokenLabel(score: number): string {
  if (score >= 8) return 'ROTA';
  if (score >= 5) return 'FUERTE';
  if (score >= 3) return 'PELIGROSA';
  return 'OK';
}


export const CHARACTER_PASSIVE_TEMPLATES = [
  {
    id: 'berserker_overflow',
    name: 'Furia por Exceso',
    description: 'Si tienes HP extra, tus cartas de daño ganan +20%.',
    scope: 'self',
    timing: 'on_damage_dealt',
    tags: ['overheal', 'damage', 'broken'],
    effects: [
      { kind: 'combo_amp', target: 'self', amount: 20, label: 'Furia por Exceso' } as any,
    ],
  },
  {
    id: 'team_barrier_engine',
    name: 'Motor de Barrera',
    description: 'Al final del turno, aliados con escudo ganan defensa adicional.',
    scope: 'team',
    timing: 'end_of_turn',
    tags: ['defense', 'team'],
    effects: [
      { kind: 'defense_buff', target: 'all_allies', amount: 25, label: 'Barrera de Equipo' } as any,
    ],
  },
  {
    id: 'restore_oath',
    name: 'Juramento de Carne',
    description: 'Si tienes HP extra, vuelves a HP original. Si no, pierdes defensa.',
    scope: 'self',
    timing: 'start_of_turn',
    tags: ['overheal', 'risk'],
    effects: [
      { kind: 'restore_original_hp', target: 'self', defensePenaltyPct: 25, label: 'Juramento de Carne' } as any,
    ],
  },
];

export const ADVANCED_CARD_TEMPLATES = {
  overheal: {
    id: 'bendicion_excesiva',
    name: 'Bendición Excesiva',
    type: 'healing',
    value: 0,
    description: 'Cura por encima del HP máximo.',
    effectTiming: 'immediate',
    duration: 0,
    isInstant: false,
    targetMode: 'ally_or_self',
    tags: ['cura', 'overheal', 'broken'],
    effects: [
      { kind: 'overheal', target: 'ally_or_self', amount: 120, overhealLimitPct: 150, label: 'Bendición Excesiva' },
    ],
  },
  restoreOriginalHp: {
    id: 'juramento_de_carne',
    name: 'Juramento de Carne',
    type: 'utility',
    value: 0,
    description: 'Si tienes HP extra, vuelves a HP original. Si no, pierdes 25% defensa.',
    effectTiming: 'immediate',
    duration: 0,
    isInstant: false,
    targetMode: 'self',
    tags: ['overheal', 'control'],
    effects: [
      { kind: 'restore_original_hp', target: 'self', defensePenaltyPct: 25, label: 'Voto de Restauración' },
    ],
  },
  armorBreak: {
    id: 'rompearmadura_brutal',
    name: 'Rompearmadura Brutal',
    type: 'debuff',
    value: 0,
    description: 'Reduce defensa y marca al objetivo.',
    effectTiming: 'immediate',
    duration: 0,
    isInstant: false,
    targetMode: 'enemy',
    tags: ['armor_break', 'control'],
    effects: [
      { kind: 'armor_break', target: 'enemy', amount: 75, label: 'Rompearmadura' },
      { kind: 'stack_effect', target: 'enemy', amount: 10, duration: 2, stackMode: 'add_stacks', label: 'Marcado' },
    ],
  },
};

export function makeComplexCharacterTemplate() {
  return {
    id: 'heroe_v2_' + Date.now().toString(36),
    name: 'Héroe Complejo V2',
    classType: 'warrior',
    hp: 3200,
    defense: 60,
    damage: 50,
    avatar: '🧬',
    color: '#a78bfa',
    imageFront: null,
    imageBack: null,
    passiveDescription: 'Tiene varias pasivas avanzadas.',
    teamPassiveDescription: 'Aporta pasivas de equipo.',
    passives: [CHARACTER_PASSIVE_TEMPLATES[0], CHARACTER_PASSIVE_TEMPLATES[2]],
    teamPassives: [CHARACTER_PASSIVE_TEMPLATES[1]],
    maxActiveAbilities: 8,
    uiHints: {
      role: 'Tanque híbrido / overheal',
      difficulty: 'expert',
      tags: ['overheal', 'combo', 'defense'],
      notes: 'Personaje ejemplo para probar múltiples pasivas.',
    },
    abilities: [
      { id: 'v2_h1', name: 'Golpe Excesivo', description: 'Daño aumentado si tienes HP extra', cooldown: 4, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'enemy' },
      { id: 'v2_h2', name: 'Pacto de Sangre', description: 'Sobrecuración propia', cooldown: 5, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'self' },
      { id: 'v2_h3', name: 'Rompearmadura', description: 'Reduce defensa enemiga', cooldown: 6, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'enemy' },
      { id: 'v2_h4', name: 'Reset Vital', description: 'Restaura HP original o penaliza defensa', cooldown: 7, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'self' },
      { id: 'v2_e1', name: 'Barrera Compartida', description: 'Da defensa a aliados', cooldown: 6, currentCooldown: 0, isTeamAbility: true, passive: '', canTarget: 'ally' },
      { id: 'v2_e2', name: 'Ritual de Equipo', description: 'Aumenta combos del equipo', cooldown: 8, currentCooldown: 0, isTeamAbility: true, passive: '', canTarget: 'ally' },
    ],
  };
}
