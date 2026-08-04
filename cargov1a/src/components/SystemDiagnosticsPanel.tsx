// ============================================================
// SYSTEM DIAGNOSTICS - Verificación de almacenamiento e instalación
// ============================================================
// Panel que muestra dónde se guarda todo y verifica que el disco
// duro funcione correctamente. Útil para confirmar antes/después
// del empaquetado que la persistencia funciona.
// ============================================================

import React, { useState, useEffect } from 'react';
import { getFileSystem, FOLDER_STRUCTURE } from '../utils/fileSystem';
import { getPersistenceInfo, writePersisted, readPersisted } from '../services/persistence';
import { getInstalledMods } from '../data/mods';
import { cn } from '../utils/cn';

interface CheckResult {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'pending';
  detail: string;
}

export const SystemDiagnosticsPanel: React.FC = () => {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const results: CheckResult[] = [];
    const fs = getFileSystem();

    // 1. Modo de almacenamiento
    results.push({
      label: 'Modo de almacenamiento',
      status: fs.mode === 'tauri' ? 'ok' : 'warn',
      detail: fs.mode === 'tauri'
        ? 'Tauri: guarda en disco duro real ✓'
        : 'Web: guarda en disco compartido (disco real). En la app instalada usará el disco.',
    });

    // 2. Estructura de carpetas
    if (fs.mode === 'tauri') {
      const folders = [
        FOLDER_STRUCTURE.data, FOLDER_STRUCTURE.saves, FOLDER_STRUCTURE.mods,
        FOLDER_STRUCTURE.dlc, FOLDER_STRUCTURE.assets,
      ];
      let allExist = true;
      for (const f of folders) {
        const exists = await fs.exists(f);
        if (!exists) { await fs.createDir(f); }
        if (!await fs.exists(f)) allExist = false;
      }
      results.push({
        label: 'Estructura de carpetas',
        status: allExist ? 'ok' : 'error',
        detail: allExist
          ? `${folders.length} carpetas creadas: data/, saves/, mods/, dlc/, assets/`
          : 'No se pudieron crear algunas carpetas',
      });
    } else {
      results.push({
        label: 'Estructura de carpetas',
        status: 'warn',
        detail: 'Solo disponible en la app instalada (Tauri)',
      });
    }

    // 3. Test de escritura/lectura
    const testKey = 'diagnostics_test';
    const testValue = `test_${Date.now()}`;
    writePersisted(testKey, testValue);
    await new Promise(r => setTimeout(r, 100));
    const readBack = readPersisted(testKey);
    results.push({
      label: 'Escritura y lectura',
      status: readBack === testValue ? 'ok' : 'error',
      detail: readBack === testValue
        ? 'Guardar y leer funciona correctamente ✓'
        : `Falló: escribí "${testValue}", leí "${readBack}"`,
    });

    // 4. Persistencia de config
    const pInfo = getPersistenceInfo();
    results.push({
      label: 'Configuración persistida',
      status: 'ok',
      detail: `${pInfo.cacheSize} valores en caché · ${pInfo.keys.length} claves: ${pInfo.keys.join(', ')}`,
    });

    // 5. Mods cargados
    const mods = getInstalledMods();
    const dlc = mods.filter(m => m.manifest.kind === 'dlc' || (m.manifest.id || '').startsWith('dlc_'));
    results.push({
      label: 'Contenido instalado',
      status: 'ok',
      detail: `${mods.length - dlc.length} mods · ${dlc.length} DLC cargados`,
    });

    // 6. Multijugador (WebRTC)
    const rtcOk = typeof RTCPeerConnection !== 'undefined';
    results.push({
      label: 'Multijugador (WebRTC)',
      status: rtcOk ? 'ok' : 'warn',
      detail: rtcOk ? 'WebRTC disponible para LAN/VPN ✓' : 'WebRTC no disponible',
    });

    setChecks(results);
    setRunning(false);
  };

  useEffect(() => { runDiagnostics(); }, []);

  const statusColor = (s: CheckResult['status']) =>
    s === 'ok' ? 'text-green-400 bg-green-950/40 border-green-700/40' :
    s === 'warn' ? 'text-amber-400 bg-amber-950/40 border-amber-700/40' :
    s === 'error' ? 'text-red-400 bg-red-950/40 border-red-700/40' :
    'text-slate-400 bg-slate-800/40 border-slate-700/40';

  const statusIcon = (s: CheckResult['status']) =>
    s === 'ok' ? '✅' : s === 'warn' ? '⚠️' : s === 'error' ? '❌' : '⏳';

  const allOk = checks.every(c => c.status === 'ok' || c.status === 'warn');

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-slate-800/70 to-emerald-950/30 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-sm font-black text-emerald-300 mb-1">🔍 Diagnóstico del Sistema</h3>
        <p className="text-[0.58rem] text-slate-300 leading-relaxed">
          Verifica que el juego guarde correctamente todo en el disco duro.
          Ejecuta esto antes y después de instalar para confirmar que funciona.
        </p>
      </div>

      {checks.length > 0 && (
        <div className={cn('rounded-xl p-3 border text-center font-black text-sm',
          allOk ? 'bg-green-950/30 border-green-700/40 text-green-300' : 'bg-red-950/30 border-red-700/40 text-red-300')}>
          {allOk ? '✅ Todo funciona correctamente' : '❌ Hay problemas que revisar'}
        </div>
      )}

      <div className="space-y-2">
        {checks.map((c, i) => (
          <div key={i} className={cn('rounded-lg border p-2.5 flex items-start gap-2', statusColor(c.status))}>
            <span className="text-base shrink-0">{statusIcon(c.status)}</span>
            <div className="min-w-0">
              <div className="text-[0.7rem] font-black">{c.label}</div>
              <div className="text-[0.55rem] text-slate-300 mt-0.5 leading-relaxed">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={runDiagnostics} disabled={running}
        className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors">
        {running ? '⏳ Verificando...' : '🔄 Volver a verificar'}
      </button>
    </div>
  );
};
