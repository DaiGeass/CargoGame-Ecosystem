// ============================================================
// GAME CONTENT SNAPSHOT
// Publica TODO el contenido real de CARGAS en disco compartido.
// DevBuild y ModdingBuild NO pueden leer window.CARGAS_API entre .exe,
// así que leen este archivo:
//
// data/api/game-content.json
// ============================================================

import {
  getAllCardsWithSource,
  getAllCharactersWithSource,
  getAllCombosWithSource,
  getContentSourceSummary,
} from '../data/contentRegistry';
import { getInstalledMods } from '../data/mods';
import { ABILITY_BEHAVIORS } from '../data/abilities';
import { ensureSharedStructure, writeSharedText, getSharedRoot , readSharedText} from './sharedDisk';
import { loadBaseOverridesFromDisk } from './baseOverridesRuntime';

const EFFECT_KINDS = [
  'damage',
  'heal',
  'hot',
  'dot',
  'defense_buff',
  'buff_self',
  'debuff',
  'stun',
  'silence',
  'skip_turn',
  'extra_turn',
  'draw_cards',
  'discard',
  'reveal_hand',
  'shield',
  'reflect',
  'lifesteal',
  'execute',
  'transfer_hp',
  'cleanse',
  'dispel',
  'set_tag',
  'stack_effect',
  'multi_target',
  'choice',
  'conditional',
  'custom',
];

const TARGET_MODES = [
  'enemy',
  'ally',
  'self',
  'ally_or_self',
  'all_enemies',
  'all_allies',
  'multi_enemy',
  'any',
];

const EFFECT_TIMINGS = [
  'immediate',
  'start_of_turn',
  'end_of_turn',
  'on_damage_taken',
];

function collectAllTags(cards: any[]): string[] {
  const out = new Set<string>();
  for (const card of cards) {
    for (const tag of [...(card.tags || []), ...(card.synergyTags || [])]) {
      if (tag) out.add(String(tag));
    }
    for (const effect of card.effects || []) {
      for (const tag of effect.applyTags || []) {
        if (tag) out.add(String(tag));
      }
    }
  }
  return [...out].sort();
}

async function readMechanicsCatalogV2(): Promise<any | null> {
  try {
    const raw = await readSharedText('data/kv/cargas.mechanicsCatalog.v2.json');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function publishGameContentSnapshot(): Promise<void> {
  await ensureSharedStructure();
  await loadBaseOverridesFromDisk();

  const cards = getAllCardsWithSource();
  const characters = getAllCharactersWithSource();
  const combos = getAllCombosWithSource();
  const mods = getInstalledMods();
  const mechanicsV2 = await readMechanicsCatalogV2();

  const mechanicsV2Kinds = Object.keys(mechanicsV2?.mechanics || {});
  const mechanicsV2StackModes = mechanicsV2?.stackModes || {};
  const mechanicsV2CardTemplates = mechanicsV2?.cardTemplates || {};
  const mechanicsV2PassiveTemplates = mechanicsV2?.passiveTemplates || [];

  const mergedEffectKinds = Array.from(new Set([
    ...EFFECT_KINDS,
    ...mechanicsV2Kinds,
  ])).sort();

  const snapshot = {
    version: '1.0.0',
    protocol: 'cargas-game-content-v1',
    publishedAt: Date.now(),
    sharedRoot: await getSharedRoot().catch(() => ''),
    counts: {
      cards: cards.length,
      characters: characters.length,
      combos: combos.length,
      mods: mods.length,
    },
    sourceSummary: getContentSourceSummary(),
    cards,
    characters,
    combos,
    mods,
    mechanics: {
      abilityBehaviors: ABILITY_BEHAVIORS,
      effectKinds: mergedEffectKinds,
      mechanicsV2: mechanicsV2?.mechanics || {},
      stackModesV2: mechanicsV2StackModes,
      cardTemplatesV2: mechanicsV2CardTemplates,
      passiveTemplatesV2: mechanicsV2PassiveTemplates,
      targetModes: TARGET_MODES,
      effectTimings: EFFECT_TIMINGS,
      tags: collectAllTags(cards),
    },
  };

  await writeSharedText('data/api/game-content.json', JSON.stringify(snapshot, null, 2));
}

let timer: number | null = null;

export function startGameContentSnapshotPublisher(): void {
  publishGameContentSnapshot().catch(err => console.warn('[GameContentSnapshot] Error inicial:', err));

  if (timer !== null) return;

  timer = window.setInterval(() => {
    publishGameContentSnapshot().catch(err => console.warn('[GameContentSnapshot] Error publicando:', err));
  }, 3000);
}
