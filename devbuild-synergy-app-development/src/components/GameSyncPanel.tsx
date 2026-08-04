import React, { useState, useEffect } from 'react';
import { detectGame, GameDetectionResult } from '../services/gameDetection';
import { isGameConnected } from '../services/gameContent';
import { exportAllRegistries, importAllRegistries } from '../data/registries';
import { useDevBuild } from '../store/devbuildStore';

export const GameSyncPanel: React.FC = () => {
  const { refreshMods, refreshBase, getAllCardsWithSource, baseCards } = useDevBuild();
  const connected = isGameConnected();
  const [result, setResult] = useState<GameDetectionResult | null>(null);
  const [loading, setLoading] = useState(true);

  const run = async () => { setLoading(true); setResult(await detectGame()); setLoading(false); };
  useEffect(() => { run(); }, []);

  const exportRegistries = () => {
    const blob = new Blob([JSON.stringify(exportAllRegistries(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'devbuild_registries.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const importRegistries = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { importAllRegistries(JSON.parse(await file.text())); refreshMods(); alert('✅ Registros importados'); } catch { alert('❌ JSON inválido'); }
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 rounded-xl p-4 border border-emerald-800/50">
        <h3 className="text-sm font-black text-emerald-300 mb-1">🔗 Sinergia con el juego CARGAS</h3>
        <p className="text-xs text-slate-400">DevBuild detecta el juego en la misma ruta de instalación y comparte cartas, personajes, mods, tags y efectos.</p>
      </div>

      {/* recolección de contenido del juego */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center gap-3">
        <span className="text-2xl">{connected ? '🟢' : '🟡'}</span>
        <div className="flex-1">
          <div className="text-xs font-black text-white">{connected ? 'API del juego conectada (window.CARGAS_API)' : 'API del juego no detectada'}</div>
          <div className="text-[0.65rem] text-slate-500">
            {connected ? 'Recolectando cartas y personajes en vivo desde el juego.' : 'Usando catálogo base local. Al ejecutar dentro del juego, recolectará en vivo.'}
            {' '}· {baseCards.length} cartas base · {getAllCardsWithSource().length} totales
          </div>
        </div>
        <button onClick={() => { refreshBase(); refreshMods(); }} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold">🔄 Recolectar del juego</button>
      </div>

      {loading ? <div className="text-center text-slate-500 py-8">🔍 Detectando juego...</div> : result && (
        <>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{result.detected ? '✅' : '⚠️'}</span>
              <div>
                <div className="font-black text-white">{result.detected ? 'Juego detectado' : 'No detectado'}</div>
                <div className="text-xs text-slate-400">Modo: {result.mode === 'tauri' ? '🖥️ App instalada (disco real)' : '🌐 Web deshabilitado'}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Ruta</span><span className="text-white font-mono text-[0.65rem] truncate max-w-[60%]">{result.path}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Storage</span><span className="text-cyan-300 font-mono text-[0.65rem]">{result.storageKey}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Mods compartidos</span><span className="text-emerald-400 font-bold">{result.sharedMods}</span></div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <h4 className="text-xs font-black text-slate-300 mb-2">Detalles de sinergia</h4>
            <div className="space-y-1">
              {result.details.map((d, i) => <div key={i} className="text-xs text-slate-400">{d}</div>)}
            </div>
          </div>

          <button onClick={run} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl">🔄 Re-detectar</button>
        </>
      )}

      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
        <h4 className="text-xs font-black text-slate-300 mb-2">📦 Backup de registros (tags, efectos, habilidades, pasivas, overrides)</h4>
        <div className="flex gap-2">
          <button onClick={exportRegistries} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg">📤 Exportar todo</button>
          <label className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg text-center cursor-pointer">
            📥 Importar<input type="file" accept=".json" className="hidden" onChange={importRegistries} />
          </label>
        </div>
      </div>

      <div className="text-[0.6rem] text-slate-500 bg-slate-800/40 rounded-lg p-3 border border-slate-700/40 leading-relaxed">
        ℹ️ <b>Cómo funciona la sinergia:</b> al instalar el juego y DevBuild en la misma carpeta, ambos usan <code className="text-cyan-300">AppLocalData/com.cargas.game</code>.
        DevBuild escribe en <code className="text-cyan-300">mods/</code>, <code className="text-cyan-300">dlc/</code> y los registros; el juego los lee al arrancar (<code className="text-cyan-300">loadModsFromInstallFolder()</code>).
      </div>
    </div>
  );
};
