// ============================================================
// DECK RESTRICTION PANEL - Selector de cartas y fuentes del mazo
// ============================================================
// Permite al anfitrión (o jugador local) decidir:
//   - Qué fuentes de contenido se usan (base / mods / dlc)
//   - Qué cartas específicas se BLOQUEAN del mazo
//   - Filtrar/buscar entre todo el contenido disponible
//
// Funciona tanto en partida local como en el lobby multijugador.
// ============================================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import {
  getAllCardsWithSource,
  getContentSourceSummary,
  ContentSource,
} from '../data/contentRegistry';
import { getCardImage } from '../utils/media';

interface DeckRestrictionPanelProps {
  blockedCardBaseIds: string[];
  enabledSourceIds: string[];
  onBlockedChange: (ids: string[]) => void;
  onSourcesChange: (ids: string[]) => void;
  compact?: boolean;
}

const SOURCE_STYLES: Record<string, { label: string; icon: string; color: string }> = {
  base: { label: 'Base', icon: '🎮', color: 'text-slate-300 border-slate-600' },
  mod:  { label: 'Mod',  icon: '🧩', color: 'text-cyan-300 border-cyan-600' },
  dlc:  { label: 'DLC',  icon: '📦', color: 'text-amber-300 border-amber-600' },
  editor: { label: 'Editor', icon: '🧬', color: 'text-purple-300 border-purple-600' },
  unknown: { label: 'Fuente', icon: '❔', color: 'text-slate-400 border-slate-700' },
};

export const DeckRestrictionPanel: React.FC<DeckRestrictionPanelProps> = ({
  blockedCardBaseIds, enabledSourceIds, onBlockedChange, onSourcesChange,
}) => {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | ContentSource>('all');

  const sources = useMemo(() => getContentSourceSummary(), []);
  const allCards = useMemo(() => getAllCardsWithSource(), []);

  // Deduplicar cartas por id base (el mazo repite cartas con __idx)
  const uniqueCards = useMemo(() => {
    const seen = new Set<string>();
    const list: typeof allCards = [];
    for (const c of allCards) {
      const baseId = String(c.id || '').split('__')[0];
      if (!seen.has(baseId)) { seen.add(baseId); list.push(c); }
    }
    return list;
  }, [allCards]);

  const filteredCards = useMemo(() => {
    return uniqueCards.filter(c => {
      if (filterSource !== 'all' && c.__source !== filterSource) return false;
      if (search) {
        const q = search.toLowerCase();
        return String(c.name || '').toLowerCase().includes(q) || String(c.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [uniqueCards, filterSource, search]);

  const blocked = new Set(blockedCardBaseIds);
  const sourcesEnabled = new Set(enabledSourceIds);
  const allSourcesEnabled = enabledSourceIds.length === 0;

  const toggleCard = (baseId: string) => {
    if (blocked.has(baseId)) onBlockedChange(blockedCardBaseIds.filter(x => x !== baseId));
    else onBlockedChange([...blockedCardBaseIds, baseId]);
  };

  const toggleSource = (sourceId: string) => {
    if (allSourcesEnabled) {
      // Pasar de "todas" a solo esta deshabilitada → habilitar las demás
      const all = sources.map(s => s.id).filter(id => id !== sourceId);
      onSourcesChange(all);
    } else if (sourcesEnabled.has(sourceId)) {
      onSourcesChange(enabledSourceIds.filter(x => x !== sourceId));
    } else {
      const next = [...enabledSourceIds, sourceId];
      // Si quedan todas, volver a "todas" (array vacío)
      if (next.length === sources.length) onSourcesChange([]);
      else onSourcesChange(next);
    }
  };

  const isSourceOn = (id: string) => allSourcesEnabled || sourcesEnabled.has(id);

  return (
    <div className="space-y-3">
      {/* Resumen de fuentes */}
      <div>
        <div className="text-[0.6rem] text-slate-400 font-bold uppercase tracking-wider mb-2">
          📚 Fuentes de contenido ({sources.length})
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sources.map(s => {
            const st = SOURCE_STYLES[(s as any).source || 'unknown'] || SOURCE_STYLES.unknown;
            const on = isSourceOn(s.id);
            return (
              <button key={s.id} onClick={() => toggleSource(s.id)}
                className={cn('text-left rounded-lg border-2 p-2 transition-all',
                  on ? 'bg-slate-800/80 ' + st.color : 'bg-slate-900/40 border-slate-800 opacity-50 grayscale')}>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{st.icon}</span>
                  <span className="text-[0.65rem] font-black text-white truncate flex-1">{s.name}</span>
                  <span className={cn('w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center text-[0.5rem]',
                    on ? 'bg-green-500 border-green-400 text-black' : 'border-slate-600')}>
                    {on ? '✓' : ''}
                  </span>
                </div>
                <div className="text-[0.5rem] text-slate-400 mt-1">
                  🃏 {s.cards} · 🧙 {s.characters} · 💥 {s.combos}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador + filtro */}
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar carta..."
          className="flex-1 bg-slate-800/80 rounded-lg px-3 py-1.5 text-xs border border-slate-700 outline-none focus:border-cyan-500 text-white placeholder-slate-500" />
        <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)}
          className="bg-slate-800/80 rounded-lg px-2 py-1.5 text-xs border border-slate-700 outline-none text-white">
          <option value="all">Todas</option>
          <option value="base">🎮 Base</option>
          <option value="mod">🧩 Mods</option>
          <option value="dlc">📦 DLC</option>
        </select>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-2 text-[0.55rem]">
        <button onClick={() => onBlockedChange([])}
          className="px-2 py-1 rounded bg-green-900/40 text-green-300 border border-green-700/40 hover:bg-green-800/50">
          ✅ Permitir todas
        </button>
        <button onClick={() => onBlockedChange(filteredCards.map(c => c.id.split('__')[0]))}
          className="px-2 py-1 rounded bg-red-900/40 text-red-300 border border-red-700/40 hover:bg-red-800/50">
          🚫 Bloquear visibles
        </button>
        <span className="px-2 py-1 text-slate-500 ml-auto">
          {uniqueCards.length - blocked.size}/{uniqueCards.length} activas
        </span>
      </div>

      {/* Grid de cartas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-64 overflow-y-auto pr-1">
        {filteredCards.map(card => {
          const baseId = card.id.split('__')[0];
          const isBlocked = blocked.has(baseId);
          const st = SOURCE_STYLES[(card as any).__source || 'unknown'] || SOURCE_STYLES.unknown;
          const img = getCardImage(card);
          return (
            <motion.button
              key={baseId}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleCard(baseId)}
              className={cn('relative text-left rounded-lg border-2 p-1.5 transition-all overflow-hidden',
                isBlocked ? 'border-red-700/60 bg-red-950/30 opacity-50 grayscale' : 'border-slate-700 bg-slate-800/60 hover:border-amber-500/50')}>
              {img && (
                <div className="absolute inset-0 opacity-20">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className={cn('text-[0.4rem] px-1 rounded border font-black uppercase', st.color)}>{st.icon}</span>
                  {isBlocked && <span className="text-red-400 text-xs">🚫</span>}
                </div>
                <div className="text-[0.6rem] font-bold text-white leading-tight mt-1 line-clamp-2">{card.name}</div>
                <div className="text-[0.45rem] text-slate-400 leading-tight mt-0.5 line-clamp-1">{card.description}</div>
              </div>
            </motion.button>
          );
        })}
        {filteredCards.length === 0 && (
          <div className="col-span-full text-center text-slate-500 text-xs py-6">No hay cartas que coincidan.</div>
        )}
      </div>
    </div>
  );
};
