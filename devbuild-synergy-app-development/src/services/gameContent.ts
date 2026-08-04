// ============================================================
// GAME CONTENT — lee el contenido REAL publicado por CARGAS
// ============================================================
// Fuente real entre .exe separados:
//   data/api/game-content.json
//
// window.CARGAS_API NO sirve entre procesos separados.
// ============================================================

import { PlayableCard, CharacterCard } from '../types/game';
import { allBaseCards, getAllCharacters, getAllCombos, Combo } from '../data/cards';
import { getBaseOverrides } from '../data/registries';
import { readSharedText } from './sharedDisk';

let snapshotCache: any | null = null;
let lastLoad = 0;

function stripSource<T extends Record<string, any>>(item: T): T {
  const { __source, __sourceId, __sourceName, ...rest } = item;
  return rest as T;
}

export async function refreshGameContentSnapshot(): Promise<any | null> {
  const raw = await readSharedText('data/api/game-content.json').catch(() => null);
  if (!raw) return snapshotCache;

  try {
    snapshotCache = JSON.parse(raw);
    lastLoad = Date.now();
    return snapshotCache;
  } catch {
    return snapshotCache;
  }
}

export function isGameConnected(): boolean {
  return Boolean(snapshotCache && Date.now() - Number(snapshotCache.publishedAt || 0) < 10000);
}

export function getGameContentSnapshot(): any | null {
  return snapshotCache;
}

export function collectBaseCards(): PlayableCard[] {
  let cards: PlayableCard[] = [];

  if (snapshotCache?.cards?.length) {
    cards = snapshotCache.cards
      .filter((c: any) => c.__source === 'base' || !c.__source)
      .map(stripSource);
  }

  if (!cards.length) {
    cards = JSON.parse(JSON.stringify(allBaseCards));
  }

  return applyCardOverrides(cards);
}

export function collectBaseCharacters(): CharacterCard[] {
  let chars: CharacterCard[] = [];

  if (snapshotCache?.characters?.length) {
    chars = snapshotCache.characters
      .filter((c: any) => c.__source === 'base' || !c.__source)
      .map(stripSource);
  }

  if (!chars.length) {
    chars = JSON.parse(JSON.stringify(getAllCharacters()));
  }

  return applyCharacterOverrides(chars);
}

export function collectBaseCombos(): Combo[] {
  if (snapshotCache?.combos?.length) {
    return snapshotCache.combos.map(stripSource);
  }
  return JSON.parse(JSON.stringify(getAllCombos()));
}

export function collectMechanics(): any {
  return snapshotCache?.mechanics || {
    abilityBehaviors: {},
    effectKinds: [],
    targetModes: [],
    effectTimings: [],
    tags: [],
  };
}

export function getLastGameContentLoad(): number {
  return lastLoad;
}

function applyCardOverrides(cards: PlayableCard[]): PlayableCard[] {
  const o = getBaseOverrides();
  return cards
    .filter(c => !o.deletedCards.includes(c.id))
    .map(c => o.cards[c.id] ? { ...c, ...o.cards[c.id] } : c);
}

function applyCharacterOverrides(chars: CharacterCard[]): CharacterCard[] {
  const o = getBaseOverrides();
  return chars
    .filter(c => !o.deletedCharacters.includes(c.id))
    .map(c => o.characters[c.id] ? { ...c, ...o.characters[c.id] } : c);
}

// Carga inicial silenciosa
refreshGameContentSnapshot().catch(() => {});
