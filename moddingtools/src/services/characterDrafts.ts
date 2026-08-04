// ============================================================
// CHARACTER DRAFTS V2 - ModdingTools
// Robust abilities/passives preservation
// ============================================================

import { readSharedJson, writeSharedJson } from './sharedDisk';

export type AnyCharacter = Record<string, any>;

const DRAFTS_FILE = 'data/kv/moddingtool.characterDrafts.v2.json';
const BASE_OVERRIDES_FILE = 'data/kv/cargas.baseOverrides.v1.json';

type DraftStore = {
  version: 2;
  characters: Record<string, AnyCharacter>;
  updatedAt?: string;
};

type BaseOverrides = {
  cards: Record<string, any>;
  characters: Record<string, AnyCharacter>;
  deletedCards: string[];
  deletedCharacters: string[];
  updatedAt?: string;
};

const now = () => new Date().toISOString();

const emptyDraftStore = (): DraftStore => ({
  version: 2,
  characters: {},
});

const emptyOverrides = (): BaseOverrides => ({
  cards: {},
  characters: {},
  deletedCards: [],
  deletedCharacters: [],
});

const num = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizeCharacterId(input: any): string {
  const raw = String(input || '').trim() || `personaje_${Date.now()}`;

  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || `personaje_${Date.now()}`;
}

function normalizeAbilityId(input: any, index = 0): string {
  const raw = String(input || '').trim() || `ability_${index + 1}`;

  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || `ability_${index + 1}`;
}

function cleanAbility(ab: any, index = 0): any {
  const name = String(ab?.name || ab?.id || `Habilidad ${index + 1}`).trim();
  const effect = String(ab?.effect || ab?.type || (ab?.healing ? 'heal' : ab?.defense ? 'defense' : 'damage'));

  return {
    id: normalizeAbilityId(ab?.id || name, index),
    name,
    description: String(ab?.description || '').trim(),
    icon: String(ab?.icon || '').trim(),
    type: String(ab?.type || (effect === 'heal' ? 'heal' : effect === 'defense' ? 'defense' : 'attack')),
    cooldown: Math.max(0, num(ab?.cooldown, 0)),
    damage: Math.max(0, num(ab?.damage ?? ab?.value, 0)),
    healing: Math.max(0, num(ab?.healing, 0)),
    defense: num(ab?.defense ?? ab?.defenseChange, 0),
    duration: Math.max(0, num(ab?.duration, 0)),
    passive: Boolean(ab?.passive),
    isTeamAbility: Boolean(ab?.isTeamAbility),
    canTarget: ab?.canTarget || ab?.targetMode || (ab?.isTeamAbility ? 'ally_or_self' : 'enemy'),
    targetMode: ab?.targetMode || ab?.canTarget || (ab?.isTeamAbility ? 'ally_or_self' : 'enemy'),
    category: ab?.category || ab?.behavior?.category || (effect === 'defense' ? 'defense' : effect === 'buff' ? 'buff_self' : 'instant'),
    effect,
    ignoresDefense: Boolean(ab?.ignoresDefense),
    reflectAtEnd: Boolean(ab?.reflectAtEnd),
    tags: Array.isArray(ab?.tags) ? ab.tags.map(String).filter(Boolean) : [],
    effects: Array.isArray(ab?.effects) ? ab.effects : [],
    behavior: ab?.behavior && typeof ab.behavior === 'object' ? ab.behavior : undefined,
    source: ab?.source,
    sourceId: ab?.sourceId,
  };
}

function cleanPassive(p: any, index = 0, team = false): any {
  const name = String(p?.name || p?.id || `${team ? 'Pasiva equipo' : 'Pasiva'} ${index + 1}`).trim();

  return {
    id: normalizeAbilityId(p?.id || name, index),
    name,
    description: String(p?.description || '').trim(),
    icon: String(p?.icon || (team ? '🛡️' : '🔒')),
    scope: p?.scope || (team ? 'team' : 'self'),
    timing: p?.timing || p?.passiveTiming || 'always',
    effect: p?.effect || 'buff',
    category: 'passive',
    damage: Math.max(0, num(p?.damage, 0)),
    healing: Math.max(0, num(p?.healing, 0)),
    defense: num(p?.defense, 0),
    duration: Math.max(0, num(p?.duration, 0)),
    tags: Array.isArray(p?.tags) ? p.tags.map(String).filter(Boolean) : [],
    effects: Array.isArray(p?.effects) ? p.effects : [],
    source: p?.source,
    sourceId: p?.sourceId,
  };
}

export function cleanCharacterDraft(input: AnyCharacter): AnyCharacter {
  const name = String(input?.name || input?.nombre || 'Nuevo personaje').trim();
  const id = normalizeCharacterId(input?.id || name);

  const abilities = Array.isArray(input?.abilities) && input.abilities.length
    ? input.abilities.map(cleanAbility).filter((ab: any) => !ab.passive)
    : [
        cleanAbility({
          id: 'golpe_basico_editor',
          name: 'Golpe Básico Editor',
          description: 'Habilidad básica para que el personaje sea jugable.',
          effect: 'damage',
          type: 'attack',
          damage: 100,
          cooldown: 0,
          canTarget: 'enemy',
        }, 0),
      ];

  const passives = Array.isArray(input?.passives)
    ? input.passives.map((p: any, i: number) => cleanPassive(p, i, false))
    : [];

  const teamPassives = Array.isArray(input?.teamPassives)
    ? input.teamPassives.map((p: any, i: number) => cleanPassive(p, i, true))
    : [];

  return {
    ...input,
    id,
    name,
    avatar: String(input?.avatar || '🧬'),
    color: String(input?.color || '#22d3ee'),
    class: input?.class || input?.role || 'warrior',
    hp: Math.max(1, num(input?.hp ?? input?.maxHp, 3000)),
    maxHp: Math.max(1, num(input?.maxHp ?? input?.hp, 3000)),
    defense: num(input?.defense ?? input?.defensa, 20),
    damage: num(input?.damage, 100),
    speed: num(input?.speed, 10),
    tags: Array.isArray(input?.tags)
      ? input.tags.map(String).filter(Boolean)
      : String(input?.tags || 'editor').split(',').map(x => x.trim()).filter(Boolean),
    passiveDescription: String(input?.passiveDescription || passives.map((p: any) => p.name).join(' · ') || ''),
    teamPassiveDescription: String(input?.teamPassiveDescription || teamPassives.map((p: any) => p.name).join(' · ') || ''),
    abilities,
    passives,
    teamPassives,
    __source: 'editor',
    __sourceId: 'baseOverrides',
    __sourceName: 'Editor / Overrides',
    updatedAt: now(),
  };
}

async function loadDraftStore(): Promise<DraftStore> {
  const raw = await readSharedJson<any>(DRAFTS_FILE, emptyDraftStore());
  const source = raw?.characters || raw?.drafts || {};
  const characters: Record<string, AnyCharacter> = {};

  for (const value of Object.values(source || {})) {
    const clean = cleanCharacterDraft(value as AnyCharacter);
    characters[clean.id] = clean;
  }

  return {
    version: 2,
    characters,
    updatedAt: raw?.updatedAt || now(),
  };
}

async function saveDraftStore(store: DraftStore): Promise<void> {
  await writeSharedJson(DRAFTS_FILE, {
    version: 2,
    characters: store.characters || {},
    updatedAt: now(),
  });
}

export async function loadCharacterDrafts(): Promise<AnyCharacter[]> {
  const store = await loadDraftStore();
  return Object.values(store.characters || {}).sort((a: any, b: any) =>
    String(a.name || a.id).localeCompare(String(b.name || b.id))
  );
}

export async function getCharacterDraft(id: string): Promise<AnyCharacter | null> {
  const store = await loadDraftStore();
  return store.characters[normalizeCharacterId(id)] || null;
}

export async function saveCharacterDraft(character: AnyCharacter): Promise<AnyCharacter> {
  const store = await loadDraftStore();
  const clean = cleanCharacterDraft(character);
  store.characters[clean.id] = clean;
  await saveDraftStore(store);
  return clean;
}

export async function deleteCharacterDraft(id: string): Promise<void> {
  const store = await loadDraftStore();
  delete store.characters[normalizeCharacterId(id)];
  await saveDraftStore(store);
}

export async function loadGameOverrides(): Promise<BaseOverrides> {
  const raw = await readSharedJson<any>(BASE_OVERRIDES_FILE, emptyOverrides());

  return {
    cards: raw?.cards || {},
    characters: raw?.characters || {},
    deletedCards: Array.isArray(raw?.deletedCards) ? raw.deletedCards : [],
    deletedCharacters: Array.isArray(raw?.deletedCharacters) ? raw.deletedCharacters : [],
    updatedAt: raw?.updatedAt,
  };
}

export async function saveGameOverrides(overrides: BaseOverrides): Promise<void> {
  await writeSharedJson(BASE_OVERRIDES_FILE, {
    cards: overrides.cards || {},
    characters: overrides.characters || {},
    deletedCards: overrides.deletedCards || [],
    deletedCharacters: overrides.deletedCharacters || [],
    updatedAt: now(),
  });
}

export async function applyCharacterDraftToGame(character: AnyCharacter): Promise<AnyCharacter> {
  const clean = cleanCharacterDraft(character);
  const overrides = await loadGameOverrides();

  overrides.characters = overrides.characters || {};
  overrides.deletedCharacters = (overrides.deletedCharacters || []).filter(id => id !== clean.id);
  overrides.characters[clean.id] = clean;

  await saveGameOverrides(overrides);
  await saveCharacterDraft(clean);

  return clean;
}

export async function removeCharacterFromGame(id: string): Promise<void> {
  const cleanId = normalizeCharacterId(id);
  const overrides = await loadGameOverrides();

  if (overrides.characters) delete overrides.characters[cleanId];
  overrides.deletedCharacters = Array.from(new Set([...(overrides.deletedCharacters || []), cleanId]));

  await saveGameOverrides(overrides);
}

export async function syncCharacterDraftsToGame(): Promise<AnyCharacter[]> {
  const drafts = await loadCharacterDrafts();
  const applied: AnyCharacter[] = [];

  for (const draft of drafts) {
    applied.push(await applyCharacterDraftToGame(draft));
  }

  return applied;
}

export async function createExampleCharacter(): Promise<AnyCharacter> {
  const id = `personaje_editor_${Date.now()}`;

  const character = cleanCharacterDraft({
    id,
    name: 'Personaje Editor V2',
    avatar: '🧬',
    color: '#22d3ee',
    hp: 3200,
    maxHp: 3200,
    defense: 25,
    damage: 120,
    speed: 10,
    tags: ['editor', 'v2'],
    abilities: [
      {
        id: 'corte_editor',
        name: 'Corte Editor',
        description: 'Daño individual.',
        effect: 'damage',
        type: 'attack',
        damage: 150,
        cooldown: 0,
        canTarget: 'enemy',
      },
      {
        id: 'grito_equipo_editor',
        name: 'Grito de Equipo Editor',
        description: 'Habilidad de equipo.',
        effect: 'buff',
        type: 'attack',
        defense: 20,
        cooldown: 2,
        isTeamAbility: true,
        canTarget: 'all_allies',
      },
    ],
    passives: [
      {
        id: 'pasiva_editor',
        name: 'Pasiva Editor',
        description: '+10 defensa conceptual.',
        timing: 'always',
        scope: 'self',
        defense: 10,
      },
    ],
    teamPassives: [
      {
        id: 'aura_equipo_editor',
        name: 'Aura Equipo Editor',
        description: 'Aura de equipo conceptual.',
        timing: 'start_of_turn',
        scope: 'team',
        healing: 25,
      },
    ],
  });

  await saveCharacterDraft(character);
  return character;
}
