// ============================================================
// PERSISTENCE - SOLO DISCO REAL COMPARTIDO
// Arch:    ~/.local/share/cargas-ecosystem
// Windows: %LOCALAPPDATA%\cargas-ecosystem
// ============================================================

import {
  ensureSharedStructure,
  readSharedText,
  writeSharedText,
  listSharedDir,
} from './sharedDisk';

const memoryCache = new Map<string, string>();
let cacheLoaded = false;

const KEY_PATHS: Record<string, string> = {
  visualConfig: 'data/visual.json',
  playerConfig: 'data/config.json',
  modsIndex: 'data/mods-index.json',
  lastGame: 'data/last-game.json',
};

function pathForKey(key: string): string {
  if (KEY_PATHS[key]) return KEY_PATHS[key];
  return `data/kv/${encodeURIComponent(key)}.json`;
}

function keyFromKvFile(file: string): string | null {
  if (!file.endsWith('.json')) return null;
  try {
    return decodeURIComponent(file.replace(/\.json$/, ''));
  } catch {
    return null;
  }
}

export async function loadPersistedData(): Promise<void> {
  if (cacheLoaded) return;

  await ensureSharedStructure();

  for (const [key, path] of Object.entries(KEY_PATHS)) {
    const content = await readSharedText(path);
    if (content !== null) {
      memoryCache.set(key, content);
    }
  }

  const kvFiles = await listSharedDir('data/kv').catch(() => []);
  for (const file of kvFiles) {
    const key = keyFromKvFile(file);
    if (!key) continue;

    const content = await readSharedText(`data/kv/${file}`);
    if (content !== null) {
      memoryCache.set(key, content);
    }
  }

  cacheLoaded = true;
  console.log('[Persistence] Datos cargados desde disco compartido');
}

export function readPersisted(key: string): string | null {
  if (memoryCache.has(key)) return memoryCache.get(key)!;
  return null;
}

export function writePersisted(key: string, value: string): void {
  memoryCache.set(key, value);

  writeSharedText(pathForKey(key), value).catch(err => {
    console.error(`[Persistence] Error guardando ${key} en disco compartido:`, err);
  });
}

export function readPersistedJSON<T>(key: string, fallback: T): T {
  const raw = readPersisted(key);
  if (raw === null) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writePersistedJSON(key: string, value: any): void {
  writePersisted(key, JSON.stringify(value, null, 2));
}

export async function saveGame(name: string, gameState: any): Promise<boolean> {
  const safeName = name.replace(/[^a-z0-9_-]/gi, '_');
  return await writeSharedText(`data/saves/${safeName}.json`, JSON.stringify(gameState, null, 2));
}

export async function listSaves(): Promise<string[]> {
  const files = await listSharedDir('data/saves');
  return files.filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
}

export function getPersistenceInfo(): { mode: string; keys: string[]; cacheSize: number } {
  return {
    mode: 'tauri-shared-disk',
    keys: [...Object.keys(KEY_PATHS), 'data/kv/*'],
    cacheSize: memoryCache.size,
  };
}
