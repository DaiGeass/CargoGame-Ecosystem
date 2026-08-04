import { readPersisted, writePersisted } from '../services/persistence';
// ============================================================
// SISTEMA DE MODS / DLC / ADDONS (real, alineado con CARGAS)
// ============================================================
// IMPORTANTE: usa la MISMA clave de disco compartido que el juego
// ('cargas.installedMods.v1'), por lo que un mod creado en DevBuild
// aparece directamente en el juego CARGAS (modo web).
// ============================================================

import JSZip from 'jszip';
import { PlayableCard, CharacterCard } from '../types/game';

function extToMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'm4a': return 'audio/mp4';
    default: return 'application/octet-stream';
  }
}

async function zipFileToDataUrl(zip: JSZip, path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^(data:|https?:\/\/|\/)/i.test(path)) return path;
  const f = zip.file(path);
  if (!f) return path;
  const base64 = await f.async('base64');
  return `data:${extToMime(path)};base64,${base64}`;
}

async function inlineCardAssetsFromZip(zip: JSZip, card: PlayableCard): Promise<PlayableCard> {
  const media = card.media ? { ...card.media } : undefined;
  return {
    ...card,
    imageFront: await zipFileToDataUrl(zip, card.imageFront),
    media: media ? {
      ...media,
      image: await zipFileToDataUrl(zip, media.image),
      iconImage: await zipFileToDataUrl(zip, media.iconImage),
      soundOnHover: await zipFileToDataUrl(zip, media.soundOnHover),
      soundOnPlay: await zipFileToDataUrl(zip, media.soundOnPlay),
      soundOnResolve: await zipFileToDataUrl(zip, media.soundOnResolve),
    } : undefined,
  };
}

async function inlineCharacterAssetsFromZip(zip: JSZip, char: CharacterCard): Promise<CharacterCard> {
  const media = char.media ? { ...char.media } : undefined;
  return {
    ...char,
    imageFront: await zipFileToDataUrl(zip, char.imageFront),
    imageBack: await zipFileToDataUrl(zip, char.imageBack),
    media: media ? {
      ...media,
      imageFront: await zipFileToDataUrl(zip, media.imageFront),
      imageBack: await zipFileToDataUrl(zip, media.imageBack),
      iconImage: await zipFileToDataUrl(zip, media.iconImage),
      soundOnIntro: await zipFileToDataUrl(zip, media.soundOnIntro),
    } : undefined,
  };
}

export interface ComboMod {
  id: string;
  name: string;
  requiredCards: string[];
  description: string;
  effectDescription: string;
  isTeamCombo: boolean;
  bonusValue: number;
}

export interface ModManifest {
  id?: string;
  name: string;
  author: string;
  version: string;
  description: string;
  cards?: string[];
  characters?: string[];
  combos?: string[];
  icon?: string;
  kind?: 'mod' | 'dlc';
}

export interface LoadedMod {
  manifest: ModManifest;
  cards: PlayableCard[];
  characters: CharacterCard[];
  combos: ComboMod[];
  source: 'tauri' | 'tauri' | 'browser-file';
}

const STORAGE_KEY = 'cargas.installedMods.v1';
let loadedMods: LoadedMod[] = [];

function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

export function sanitizeId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeManifest(manifest: Partial<ModManifest>, fallbackName: string): ModManifest {
  const name = manifest.name || fallbackName || 'Mod sin nombre';
  return {
    id: manifest.id || sanitizeId(name),
    name,
    author: manifest.author || 'Desconocido',
    version: manifest.version || '1.0.0',
    description: manifest.description || 'Mod instalado por el usuario',
    cards: manifest.cards || ['cards.json'],
    characters: manifest.characters || [],
    combos: manifest.combos || [],
    icon: manifest.icon,
    kind: manifest.kind,
  };
}

function readInstalledMods(): LoadedMod[] {
  try {
    const raw = readPersisted('modsIndex');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoadedMod[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeInstalledMods(mods: LoadedMod[]) {
  writePersisted('modsIndex', JSON.stringify(mods));
}

export function getInstalledMods(): LoadedMod[] {
  loadedMods = readInstalledMods();
  return loadedMods;
}

export function getRuntimeModCards(): PlayableCard[] { return getInstalledMods().flatMap(m => m.cards || []); }
export function getRuntimeModCharacters(): CharacterCard[] { return getInstalledMods().flatMap(m => m.characters || []); }
export function getRuntimeModCombos(): ComboMod[] { return getInstalledMods().flatMap(m => m.combos || []); }

export function uninstallMod(modId: string) {
  const mods = getInstalledMods().filter(m => (m.manifest.id || sanitizeId(m.manifest.name)) !== modId);
  loadedMods = mods;
  writeInstalledMods(mods);
}

export function resetMods(): void {
  loadedMods = [];
  writePersisted('modsIndex', JSON.stringify([]));
}

export async function installModFromFile(file: File): Promise<LoadedMod> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip') || lower.endsWith('.cargasmod')) return installZipMod(await file.arrayBuffer(), file.name);
  if (lower.endsWith('.json')) return installJsonMod(await file.text(), file.name);
  throw new Error('Formato no soportado. Usa .json, .zip o .cargasmod');
}

async function installJsonMod(text: string, fileName: string): Promise<LoadedMod> {
  const json = JSON.parse(text);
  let manifest: ModManifest;
  let cards: PlayableCard[] = [];
  let characters: CharacterCard[] = [];
  let combos: ComboMod[] = [];

  if (Array.isArray(json)) {
    cards = json as PlayableCard[];
    manifest = normalizeManifest({ name: fileName.replace(/\.json$/i, ''), description: `${cards.length} cartas importadas` }, fileName);
  } else {
    manifest = normalizeManifest(json.manifest || json, fileName);
    cards = (json.cards || []) as PlayableCard[];
    characters = (json.characters || []) as CharacterCard[];
    combos = (json.combos || []) as ComboMod[];
  }

  return saveMod({
    manifest,
    cards: prefixModCardIds(cards, manifest),
    characters: prefixModCharacterIds(characters, manifest),
    combos: prefixModComboIds(combos, manifest),
    source: 'browser-file',
  });
}

async function installZipMod(buffer: ArrayBuffer, fileName: string): Promise<LoadedMod> {
  const zip = await JSZip.loadAsync(buffer);
  const manifestFile = zip.file('manifest.json');
  const manifest = manifestFile
    ? normalizeManifest(JSON.parse(await manifestFile.async('text')), fileName)
    : normalizeManifest({ name: fileName.replace(/\.(zip|cargasmod)$/i, '') }, fileName);

  if (manifest.icon) manifest.icon = await zipFileToDataUrl(zip, manifest.icon) || undefined;

  const cards: PlayableCard[] = [];
  for (const path of (manifest.cards?.length ? manifest.cards : ['cards.json'])) {
    const f = zip.file(path); if (!f) continue;
    const parsed = JSON.parse(await f.async('text'));
    cards.push(...(Array.isArray(parsed) ? parsed : parsed.cards || []));
  }
  const characters: CharacterCard[] = [];
  for (const path of (manifest.characters?.length ? manifest.characters : ['characters.json'])) {
    const f = zip.file(path); if (!f) continue;
    const parsed = JSON.parse(await f.async('text'));
    characters.push(...(Array.isArray(parsed) ? parsed : parsed.characters || []));
  }
  const combos: ComboMod[] = [];
  for (const path of (manifest.combos?.length ? manifest.combos : ['combos.json'])) {
    const f = zip.file(path); if (!f) continue;
    const parsed = JSON.parse(await f.async('text'));
    combos.push(...(Array.isArray(parsed) ? parsed : parsed.combos || []));
  }

  const inlinedCards = await Promise.all(prefixModCardIds(cards, manifest).map(c => inlineCardAssetsFromZip(zip, c)));
  const inlinedChars = await Promise.all(prefixModCharacterIds(characters, manifest).map(c => inlineCharacterAssetsFromZip(zip, c)));

  return saveMod({ manifest, cards: inlinedCards, characters: inlinedChars, combos: prefixModComboIds(combos, manifest), source: 'browser-file' });
}

function prefixModCardIds(cards: PlayableCard[], manifest: ModManifest): PlayableCard[] {
  const modId = manifest.id || sanitizeId(manifest.name);
  return cards.map((card, i) => ({
    ...card,
    id: card.id?.startsWith(`${modId}_`) ? card.id : `${modId}_${card.id || `card_${i}`}`,
    imageFront: card.imageFront || null,
  }));
}

function prefixModCharacterIds(characters: CharacterCard[], manifest: ModManifest): CharacterCard[] {
  const modId = manifest.id || sanitizeId(manifest.name);
  return characters.map((char, i) => ({
    ...char,
    id: char.id?.startsWith(`${modId}_`) ? char.id : `${modId}_${char.id || `char_${i}`}`,
    imageFront: char.imageFront || null,
    imageBack: char.imageBack || null,
    abilities: (char.abilities || []).map((ab, j) => ({
      ...ab,
      id: ab.id?.startsWith(`${modId}_`) ? ab.id : `${modId}_${char.id || `char_${i}`}_ab_${j}`,
    })),
  }));
}

function prefixModComboIds(combos: ComboMod[], manifest: ModManifest): ComboMod[] {
  const modId = manifest.id || sanitizeId(manifest.name);
  return combos.map((combo, i) => ({
    ...combo,
    id: combo.id?.startsWith(`${modId}_`) ? combo.id : `${modId}_${combo.id || `combo_${i}`}`,
  }));
}

export function saveMod(mod: LoadedMod): LoadedMod {
  const mods = getInstalledMods();
  const id = mod.manifest.id || sanitizeId(mod.manifest.name);
  const filtered = mods.filter(m => (m.manifest.id || sanitizeId(m.manifest.name)) !== id);
  const next = [...filtered, mod];
  loadedMods = next;
  writeInstalledMods(next);
  if (isTauri() && mod.source !== 'tauri') {
    persistModToDisk(mod, id).catch(err => console.warn(`No se pudo persistir el mod ${id} en disco:`, err));
  }
  return mod;
}

async function persistModToDisk(mod: LoadedMod, id: string): Promise<void> {
  try {
    const { savePackToDisk } = await import('../utils/fileSystem');
    const folder = (mod.manifest.kind === 'dlc') ? 'dlc' : 'mods';
    await savePackToDisk(folder, id, { manifest: mod.manifest, cards: mod.cards, characters: mod.characters, combos: mod.combos });
  } catch (err) { console.warn('Error persistiendo mod a disco:', err); }
}

// ─── Helpers de ESCRITURA para DevBuild ────────────────────
export function createEmptyMod(name: string, author = 'DevBuild', kind: 'mod' | 'dlc' = 'mod'): LoadedMod {
  const manifest = normalizeManifest({ name, author, kind, description: 'Creado con DevBuild' }, name);
  return saveMod({ manifest, cards: [], characters: [], combos: [], source: 'tauri' });
}

export function upsertCardInMod(modId: string, card: PlayableCard): LoadedMod | null {
  const mod = getInstalledMods().find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === modId);
  if (!mod) return null;
  const idx = mod.cards.findIndex(c => c.id === card.id);
  const cards = [...mod.cards];
  if (idx >= 0) cards[idx] = card; else cards.push(card);
  return saveMod({ ...mod, cards });
}

export function deleteCardFromMod(modId: string, cardId: string): LoadedMod | null {
  const mod = getInstalledMods().find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === modId);
  if (!mod) return null;
  return saveMod({ ...mod, cards: mod.cards.filter(c => c.id !== cardId) });
}

export function upsertCharacterInMod(modId: string, char: CharacterCard): LoadedMod | null {
  const mod = getInstalledMods().find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === modId);
  if (!mod) return null;
  const idx = mod.characters.findIndex(c => c.id === char.id);
  const characters = [...mod.characters];
  if (idx >= 0) characters[idx] = char; else characters.push(char);
  return saveMod({ ...mod, characters });
}

export function deleteCharacterFromMod(modId: string, charId: string): LoadedMod | null {
  const mod = getInstalledMods().find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === modId);
  if (!mod) return null;
  return saveMod({ ...mod, characters: mod.characters.filter(c => c.id !== charId) });
}

export async function importModWithTauriDialog(): Promise<LoadedMod | null> {
  if (!isTauri()) return null;
  try {
    const dialogMod = '@tauri-apps/plugin-' + 'dialog';
    const fsMod = '@tauri-apps/plugin-' + 'fs';
    const { open } = await import(/* @vite-ignore */ dialogMod);
    const { readFile, readTextFile } = await import(/* @vite-ignore */ fsMod);
    const selected = await open({ multiple: false, directory: false, filters: [{ name: 'CARGAS Mod', extensions: ['json', 'zip', 'cargasmod'] }] });
    if (!selected || Array.isArray(selected)) return null;
    const path = selected as string;
    if (path.toLowerCase().endsWith('.json')) return installJsonMod(await readTextFile(path), path.split(/[\\/]/).pop() || 'mod.json');
    const bytes = await readFile(path);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return installZipMod(arrayBuffer, path.split(/[\\/]/).pop() || 'mod.cargasmod');
  } catch (err) { console.error('Error importando con Tauri:', err); throw err; }
}

export function getLoadedMods(): LoadedMod[] { return getInstalledMods(); }
