// ============================================================
// CARD CHOICE MODAL
// ============================================================
// Modal que se muestra cuando una carta tiene un efecto 'choice'.
// El jugador humano debe elegir una de las opciones disponibles.
// La promesa se resuelve con el índice elegido y el motor de efectos
// continúa con esa rama.
// ============================================================

import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

export const CardChoiceModal: React.FC = () => {
  const choiceRequest = useGameStore(s => (s as any).cardChoiceRequest);
  if (!choiceRequest) return null;

  const handlePick = (idx: number) => {
    choiceRequest.resolve(idx);
    // Limpiar el pedido del store
    useGameStore.setState({ cardChoiceRequest: undefined } as any);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4"
      >
        <motion.div
          initial={{ scale: 0.8, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 40 }}
          transition={{ type: 'spring', damping: 18 }}
          className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border-2 border-purple-500/50 p-6 max-w-2xl w-full shadow-2xl shadow-purple-500/30"
        >
          <div className="text-center mb-5">
            <div className="text-5xl mb-2">🎲</div>
            <h2 className="text-2xl font-black text-purple-300 drop-shadow-glow">Elige tu camino</h2>
            <p className="text-sm text-slate-400 mt-1">Esta carta te ofrece varias opciones</p>
          </div>

          <div className={`grid gap-3 ${choiceRequest.choices.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {choiceRequest.choices.map((choice: any, idx: number) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePick(idx)}
                className="bg-gradient-to-br from-purple-900/80 to-fuchsia-900/60 hover:from-purple-800 hover:to-fuchsia-800 rounded-xl border-2 border-purple-500/60 hover:border-purple-300 p-4 text-left transition-all shadow-lg shadow-purple-900/40"
              >
                <div className="text-xs font-black text-purple-200 mb-2 leading-tight">
                  {choice.label}
                </div>
                <div className="space-y-1">
                  {choice.effects.map((eff: any, i: number) => (
                    <div key={i} className="text-[0.65rem] text-slate-300 leading-tight flex items-start gap-1">
                      <span className="text-amber-400">•</span>
                      <span>{describeEffect(eff)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center text-[0.6rem] text-purple-300 font-bold uppercase tracking-wider">
                  ▶ Elegir
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-4 text-center text-[0.65rem] text-slate-500 italic">
            💡 Haz click en una opción para aplicarla
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper para describir un efecto en lenguaje humano
function describeEffect(eff: any): string {
  switch (eff.kind) {
    case 'damage': return `⚔️ Daño ${eff.amount || eff.formula || ''}`;
    case 'heal': return `💚 Cura ${eff.amount || eff.formula || ''}`;
    case 'hot': return `🌿 Regenera ${eff.amount || eff.formula || ''}/t x${eff.duration || 3}`;
    case 'defense_buff': return `🛡️ +${eff.amount} defensa`;
    case 'dot': return `☠️ DoT ${eff.amount}/t x${eff.duration || 3}`;
    case 'stun': return `😵 Aturde ${eff.duration || 1}t`;
    case 'silence': return `🤐 Silencia ${eff.duration || 2}t`;
    case 'skip_turn': return `⏭️ Salta turno`;
    case 'extra_turn': return `⌛ Turno extra`;
    case 'lifesteal': return `🩸 Drena ${eff.amount} HP`;
    case 'execute': return `💀 Ejecuta si HP <${eff.amount}%`;
    case 'draw_cards': return `🃏 Roba ${eff.amount || 1} carta(s)`;
    case 'discard': return `🗑️ Descarta ${eff.amount || 1}`;
    case 'shield': return `🛡️ Escudo`;
    case 'reflect': return `🪞 Refleja x${eff.amount || 2}`;
    case 'transfer_hp': return `💞 Transfiere HP`;
    case 'set_tag': return `🏷️ Marca [${(eff.applyTags || []).join(',')}]`;
    default: return eff.label || eff.kind;
  }
}
