// ============================================================
// CARGAS ABILITY LIBRARY V2
// Shared DevBuild / ModdingTools ability creator
// ============================================================

import { readSharedJson, writeSharedJson } from './sharedDisk';

export type AbilityKind = 'active' | 'team_active' | 'passive' | 'team_passive';

export type AbilityEffect =
  | 'damage'
  | 'heal'
  | 'defense'
  | 'buff'
  | 'debuff'
  | 'special';

export type AbilityCategory =
  | 'instant'
  | 'end_turn'
  | 'defense'
  | 'buff_self'
  | 'passive';

export type AbilityTarget =
  | 'enemy'
  | 'ally'
  | 'self'
  | 'any'
  | 'ally_or_self'
  | 'all_enemies'
  | 'all_allies';

export type PassiveTiming =
  | 'always'
  | 'start_of_turn'
  | 'end_of_turn'
  | 'on_damage_dealt'
  | 'on_damage_taken'
  | 'on_heal'
  | 'on_combo';

export type AbilityDef = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  kind: AbilityKind;

  effect: AbilityEffect;
  category: AbilityCategory;
  target: AbilityTarget;

  cooldown: number;
  damage: number;
  healing: number;
  defense: number;
  duration: number;

  ignoresDefense?: boolean;
  reflectAtEnd?: boolean;
  tags?: string[];

  passiveTiming?: PassiveTiming;
  scope?: 'self' | 'team' | 'global';

  effects?: any[];
  createdAt?: string;
  updatedAt?: string;
};

type AbilityStore = {
  version: 1;
  abilities: Record<string, AbilityDef>;
  updatedAt?: string;
};

const FILE = 'data/kv/cargas.abilityLibrary.v1.json';

const emptyStore = (): AbilityStore => ({
  version: 1,
  abilities: {},
});

const now = () => new Date().toISOString();

const n = (value: any, fallback = 0) => {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
};

export function normalizeAbilityId(input: any): string {
  const raw = String(input || '').trim() || `ability_${Date.now()}`;

  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || `ability_${Date.now()}`;
}

function categoryFor(def: Partial<AbilityDef>): AbilityCategory {
  if (def.kind === 'passive' || def.kind === 'team_passive') return 'passive';
  if (def.category) return def.category;
  if (def.effect === 'defense') return 'defense';
  if (def.effect === 'buff') return 'buff_self';
  return 'instant';
}

function targetFor(def: Partial<AbilityDef>): AbilityTarget {
  if (def.target) return def.target;
  if (def.kind === 'team_active') return 'ally_or_self';
  if (def.kind === 'team_passive') return 'all_allies';
  return 'enemy';
}

export function cleanAbilityDef(input: Partial<AbilityDef> = {}): AbilityDef {
  const name = String(input.name || input.id || 'Nueva habilidad').trim();
  const id = normalizeAbilityId(input.id || name);
  const kind = (input.kind || 'active') as AbilityKind;
  const effect = (input.effect || 'damage') as AbilityEffect;

  return {
    id,
    name,
    description: String(input.description || '').trim() || 'Habilidad creada desde el editor.',
    icon: String(input.icon || '').trim() || iconFor(effect, kind),
    kind,

    effect,
    category: categoryFor({ ...input, kind, effect }),
    target: targetFor({ ...input, kind, effect }),

    cooldown: Math.max(0, n(input.cooldown, 0)),
    damage: Math.max(0, n(input.damage, effect === 'damage' ? 100 : 0)),
    healing: Math.max(0, n(input.healing, effect === 'heal' ? 100 : 0)),
    defense: n(input.defense, effect === 'defense' ? 40 : 0),
    duration: Math.max(0, n(input.duration, 0)),

    ignoresDefense: Boolean(input.ignoresDefense),
    reflectAtEnd: Boolean(input.reflectAtEnd),
    tags: Array.isArray(input.tags)
      ? input.tags.map(String).map(x => x.trim()).filter(Boolean)
      : String((input as any).tags || 'editor,ability').split(',').map(x => x.trim()).filter(Boolean),

    passiveTiming: (input.passiveTiming || 'always') as PassiveTiming,
    scope: input.scope || (kind === 'team_passive' ? 'team' : 'self'),

    effects: Array.isArray(input.effects) ? input.effects : [],
    createdAt: input.createdAt || now(),
    updatedAt: now(),
  };
}

function iconFor(effect: AbilityEffect, kind: AbilityKind): string {
  if (kind === 'passive') return '🔒';
  if (kind === 'team_passive') return '🛡️';
  if (kind === 'team_active') return '👥';
  if (effect === 'heal') return '💚';
  if (effect === 'defense') return '🛡️';
  if (effect === 'buff') return '💪';
  if (effect === 'debuff') return '🕸️';
  if (effect === 'special') return '✨';
  return '⚔️';
}

async function loadStore(): Promise<AbilityStore> {
  const raw = await readSharedJson<any>(FILE, emptyStore());

  const source = Array.isArray(raw)
    ? Object.fromEntries(raw.map((x: any) => [normalizeAbilityId(x.id || x.name), x]))
    : raw?.abilities || {};

  const abilities: Record<string, AbilityDef> = {};

  for (const value of Object.values(source || {})) {
    const clean = cleanAbilityDef(value as any);
    abilities[clean.id] = clean;
  }

  return {
    version: 1,
    abilities,
    updatedAt: raw?.updatedAt || now(),
  };
}

async function saveStore(store: AbilityStore): Promise<void> {
  await writeSharedJson(FILE, {
    version: 1,
    abilities: store.abilities || {},
    updatedAt: now(),
  });
}

export async function loadAbilityLibrary(): Promise<AbilityDef[]> {
  const store = await loadStore();
  return Object.values(store.abilities || {}).sort((a, b) =>
    `${a.kind}:${a.name}`.localeCompare(`${b.kind}:${b.name}`)
  );
}

export async function getAbilityDef(id: string): Promise<AbilityDef | null> {
  const store = await loadStore();
  return store.abilities[normalizeAbilityId(id)] || null;
}

export async function saveAbilityDef(input: Partial<AbilityDef>): Promise<AbilityDef> {
  const store = await loadStore();
  const clean = cleanAbilityDef(input);
  store.abilities[clean.id] = clean;
  await saveStore(store);
  return clean;
}

export async function deleteAbilityDef(id: string): Promise<void> {
  const store = await loadStore();
  delete store.abilities[normalizeAbilityId(id)];
  await saveStore(store);
}

export function abilityToCharacterSlot(input: Partial<AbilityDef>): any {
  const def = cleanAbilityDef(input);

  if (def.kind === 'passive' || def.kind === 'team_passive') {
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      scope: def.kind === 'team_passive' ? 'team' : def.scope || 'self',
      timing: def.passiveTiming || 'always',
      effect: def.effect,
      category: 'passive',
      damage: def.damage,
      healing: def.healing,
      defense: def.defense,
      duration: def.duration,
      tags: def.tags || [],
      effects: def.effects || [],
      source: 'abilityLibrary',
      sourceId: def.id,
    };
  }

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    type: def.effect === 'heal' ? 'heal' : def.effect === 'defense' ? 'defense' : 'attack',
    cooldown: def.cooldown,
    damage: def.damage,
    healing: def.healing,
    defense: def.defense,
    duration: def.duration,
    passive: false,
    isTeamAbility: def.kind === 'team_active',
    canTarget: def.target,
    targetMode: def.target,
    category: def.category,
    effect: def.effect,
    ignoresDefense: def.ignoresDefense,
    reflectAtEnd: def.reflectAtEnd,
    tags: def.tags || [],
    effects: def.effects || [],
    behavior: {
      category: def.category,
      effect: def.effect,
      targetMode: def.target,
      ignoresDefense: def.ignoresDefense,
      reflectAtEnd: def.reflectAtEnd,
    },
    source: 'abilityLibrary',
    sourceId: def.id,
  };
}

export async function seedExampleAbilities(): Promise<AbilityDef[]> {
  const examples: Partial<AbilityDef>[] = [
    {
      id: 'corte_editor',
      name: 'Corte Editor',
      description: 'Daño individual creado en el editor.',
      kind: 'active',
      effect: 'damage',
      category: 'instant',
      target: 'enemy',
      damage: 180,
      cooldown: 1,
    },
    {
      id: 'grito_equipo_editor',
      name: 'Grito de Equipo Editor',
      description: 'Buff de equipo creado en el editor.',
      kind: 'team_active',
      effect: 'buff',
      category: 'buff_self',
      target: 'all_allies',
      defense: 25,
      cooldown: 2,
      duration: 2,
    },
    {
      id: 'sanacion_editor',
      name: 'Sanación Editor',
      description: 'Cura individual creada en el editor.',
      kind: 'active',
      effect: 'heal',
      category: 'instant',
      target: 'ally_or_self',
      healing: 250,
      cooldown: 2,
    },
    {
      id: 'voluntad_pasiva_editor',
      name: 'Voluntad Pasiva Editor',
      description: 'Pasiva individual visible y exportable.',
      kind: 'passive',
      effect: 'buff',
      category: 'passive',
      target: 'self',
      passiveTiming: 'always',
      scope: 'self',
      defense: 10,
    },
    {
      id: 'aura_equipo_pasiva_editor',
      name: 'Aura Equipo Pasiva Editor',
      description: 'Pasiva de equipo visible y exportable.',
      kind: 'team_passive',
      effect: 'heal',
      category: 'passive',
      target: 'all_allies',
      passiveTiming: 'start_of_turn',
      scope: 'team',
      healing: 25,
    },
  ];

  const saved: AbilityDef[] = [];
  for (const ex of examples) saved.push(await saveAbilityDef(ex));
  return saved;
}

export async function exportAbilityLibraryJson(): Promise<string> {
  const store = await loadStore();
  return JSON.stringify(store, null, 2);
}
