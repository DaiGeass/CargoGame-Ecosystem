// ============================================================
// MOD MANAGER (real, alineado con CARGAS + DevBuild)
// ============================================================
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDevBuild } from '../store/devbuildStore';
import { LoadedMod, importModWithTauriDialog, sanitizeId } from '../data/mods';

export const ModManager: React.FC = () => {
  const { mods, importModFile, deleteMod, refreshMods, disabledMods, toggleMod } = useDevBuild();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const mid = (m: LoadedMod) => m.manifest.id || sanitizeId(m.manifest.name);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      let installed = 0;
      for (const file of Array.from(files)) { await importModFile(file); installed++; }
      setMessage({ type: 'ok', text: `${installed} mod(s) instalado(s). Sincronizado con cargas.installedMods.v1 ✓` });
    } catch (err: any) { setMessage({ type: 'err', text: err?.message || 'Error instalando mod' }); }
  };

  const handleTauriImport = async () => {
    try {
      const mod = await importModWithTauriDialog();
      if (!mod) { setMessage({ type: 'err', text: 'No se seleccionó archivo o no estás en Tauri.' }); return; }
      refreshMods();
      setMessage({ type: 'ok', text: `Mod instalado: ${mod.manifest.name}` });
    } catch (err: any) { setMessage({ type: 'err', text: err?.message || 'Error' }); }
  };

  const exportMod = (mod: LoadedMod) => {
    const blob = new Blob([JSON.stringify(mod, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${mid(mod)}.cargasmod.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-slate-800/70 to-cyan-950/30 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-sm font-black text-cyan-300 mb-1">🧩 Gestor de Mods</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Instala <b>.json</b>, <b>.zip</b> o <b>.cargasmod</b>. Los mods se guardan en <code className="text-cyan-300">cargas.installedMods.v1</code> (mismo storage que el juego CARGAS).
        </p>
      </div>

      <div onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }} onDragOver={e => e.preventDefault()}
           className="border-2 border-dashed border-cyan-700/50 rounded-xl p-5 bg-cyan-950/10 text-center hover:bg-cyan-950/20 transition-colors">
        <div className="text-3xl mb-2">📦</div>
        <div className="text-sm font-black text-cyan-300">Arrastra tu mod aquí</div>
        <div className="text-[0.55rem] text-slate-500 mb-3">.json · .zip · .cargasmod</div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500">📁 Elegir archivo</button>
          <button onClick={handleTauriImport} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-600">🖥️ Abrir con Tauri</button>
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".json,.zip,.cargasmod" className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`p-2 rounded-lg border text-xs ${message.type === 'ok' ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' : 'bg-red-950/40 border-red-700/40 text-red-300'}`}>
            {message.type === 'ok' ? '✅' : '❌'} {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
          <span className="text-xs font-black text-amber-300">Mods instalados</span>
          <span className="text-xs text-slate-500">{mods.length} paquete(s)</span>
        </div>
        <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto">
          {mods.length === 0 && <div className="text-center text-xs text-slate-500 py-6">Sin mods. Instala uno arriba.</div>}
          {mods.map(mod => {
            const id = mid(mod);
            const enabled = !disabledMods.has(id);
            return (
              <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-2.5 flex items-center gap-2">
                {mod.manifest.icon && <img src={mod.manifest.icon} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-white flex items-center gap-1">
                    {mod.manifest.name}
                    <span className="text-[0.5rem] bg-slate-800 text-slate-400 px-1 py-0.5 rounded uppercase">{mod.manifest.kind || 'mod'}</span>
                  </div>
                  <div className="text-[0.55rem] text-slate-500">v{mod.manifest.version} · {mod.manifest.author}</div>
                  <div className="flex gap-1 mt-1">
                    <span className="text-[0.5rem] bg-amber-950/50 text-amber-300 px-1 py-0.5 rounded">🃏 {mod.cards.length}</span>
                    <span className="text-[0.5rem] bg-blue-950/50 text-blue-300 px-1 py-0.5 rounded">🦸 {mod.characters.length}</span>
                    <span className="text-[0.5rem] bg-purple-950/50 text-purple-300 px-1 py-0.5 rounded">💥 {mod.combos.length}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => toggleMod(id)} className={`text-[0.6rem] font-bold px-2 py-1 rounded-lg ${enabled ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {enabled ? '●' : '○'}
                  </button>
                  <button onClick={() => exportMod(mod)} className="text-[0.6rem] bg-slate-800 hover:bg-blue-600 text-white px-2 py-1 rounded-lg">📤</button>
                  <button onClick={() => { if (confirm(`¿Eliminar "${mod.manifest.name}"?`)) deleteMod(id); }} className="text-[0.6rem] bg-slate-800 hover:bg-red-600 text-white px-2 py-1 rounded-lg">🗑️</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
