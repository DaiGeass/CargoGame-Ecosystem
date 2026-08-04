import React, { useState } from 'react';
import { Combo } from '../data/cards';
import { collectBaseCombos } from '../services/gameContent';
import { getInstalledMods, saveMod, sanitizeId, ComboMod } from '../data/mods';
import { CardView } from './CardView';
import { useDevBuild } from '../store/devbuildStore';

function uid() { return `combo_${Date.now().toString(36)}`; }

const blankCombo = (): Combo => ({
  id: uid(), name: 'Nuevo Combo', requiredCards: [], description: 'Carta A + Carta B',
  effectDescription: '+50 daño', isTeamCombo: false, bonusValue: 50,
});

export const ComboEditor: React.FC = () => {
  const { getAllCardsWithSource } = useDevBuild();
  const allCards = getAllCardsWithSource();
  const mods = getInstalledMods();
  const [combos, setCombos] = useState<Combo[]>([
    ...collectBaseCombos(),
    ...getInstalledMods().flatMap(m => m.combos.map(c => ({ ...c } as Combo))),
  ]);
  const [selectedId, setSelectedId] = useState(combos[0]?.id || '');
  const [targetMod, setTargetMod] = useState('base');
  const [saved, setSaved] = useState(false);

  const sel = combos.find(c => c.id === selectedId) || combos[0];

  const update = (patch: Partial<Combo>) => {
    setCombos(cs => cs.map(c => c.id === selectedId ? { ...c, ...patch } : c));
    setSaved(false);
  };

  const addCombo = () => {
    const c = blankCombo();
    setCombos(cs => [...cs, c]);
    setSelectedId(c.id);
  };

  const removeCombo = (id: string) => {
    setCombos(cs => cs.filter(c => c.id !== id));
    setSelectedId(combos.find(c => c.id !== id)?.id || '');
  };

  const toggleCard = (cardId: string) => {
    if (!sel) return;
    const req = sel.requiredCards.includes(cardId)
      ? sel.requiredCards.filter(id => id !== cardId)
      : [...sel.requiredCards, cardId];
    update({ requiredCards: req });
  };

  const saveCombo = () => {
    if (!sel || targetMod === 'base') { setSaved(true); setTimeout(() => setSaved(false), 2000); return; }
    const mod = mods.find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === targetMod);
    if (mod) {
      const comboAsMod: ComboMod = { id: sel.id, name: sel.name, requiredCards: sel.requiredCards, description: sel.description, effectDescription: sel.effectDescription, isTeamCombo: sel.isTeamCombo, bonusValue: sel.bonusValue };
      const idx = mod.combos.findIndex(c => c.id === sel.id);
      const combosArr = [...mod.combos];
      if (idx >= 0) combosArr[idx] = comboAsMod; else combosArr.push(comboAsMod);
      saveMod({ ...mod, combos: combosArr });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportCombo = () => {
    if (!sel) return;
    const blob = new Blob([JSON.stringify(sel, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${sel.id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCards = allCards.filter(c => sel?.requiredCards.includes(c.id));

  return (
    <div className="h-full flex">
      {/* sidebar */}
      <aside className="w-52 bg-slate-900 border-r border-slate-800 overflow-y-auto shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-black text-amber-300">💥 Combos</span>
          <button onClick={addCombo} className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded-lg font-bold">+</button>
        </div>
        {combos.map(c => (
          <div key={c.id} onClick={() => setSelectedId(c.id)}
               className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 ${selectedId === c.id ? 'bg-amber-900/40 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span>💥</span>
            <div className="flex-1 min-w-0">
              <div className="truncate font-bold text-xs">{c.name}</div>
              <div className="text-[0.55rem] text-slate-500">{c.requiredCards.length} cartas</div>
            </div>
          </div>
        ))}
      </aside>

      {/* editor */}
      <main className="flex-1 overflow-y-auto p-5">
        {!sel ? <div className="text-center text-slate-500 py-16">Sin combos. Crea uno.</div> : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-amber-300">{sel.name}</h2>
                <div className="text-sm text-slate-400">{sel.description} → {sel.effectDescription}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={exportCombo} className="text-xs bg-slate-800 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg">📤</button>
                <button onClick={() => removeCombo(sel.id)} className="text-xs bg-slate-800 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg">🗑️</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2"><span className="text-[0.65rem] font-bold text-slate-400 uppercase">Nombre</span>
                <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-amber-500" value={sel.name} onChange={e => update({ name: e.target.value })} />
              </label>
              <label className="block"><span className="text-[0.65rem] font-bold text-slate-400 uppercase">Descripción</span>
                <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-amber-500" value={sel.description} onChange={e => update({ description: e.target.value })} />
              </label>
              <label className="block"><span className="text-[0.65rem] font-bold text-slate-400 uppercase">Efecto</span>
                <input className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-amber-500" value={sel.effectDescription} onChange={e => update({ effectDescription: e.target.value })} />
              </label>
              <label className="block"><span className="text-[0.65rem] font-bold text-slate-400 uppercase">Bonus (valor)</span>
                <input type="number" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-amber-500" value={sel.bonusValue} onChange={e => update({ bonusValue: +e.target.value })} />
              </label>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={sel.isTeamCombo} onChange={e => update({ isTeamCombo: e.target.checked })} /> Combo de equipo
                </label>
              </div>
            </div>

            {/* cartas seleccionadas */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-black text-amber-300 mb-2">🎴 Cartas del combo ({sel.requiredCards.length})</h3>
              {selectedCards.length > 0 ? (
                <div className="flex flex-wrap gap-3 mb-3">
                  {selectedCards.map(c => <CardView key={c.__sourceId + c.id} card={c} size="sm" onClick={() => toggleCard(c.id)} />)}
                </div>
              ) : <div className="text-sm text-slate-500 mb-3">Haz click en cartas abajo para agregarlas.</div>}
            </div>

            {/* selector de cartas */}
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-black text-slate-300 mb-2">Añadir carta al combo</h3>
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {allCards.map(c => {
                  const active = sel.requiredCards.includes(c.id);
                  return (
                    <button key={c.__sourceId + c.id} onClick={() => toggleCard(c.id)}
                            className={`text-xs px-2 py-1 rounded-lg border font-bold transition-colors ${active ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500'}`}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Guardar en:</span>
                <select className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none" value={targetMod} onChange={e => setTargetMod(e.target.value)}>
                  <option value="base">Juego Base (solo UI)</option>
                  {mods.map(m => { const id = m.manifest.id || sanitizeId(m.manifest.name); return <option key={id} value={id}>{m.manifest.name}</option>; })}
                </select>
              </div>
              <button onClick={saveCombo} className={`px-5 py-2 rounded-xl text-sm font-black ${saved ? 'bg-emerald-800 text-emerald-200' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}>
                {saved ? '✓ Guardado' : '💾 Guardar combo'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
