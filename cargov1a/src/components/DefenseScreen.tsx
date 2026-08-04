// ============================================================
// DEFENSE SCREEN - Fase de respuesta del objetivo
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getAllCharactersWithSource } from '../data/contentRegistry';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export const DefenseScreen: React.FC = () => {
  const store = useGameStore();
  const DEFENSE_TIME = store.rules.defenseTimerSecs;
  const df = store.defensePhase;
  if (!df) return null;

  const defender = store.players.find(p => p.id === df.targetId);
  const attacker = store.players.find(p => p.id === df.attackerId);
  const preview = store.resolutionPreview;
  const allChars = getAllCharactersWithSource();
  const defChar = allChars.find(c => c.id === defender?.characterId);
  const atkChar = allChars.find(c => c.id === attacker?.characterId);

  const defCards = defender?.hand.filter(c =>
    c.type === 'defense' || (c.isInstant && (c.effectTiming === 'on_damage_taken' || c.type === 'dodge'))
  ) ?? [];

  const typeColors: Record<string, string> = {
    dodge: 'border-cyan-500 bg-cyan-950/40 text-cyan-300',
    defense: 'border-blue-500 bg-blue-950/40 text-blue-300',
    special: 'border-amber-500 bg-amber-950/40 text-amber-300',
    counter: 'border-orange-500 bg-orange-950/40 text-orange-300',
  };

  const [seconds, setSeconds] = useState(DEFENSE_TIME);
  useEffect(() => {
    setSeconds(DEFENSE_TIME);
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(interval);
          if (defender?.control === 'human') {
            store.skipDefense();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [df.attackerId, df.targetId, df.pendingDamage]);

  useEffect(() => {
    if (store.defenseChainDepth >= store.maxChainDepth) {
      store.log(`⚠️ Cadena de defensa demasiado profunda. Resolviendo...`, 'system');
      store.skipDefense();
    }
  }, [store.defenseChainDepth]);

  const timerPct = (seconds / DEFENSE_TIME) * 100;
  const timerColor = seconds > 6 ? 'bg-green-500' : seconds > 3 ? 'bg-yellow-500' : 'bg-red-500';
  const urgent = seconds <= 3;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-40 p-4"
    >
      {urgent && (
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          className="fixed inset-0 bg-red-500 pointer-events-none z-0"
        />
      )}

      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-red-500/50 p-5 max-w-md w-full shadow-2xl relative z-10"
      >
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          <motion.div
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            className={cn('h-full rounded-full', timerColor)}
          />
        </div>

        <div className="text-center mb-4">
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: urgent ? 0.3 : 0.8 }}
            className="text-5xl mb-2"
          >
            ⚠️
          </motion.div>
          <h2 className={cn('text-xl font-black text-white', urgent && 'text-red-400')}>
            {store.defenseChainDepth > 0 ? '🔄 ¡Contraataque!' : '¡Estás bajo ataque!'}
          </h2>
          {store.defenseChainDepth > 0 && (
            <div className="text-[0.6rem] text-orange-300 font-bold mt-0.5">
              Cadena de defensa · Nivel {store.defenseChainDepth}/{store.maxChainDepth}
            </div>
          )}
          <p className="text-[0.7rem] text-red-300 mt-1">
            <span style={{ color: atkChar?.color }}>{attacker?.avatar} {attacker?.name}</span> → <span style={{ color: defChar?.color }}>{defender?.avatar} {defender?.name}</span>
          </p>
          <motion.div
            animate={urgent ? { scale: [1, 1.3, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className={cn('mt-2 text-2xl font-black', seconds > 6 ? 'text-green-400' : seconds > 3 ? 'text-yellow-400' : 'text-red-400')}
          >
            {seconds}s
          </motion.div>
        </div>

        <div className="bg-red-950/40 border border-red-700/40 rounded-xl p-3 mb-4 text-center relative overflow-hidden">
          <div className="relative">
            <div className="text-[0.6rem] text-red-400/70 uppercase tracking-wider mb-0.5 font-bold">Daño entrante</div>
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="text-4xl font-black text-red-400">
              -{df.pendingDamage} HP
            </motion.div>
            {df.pendingDots.length > 0 && (
              <div className="mt-1 text-[0.55rem] text-purple-300">
                + efectos: {df.pendingDots.map(d => `${d.name}(${d.value}x${d.duration}t)`).join(', ')}
              </div>
            )}
          </div>
        </div>

        {preview?.cards && preview.cards.length > 0 && (
          <div className="mb-4 bg-slate-950/50 border border-slate-700/50 rounded-xl p-2">
            <div className="text-[0.6rem] text-amber-400 uppercase tracking-wider font-bold mb-1">Cartas del atacante</div>
            <div className="flex flex-wrap gap-1">
              <AnimatePresence>
                {preview.cards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ rotateY: -180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-slate-800 rounded p-1.5 border border-slate-700 min-w-[90px] max-w-[140px]"
                  >
                    <div className="text-[0.55rem] text-amber-300 font-bold leading-tight">{card.name}</div>
                    <div className="text-[0.48rem] text-slate-400 leading-tight">{card.description}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between text-[0.6rem] text-slate-400 mb-1">
            <span>❤ HP de {defender?.name}</span>
            <span className="font-bold">
              {defender?.currentHp} → <span className={cn(
                (defender?.currentHp ?? 0) - df.pendingDamage <= 0 ? 'text-red-400 font-black' :
                (defender?.currentHp ?? 0) - df.pendingDamage < (defender?.maxHp ?? 1) * 0.3 ? 'text-yellow-400' : 'text-white'
              )}>
                {Math.max(0, (defender?.currentHp ?? 0) - df.pendingDamage)}
              </span> / {defender?.maxHp}
            </span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: `${((defender?.currentHp ?? 0) / (defender?.maxHp ?? 1)) * 100}%` }}
              animate={{ width: `${Math.max(0, ((defender?.currentHp ?? 0) - df.pendingDamage) / (defender?.maxHp ?? 1) * 100)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
            />
          </div>
          {(defender?.currentHp ?? 0) - df.pendingDamage <= 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-red-400 font-black text-[0.6rem] mt-1">
              💀 Si no te defiendes, MORIRÁS
            </motion.div>
          )}
        </div>

        {defCards.length > 0 ? (
          <div className="mb-4">
            <div className="text-[0.6rem] text-slate-400 uppercase tracking-wider mb-2 font-bold">🃏 Usa una carta de respuesta:</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {defCards.map((card, i) => (
                <motion.button
                  key={card.id}
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  whileHover={{ scale: 1.1, y: -6, rotate: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => store.defendWithCard(card.id)}
                  className={cn(
                    'px-3 py-2 rounded-xl border-2 text-left transition-all min-w-[130px] max-w-[180px] shadow-lg',
                    typeColors[card.type] || 'border-slate-600 bg-slate-800/60 text-slate-300',
                    'hover:shadow-xl'
                  )}
                >
                  <div className="text-xs font-black">{card.name}</div>
                  <div className="text-[0.5rem] opacity-80 mt-0.5">{card.description}</div>
                  {card.instantCondition && (
                    <div className="text-[0.45rem] opacity-60 italic mt-0.5">{card.instantCondition}</div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-slate-800/50 rounded-xl text-center">
            <div className="text-[0.65rem] text-slate-400 font-bold mb-1">Sin cartas defensivas disponibles</div>
            <div className="text-[0.5rem] text-slate-500">El daño se aplicará al finalizar el tiempo</div>
          </div>
        )}

        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => store.skipDefense()}
            className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-bold hover:bg-slate-600 transition-colors"
          >
            😔 Recibir daño
          </motion.button>
        </div>

        <div className="text-center text-[0.5rem] text-slate-600 mt-2 italic">
          El daño se aplica automáticamente cuando llega a 0s
        </div>
      </motion.div>
    </motion.div>
  );
};
