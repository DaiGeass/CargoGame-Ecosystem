// ============================================================
// INDICADOR DE SINCRONIZACIÓN DE MODS (a nivel de sala)
// ============================================================
// En multijugador, si el HOST tiene mods que el cliente NO tiene,
// se muestra un aviso. El cliente NO puede entrar a la partida
// hasta que:
//   a) Instale los mods faltantes, o
//   b) El host los desactive
//
// NO se bloquean cartas individuales: es todo o nada a nivel de sala.
// ============================================================

import React from 'react';
import { useModSync } from '../hooks/useModSync';
import { motion, AnimatePresence } from 'framer-motion';

export const ModSyncIndicator: React.FC = () => {
  const { missingMods, hasMissingMods, syncMods } = useModSync();

  if (!hasMissingMods) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4 max-w-2xl mx-auto"
      >
        <div className="bg-gradient-to-r from-red-950/95 to-orange-950/95 backdrop-blur-md rounded-2xl border-2 border-red-500/50 p-4 shadow-2xl shadow-red-500/20">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-red-300 mb-1">
                No puedes jugar: faltan {missingMods.length} mod(s) del host
              </h3>
              <p className="text-[0.6rem] text-slate-300 mb-2 leading-relaxed">
                El host de la sala usa mods que tú no tienes instalados. Instálalos
                o pide al host que los desactive para poder iniciar la partida.
              </p>

              <div className="space-y-1 mb-3">
                {missingMods.map(mod => (
                  <div key={mod.id} className="flex items-center justify-between text-[0.55rem] bg-slate-900/50 rounded-lg px-2 py-1.5 border border-slate-700/50">
                    <span className="text-slate-300 font-bold">📦 {mod.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[0.45rem] font-black bg-red-900/60 text-red-300">
                      FALTANTE
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={syncMods}
                className="px-3 py-2 rounded-xl bg-slate-700 text-slate-200 text-[0.6rem] font-bold hover:bg-slate-600 transition-colors"
              >
                🔄 Verificar de nuevo
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
