import { readPersisted, writePersisted } from '../services/persistence';
// ============================================================
// SISTEMA DE MODS / DLC / ADDONS
// ============================================================

import JSZip from 'jszip';
import { PlayableCard, CharacterCard } from '../types/game';

// ─── Helpers de assets embebidos ───────────────────────────
// Convierte archivos dentro de un ZIP a data URLs para que funcionen
// en web y empaquetado sin depender de rutas externas.
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
  // Si ya es URL absoluta o data URL, dejarlo igual
  if (/^(data:|https?:\/\/|\/)/i.test(path)) return path;
  const f = zip.file(path);
  if (!f) return path; // fallback: dejar la ruta tal cual
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
  // Tipo explícito de paquete: 'mod' o 'dlc'. Si no se define,
  // se infiere por convención (id 'dlc_*' o nombre con 'dlc/expansión').
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

function sanitizeId(text: string): string {
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
  };
}

function readInstalledMods(): LoadedMod[] {
  try {
    const raw = readPersisted('modsIndex');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoadedMod[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInstalledMods(mods: LoadedMod[]) {
  writePersisted('modsIndex', JSON.stringify(mods));
}

export function getInstalledMods(): LoadedMod[] {
  loadedMods = readInstalledMods();
  return loadedMods;
}

export function getRuntimeModCards(): PlayableCard[] {
  return getInstalledMods().flatMap(mod => mod.cards || []);
}

export function getRuntimeModCharacters(): CharacterCard[] {
  return getInstalledMods().flatMap(mod => mod.characters || []);
}

export function getRuntimeModCombos(): ComboMod[] {
  return getInstalledMods().flatMap(mod => mod.combos || []);
}

export function uninstallMod(modId: string) {
  const mods = getInstalledMods().filter(mod => (mod.manifest.id || sanitizeId(mod.manifest.name)) !== modId);
  loadedMods = mods;
  writeInstalledMods(mods);
}

export function resetMods(): void {
  loadedMods = [];
  writePersisted('modsIndex', JSON.stringify([]));
}

export async function installModFromFile(file: File): Promise<LoadedMod> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip') || lower.endsWith('.cargasmod')) {
    return installZipMod(await file.arrayBuffer(), file.name);
  }
  if (lower.endsWith('.json')) {
    const text = await file.text();
    return installJsonMod(text, file.name);
  }
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
    source: 'browser-file'
  });
}

async function installZipMod(buffer: ArrayBuffer, fileName: string): Promise<LoadedMod> {
  const zip = await JSZip.loadAsync(buffer);
  const manifestFile = zip.file('manifest.json');
  const manifest = manifestFile
    ? normalizeManifest(JSON.parse(await manifestFile.async('text')), fileName)
    : normalizeManifest({ name: fileName.replace(/\.(zip|cargasmod)$/i, '') }, fileName);

  // Incrustar el icono del mod si viene dentro del ZIP
  if (manifest.icon) {
    manifest.icon = await zipFileToDataUrl(zip, manifest.icon) || undefined;
  }

  let cards: PlayableCard[] = [];
  const cardFiles = manifest.cards?.length ? manifest.cards : ['cards.json'];
  for (const path of cardFiles) {
    const f = zip.file(path);
    if (!f) continue;
    const parsed = JSON.parse(await f.async('text'));
    cards.push(...(Array.isArray(parsed) ? parsed : parsed.cards || []));
  }

  let characters: CharacterCard[] = [];
  const charFiles = manifest.characters?.length ? manifest.characters : ['characters.json'];
  for (const path of charFiles) {
    const f = zip.file(path);
    if (!f) continue;
    const parsed = JSON.parse(await f.async('text'));
    characters.push(...(Array.isArray(parsed) ? parsed : parsed.characters || []));
  }

  let combos: ComboMod[] = [];
  const comboFiles = manifest.combos?.length ? manifest.combos : ['combos.json'];
  for (const path of comboFiles) {
    const f = zip.file(path);
    if (!f) continue;
    const parsed = JSON.parse(await f.async('text'));
    combos.push(...(Array.isArray(parsed) ? parsed : parsed.combos || []));
  }

  // Incrustar imágenes/sonidos del ZIP como data URLs para que funcionen
  // en web y empaquetado sin depender de rutas locales del usuario.
  const prefixedCards = prefixModCardIds(cards, manifest);
  const prefixedChars = prefixModCharacterIds(characters, manifest);
  const inlinedCards = await Promise.all(prefixedCards.map(c => inlineCardAssetsFromZip(zip, c)));
  const inlinedChars = await Promise.all(prefixedChars.map(c => inlineCharacterAssetsFromZip(zip, c)));

  return saveMod({
    manifest,
    cards: inlinedCards,
    characters: inlinedChars,
    combos: prefixModComboIds(combos, manifest),
    source: 'browser-file'
  });
}

function prefixModCardIds(cards: PlayableCard[], manifest: ModManifest): PlayableCard[] {
  const modId = manifest.id || sanitizeId(manifest.name);
  return cards.map((card, i) => ({
    ...card,
    id: card.id.startsWith(`${modId}_`) ? card.id : `${modId}_${card.id || `card_${i}`}`,
    imageFront: card.imageFront || `/placeholders/mod_${modId}_${i}.png`,
  }));
}

function prefixModCharacterIds(characters: CharacterCard[], manifest: ModManifest): CharacterCard[] {
  const modId = manifest.id || sanitizeId(manifest.name);
  return characters.map((char, i) => ({
    ...char,
    id: char.id.startsWith(`${modId}_`) ? char.id : `${modId}_${char.id || `char_${i}`}`,
    imageFront: char.imageFront || `/placeholders/mod_${modId}_char_${i}_front.png`,
    imageBack: char.imageBack || `/placeholders/mod_${modId}_char_${i}_back.png`,
    abilities: (char.abilities || []).map((ab, j) => ({
      ...ab,
      id: ab.id.startsWith(`${modId}_`) ? ab.id : `${modId}_${char.id || `char_${i}`}_ab_${j}`,
    }))
  }));
}

function prefixModComboIds(combos: ComboMod[], manifest: ModManifest): ComboMod[] {
  const modId = manifest.id || sanitizeId(manifest.name);
  return combos.map((combo, i) => ({
    ...combo,
    id: combo.id.startsWith(`${modId}_`) ? combo.id : `${modId}_${combo.id || `combo_${i}`}`,
  }));
}

function saveMod(mod: LoadedMod): LoadedMod {
  const mods = getInstalledMods();
  const id = mod.manifest.id || sanitizeId(mod.manifest.name);
  const filtered = mods.filter(m => (m.manifest.id || sanitizeId(m.manifest.name)) !== id);
  const next = [...filtered, mod];
  loadedMods = next;
  writeInstalledMods(next);
  // Si estamos en Tauri y el mod no vino del disco, escribirlo a la
  // carpeta mods/ para que persista entre sesiones (en background).
  if (isTauri() && mod.source !== 'tauri') {
    persistModToDisk(mod, id).catch(err =>
      console.warn(`No se pudo persistir el mod ${id} en disco:`, err));
  }
  return mod;
}

// Escribe un mod a la carpeta mods/<id>/ del disco (Tauri).
async function persistModToDisk(mod: LoadedMod, id: string): Promise<void> {
  try {
    const { savePackToDisk } = await import('../utils/fileSystem');
    const folder = (mod.manifest.kind === 'dlc') ? 'dlc' : 'mods';
    await savePackToDisk(folder, id, {
      manifest: mod.manifest,
      cards: mod.cards,
      characters: mod.characters,
      combos: mod.combos,
    });
    console.log(`💾 Mod "${mod.manifest.name}" guardado en ${folder}/${id}/`);
  } catch (err) {
    console.warn('Error persistiendo mod a disco:', err);
  }
}

export async function importModWithTauriDialog(): Promise<LoadedMod | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile, readTextFile } = await import('@tauri-apps/plugin-fs');
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'CARGAS Mod', extensions: ['json', 'zip', 'cargasmod'] }],
    });
    if (!selected || Array.isArray(selected)) return null;
    const path = selected as string;
    if (path.toLowerCase().endsWith('.json')) {
      return installJsonMod(await readTextFile(path), path.split(/[\\/]/).pop() || 'mod.json');
    }
    const bytes = await readFile(path);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return installZipMod(arrayBuffer, path.split(/[\\/]/).pop() || 'mod.cargasmod');
  } catch (err) {
    console.error('Error importando con Tauri:', err);
    throw err;
  }
}

export async function loadMods(): Promise<PlayableCard[]> {
  loadedMods = getInstalledMods();
  return getRuntimeModCards();
}

export function getLoadedMods(): LoadedMod[] {
  return getInstalledMods();
}

// ─── Carga de mods + DLC desde disco (Tauri) ────────────────
// Lee los mods de /mods y los DLC de /dlc, e incrusta sus assets
// locales (imágenes/sonidos de las carpetas images/ y sounds/).
export async function loadModsFromInstallFolder(): Promise<LoadedMod[]> {
  try {
    const { loadModsFromDisk, loadDlcFromDisk, getFileSystem } = await import('../utils/fileSystem');
    const fs = getFileSystem();
    if (fs.mode !== 'tauri') return [];

    // Cargar mods Y DLC desde sus carpetas respectivas
    const diskMods = [...await loadModsFromDisk(), ...await loadDlcFromDisk()];
    const loaded: LoadedMod[] = [];

    for (const dm of diskMods) {
      const manifest = normalizeManifest(dm.manifest, dm.manifest.name || 'Mod');
      const modId = manifest.id || sanitizeId(manifest.name);

      // Incrustar assets locales (images/ y sounds/ dentro de la carpeta del mod)
      const inlineAsset = async (relPath: string | null | undefined): Promise<string | null> => {
        if (!relPath) return null;
        if (/^(data:|https?:\/\/)/i.test(relPath)) return relPath;
        const mime = relPath.endsWith('.png') ? 'image/png'
          : relPath.endsWith('.jpg') || relPath.endsWith('.jpeg') ? 'image/jpeg'
          : relPath.endsWith('.webp') ? 'image/webp'
          : relPath.endsWith('.svg') ? 'image/svg+xml'
          : relPath.endsWith('.mp3') ? 'audio/mpeg'
          : relPath.endsWith('.wav') ? 'audio/wav'
          : relPath.endsWith('.ogg') ? 'audio/ogg'
          : 'application/octet-stream';
        return await fs.readBinaryAsDataUrl(`${dm.folder}/${relPath}`, mime);
      };

      const cards: PlayableCard[] = [];
      for (const c of prefixModCardIds(dm.cards, manifest)) {
        cards.push({
          ...c,
          imageFront: await inlineAsset(c.imageFront as string),
          media: c.media ? {
            ...c.media,
            image: await inlineAsset(c.media.image),
            iconImage: await inlineAsset(c.media.iconImage),
            soundOnHover: await inlineAsset(c.media.soundOnHover),
            soundOnPlay: await inlineAsset(c.media.soundOnPlay),
            soundOnResolve: await inlineAsset(c.media.soundOnResolve),
          } : undefined,
        });
      }

      const chars: CharacterCard[] = [];
      for (const ch of prefixModCharacterIds(dm.characters, manifest)) {
        chars.push({
          ...ch,
          imageFront: await inlineAsset(ch.imageFront as string),
          imageBack: await inlineAsset(ch.imageBack as string),
          media: ch.media ? {
            ...ch.media,
            imageFront: await inlineAsset(ch.media.imageFront),
            imageBack: await inlineAsset(ch.media.imageBack),
            iconImage: await inlineAsset(ch.media.iconImage),
            soundOnIntro: await inlineAsset(ch.media.soundOnIntro),
          } : undefined,
        });
      }

      const mod: LoadedMod = {
        manifest,
        cards,
        characters: chars,
        combos: prefixModComboIds(dm.combos, manifest),
        source: 'tauri',
      };
      saveMod(mod);
      loaded.push(mod);
      const kindLabel = dm.kind === 'dlc' ? 'DLC' : 'Mod';
      console.log(`📦 ${kindLabel} cargado desde disco: ${manifest.name} (${modId})`);
    }

    return loaded;
  } catch (err) {
    console.error('Error cargando mods desde carpeta de instalación:', err);
    return [];
  }
}
