// ============================================================
// CONTENT REGISTRY - Catálogo unificado de contenido del juego
// ============================================================
// Centraliza TODO el contenido jugable (cartas, personajes, combos)
// sin importar su origen: juego base, mods o DLC.
//
// Cada elemento lleva metadata de origen para que la UI pueda:
//   - Mostrar de qué fuente viene (base / mod / dlc)
//   - Agrupar por fuente en el lobby / deck builder
//   - Permitir bloquear/desbloquear contenido por partida
//
// Esto es la base del crossplay y del selector de cartas del deck.
// ============================================================

import { PlayableCard, CharacterCard } from '../types/game';
import { getRuntimeBaseOverrides } from '../services/baseOverridesRuntime';
import { allBaseCards, getAllCharacters as getBaseCharacters, getAllCombos as getBaseCombos, Combo } from './cards';
import {
  getInstalledMods,
  getRuntimeModCards,
  getRuntimeModCharacters,
  getRuntimeModCombos,
  ComboMod,
} from './mods';

export type ContentSource = 'base' | 'mod' | 'dlc' | 'editor';

export interface SourcedCard extends PlayableCard {
  __source: ContentSource;
  __sourceId: string;   // id del mod/dlc, o 'base'
  __sourceName: string; // nombre legible de la fuente
}

export interface SourcedCharacter extends CharacterCard {
  __source: ContentSource;
  __sourceId: string;
  __sourceName: string;
}

export interface SourcedCombo extends Combo {
  __source: ContentSource;
  __sourceId: string;
  __sourceName: string;
}

// Determina si un pack es DLC. Prioridad:
//   1. manifest.kind === 'dlc' (explícito)
//   2. convención: id 'dlc_*' o nombre con 'dlc/expansión'
function isDlcPack(mod: { manifest: { id?: string; name: string; kind?: 'mod' | 'dlc' } }): boolean {
  if (mod.manifest.kind === 'dlc') return true;
  if (mod.manifest.kind === 'mod') return false;
  const modId = mod.manifest.id || mod.manifest.name;
  return modId.startsWith('dlc_') || /dlc|expansion|expansión/i.test(mod.manifest.name);
}

interface BaseOverridesForGame {
  cards: Record<string, any>;
  characters: Record<string, any>;
  deletedCards: string[];
  deletedCharacters: string[];
}

function getBaseOverridesForGame(): BaseOverridesForGame {
  return getRuntimeBaseOverrides();
}

function getOverriddenBaseCards(): PlayableCard[] {
  const o = getBaseOverridesForGame();
  return allBaseCards
    .filter(card => !o.deletedCards.includes(card.id))
    .map(card => o.cards[card.id] ? { ...card, ...o.cards[card.id] } : card);
}

function getOverriddenBaseCharacters(): CharacterCard[] {
  const o = getBaseOverridesForGame();
  const base = getBaseCharacters()
    .filter(char => !o.deletedCharacters.includes(char.id))
    .map(char => o.characters[char.id] ? { ...char, ...o.characters[char.id] } : char);

  // Personajes nuevos creados desde DevBuild/ModdingTool:
  // si el ID no existe en el juego base, se agregan como contenido baseOverride.
  const baseIds = new Set(base.map(char => char.id));
  const added = Object.entries(o.characters || {})
    .filter(([id]) => !o.deletedCharacters.includes(id))
    .filter(([id]) => !baseIds.has(id))
    .map(([id, char]: [string, any]) => ({
      name: char.name || id,
      classType: char.classType || 'custom',
      hp: Number(char.hp || char.maxHp || 3000),
      defense: Number(char.defense || 0),
      damage: Number(char.damage || 0),
      avatar: char.avatar || '🧬',
      color: char.color || '#a78bfa',
      passiveDescription: char.passiveDescription || '',
      teamPassiveDescription: char.teamPassiveDescription || '',
      abilities: Array.isArray(char.abilities) ? char.abilities : [],
      passives: Array.isArray(char.passives) ? char.passives : [],
      teamPassives: Array.isArray(char.teamPassives) ? char.teamPassives : [],
      advancedMechanics: Array.isArray(char.advancedMechanics) ? char.advancedMechanics : [],
      imageFront: char.imageFront || null,
      imageBack: char.imageBack || null,
      ...char,
      id,
      __source: 'editor',
      __sourceId: 'baseOverrides',
      __sourceName: 'Editor / Overrides',
    } as CharacterCard));

  return [...base, ...added];
}

// ─── CARTAS UNIFICADAS ──────────────────────────────────────
export function getAllCardsWithSource(): SourcedCard[] {
  const result: SourcedCard[] = [];

  // Base
  for (const card of getOverriddenBaseCards()) {
    result.push({ ...card, __source: 'base', __sourceId: 'base', __sourceName: 'Juego Base' });
  }

  // Mods y DLC
  for (const mod of getInstalledMods()) {
    const modId = mod.manifest.id || mod.manifest.name;
    const source: ContentSource = isDlcPack(mod) ? 'dlc' : 'mod';
    for (const card of (mod.cards || [])) {
      result.push({ ...card, __source: source, __sourceId: modId, __sourceName: mod.manifest.name });
    }
  }

  return result;
}

// ─── PERSONAJES UNIFICADOS ──────────────────────────────────
export function getAllCharactersWithSource(): SourcedCharacter[] {
  const result: SourcedCharacter[] = [];

  for (const char of getOverriddenBaseCharacters()) {
    // Respetar origen si viene de DevBuild/ModdingTool/baseOverrides.
    const anyChar: any = char;
    result.push({
      ...char,
      __source: anyChar.__source || 'base',
      __sourceId: anyChar.__sourceId || 'base',
      __sourceName: anyChar.__sourceName || 'Juego Base',
    });
  }

  // Si getBaseCharacters ya incluye mods, los detectamos por origen
  const baseIds = new Set(result.map(c => c.id));
  for (const mod of getInstalledMods()) {
    const modId = mod.manifest.id || mod.manifest.name;
    const source: ContentSource = isDlcPack(mod) ? 'dlc' : 'mod';
    for (const char of (mod.characters || [])) {
      if (baseIds.has(char.id)) {
        // Reclasificar el que ya estaba como base
        const existing = result.find(c => c.id === char.id);
        if (existing) { existing.__source = source; existing.__sourceId = modId; existing.__sourceName = mod.manifest.name; }
      } else {
        result.push({ ...char, __source: source, __sourceId: modId, __sourceName: mod.manifest.name });
        baseIds.add(char.id);
      }
    }
  }

  return result;
}

// ─── COMBOS UNIFICADOS ──────────────────────────────────────
export function getAllCombosWithSource(): SourcedCombo[] {
  const result: SourcedCombo[] = [];
  for (const combo of getBaseCombos()) {
    result.push({ ...combo, __source: 'base', __sourceId: 'base', __sourceName: 'Juego Base' });
  }
  for (const mod of getInstalledMods()) {
    const modId = mod.manifest.id || mod.manifest.name;
    const source: ContentSource = isDlcPack(mod) ? 'dlc' : 'mod';
    for (const combo of (mod.combos || [])) {
      result.push({ ...(combo as unknown as Combo), __source: source, __sourceId: modId, __sourceName: mod.manifest.name });
    }
  }
  return result;
}

// ─── RESUMEN POR FUENTE (para UI de lobby/menú) ─────────────
export interface SourceSummary {
  id: string;
  name: string;
  source: ContentSource;
  cards: number;
  characters: number;
  combos: number;
}

export function getContentSourceSummary(): SourceSummary[] {
  const summary: SourceSummary[] = [
    {
      id: 'base', name: 'Juego Base', source: 'base',
      cards: allBaseCards.length,
      characters: getBaseCharacters().filter(c => {
        // Solo contar los que no vienen de mods
        return !getInstalledMods().some(m => (m.characters || []).some(mc => mc.id === c.id));
      }).length,
      combos: getBaseCombos().length,
    },
  ];

  const o = getBaseOverridesForGame();
  const baseCharIdsForSummary = new Set(getBaseCharacters().map(c => c.id));
  const baseCardIdsForSummary = new Set(allBaseCards.map(c => c.id));

  const editorCharacters = Object.keys(o.characters || {})
    .filter(id => !o.deletedCharacters.includes(id))
    .filter(id => !baseCharIdsForSummary.has(id)).length;

  const editorCards = Object.keys(o.cards || {})
    .filter(id => !o.deletedCards.includes(id))
    .filter(id => !baseCardIdsForSummary.has(id)).length;

  if (editorCharacters > 0 || editorCards > 0) {
    summary.push({
      id: 'baseOverrides',
      name: 'Editor / Overrides',
      source: 'editor',
      cards: editorCards,
      characters: editorCharacters,
      combos: 0,
    });
  }

  for (const mod of getInstalledMods()) {
    const modId = mod.manifest.id || mod.manifest.name;
    summary.push({
      id: modId,
      name: mod.manifest.name,
      source: isDlcPack(mod) ? 'dlc' : 'mod',
      cards: (mod.cards || []).length,
      characters: (mod.characters || []).length,
      combos: (mod.combos || []).length,
    });
  }

  return summary;
}

// ─── Plantilla de configuración de deck (qué se permite) ────
export interface DeckRestrictions {
  // IDs base de cartas EXCLUIDAS del mazo (no entran al juego)
  blockedCardBaseIds: string[];
  // Fuentes habilitadas (si está vacío = todas permitidas)
  enabledSources: string[];
}

export const DEFAULT_DECK_RESTRICTIONS: DeckRestrictions = {
  blockedCardBaseIds: [],
  enabledSources: [],
};

/** Devuelve el conjunto de cartas permitidas según restricciones. */
export function getAllowedCards(restrictions: DeckRestrictions): SourcedCard[] {
  const all = getAllCardsWithSource();
  const blocked = new Set(restrictions.blockedCardBaseIds);
  const sources = restrictions.enabledSources.length > 0 ? new Set(restrictions.enabledSources) : null;
  return all.filter(c => {
    const baseId = c.id.split('__')[0];
    if (blocked.has(baseId)) return false;
    if (sources && !sources.has(c.__sourceId)) return false;
    return true;
  });
}

// Re-export para conveniencia
export { getRuntimeModCards, getRuntimeModCharacters, getRuntimeModCombos };
export type { ComboMod };
