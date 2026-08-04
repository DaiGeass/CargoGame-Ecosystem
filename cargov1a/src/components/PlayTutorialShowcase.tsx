// ============================================================
// 🎬 TUTORIAL VISUAL INTERACTIVO
// ============================================================
// Muestra una serie de slides animadas explicando cómo jugar.
// La idea es que el jugador NO tenga que adivinar:
//   1. Seleccionar carta
//   2. Elegir objetivo
//   3. Usar Golpear / Jugar
//   4. Resolver turno
//   5. Defenderse
//   6. Entender efectos (DoT, AOE, choice, stack)
//
// El tutorial es visual y autoexplicativo.
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface PlayTutorialShowcaseProps {
  open: boolean;
  onClose: () => void;
}

interface TutorialSlide {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  body: React.ReactNode;
}

const CardMock: React.FC<{ label: string; emoji: string; color: string; selected?: boolean; badge?: string }> = ({ label, emoji, color, selected, badge }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: selected ? -10 : 0, scale: selected ? 1.06 : 1 }}
    whileHover={{ y: -4, scale: 1.03 }}
    className={cn('w-16 h-22 rounded-lg border-2 p-1.5 relative flex flex-col items-center justify-between shadow-xl', selected && 'ring-2 ring-yellow-300 animate-selected')}
    style={{ background: color, borderColor: selected ? '#fde047' : 'rgba(255,255,255,0.25)', height: '5.5rem' }}
  >
    {badge && <div className="absolute top-0 right-0 bg-black/40 text-white text-[0.35rem] font-black px-1 rounded-bl">{badge}</div>}
    <div className="text-xl mt-0.5">{emoji}</div>
    <div className="text-[0.45rem] text-white font-black text-center leading-tight">{label}</div>
  </motion.div>
);

const PlayerMock: React.FC<{ name: string; avatar: string; hp: number; maxHp: number; target?: boolean; defending?: boolean }> = ({ name, avatar, hp, maxHp, target, defending }) => {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <motion.div
      animate={defending ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1.2 }}
      className={cn('w-32 rounded-xl border-2 p-2 bg-slate-900/90 shadow-xl relative', target ? 'border-red-400 shadow-red-500/20' : 'border-slate-700')}
    >
      {target && <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[0.4rem] font-black px-1.5 py-0.5 rounded-full">OBJ</div>}
      {defending && <div className="absolute -top-2 -left-2 bg-cyan-500 text-black text-[0.4rem] font-black px-1.5 py-0.5 rounded-full">🛡️ DEF</div>}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-base">{avatar}</div>
        <div>
          <div className="text-[0.7rem] font-black text-white">{name}</div>
        </div>
      </div>
      <div className="text-[0.45rem] text-slate-400 mb-1 flex justify-between">
        <span>HP</span><span>{hp}/{maxHp}</span>
      </div>
      <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-red-500 to-red-400" animate={{ width: `${pct}%` }} />
      </div>
    </motion.div>
  );
};

export const PlayTutorialShowcase: React.FC<PlayTutorialShowcaseProps> = ({ open, onClose }) => {
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const slides = useMemo<TutorialSlide[]>(() => [
    {
      id: 'pick-card',
      title: '1. Elige cartas de tu mano',
      subtitle: 'Haz click o arrastra cartas. Las seleccionadas brillan.',
      accent: 'from-amber-500 to-yellow-400',
      body: (
        <div className="flex justify-center gap-3 py-2">
          <CardMock label="Arco Corto" emoji="🏹" color="linear-gradient(160deg,#14532d,#166534)" selected />
          <CardMock label="Veneno" emoji="☠️" color="linear-gradient(160deg,#4a1d96,#5b21b6)" selected badge="DoT" />
          <CardMock label="Potenciar" emoji="⭐" color="linear-gradient(160deg,#7c2d12,#9a3412)" />
        </div>
      ),
    },
    {
      id: 'choose-target',
      title: '2. Marca un objetivo',
      subtitle: 'Haz click sobre un enemigo. Verás el badge rojo de objetivo.',
      accent: 'from-red-500 to-rose-400',
      body: (
        <div className="flex justify-center gap-6 py-2">
          <PlayerMock name="Tú" avatar="🏹" hp={2900} maxHp={2900} />
          <motion.div animate={{ x: [0, 8, 0], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1 }} className="self-center text-3xl text-amber-300">➜</motion.div>
          <PlayerMock name="Enemigo" avatar="⚔️" hp={2400} maxHp={3400} target />
        </div>
      ),
    },
    {
      id: 'golpear',
      title: '3. Usa “⚔️ Golpear” o “▶ Jugar”',
      subtitle: 'Golpear mezcla ataque básico + cartas. Jugar usa solo cartas seleccionadas.',
      accent: 'from-red-600 to-orange-500',
      body: (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex gap-3">
            <CardMock label="Espada" emoji="⚔️" color="linear-gradient(160deg,#7f1d1d,#991b1b)" selected />
            <CardMock label="Fuego" emoji="🔥" color="linear-gradient(160deg,#7c2d12,#9a3412)" selected badge="DoT" />
          </div>
          <div className="flex gap-3 mt-1">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-black shadow-lg">⚔️ Golpear</div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-black shadow-lg">▶ Jugar 2</div>
          </div>
        </div>
      ),
    },
    {
      id: 'resolver',
      title: '4. Resuelve el turno',
      subtitle: 'Las cartas preparadas se aplican al final con un solo cálculo correcto.',
      accent: 'from-green-500 to-emerald-400',
      body: (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex gap-1.5">
            <CardMock label="Carta Preparada" emoji="🂠" color="linear-gradient(160deg,#78350f,#422006)" />
            <CardMock label="Carta Preparada" emoji="🂠" color="linear-gradient(160deg,#78350f,#422006)" />
            <CardMock label="Carta Preparada" emoji="🂠" color="linear-gradient(160deg,#78350f,#422006)" />
          </div>
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.1 }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-sm font-black shadow-lg">⏭ Resolver (1)</motion.div>
        </div>
      ),
    },
    {
      id: 'defend',
      title: '5. Defiéndete si te atacan',
      subtitle: 'Puedes usar defensa, esquive, contraataque o cartas reactivas.',
      accent: 'from-cyan-500 to-sky-400',
      body: (
        <div className="flex justify-center gap-6 py-2">
          <PlayerMock name="Atacante" avatar="💀" hp={2500} maxHp={2500} />
          <motion.div animate={{ rotate: [0, 6, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="self-center text-4xl text-red-400">⚠️</motion.div>
          <PlayerMock name="Defensor" avatar="🛡️" hp={1800} maxHp={3200} defending />
        </div>
      ),
    },
    {
      id: 'effects',
      title: '6. Aprende los badges y efectos',
      subtitle: 'AOE, Choice, Turno, Stack, Tick, Ignora defensa y Cementerio.',
      accent: 'from-purple-500 to-fuchsia-400',
      body: (
        <div className="flex flex-wrap justify-center gap-2 py-2 text-[0.65rem]">
          {['💥 AOE','🎲 ELIGE','⏭ TURNO','📚 STACK','⏱ TICK','🗡️ PIERCE','🪦 CEM'].map(b => (
            <motion.div key={b} whileHover={{ scale: 1.08 }} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 font-black shadow-lg">{b}</motion.div>
          ))}
        </div>
      ),
    },
  ], []);

  useEffect(() => {
    if (!open || !autoPlay) return;
    const t = setInterval(() => {
      setIndex(i => (i + 1) % slides.length);
    }, 4800);
    return () => clearInterval(t);
  }, [open, autoPlay, slides.length]);

  useEffect(() => {
    if (!open) setIndex(0);
  }, [open]);

  if (!open) return null;
  const slide = slides[index];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.86, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.86, y: 30 }}
          transition={{ type: 'spring', damping: 18 }}
          className="w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 shadow-2xl overflow-hidden"
        >
          <div className={cn('px-4 py-3 bg-gradient-to-r text-white', slide.accent)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[0.6rem] uppercase tracking-[0.25em] text-white/80 font-black">Tutorial visual</div>
                <h2 className="text-lg font-black mt-0.5 drop-shadow-md">{slide.title}</h2>
                <p className="text-[0.7rem] text-white/85 mt-0.5">{slide.subtitle}</p>
              </div>
              <button onClick={onClose} className="text-white/80 hover:text-white text-lg font-black shrink-0">✕</button>
            </div>
          </div>

          <div className="p-4 min-h-[220px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.28 }}
                className="w-full"
              >
                {slide.body}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="px-4 pb-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 justify-center">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => { setIndex(i); setAutoPlay(false); }}
                  className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-600 hover:bg-slate-500')}
                  aria-label={`Ir al paso ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-[0.6rem] text-slate-400">Paso {index + 1} / {slides.length}</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setIndex(i => (i - 1 + slides.length) % slides.length); setAutoPlay(false); }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
                >
                  ← Atrás
                </button>
                <button
                  onClick={() => setAutoPlay(v => !v)}
                  className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold', autoPlay ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700')}
                >
                  {autoPlay ? '⏸' : '▶'} Auto
                </button>
                <button
                  onClick={() => { setIndex(i => (i + 1) % slides.length); setAutoPlay(false); }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-black hover:bg-amber-400"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
