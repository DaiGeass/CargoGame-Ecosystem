import React, { useRef, useState } from 'react';
import { useDevBuild } from '../store/devbuildStore';
import { LoadedMod, sanitizeId } from '../data/mods';

export const ContentBrowser: React.FC = () => {
  const {
    baseCards, baseCharacters, mods, disabledMods, toggleMod, deleteMod, createMod, importModFile,
    setView, setFilterSource, getAllCardsWithSource,
  } = useDevBuild();
  const mid = (m: LoadedMod) => m.manifest.id || sanitizeId(m.manifest.name);
  const fileRef = useRef<HTMLInputElement>(null);
  const [newModName, setNewModName] = useState('');

  const allCards = getAllCardsWithSource();

  const exportMod = (mod: LoadedMod) => {
    const blob = new Blob([JSON.stringify(mod, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${mod.manifest.id}.cargasmod.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportAll = () => {
    const data = { baseCards, baseCharacters, mods };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `devbuild_export.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importModFile(file);
    } catch (err: any) { alert('Error al importar: ' + (err?.message || err)); }
    e.target.value = '';
  };

  const Stat: React.FC<{ icon: string; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
      <span className="text-3xl">{icon}</span>
      <div>
        <div className="text-2xl font-black" style={{ color }}>{value}</div>
        <div className="text-[0.65rem] text-slate-400 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* intro */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 rounded-2xl p-5 border border-emerald-800/50">
          <h1 className="text-xl font-black text-emerald-300">🔧 DevBuild — Editor total de CARGAS</h1>
          <p className="text-sm text-slate-400 mt-1">Recolecta el contenido <b>directamente del juego</b> (cartas, personajes, efectos, tags). Crea y modifica cartas, personajes, habilidades, pasivas, efectos y sinergias por GUI o CLI. Todo se sincroniza con el juego instalado en la misma ruta.</p>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon="🎴" label="Cartas totales" value={allCards.length} color="#22c55e" />
          <Stat icon="👤" label="Personajes" value={baseCharacters.length + mods.reduce((a, m) => a + m.characters.length, 0)} color="#3b82f6" />
          <Stat icon="📦" label="Mods / DLC" value={mods.length} color="#d946ef" />
          <Stat icon="⚡" label="Sinergias" value={allCards.reduce((a, c) => a + (c.synergies?.length || 0), 0)} color="#f59e0b" />
        </div>

        {/* acciones rápidas */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setFilterSource('all'); setView('visual'); }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-lg">🎨 Editor Visual</button>
          <button onClick={() => setView('synergy')} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold px-4 py-2 rounded-lg">⚡ Laboratorio de Sinergias</button>
          <button onClick={() => fileRef.current?.click()} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-lg">📥 Importar mod/JSON</button>
          <button onClick={exportAll} className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold px-4 py-2 rounded-lg">📤 Exportar todo</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {/* fuente base */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏛️</span>
              <div>
                <div className="font-black text-white">Juego Base</div>
                <div className="text-xs text-slate-500">{baseCards.length} cartas · {baseCharacters.length} personajes</div>
              </div>
            </div>
            <button onClick={() => { setFilterSource('base'); setView('visual'); }} className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg">Ver cartas →</button>
          </div>
        </div>

        {/* mods */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black text-slate-300">📦 Mods y DLC instalados</h2>
            <div className="flex items-center gap-2">
              <input value={newModName} onChange={(e) => setNewModName(e.target.value)} placeholder="Nombre del mod..."
                     className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none" />
              <button onClick={() => { if (newModName.trim()) { createMod(newModName.trim(), 'DevBuild'); setNewModName(''); } }}
                      className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">+ Crear mod</button>
            </div>
          </div>
          <div className="space-y-2">
            {mods.map((mod) => (
              <div key={mod.manifest.id} className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
                <span className="text-xl">{mod.manifest.kind === 'dlc' ? '💎' : '🧩'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    {mod.manifest.name}
                    <span className="text-[0.55rem] uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{mod.manifest.kind || 'mod'}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">v{mod.manifest.version} · {mod.manifest.author} · {mod.cards.length} cartas · {mod.characters.length} pjs</div>
                </div>
                <button onClick={() => toggleMod(mid(mod))} title="Activar/desactivar"
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${!disabledMods.has(mid(mod)) ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  {!disabledMods.has(mid(mod)) ? '● ON' : '○ OFF'}
                </button>
                <button onClick={() => { setFilterSource(mid(mod)); setView('visual'); }} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg">Ver</button>
                <button onClick={() => exportMod(mod)} title="Exportar" className="text-xs bg-slate-800 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg">📤</button>
                <button onClick={() => { if (confirm(`¿Eliminar mod "${mod.manifest.name}"?`)) deleteMod(mid(mod)); }} title="Eliminar" className="text-xs bg-slate-800 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg">🗑</button>
              </div>
            ))}
            {mods.length === 0 && <div className="text-center text-slate-600 py-6 text-sm border-2 border-dashed border-slate-800 rounded-xl">No hay mods. Crea uno arriba.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
