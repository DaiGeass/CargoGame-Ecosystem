// ============================================================
// FILE SYSTEM - SOLO DISCO COMPARTIDO REAL
// Arch:    ~/.local/share/cargas-ecosystem
// Windows: %LOCALAPPDATA%\cargas-ecosystem
// ============================================================

import {
  ensureSharedStructure,
  readSharedText,
  writeSharedText,
  listSharedDir,
  existsShared,
  createSharedDir,
} from '../services/sharedDisk';

export const FOLDER_STRUCTURE = {
  data: 'data',
  saves: 'data/saves',
  bridge: 'data/bridge',
  mods: 'mods',
  dlc: 'dlc',
  assets: 'assets',
  music: 'assets/music',
  sfx: 'assets/sfx',
  images: 'assets/images',
};

export interface ContentPack {
  manifest: any;
  cards?: any[];
  characters?: any[];
  combos?: any[];
  folder?: string;
  source?: 'tauri' | 'browser-file';
}

class SharedDiskFileSystem {
  readonly mode = 'tauri' as const;

  async ensureFolderStructure(): Promise<void> {
    await ensureSharedStructure();
  }

  async readText(path: string): Promise<string | null> {
    return await readSharedText(path);
  }

  async writeText(path: string, content: string): Promise<boolean> {
    return await writeSharedText(path, content);
  }

  async readBinaryAsDataUrl(path: string): Promise<string | null> {
    // Los assets importados por mods deben guardarse como dataURL/texto.
    return await readSharedText(path);
  }

  async listDir(path: string): Promise<string[]> {
    return await listSharedDir(path);
  }

  async exists(path: string): Promise<boolean> {
    return await existsShared(path);
  }

  async createDir(path: string): Promise<boolean> {
    return await createSharedDir(path);
  }
}

const fsInstance = new SharedDiskFileSystem();

export function getFileSystem(): SharedDiskFileSystem {
  return fsInstance;
}

export async function loadContentPacksFromDisk(baseFolder: string): Promise<ContentPack[]> {
  const fs = getFileSystem();
  await fs.ensureFolderStructure();

  const folders = await fs.listDir(baseFolder);
  const packs: ContentPack[] = [];

  for (const folder of folders) {
    const base = `${baseFolder}/${folder}`;
    const manifestRaw = await fs.readText(`${base}/manifest.json`);
    if (!manifestRaw) continue;

    try {
      const manifest = JSON.parse(manifestRaw);
      const cardsRaw = await fs.readText(`${base}/cards.json`);
      const charsRaw = await fs.readText(`${base}/characters.json`);
      const combosRaw = await fs.readText(`${base}/combos.json`);

      packs.push({
        manifest,
        cards: cardsRaw ? JSON.parse(cardsRaw) : [],
        characters: charsRaw ? JSON.parse(charsRaw) : [],
        combos: combosRaw ? JSON.parse(combosRaw) : [],
        folder: base,
        source: 'tauri',
      });
    } catch (err) {
      console.warn(`[FileSystem] Pack inválido en ${base}:`, err);
    }
  }

  return packs;
}

export async function discoverDiskMods(baseFolder: string = FOLDER_STRUCTURE.mods): Promise<ContentPack[]> {
  return await loadContentPacksFromDisk(baseFolder);
}

export async function persistContentPackToDisk(pack: ContentPack, folderName?: string): Promise<boolean> {
  const fs = getFileSystem();
  await fs.ensureFolderStructure();

  const id = folderName || pack.manifest?.id || pack.manifest?.name || `pack_${Date.now()}`;
  const safeId = String(id).replace(/[^a-z0-9_-]/gi, '_');
  const base = `${FOLDER_STRUCTURE.mods}/${safeId}`;

  await fs.createDir(base);
  await fs.writeText(`${base}/manifest.json`, JSON.stringify(pack.manifest || {}, null, 2));
  await fs.writeText(`${base}/cards.json`, JSON.stringify(pack.cards || [], null, 2));
  await fs.writeText(`${base}/characters.json`, JSON.stringify(pack.characters || [], null, 2));
  await fs.writeText(`${base}/combos.json`, JSON.stringify(pack.combos || [], null, 2));

  return true;
}

export async function saveContentPackToDisk(pack: ContentPack, folderName?: string): Promise<boolean> {
  return await persistContentPackToDisk(pack, folderName);
}
