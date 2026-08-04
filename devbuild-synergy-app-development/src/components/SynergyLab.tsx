import React, { useState, useMemo } from 'react';
import { useDevBuild } from '../store/devbuildStore';
import { CardView } from './CardView';
import { CardSynergy, SourcedCard } from '../types/game';

const inputCls = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500';

export const SynergyLab: React.FC = () => {
  const { getAllCardsWithSource, startEditCard, updateEditingCard, saveEditingCard, editingCard } = useDevBuild();
  const all = getAllCardsWithSource();
  const [selectedId, setSelectedId] = useState<string | null>(all[0]?.id ?? null);

  const selected = all.find((c) => c.id === selectedId) || null;

  // mapa de tags -> cartas
  const tagMap = useMemo(() => {
    const m = new Map<string, SourcedCard[]>();
    for (const c of all) {
      for (const t of [...(c.tags || []), ...(c.synergyTags || [])]) {
        if (!m.has(t)) m.set(t, []);
        if (!m.get(t)!.find((x) => x.id === c.id)) m.get(t)!.push(c);
      }
    }
    return m;
  }, [all]);

  // cartas que sinergizan con la seleccionada (comparten tags)
  const related = useMemo(() => {
    if (!selected) return [];
    const myTags = new Set([...(selected.tags || []), ...(selected.synergyTags || [])]);
    return all.filter((c) => c.id !== selected.id &&
      [...(c.tags || []), ...(c.synergyTags || [])].some((t) => myTags.has(t)));
  }, [selected, all]);

  // edición de sinergias: trabajamos sobre editingCard si coincide
  const working = editingCard && editingCard.id === selectedId ? editingCard : null;
  const synergies = working?.synergies || selected?.synergies || [];

  const beginEdit = () => { if (selected) startEditCard(selected); };
  const addSynergy = () => {
    if (!working) { beginEdit(); return; }
    const s: CardSynergy = { condition: { targetHasTag: '' }, bonusDamage: 10 };
    updateEditingCard({ synergies: [...(working.synergies || []), s] });
  };
  const setSynergy = (idx: number, patch: Partial<CardSynergy>) => {
    if (!working) return;
    updateEditingCard({ synergies: (working.synergies || []).map((s, i) => i === idx ? { ...s, ...patch } : s) });
  };
  const removeSynergy = (idx: number) => {
    if (!working) return;
    updateEditingCard({ synergies: (working.synergies || []).filter((_, i) => i !== idx) });
  };
  const save = () => { if (selected) saveEditingCard(selected.__sourceId); };

  return (
    <div className="h-full flex">
      {/* lista de cartas */}
      <aside className="w-56 bg-slate-900 border-r border-slate-800 overflow-y-auto shrink-0">
        <div className="p-3 border-b border-slate-800 text-xs font-black text-fuchsia-300">⚡ Cartas</div>
        {all.map((c) => (
          <button key={c.__sourceId + c.id} onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${selectedId === c.id ? 'bg-fuchsia-900/40 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="truncate flex-1">{c.name}</span>
            {c.synergies && c.synergies.length > 0 && <span className="text-[0.55rem] bg-fuchsia-600 text-white px-1 rounded">{c.synergies.length}</span>}
          </button>
        ))}
      </aside>

      {/* panel central: sinergias de la carta */}
      <main className="flex-1 overflow-y-auto p-5">
        {!selected ? (
          <div className="text-center text-slate-500 py-16">Selecciona una carta.</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="flex items-start gap-5">
              <CardView card={working || selected} size="md" />
              <div className="flex-1">
                <h2 className="text-xl font-black text-white">{selected.name}</h2>
                <div className="text-xs text-slate-400 mb-2">{selected.__sourceName}</div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[...(selected.tags || []), ...(selected.synergyTags || [])].map((t, i) => (
                    <span key={i} className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full bg-fuchsia-900/50 text-fuchsia-300 border border-fuchsia-700">#{t}</span>
                  ))}
                  {[...(selected.tags || []), ...(selected.synergyTags || [])].length === 0 && <span className="text-xs text-slate-600 italic">Sin tags</span>}
                </div>
                {!working ? (
                  <button onClick={beginEdit} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold px-4 py-1.5 rounded-lg">✏️ Editar sinergias</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={addSynergy} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg">+ Sinergia</button>
                    <button onClick={save} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black px-4 py-1.5 rounded-lg">💾 Guardar</button>
                  </div>
                )}
              </div>
            </div>

            {/* lista de sinergias */}
            <div className="space-y-3">
              {synergies.map((s, i) => (
                <div key={i} className="bg-slate-800/50 border border-fuchsia-900/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-black text-fuchsia-300">⚡ Sinergia #{i + 1}</span>
                    {working && <button onClick={() => removeSynergy(i)} className="text-red-400 hover:text-red-300 text-sm">🗑️</button>}
                  </div>
                  <div className="text-[0.65rem] text-slate-400 uppercase font-bold mb-1">Condición (SI...)</div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] text-slate-500">Objetivo tiene tag</span>
                      <input className={inputCls} disabled={!working} value={s.condition.targetHasTag || ''}
                             onChange={(e) => setSynergy(i, { condition: { ...s.condition, targetHasTag: e.target.value } })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] text-slate-500">Estado objetivo</span>
                      <select className={inputCls} disabled={!working} value={s.condition.targetStatus || ''}
                              onChange={(e) => setSynergy(i, { condition: { ...s.condition, targetStatus: (e.target.value || undefined) as any } })}>
                        <option value="">—</option>
                        {['has_dots', 'low_hp', 'high_def', 'stunned', 'silenced'].map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] text-slate-500">Atacante tiene tag</span>
                      <input className={inputCls} disabled={!working} value={s.condition.attackerHasTag || ''}
                             onChange={(e) => setSynergy(i, { condition: { ...s.condition, attackerHasTag: e.target.value } })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] text-slate-500">Cartas jugadas este turno ≥</span>
                      <input type="number" className={inputCls} disabled={!working} value={s.condition.cardsPlayedThisTurn ?? ''}
                             onChange={(e) => setSynergy(i, { condition: { ...s.condition, cardsPlayedThisTurn: e.target.value === '' ? undefined : Number(e.target.value) } })} />
                    </label>
                  </div>
                  <div className="text-[0.65rem] text-slate-400 uppercase font-bold mb-1">Bonus (ENTONCES...)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] text-slate-500">+ Daño</span>
                      <input type="number" className={inputCls} disabled={!working} value={s.bonusDamage ?? ''}
                             onChange={(e) => setSynergy(i, { bonusDamage: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] text-slate-500">+ Cura</span>
                      <input type="number" className={inputCls} disabled={!working} value={s.bonusHeal ?? ''}
                             onChange={(e) => setSynergy(i, { bonusHeal: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] text-slate-500">+ Defensa</span>
                      <input type="number" className={inputCls} disabled={!working} value={s.bonusDefense ?? ''}
                             onChange={(e) => setSynergy(i, { bonusDefense: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    </label>
                  </div>
                </div>
              ))}
              {synergies.length === 0 && (
                <div className="text-center text-slate-500 py-6 border-2 border-dashed border-slate-800 rounded-xl text-sm">
                  Esta carta no tiene sinergias. {working ? 'Pulsa "+ Sinergia".' : 'Pulsa "Editar sinergias".'}
                </div>
              )}
            </div>

            {/* cartas relacionadas por tag */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-black text-slate-300 mb-3">🔗 Cartas que interactúan por tags ({related.length})</h3>
              <div className="flex flex-wrap gap-3">
                {related.map((c) => (
                  <div key={c.__sourceId + c.id} onClick={() => setSelectedId(c.id)}>
                    <CardView card={c} size="sm" onClick={() => setSelectedId(c.id)} />
                  </div>
                ))}
                {related.length === 0 && <span className="text-xs text-slate-600 italic">Ninguna carta comparte tags con esta.</span>}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* panel de tags global */}
      <aside className="w-52 bg-slate-900 border-l border-slate-800 overflow-y-auto shrink-0 hidden xl:block">
        <div className="p-3 border-b border-slate-800 text-xs font-black text-slate-300">🏷️ Mapa de Tags</div>
        <div className="p-2 space-y-1">
          {[...tagMap.entries()].sort((a, b) => b[1].length - a[1].length).map(([tag, cards]) => (
            <div key={tag} className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-[0.65rem] font-bold text-fuchsia-300">#{tag} <span className="text-slate-500">({cards.length})</span></div>
              <div className="text-[0.55rem] text-slate-500 truncate">{cards.map((c) => c.name).join(', ')}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};
