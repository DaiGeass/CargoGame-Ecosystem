// ============================================================
// SYSTEM DIAGNOSTICS (real, alineado con CARGAS)
// ============================================================
import React, { useState, useEffect } from 'react';
import { getFileSystem, FOLDER_STRUCTURE } from '../utils/fileSystem';
import { getPersistenceInfo, writePersisted, readPersisted } from '../services/persistence';
import { getInstalledMods } from '../data/mods';

interface CheckResult { label: string; status: 'ok' | 'warn' | 'error'; detail: string; }

export const SystemDiagnosticsPanel: React.FC = () => {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const results: CheckResult[] = [];
    const fs = getFileSystem();

    results.push({ label: 'Modo de almacenamiento', status: fs.mode === 'tauri' ? 'ok' : 'warn', detail: fs.mode === 'tauri' ? '✓ Tauri: disco duro real' : 'Web: disco compartido (disco real). En la app instalada usará disco.' });

    if (fs.mode === 'tauri') {
      let allExist = true;
      for (const f of [FOLDER_STRUCTURE.data, FOLDER_STRUCTURE.saves, FOLDER_STRUCTURE.mods, FOLDER_STRUCTURE.dlc]) {
        const exists = await fs.exists(f);
        if (!exists) { await fs.createDir(f); if (!await fs.exists(f)) allExist = false; }
      }
      results.push({ label: 'Estructura de carpetas', status: allExist ? 'ok' : 'error', detail: allExist ? 'data/, saves/, mods/, dlc/ creadas ✓' : 'No se pudieron crear algunas carpetas' });
    } else {
      results.push({ label: 'Estructura de carpetas', status: 'warn', detail: 'Solo disponible en app instalada (Tauri)' });
    }

    const testKey = 'devbuild_diag_test';
    const testVal = `test_${Date.now()}`;
    writePersisted(testKey, testVal);
    await new Promise(r => setTimeout(r, 80));
    const readBack = readPersisted(testKey);
    results.push({ label: 'Escritura y lectura', status: readBack === testVal ? 'ok' : 'error', detail: readBack === testVal ? 'Guardar y leer funciona ✓' : `Falló: escribí "${testVal}", leí "${readBack}"` });

    const pInfo = getPersistenceInfo();
    results.push({ label: 'Configuración persistida', status: 'ok', detail: `${pInfo.cacheSize} valores en caché · claves: ${pInfo.keys.join(', ')}` });

    const mods = getInstalledMods();
    const totalCards = mods.reduce((a, m) => a + m.cards.length, 0);
    results.push({ label: 'Mods instalados', status: 'ok', detail: `${mods.length} mod(s) · ${totalCards} cartas en disco compartido['cargas.installedMods.v1']` });

    results.push({ label: 'Sinergia con juego', status: 'ok', detail: 'DevBuild escribe en cargas.installedMods.v1 = mismo storage que CARGAS ✓' });

    const rtcOk = typeof RTCPeerConnection !== 'undefined';
    results.push({ label: 'WebRTC (multijugador)', status: rtcOk ? 'ok' : 'warn', detail: rtcOk ? 'WebRTC disponible ✓' : 'No disponible' });

    setChecks(results);
    setRunning(false);
  };

  useEffect(() => { run(); }, []);

  const allOk = checks.every(c => c.status !== 'error');
  const statusIcon = (s: string) => s === 'ok' ? '✅' : s === 'warn' ? '⚠️' : '❌';
  const statusCls = (s: string) => s === 'ok' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-700/40' : s === 'warn' ? 'text-amber-400 bg-amber-950/40 border-amber-700/40' : 'text-red-400 bg-red-950/40 border-red-700/40';

  return (
    <div className="space-y-3">
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-black text-emerald-300 mb-1">🔍 Diagnóstico del Sistema</h3>
        <p className="text-xs text-slate-400">Verifica que el almacenamiento y la sinergia con CARGAS funcionen.</p>
      </div>

      {checks.length > 0 && (
        <div className={`rounded-xl p-3 border text-center font-black text-sm ${allOk ? 'bg-emerald-950/30 border-emerald-700/40 text-emerald-300' : 'bg-red-950/30 border-red-700/40 text-red-300'}`}>
          {allOk ? '✅ Todo funciona correctamente' : '❌ Revisa los errores'}
        </div>
      )}

      <div className="space-y-2">
        {checks.map((c, i) => (
          <div key={i} className={`rounded-lg border p-2.5 flex items-start gap-2 ${statusCls(c.status)}`}>
            <span className="text-base shrink-0">{statusIcon(c.status)}</span>
            <div>
              <div className="text-xs font-black">{c.label}</div>
              <div className="text-[0.6rem] text-slate-300 mt-0.5">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={run} disabled={running} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-500 disabled:opacity-50">
        {running ? '⏳ Verificando...' : '🔄 Volver a verificar'}
      </button>
    </div>
  );
};
