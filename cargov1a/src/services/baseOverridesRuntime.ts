import { readSharedText, writeSharedText } from './sharedDisk';

export interface BaseOverridesForGame {
  cards: Record<string, any>;
  characters: Record<string, any>;
  deletedCards: string[];
  deletedCharacters: string[];
}

const EMPTY: BaseOverridesForGame = {
  cards: {},
  characters: {},
  deletedCards: [],
  deletedCharacters: [],
};

let current: BaseOverridesForGame = { ...EMPTY };
let lastRaw = '';

function normalize(value: any): BaseOverridesForGame {
  return {
    cards: value?.cards && typeof value.cards === 'object' ? value.cards : {},
    characters: value?.characters && typeof value.characters === 'object' ? value.characters : {},
    deletedCards: Array.isArray(value?.deletedCards) ? value.deletedCards : [],
    deletedCharacters: Array.isArray(value?.deletedCharacters) ? value.deletedCharacters : [],
  };
}

export function getRuntimeBaseOverrides(): BaseOverridesForGame {
  return current;
}

export async function loadBaseOverridesFromDisk(): Promise<BaseOverridesForGame> {
  const raw = await readSharedText('data/kv/cargas.baseOverrides.v1.json').catch(() => null);

  if (!raw) {
    return current;
  }

  if (raw === lastRaw) {
    return current;
  }

  try {
    current = normalize(JSON.parse(raw));
    lastRaw = raw;
    console.log('[BaseOverridesRuntime] overrides cargados desde disco compartido');
  } catch (err) {
    console.warn('[BaseOverridesRuntime] override inválido:', err);
  }

  return current;
}

export async function saveRuntimeBaseOverrides(value: BaseOverridesForGame): Promise<void> {
  current = normalize(value);
  lastRaw = JSON.stringify(current, null, 2);
  await writeSharedText('data/kv/cargas.baseOverrides.v1.json', lastRaw);
}

let timer: number | null = null;

export function startBaseOverridesRuntimeWatcher(): void {
  loadBaseOverridesFromDisk().catch(() => {});

  if (timer !== null) return;

  timer = window.setInterval(() => {
    loadBaseOverridesFromDisk().catch(() => {});
  }, 1000);
}
