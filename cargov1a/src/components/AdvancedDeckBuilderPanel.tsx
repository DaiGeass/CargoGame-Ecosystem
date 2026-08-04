import React, { useMemo, useState } from 'react';
import { getAllCardsWithSource } from '../data/contentRegistry';
import { cn } from '../utils/cn';

export type AdvancedDeckCardRule = {
  enabled?: boolean;
  copies?: number;
  weight?: number;
};

export type AdvancedDeckConfig = {
  enabled: boolean;
  cards: Record<string, AdvancedDeckCardRule>;
};

interface Props {
  value: AdvancedDeckConfig;
  onChange: (next: AdvancedDeckConfig) => void;
  deckSize: number;
  blockedCardBaseIds: string[];
  enabledSourceIds: string[];
}

const SOURCE_BADGE: Record<string, string> = {
  base: 'bg-slate-700 text-slate-200',
  mod: 'bg-cyan-900/70 text-cyan-200',
  dlc: 'bg-amber-900/70 text-amber-200',
  editor: 'bg-purple-900/70 text-purple-200',
  unknown: 'bg-slate-900 text-slate-400',
};

function baseIdOf(card: any): string {
  return String(card.id).split('__')[0];
}

export function AdvancedDeckBuilderPanel({
  value,
  onChange,
  deckSize,
  blockedCardBaseIds,
  enabledSourceIds,
}: Props) {
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const allCards = useMemo(() => getAllCardsWithSource(), []);

  const sourceIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allCards as any[]) {
      const sid = c.__sourceId || c.__source || 'unknown';
      map.set(sid, c.__sourceName || sid);
    }
    return [...map.entries()];
  }, [allCards]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCards as any[]) (Array.isArray(c.tags) ? c.tags : []).forEach((t: string) => set.add(t));
    return [...set].sort();
  }, [allCards]);

  const blocked = new Set(blockedCardBaseIds);
  const enabledSources = new Set(enabledSourceIds);
  const allSourcesEnabled = enabledSourceIds.length === 0;

  const availableCards = useMemo(() => {
    return (allCards as any[]).filter(c => {
      const baseId = baseIdOf(c);
      if (blocked.has(baseId)) return false;
      if (!allSourcesEnabled && !enabledSources.has(c.__sourceId)) return false;
      return true;
    });
  }, [allCards, blockedCardBaseIds, enabledSourceIds]);

  const filtered = availableCards.filter((c: any) => {
    const q = query.trim().toLowerCase();
    if (q && !`${c.name} ${c.description} ${c.id} ${(c.tags || []).join(' ')}`.toLowerCase().includes(q)) return false;
    if (sourceFilter !== 'all' && c.__sourceId !== sourceFilter) return false;
    if (tagFilter !== 'all' && !(c.tags || []).includes(tagFilter)) return false;
    return true;
  });

  const rules = value.cards || {};

  const summary = availableCards.reduce(
    (acc, c: any) => {
      const id = baseIdOf(c);
      const r = rules[id] || {};
      const enabled = r.enabled !== false;
      const copies = Math.max(0, Number(r.copies || 0));
      const weight = r.weight === undefined ? 1 : Math.max(0, Number(r.weight));

      if (!enabled) acc.disabled++;
      else acc.enabled++;

      acc.fixed += enabled ? copies : 0;
      acc.weight += enabled ? weight : 0;
      if (copies > 0 || r.weight !== undefined || r.enabled === false) acc.custom++;
      return acc;
    },
    { enabled: 0, disabled: 0, fixed: 0, weight: 0, custom: 0 }
  );

  const balanceWarnings = (() => {
    const warnings: string[] = [];

    if (summary.enabled < 10) {
      warnings.push('Hay menos de 10 tipos de carta activos; el mazo puede sentirse repetitivo.');
    }

    if (summary.fixed > Math.floor(deckSize * 0.7)) {
      warnings.push('Más del 70% del mazo son copias fijas; puede romper el azar/balance.');
    }

    if (summary.fixed > deckSize) {
      warnings.push('Las copias fijas superan el tamaño del mazo; se recortarán al iniciar.');
    }

    const extremeWeights = Object.entries(rules).filter(([_, r]) => Number(r.weight || 0) > 20);
    if (extremeWeights.length > 0) {
      warnings.push('Hay cartas con peso mayor a 20; saldrán exageradamente seguido.');
    }

    const disabledRatio = availableCards.length > 0 ? summary.disabled / availableCards.length : 0;
    if (disabledRatio > 0.75) {
      warnings.push('Más del 75% de cartas están desactivadas.');
    }

    return warnings;
  })();

  const updateRule = (cardId: string, patch: AdvancedDeckCardRule) => {
    const prev = rules[cardId] || {};
    const nextRule = { ...prev, ...patch };

    if (
      nextRule.enabled !== false &&
      !nextRule.copies &&
      nextRule.weight === undefined
    ) {
      const nextCards = { ...rules };
      delete nextCards[cardId];
      onChange({ ...value, cards: nextCards });
      return;
    }

    onChange({
      ...value,
      cards: {
        ...rules,
        [cardId]: nextRule,
      },
    });
  };

  const resetAll = () => onChange({ enabled: value.enabled, cards: {} });

  const disableFiltered = () => {
    const next = { ...rules };
    for (const c of filtered as any[]) next[baseIdOf(c)] = { ...(next[baseIdOf(c)] || {}), enabled: false, copies: 0, weight: 0 };
    onChange({ ...value, cards: next });
  };

  const enableFiltered = () => {
    const next = { ...rules };
    for (const c of filtered as any[]) {
      const id = baseIdOf(c);
      const old = next[id] || {};
      next[id] = { ...old, enabled: true, weight: old.weight ?? 1 };
    }
    onChange({ ...value, cards: next });
  };

  return (
    <div className="mt-4 rounded-2xl border border-fuchsia-700/40 bg-fuchsia-950/10 overflow-hidden">
      <div className="p-3 border-b border-fuchsia-800/30 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...value, enabled: !value.enabled })}
          className={cn(
            'px-3 py-2 rounded-xl font-black text-xs border transition-all',
            value.enabled
              ? 'bg-fuchsia-600 text-white border-fuchsia-300 shadow-lg shadow-fuchsia-900/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          )}
        >
          {value.enabled ? '✅ Mazo avanzado activo' : '○ Activar mazo avanzado'}
        </button>

        <div className="text-[0.72rem] text-slate-400 flex flex-wrap gap-2">
          <span className="bg-slate-900/70 px-2 py-1 rounded-lg border border-slate-700">Tipos activos: <b className="text-white">{summary.enabled}</b></span>
          <span className="bg-slate-900/70 px-2 py-1 rounded-lg border border-slate-700">Desactivadas: <b className="text-red-300">{summary.disabled}</b></span>
          <span className="bg-slate-900/70 px-2 py-1 rounded-lg border border-slate-700">Copias fijas: <b className="text-amber-300">{summary.fixed}</b>/{deckSize}</span>
          <span className="bg-slate-900/70 px-2 py-1 rounded-lg border border-slate-700">Peso total: <b className="text-cyan-300">{summary.weight}</b></span>
          <span className="bg-slate-900/70 px-2 py-1 rounded-lg border border-slate-700">Custom: <b className="text-fuchsia-300">{summary.custom}</b></span>
        </div>

        <button type="button" onClick={resetAll} className="ml-auto px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold">
          Reset avanzado
        </button>
      </div>

      <div className="p-3 bg-slate-950/30 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar carta, tag, descripción..."
          className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500"
        />

        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
          <option value="all">Todas las fuentes</option>
          {sourceIds.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>

        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
          <option value="all">Todos los tags</option>
          {tags.map(t => <option key={t} value={t}>#{t}</option>)}
        </select>

        <div className="md:col-span-4 flex flex-wrap gap-2">
          <button type="button" onClick={enableFiltered} className="px-3 py-1.5 rounded-lg bg-emerald-900/60 text-emerald-200 text-xs font-bold border border-emerald-700/50">
            Activar filtradas
          </button>
          <button type="button" onClick={disableFiltered} className="px-3 py-1.5 rounded-lg bg-red-900/60 text-red-200 text-xs font-bold border border-red-700/50">
            Desactivar filtradas
          </button>
          <span className="text-xs text-slate-500 self-center">{filtered.length} carta(s) visibles</span>
        </div>
      </div>

      {!value.enabled && (
        <div className="px-3 pb-3 text-[0.75rem] text-slate-500">
          El modo avanzado está apagado. El juego usará el mazo normal con bloqueos/fuentes.
        </div>
      )}

      {value.enabled && balanceWarnings.length > 0 && (
        <div className="mx-3 mb-3 rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 text-[0.75rem] text-amber-200 space-y-1">
          <div className="font-black text-amber-300">⚠ Avisos de balance</div>
          {balanceWarnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}

      <div className={cn('p-3 grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[34rem] overflow-y-auto', !value.enabled && 'opacity-50 pointer-events-none')}>
        {filtered.map((card: any) => {
          const id = baseIdOf(card);
          const r = rules[id] || {};
          const enabled = r.enabled !== false;
          const copies = Number(r.copies || 0);
          const weight = r.weight === undefined ? 1 : Number(r.weight);

          return (
            <div key={`${card.__sourceId}:${id}`} className={cn(
              'rounded-xl border p-2 bg-slate-900/70',
              enabled ? 'border-slate-700/70' : 'border-red-800/60 bg-red-950/20'
            )}>
              <div className="flex gap-2 items-start">
                <button
                  type="button"
                  onClick={() => updateRule(id, { enabled: !enabled, copies: enabled ? 0 : copies, weight: enabled ? 0 : Math.max(weight, 1) })}
                  className={cn(
                    'w-9 h-9 rounded-lg font-black shrink-0 border',
                    enabled ? 'bg-emerald-600 text-white border-emerald-300' : 'bg-red-900 text-red-200 border-red-600'
                  )}
                  title={enabled ? 'Desactivar carta' : 'Activar carta'}
                >
                  {enabled ? '✓' : '✕'}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="font-black text-white text-sm truncate">{card.name}</div>
                    <span className={cn('text-[0.68rem] px-1.5 py-0.5 rounded-full font-bold', (SOURCE_BADGE[(card as any).__source || 'unknown'] || SOURCE_BADGE.unknown))}>
                      {card.__sourceName}
                    </span>
                  </div>
                  <div className="text-[0.72rem] text-slate-400 line-clamp-2">{card.description}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(card.tags || []).slice(0, 8).map((t: string) => (
                      <span key={t} className="text-[0.68rem] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <label className="text-[0.72rem] text-slate-400 font-bold">
                  Copias exactas
                  <input
                    type="number"
                    min={0}
                    max={deckSize}
                    value={copies}
                    onChange={e => updateRule(id, { copies: Math.max(0, Number(e.target.value || 0)), enabled: true })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white outline-none focus:border-amber-500"
                  />
                </label>

                <label className="text-[0.72rem] text-slate-400 font-bold">
                  Peso / probabilidad
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={weight}
                    onChange={e => updateRule(id, { weight: Math.max(0, Number(e.target.value || 0)), enabled: true })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white outline-none focus:border-cyan-500"
                  />
                </label>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="lg:col-span-2 py-8 text-center text-slate-500 text-sm">
            No hay cartas con ese filtro.
          </div>
        )}
      </div>
    </div>
  );
}
