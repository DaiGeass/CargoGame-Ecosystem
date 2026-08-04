import React from 'react';
import { useDevBuild } from '../store/devbuildStore';
import { CardView } from './CardView';
import { CARD_TEMPLATES } from '../data/TEMPLATES';

export const VisualEditor: React.FC = () => {
  const {
    getAllCardsWithSource, search, setSearch, filterSource, setFilterSource,
    mods, startEditCard, startNewCard, deleteCard, duplicateCard,
  } = useDevBuild();

  const all = getAllCardsWithSource();
  const filtered = all.filter((c) => {
    if (filterSource !== 'all' && c.__sourceId !== filterSource) return false;
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.type.includes(q) || (c.tags || []).some((t) => t.includes(q));
  });

  return (
    <div className="h-full flex flex-col">
      {/* toolbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center gap-3 px-4 shrink-0">
        <input
          placeholder="🔍 Buscar carta, tipo o tag..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
        />
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none">
          <option value="all">Todas las fuentes</option>
          <option value="base">Juego Base</option>
          {mods.map((m) => <option key={m.manifest.id} value={m.manifest.id}>{m.manifest.name}</option>)}
        </select>
        <span className="text-xs text-slate-500">{filtered.length} cartas</span>
        <select defaultValue="" onChange={(e) => { const t = CARD_TEMPLATES.find((x) => x.key === e.target.value); if (t) startNewCard(t.build()); e.target.value = ''; }}
                className="ml-auto bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none">
          <option value="">+ Nueva desde plantilla...</option>
          {CARD_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
        </select>
        <button onClick={() => startNewCard()} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black px-4 py-1.5 rounded-lg shadow">+ Nueva carta</button>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-wrap gap-4">
          {filtered.map((card) => (
            <div key={card.__sourceId + '_' + card.id} className="group relative">
              <CardView card={card} size="md" onClick={() => startEditCard(card)} />
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button title="Duplicar" onClick={(e) => { e.stopPropagation(); duplicateCard(card); }}
                        className="w-6 h-6 rounded-md bg-slate-900/90 hover:bg-blue-600 text-white text-xs flex items-center justify-center">⧉</button>
                <button title="Eliminar" onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar "${card.name}"?`)) deleteCard(card.id, card.__sourceId); }}
                        className="w-6 h-6 rounded-md bg-slate-900/90 hover:bg-red-600 text-white text-xs flex items-center justify-center">🗑</button>
              </div>
              <div className="mt-1.5 text-center">
                <span className={`text-[0.55rem] font-bold px-2 py-0.5 rounded-full ${card.__source === 'base' ? 'bg-slate-700 text-slate-300' : 'bg-fuchsia-900/60 text-fuchsia-300'}`}>
                  {card.__sourceName}
                </span>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center text-slate-500 py-16">No se encontraron cartas. Crea una nueva.</div>}
      </div>
    </div>
  );
};
