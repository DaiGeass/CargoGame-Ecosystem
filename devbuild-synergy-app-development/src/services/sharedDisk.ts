// ============================================================
// CARGAS SHARED DISK BRIDGE
// DevBuild / ModdingTools -> CARGAS
//
// Windows fix:
// - Lee AppData/Local/cargas-ecosystem
// - Lee AppData/Roaming/cargas-ecosystem
// - Escribe en ambas para compatibilidad
// ============================================================

import { exists, mkdir, readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';

const isTauriRuntime = () =>
  typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

const normalizeRel = (rel: string) =>
  String(rel || '')
    .split('\\')
    .join('/')
    .replace(/^\/+/g, '')
    .replace(/\/+/g, '/');

function isWindowsRuntime(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  return ua.includes('windows') || ua.includes('win64') || ua.includes('win32');
}

function isMacRuntime(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  return ua.includes('mac');
}

async function candidateRoots(): Promise<string[]> {
  if (!isTauriRuntime()) return ['browser-local'];

  const home = await homeDir();

  if (isWindowsRuntime()) {
    return [
      await join(home, 'AppData', 'Local', 'cargas-ecosystem'),
      await join(home, 'AppData', 'Roaming', 'cargas-ecosystem'),
    ];
  }

  if (isMacRuntime()) {
    return [
      await join(home, 'Library', 'Application Support', 'cargas-ecosystem'),
    ];
  }

  return [
    await join(home, '.local', 'share', 'cargas-ecosystem'),
  ];
}

async function pathAt(root: string, rel = ''): Promise<string> {
  const clean = normalizeRel(rel);
  if (!clean) return root;
  return await join(root, ...clean.split('/').filter(Boolean));
}

export async function getSharedRoot(): Promise<string> {
  const roots = await candidateRoots();

  if (!isTauriRuntime()) return roots[0];

  // Preferir la raíz donde ya exista game.json.
  for (const root of roots) {
    const p = await pathAt(root, 'data/presence/game.json');
    if (await exists(p).catch(() => false)) return root;
  }

  // Si no existe game.json todavía, usar Local en Windows.
  return roots[0];
}

export async function sharedPath(rel = ''): Promise<string> {
  return await pathAt(await getSharedRoot(), rel);
}

const REQUIRED_DIRS = [
  '',
  'data',
  'data/api',
  'data/kv',
  'data/presence',
  'data/bridge',
  'mods',
  'dlc',
  'logs',
  'saves',
];

async function ensureDirsAt(root: string): Promise<void> {
  for (const dir of REQUIRED_DIRS) {
    await mkdir(await pathAt(root, dir), { recursive: true }).catch(() => {});
  }
}

export async function ensureSharedDirs(): Promise<void> {
  if (!isTauriRuntime()) return;

  const roots = await candidateRoots();
  for (const root of roots) {
    await ensureDirsAt(root);
  }
}

export const ensureSharedStructure = ensureSharedDirs;
export const ensureSharedDiskStructure = ensureSharedDirs;
export const ensureCargasEcosystemDirs = ensureSharedDirs;

async function ensureParentAt(root: string, rel: string): Promise<void> {
  const clean = normalizeRel(rel);
  const parts = clean.split('/').filter(Boolean);
  parts.pop();

  if (!parts.length) return;
  await mkdir(await pathAt(root, parts.join('/')), { recursive: true }).catch(() => {});
}

export async function fileExists(rel: string): Promise<boolean> {
  const clean = normalizeRel(rel);

  if (!isTauriRuntime()) {
    return localStorage.getItem('cargas-shared:' + clean) !== null;
  }

  await ensureSharedDirs();

  const roots = await candidateRoots();
  for (const root of roots) {
    if (await exists(await pathAt(root, clean)).catch(() => false)) return true;
  }

  return false;
}

export const existsShared = fileExists;
export const sharedExists = fileExists;

export async function createSharedDir(rel = ''): Promise<boolean> {
  const clean = normalizeRel(rel);

  if (!isTauriRuntime()) {
    localStorage.setItem('cargas-shared-dir:' + clean, '1');
    return true;
  }

  const roots = await candidateRoots();
  let ok = false;

  for (const root of roots) {
    try {
      await mkdir(await pathAt(root, clean), { recursive: true });
      ok = true;
    } catch {}
  }

  return ok;
}

export const mkdirShared = createSharedDir;

export async function readSharedText(rel: string, fallback: string | null = null): Promise<string | null> {
  const clean = normalizeRel(rel);

  if (!isTauriRuntime()) {
    return localStorage.getItem('cargas-shared:' + clean) ?? fallback;
  }

  await ensureSharedDirs();

  const roots = await candidateRoots();
  for (const root of roots) {
    const p = await pathAt(root, clean);

    try {
      if (!(await exists(p).catch(() => false))) continue;
      return await readTextFile(p);
    } catch (err) {
      console.warn('[sharedDisk] read failed:', p, err);
    }
  }

  return fallback;
}

export async function writeSharedText(rel: string, text: string): Promise<boolean> {
  const clean = normalizeRel(rel);

  if (!isTauriRuntime()) {
    localStorage.setItem('cargas-shared:' + clean, text);
    return true;
  }

  await ensureSharedDirs();

  const roots = await candidateRoots();
  let wrote = false;

  for (const root of roots) {
    try {
      await ensureParentAt(root, clean);
      await writeTextFile(await pathAt(root, clean), text);
      wrote = true;
    } catch (err) {
      console.warn('[sharedDisk] write failed:', root, clean, err);
    }
  }

  return wrote;
}

export async function readSharedJson<T = any>(rel: string, fallback: T): Promise<T> {
  const raw = await readSharedText(rel, null);

  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn('[sharedDisk] JSON inválido:', rel, err);
    return fallback;
  }
}

export async function writeSharedJson(rel: string, value: any): Promise<boolean> {
  return await writeSharedText(rel, JSON.stringify(value, null, 2));
}

export const readJson = readSharedJson;
export const writeJson = writeSharedJson;
export const readSharedJSON = readSharedJson;
export const writeSharedJSON = writeSharedJson;

export async function listSharedDir(rel = ''): Promise<string[]> {
  const clean = normalizeRel(rel);

  if (!isTauriRuntime()) {
    const prefix = 'cargas-shared:' + (clean ? clean + '/' : '');
    return Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(prefix.length).split('/')[0])
      .filter(Boolean)
      .sort();
  }

  await ensureSharedDirs();

  const out = new Set<string>();
  const roots = await candidateRoots();

  for (const root of roots) {
    const dir = await pathAt(root, clean);

    try {
      if (!(await exists(dir).catch(() => false))) continue;

      const entries = await readDir(dir);
      for (const entry of entries as any[]) {
        const name = entry?.name || String(entry?.path || '').split(/[\\/]/).pop();
        if (name) out.add(name);
      }
    } catch (err) {
      console.warn('[sharedDisk] list failed:', dir, err);
    }
  }

  return [...out].sort();
}

export async function getSharedDebugInfo(): Promise<any> {
  const roots = await candidateRoots();

  const existingRoots: string[] = [];
  if (isTauriRuntime()) {
    for (const root of roots) {
      if (await exists(root).catch(() => false)) existingRoots.push(root);
    }
  }

  return {
    mode: isTauriRuntime() ? 'tauri-shared-disk' : 'browser-local',
    sharedRoot: await getSharedRoot(),
    roots,
    existingRoots,
    presenceGame: await fileExists('data/presence/game.json'),
    gameApi: await fileExists('data/api/game-api.json'),
    gameContent: await fileExists('data/api/game-content.json'),
  };
}
