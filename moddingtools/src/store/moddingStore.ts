// ============================================================
// MODDINGBUILD STORE — herramienta de modding de CARGAS
// ============================================================
// Más potente y agresiva que el editor del juego base:
//   - Edita cartas, personajes, combos, efectos, tags
//   - Crea MECÁNICAS nuevas (reglas que el juego no trae)
//   - Sobrescribe reglas globales (modding agresivo)
//   - Reconocida por el juego (mismo storage que CARGAS)
// ============================================================
import { create } from 'zustand';
import { sendEcosystemMessage } from '../services/ecosystemPresence';
import { PlayableCard, CharacterCard, SourcedCard, ContentSource } from '../types/game';
import {
  LoadedMod, getInstalledMods, createEmptyMod, uninstallMod,
  upsertCardInMod, deleteCardFromMod, installModFromFile, sanitizeId,
} from '../data/mods';
import { setCardOverride, deleteBaseCard } from '../data/registries';
import { collectBaseCards, collectBaseCharacters, refreshGameContentSnapshot } from '../services/gameContent';

export type ModdingView =
  | 'home' | 'cards' | 'synergy' | 'chars' | 'combos'
  | 'preview' | 'code' | 'bridge' | 'tools' | 'tc';

export interface BridgeLog { id: string; type: string; from: string; to: string; payload: any; ts: number; }

function uid(prefix = 'card'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

const blankCard: PlayableCard = {
  id: '', name: 'Nueva Carta', type: 'damage', value: 0,
  description: '', effectTiming: 'immediate', duration: 0, isInstant: false,
  targetMode: 'enemy', imageFront: null, tags: [], rarity: 'common',
  effects: [],
};

interface ModdingState {
  baseCards: PlayableCard[];
  baseCharacters: CharacterCard[];
  mods: LoadedMod[];
  disabledMods: Set<string>;

  view: ModdingView;
  editingCard: PlayableCard | null;
  filterSource: string;
  search: string;

  bridgeLogs: BridgeLog[];
  bridgeActive: boolean;

  setView: (v: ModdingView) => void;
  setSearch: (s: string) => void;
  setFilterSource: (s: string) => void;

  refreshMods: () => void;
  refreshBase: () => void;
  getAllCardsWithSource: () => SourcedCard[];

  startEditCard: (card: PlayableCard) => void;
  startNewCard: (template?: Partial<PlayableCard>) => void;
  closeEditor: () => void;
  updateEditingCard: (patch: Partial<PlayableCard>) => void;
  saveEditingCard: (targetSourceId: string) => void;
  deleteCard: (cardId: string, sourceId: string) => void;
  duplicateCard: (card: SourcedCard) => void;

  toggleMod: (modId: string) => void;
  createMod: (name: string, author: string) => string;
  deleteMod: (modId: string) => void;
  importModFile: (file: File) => Promise<void>;

  emitBridge: (type: string, payload: any) => void;
  clearBridge: () => void;
}

function modId(m: LoadedMod): string { return m.manifest.id || sanitizeId(m.manifest.name); }

export const useModding = create<ModdingState>((set, get) => ({
  baseCards: collectBaseCards(),
  baseCharacters: collectBaseCharacters(),
  mods: getInstalledMods(),
  disabledMods: new Set<string>(),

  view: 'home',
  editingCard: null,
  filterSource: 'all',
  search: '',
  bridgeLogs: [],
  bridgeActive: true,

  setView: (v) => set({ view: v }),
  setSearch: (s) => set({ search: s }),
  setFilterSource: (s) => set({ filterSource: s }),

  refreshMods: () => set({ mods: getInstalledMods() }),
  refreshBase: () => {
    void refreshGameContentSnapshot().then(() => {
      set({ baseCards: collectBaseCards(), baseCharacters: collectBaseCharacters() });
    });
  },

  getAllCardsWithSource: () => {
    const { baseCards, mods } = get();
    const result: SourcedCard[] = [];
    for (const c of baseCards) result.push({ ...c, __source: 'base', __sourceId: 'base', __sourceName: 'Juego Base' });
    for (const mod of mods) {
      const id = modId(mod);
      const src: ContentSource = mod.manifest.kind === 'dlc' ? 'dlc' : 'mod';
      for (const c of (mod.cards || [])) result.push({ ...c, __source: src, __sourceId: id, __sourceName: mod.manifest.name });
    }
    return result;
  },

  startEditCard: (card) => set({ editingCard: JSON.parse(JSON.stringify(card)) }),
  startNewCard: (template) => set({ editingCard: { ...JSON.parse(JSON.stringify(blankCard)), ...(template || {}), id: uid() } }),
  closeEditor: () => set({ editingCard: null }),
  updateEditingCard: (patch) => set((s) => s.editingCard ? { editingCard: { ...s.editingCard, ...patch } } : {}),

  saveEditingCard: (targetSourceId) => {
    const { editingCard } = get();
    if (!editingCard) return;
    const card = { ...editingCard };
    if (!card.id) card.id = uid();
    delete (card as any).__source; delete (card as any).__sourceId; delete (card as any).__sourceName;

    if (targetSourceId === 'base') {
      set((s) => {
        const idx = s.baseCards.findIndex((c) => c.id === card.id);
        const baseCards = [...s.baseCards];
        if (idx >= 0) baseCards[idx] = card; else baseCards.push(card);
        return { baseCards, editingCard: null };
      });
    } else {
      upsertCardInMod(targetSourceId, card);
      set({ editingCard: null, mods: getInstalledMods() });
    }
    get().emitBridge('card_updated', { id: card.id, name: card.name, source: targetSourceId });
      get().emitBridge('content_updated', { kind: 'card', id: card.id, source: targetSourceId });
  },

  deleteCard: (cardId, sourceId) => {
    if (sourceId === 'base') {
      deleteBaseCard(cardId);
      set((s) => ({ baseCards: s.baseCards.filter((c) => c.id !== cardId) }));
    }
    else { deleteCardFromMod(sourceId, cardId); set({ mods: getInstalledMods() }); }
    get().emitBridge('card_deleted', { id: cardId, source: sourceId });
      get().emitBridge('content_updated', { kind: 'card_deleted', id: cardId, source: sourceId });
  },

  duplicateCard: (card) => {
    const copy: PlayableCard = JSON.parse(JSON.stringify(card));
    delete (copy as any).__source; delete (copy as any).__sourceId; delete (copy as any).__sourceName;
    copy.id = uid();
    copy.name = card.name + ' (copia)';
    if (card.__sourceId === 'base') set((s) => ({ baseCards: [...s.baseCards, copy] }));
    else { upsertCardInMod(card.__sourceId, copy); set({ mods: getInstalledMods() }); }
  },

  toggleMod: (id) => set((s) => {
    const next = new Set(s.disabledMods);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { disabledMods: next };
  }),

  createMod: (name, author) => {
    const mod = createEmptyMod(name, author);
    set({ mods: getInstalledMods() });
    get().emitBridge('mod_installed', { modId: modId(mod), modName: name });
    return modId(mod);
  },

  deleteMod: (id) => { uninstallMod(id); set({ mods: getInstalledMods() }); get().emitBridge('mod_uninstalled', { modId: id }); },

  importModFile: async (file) => {
    const mod = await installModFromFile(file);
    set({ mods: getInstalledMods() });
    get().emitBridge('mod_installed', { modId: modId(mod), modName: mod.manifest.name });
      get().emitBridge('content_updated', { kind: 'mod_installed', modId: modId(mod), modName: mod.manifest.name });
  },

  emitBridge: (type, payload) => {
      const log = { id: uid('msg'), type, from: 'moddingtool', to: 'broadcast', payload, ts: Date.now() };
      void sendEcosystemMessage(type, payload, 'broadcast').catch(err => {
        console.warn('[Bridge] No se pudo enviar mensaje real:', err);
      });
      set((s) => ({ bridgeLogs: [log, ...s.bridgeLogs].slice(0, 100) }));
    },

  clearBridge: () => set({ bridgeLogs: [] }),
}));


// auto-refresh real content snapshot
setTimeout(() => {
  useModding.getState().refreshBase();
}, 800);
