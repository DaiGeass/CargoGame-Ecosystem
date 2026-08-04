// ============================================================
// MOD MANAGER
// ============================================================

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import {
  getInstalledMods,
  importModWithTauriDialog,
  installModFromFile,
  resetMods,
  uninstallMod,
  LoadedMod,
} from '../data/mods';
import { notifyModInstalled, notifyModUninstalled } from '../services/interprocess';

export const ModManager: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mods, setMods] = useState<LoadedMod[]>(() => getInstalledMods());
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const refresh = () => setMods(getInstalledMods());

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      let installed = 0;
      for (const file of Array.from(files)) {
        const mod = await installModFromFile(file);
        // Notificar a DevTool/ModdingTool vía bridge
        notifyModInstalled(mod.manifest.id || mod.manifest.name, mod.manifest.name);
        installed++;
      }
      refresh();
      setMessage({ type: 'ok', text: `${installed} mod(s) instalado(s). Reinicia la partida para que entren al mazo.` });
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Error instalando mod' });
    }
  };

  const handleTauriImport = async () => {
    try {
      const mod = await importModWithTauriDialog();
      if (!mod) {
        setMessage({ type: 'err', text: 'No se seleccionó archivo o no estás en Tauri.' });
        return;
      }
      refresh();
      setMessage({ type: 'ok', text: `Mod instalado: ${mod.manifest.name}` });
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Error importando mod desde Tauri' });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-slate-800/70 to-cyan-950/30 border border-slate-700/50 rounded-xl p-4 shadow-lg">
        <h3 className="text-sm font-black text-cyan-300 mb-1 flex items-center gap-2">🧩 Mods / DLC / Addons <span className="text-[0.5rem] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full border border-cyan-500/30">Modular</span></h3>
        <p className="text-[0.58rem] text-slate-300 leading-relaxed mb-2">
          Instala un <b>.json</b>, <b>.zip</b> o <b>.cargasmod</b>. Las cartas de mods se agregan al mazo al iniciar una nueva partida.
        </p>
        <div className="grid sm:grid-cols-3 gap-2 text-[0.55rem]">
          <div className="bg-slate-900/50 rounded-lg px-2 py-1 border border-slate-700/40 text-slate-300">🃏 Cartas, personajes y combos</div>
          <div className="bg-slate-900/50 rounded-lg px-2 py-1 border border-slate-700/40 text-slate-300">🖼️ PNG/JPG/SVG embebidos en ZIP</div>
          <div className="bg-slate-900/50 rounded-lg px-2 py-1 border border-slate-700/40 text-slate-300">🔊 MP3/WAV/OGG soportados</div>
        </div>
      </div>

      <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-cyan-700/50 rounded-xl p-5 bg-cyan-950/10 text-center hover:bg-cyan-950/20 transition-colors">
        <div className="text-3xl mb-2">📦</div>
        <div className="text-sm font-black text-cyan-300">Arrastra aquí tu mod</div>
        <div className="text-[0.55rem] text-slate-500 mb-3">.json, .zip o .cargasmod</div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-[0.65rem] font-bold hover:bg-cyan-500">
            📁 Elegir archivo
          </button>
          <button onClick={handleTauriImport}
            className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-[0.65rem] font-bold hover:bg-slate-600">
            🖥️ Importar con Tauri
          </button>
          <button onClick={() => { resetMods(); refresh(); setMessage({ type: 'ok', text: 'Mods eliminados.' }); }}
            className="px-3 py-1.5 rounded-lg bg-red-900/60 text-red-200 text-[0.65rem] font-bold hover:bg-red-800">
            🧹 Limpiar mods
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple
          accept=".json,.zip,.cargasmod,application/json,application/zip"
          className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={cn('p-2 rounded-lg border text-[0.6rem]',
              message.type === 'ok' ? 'bg-green-950/40 border-green-700/40 text-green-300' : 'bg-red-950/40 border-red-700/40 text-red-300')}>
            {message.type === 'ok' ? '✅' : '❌'} {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-700/50 flex justify-between items-center">
          <span className="text-xs font-black text-amber-300">Mods instalados</span>
          <span className="text-[0.55rem] text-slate-500">{mods.length} paquete(s)</span>
        </div>
        <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
          {mods.length === 0 && (
            <div className="text-center text-[0.6rem] text-slate-500 py-6">No hay mods instalados</div>
          )}
          {mods.map(mod => {
            const id = mod.manifest.id || mod.manifest.name.toLowerCase().replace(/\s+/g, '_');
            // Contar assets multimedia incrustados
            const imgCount = mod.cards.filter(c => (c.media?.image || c.imageFront)).length
              + mod.characters.filter(c => (c.media?.imageFront || c.imageFront)).length;
            const sndCount = mod.cards.filter(c =>
              c.media?.soundOnPlay || c.media?.soundOnHover || c.media?.soundOnResolve).length;
            return (
              <motion.div key={id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-cyan-600/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {mod.manifest.icon && (
                      <img src={mod.manifest.icon} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-700" />
                    )}
                    <div>
                      <div className="text-[0.72rem] font-black text-white">{mod.manifest.name}</div>
                      <div className="text-[0.5rem] text-slate-500">v{mod.manifest.version} · {mod.manifest.author}</div>
                      <div className="text-[0.55rem] text-slate-400 mt-1">{mod.manifest.description}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[0.45rem] bg-amber-950/50 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/30">🃏 {mod.cards.length} cartas</span>
                        <span className="text-[0.45rem] bg-blue-950/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/30">🧙 {mod.characters.length} pers.</span>
                        <span className="text-[0.45rem] bg-purple-950/50 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800/30">🎉 {mod.combos.length} combos</span>
                        {imgCount > 0 && <span className="text-[0.45rem] bg-pink-950/50 text-pink-300 px-1.5 py-0.5 rounded border border-pink-800/30">🖼️ {imgCount} img</span>}
                        {sndCount > 0 && <span className="text-[0.45rem] bg-teal-950/50 text-teal-300 px-1.5 py-0.5 rounded border border-teal-800/30">🔊 {sndCount} snd</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { uninstallMod(id); notifyModUninstalled(id); refresh(); }}
                    className="px-2 py-1 rounded-lg bg-red-900/50 text-red-300 text-[0.6rem] hover:bg-red-800 shrink-0 font-bold">
                    ✕
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
