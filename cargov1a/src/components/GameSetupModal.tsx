// ============================================================
// GAME SETUP MODAL
// ============================================================

import React, { useState } from 'react';
import { useGameStore, PlayerConfig } from '../store/gameStore';
import { getAllCharactersWithSource, getContentSourceSummary, getAllCardsWithSource } from '../data/contentRegistry';
import { GameMode, PlayerControl, BotDifficulty, DEFAULT_RULES, GameRules } from '../types/game';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import { ModManager } from './ModManager';
import { GalleryCompendium } from './GalleryCompendium';
import { GameManual } from './GameManual';
import { VisualSettings } from './VisualSettings';
import { DeckRestrictionPanel } from './DeckRestrictionPanel';
import { AdvancedDeckBuilderPanel, AdvancedDeckConfig } from './AdvancedDeckBuilderPanel';
import { getMenuPanels } from '../data/menuRegistry';
import { getInstalledMods } from '../data/mods';
import { PlayTutorialShowcase } from './PlayTutorialShowcase';

const TEAM_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-red-900/40', text: 'text-red-300', border: 'border-red-700' },
  B: { bg: 'bg-blue-900/40', text: 'text-blue-300', border: 'border-blue-700' },
  C: { bg: 'bg-green-900/40', text: 'text-green-300', border: 'border-green-700' },
  D: { bg: 'bg-yellow-900/40', text: 'text-yellow-300', border: 'border-yellow-700' },
};


// UI POLISH FASE2: source helpers
function uiSourceKind(input: any): 'base' | 'editor' | 'mod' | 'dlc' {
  const raw = String(input?.__sourceId || input?.id || input?.__source || input?.source || '').toLowerCase();
  const source = String(input?.__source || input?.source || '').toLowerCase();

  if (raw.includes('baseoverrides') || raw.includes('editor') || source.includes('editor')) return 'editor';
  if (raw.includes('dlc') || source.includes('dlc')) return 'dlc';
  if (raw === 'base' || source === 'base' || raw === 'juego base') return 'base';
  return 'mod';
}

function uiSourceIcon(input: any): string {
  const kind = uiSourceKind(input);
  if (kind === 'editor') return '🛠️';
  if (kind === 'mod') return '🧩';
  if (kind === 'dlc') return '💎';
  return '🎮';
}

function uiSourceLabel(input: any): string {
  const kind = uiSourceKind(input);
  if (kind === 'editor') return 'Editor';
  if (kind === 'mod') return 'Mod';
  if (kind === 'dlc') return 'DLC';
  return 'Base';
}

function uiSourcePillClass(input: any): string {
  const kind = uiSourceKind(input);
  if (kind === 'editor') return 'cargas-source-editor';
  if (kind === 'mod') return 'cargas-source-mod';
  if (kind === 'dlc') return 'cargas-source-dlc';
  return 'cargas-source-base';
}

interface GameSetupModalProps {
  onMultiplayer?: () => void;
}

export const GameSetupModal: React.FC<GameSetupModalProps> = ({ onMultiplayer }) => {
  const setupGame = useGameStore(s => s.setupGame);

  const [gameMode, setGameMode] = useState<GameMode>('ffa');
  const [deckSize, setDeckSize] = useState(50);
  const [startingMode, setStartingMode] = useState<'first' | 'random' | 'loser_goes_first'>('first');
  const [rules, setRules] = useState<GameRules>({ ...DEFAULT_RULES });
  const [activeTab, setActiveTab] = useState<string>('players');
  const [showTutorial, setShowTutorial] = useState(false);
  // Restricciones del mazo (cartas bloqueadas + fuentes habilitadas)
  const [blockedCardBaseIds, setBlockedCardBaseIds] = useState<string[]>([]);
  const [enabledSourceIds, setEnabledSourceIds] = useState<string[]>([]);
  const [advancedDeck, setAdvancedDeck] = useState<AdvancedDeckConfig>({ enabled: false, cards: {} });

  const availableDeckCardsForSetup = () => {
    let cards = getAllCardsWithSource() as any[];

    if (blockedCardBaseIds.length) {
      const blocked = new Set(blockedCardBaseIds);
      cards = cards.filter(c => !blocked.has(String(c.id || '').split('__')[0]));
    }

    if (enabledSourceIds.length) {
      const allowed = new Set(enabledSourceIds);
      cards = cards.filter(c => allowed.has(c.__sourceId));
    }

    if (advancedDeck.enabled) {
      cards = cards.filter(c => {
        const baseId = String(c.id || '').split('__')[0];
        return advancedDeck.cards?.[baseId]?.enabled !== false;
      });
    }

    return cards;
  };
  // Paneles registrados por mods/DLC (sistema modular del menú)
  const modPanels = getMenuPanels().filter(p => !p.requiresMods || getInstalledMods().length > 0);
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: 'Tú', character: 'arquero', team: 'A', control: 'human' },
    { name: 'Bot', character: 'espadachin', team: 'B', control: 'bot', botDifficulty: 'normal' },
  ]);

  // UI POLISH FASE2: character selector computed data
  const uiAllCharacters = getAllCharactersWithSource();
  const uiSourceSummary = getContentSourceSummary().filter((src: any) => Number(src.characters || 0) > 0);
  const uiSelectedCharacterIds = players.map((p: any) => p.character).filter(Boolean);
  const uiDuplicateCharacterIds = uiSelectedCharacterIds.filter((id: string, idx: number) => uiSelectedCharacterIds.indexOf(id) !== idx);
  const uiMissingCharacterCount = players.filter((p: any) => !uiAllCharacters.some((c: any) => c.id === p.character)).length;


  const updatePlayer = (i: number, field: keyof PlayerConfig, value: any) =>
    setPlayers(prev => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  const addPlayer = () => {
    if (players.length >= 12) return;
    const idx = players.length;
    const allChars = getAllCharactersWithSource();
    setPlayers(prev => [...prev, {
      name: `Jugador ${idx + 1}`,
      character: allChars[idx % allChars.length].id,
      team: String.fromCharCode(65 + (idx % 4)),
      control: 'bot' as PlayerControl,
      botDifficulty: 'normal' as BotDifficulty,
    }]);
  };

  const removePlayer = (i: number) => {
    if (players.length <= 2) return;
    setPlayers(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleStart = () => {
    const available = availableDeckCardsForSetup();

    if (available.length === 0) {
      alert('No puedes iniciar: el mazo quedó sin cartas disponibles. Activa una fuente o desbloquea cartas.');
      return;
    }

    setupGame(gameMode, players, deckSize, rules, startingMode, {
      blockedCardBaseIds,
      enabledSourceIds,
      advancedDeck,
    });
  };

  const PRESETS = [
    { label: '⚔️ 1v1 Rápido', mode: 'ffa' as GameMode, deck: 40, rules: DEFAULT_RULES,
      players: [
        { name: 'Tú', character: 'arquero', team: 'A', control: 'human' as PlayerControl },
        { name: 'Bot', character: 'espadachin', team: 'B', control: 'bot' as PlayerControl, botDifficulty: 'normal' as BotDifficulty },
      ]},
    { label: '🔥 1v3 Bots', mode: 'ffa' as GameMode, deck: 50, rules: DEFAULT_RULES,
      players: [
        { name: 'Tú', character: 'arquero', team: 'A', control: 'human' as PlayerControl },
        { name: 'Bot Fácil', character: 'mago', team: 'B', control: 'bot' as PlayerControl, botDifficulty: 'easy' as BotDifficulty },
        { name: 'Bot Normal', character: 'espadachin', team: 'C', control: 'bot' as PlayerControl, botDifficulty: 'normal' as BotDifficulty },
        { name: 'Bot Difícil', character: 'asesino', team: 'D', control: 'bot' as PlayerControl, botDifficulty: 'hard' as BotDifficulty },
      ]},
    { label: '👥 2v2 Equipos', mode: 'teams' as GameMode, deck: 50, rules: DEFAULT_RULES,
      players: [
        { name: 'Tú', character: 'arquero', team: 'A', control: 'human' as PlayerControl },
        { name: 'Aliado', character: 'medico', team: 'A', control: 'bot' as PlayerControl, botDifficulty: 'normal' as BotDifficulty },
        { name: 'Rival 1', character: 'espadachin', team: 'B', control: 'bot' as PlayerControl, botDifficulty: 'normal' as BotDifficulty },
        { name: 'Rival 2', character: 'mago', team: 'B', control: 'bot' as PlayerControl, botDifficulty: 'normal' as BotDifficulty },
      ]},
    { label: '🎲 Battle Royale', mode: 'ffa' as GameMode, deck: 70, rules: DEFAULT_RULES,
      players: Array.from({ length: 8 }, (_, i) => {
        const allChars = getAllCharactersWithSource();
        return {
          name: i === 0 ? 'Tú' : `Bot ${i}`,
          character: allChars[i % allChars.length].id,
          team: String.fromCharCode(65 + i),
          control: (i === 0 ? 'human' : 'bot') as PlayerControl,
          botDifficulty: 'normal' as BotDifficulty,
        };
      })},
    { label: '💀 Hardcore', mode: 'ffa' as GameMode, deck: 50,
      rules: { ...DEFAULT_RULES, criticalChance: 30, criticalMultiplier: 3, defenseTimerSecs: 6, maxCardsPerTurn: 2 },
      players: [
        { name: 'Tú', character: 'arquero', team: 'A', control: 'human' as PlayerControl },
        { name: 'Difícil 1', character: 'asesino', team: 'B', control: 'bot' as PlayerControl, botDifficulty: 'hard' as BotDifficulty },
        { name: 'Difícil 2', character: 'sargento', team: 'C', control: 'bot' as PlayerControl, botDifficulty: 'hard' as BotDifficulty },
      ]},
    { label: '🧪 Sin Crits', mode: 'ffa' as GameMode, deck: 50,
      rules: { ...DEFAULT_RULES, criticalChance: 0, allowBasicAttack: false },
      players: [
        { name: 'Tú', character: 'mago', team: 'A', control: 'human' as PlayerControl },
        { name: 'Bot Normal', character: 'medico', team: 'B', control: 'bot' as PlayerControl, botDifficulty: 'normal' as BotDifficulty },
      ]},
  ];

  return (
    <div className="min-h-screen h-screen text-white overflow-y-auto" style={{ background: 'var(--cargas-bg)' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-3 py-5">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <h1 className="text-5xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">⚔️ CARGAS</h1>
          <p className="text-slate-400 text-xs mt-1">Juego de Cartas Estratégico</p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowTutorial(true)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-black shadow-lg shadow-fuchsia-500/30 border border-fuchsia-400/40 animate-pulse-slow">
            🎬 ¿Cómo se juega? — Tutorial visual
          </motion.button>
        </motion.div>

        {/* Tutorial visual (modal) */}
        <PlayTutorialShowcase open={showTutorial} onClose={() => setShowTutorial(false)} />

        {/* UI POLISH FASE1: setup guide */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="cargas-glass-strong rounded-2xl p-3 mb-4 animate-cargas-hint-in"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="text-[0.62rem] uppercase tracking-[0.22em] text-amber-300 font-black mb-1">
                Preparar partida
              </div>
              <div className="text-sm sm:text-base font-black text-white">
                Elige modo, jugadores, mazo y reglas. Luego inicia la batalla.
              </div>
              <div className="text-[0.68rem] text-slate-400 mt-1">
                Consejo: usa “⚡ Rápida” si quieres empezar sin ajustar todo.
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 min-w-[260px]">
              <div className="cargas-step-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="cargas-step-number">1</span>
                  <span className="text-[0.62rem] font-black text-amber-200">Modo</span>
                </div>
                <div className="text-[0.55rem] text-slate-400">{gameMode === 'ffa' ? 'Todos contra todos' : 'Batalla por equipos'}</div>
              </div>
              <div className="cargas-step-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="cargas-step-number">2</span>
                  <span className="text-[0.62rem] font-black text-cyan-200">Jugadores</span>
                </div>
                <div className="text-[0.55rem] text-slate-400">{players.length} participantes</div>
              </div>
              <div className="cargas-step-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="cargas-step-number">3</span>
                  <span className="text-[0.62rem] font-black text-emerald-200">Reglas</span>
                </div>
                <div className="text-[0.55rem] text-slate-400">{deckSize} cartas · {rules.maxCardsPerTurn}/turno</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* UI POLISH FASE2: character source summary */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="cargas-glass rounded-2xl p-3 mb-4 animate-cargas-hint-in"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="text-[0.62rem] uppercase tracking-[0.2em] text-cyan-300 font-black mb-1">
                Personajes disponibles
              </div>
              <div className="text-sm font-black text-white">
                Base, editor, mods y DLC aparecen juntos en el selector.
              </div>
              <div className="text-[0.58rem] text-slate-400 mt-1">
                Cada opción muestra origen, vida, defensa, daño, habilidades y pasivas.
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {uiSourceSummary.map((src: any) => (
                <span key={src.id || src.name} className={cn('cargas-source-pill', uiSourcePillClass(src))}>
                  {uiSourceIcon(src)} {src.name || src.id} · {src.characters}
                </span>
              ))}
            </div>
          </div>

          {(uiMissingCharacterCount > 0 || uiDuplicateCharacterIds.length > 0) && (
            <div className="mt-3 rounded-xl cargas-source-warning px-3 py-2 text-[0.62rem] font-bold">
              {uiMissingCharacterCount > 0 && (
                <div>⚠️ Hay {uiMissingCharacterCount} jugador(es) con personaje no disponible. Cambia el personaje o habilita su fuente.</div>
              )}
              {uiDuplicateCharacterIds.length > 0 && (
                <div>👥 Hay personajes repetidos. Está permitido, pero puede hacer la partida menos variada.</div>
              )}
            </div>
          )}
        </motion.div>



        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
          className="mb-4 bg-slate-800/40 backdrop-blur-md rounded-xl p-3 border border-slate-700/50">
          <h2 className="text-xs font-bold text-amber-400 mb-2">⚡ Inicio Rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => {
                setGameMode(p.mode); setDeckSize(p.deck);
                setRules(p.rules as GameRules);
                setPlayers(p.players);
              }}
                className="px-2 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-[0.6rem] hover:bg-amber-500/15 hover:border-amber-500/50 hover:text-amber-300 transition-all text-left">
                <div className="font-bold">{p.label}</div>
                <div className="text-slate-500 text-[0.5rem] mt-0.5">{p.players.length}p · {p.deck} cartas</div>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="mb-4 grid md:grid-cols-3 gap-3">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
            <h2 className="text-xs font-bold text-amber-400 mb-2">🎮 Modo</h2>
            <div className="flex flex-col gap-1.5">
              {(['ffa', 'teams'] as const).map(m => (
                <button key={m} onClick={() => setGameMode(m)}
                  className={cn('p-2 rounded-lg border-2 text-xs font-bold text-left transition-all',
                    gameMode === m ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-800/50 border-slate-700 text-slate-400')}>
                  {m === 'ffa' ? '👑 Todos vs Todos' : '👥 Por Equipos'}
                  <div className="text-[0.55rem] font-normal opacity-60 mt-0.5">
                    {m === 'ffa' ? 'Cada uno por su cuenta' : 'Alianzas y cooperación'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-amber-400">🃏 Mazo</h2>
              <span className="text-lg font-black text-amber-400">{deckSize}</span>
            </div>
            <input type="range" min="40" max="70" step="1" value={deckSize}
              onChange={e => setDeckSize(+e.target.value)}
              className="w-full h-3 rounded-xl appearance-none cursor-pointer accent-amber-500 border border-amber-800/40 bg-slate-700"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((deckSize-40)/30)*100}%, #334155 ${((deckSize-40)/30)*100}%, #334155 100%)`,
              }} />
            <div className="grid grid-cols-4 gap-1 mt-1.5">
              {[40, 50, 60, 70].map(s => (
                <button key={s} onClick={() => setDeckSize(s)}
                  className={cn('py-0.5 rounded text-[0.55rem] font-bold border transition-all',
                    deckSize === s ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-slate-700 text-slate-500 hover:text-amber-400')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
            <h2 className="text-xs font-bold text-amber-400 mb-2">🎯 Quién empieza</h2>
            <div className="flex flex-col gap-1.5">
              {([
                { id: 'first', label: '1️⃣ El primero' },
                { id: 'random', label: '🎲 Aleatorio' },
                { id: 'loser_goes_first', label: '💀 Perdedor' },
              ] as const).map(m => (
                <button key={m.id} onClick={() => setStartingMode(m.id)}
                  className={cn('p-1.5 rounded-lg border text-[0.6rem] font-bold text-left transition-all',
                    startingMode === m.id ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-800/50 border-slate-700 text-slate-400')}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="mb-4 bg-slate-800/40 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex border-b border-slate-700/50 flex-wrap">
            {/* Pestañas base del juego */}
            {([
              { id: 'players', label: `👥 Jug (${players.length})` },
              { id: 'deck', label: '🃏 Mazo' },
              { id: 'rules', label: '⚙️ Reglas' },
              { id: 'mods', label: '🧩 Mods' },
              { id: 'gallery', label: '📚 Comp' },
              { id: 'visual', label: '🎨 Visual' },
              { id: 'manual', label: '📖 Manual' },
              { id: 'info', label: '❓ Ayuda' },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex-1 py-2 text-xs font-bold transition-colors whitespace-nowrap px-1',
                  activeTab === tab.id ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-500' : 'text-slate-500 hover:text-white')}>
                {tab.label}
              </button>
            ))}
            {/* Pestañas registradas por mods/DLC (sistema modular) */}
            {modPanels.map(panel => (
              <button key={panel.id} onClick={() => setActiveTab(panel.id)}
                className={cn('flex-1 py-2 text-xs font-bold transition-colors whitespace-nowrap px-1',
                  activeTab === panel.id ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-500' : 'text-slate-500 hover:text-white')}>
                {panel.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            {activeTab === 'players' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.6rem] text-slate-500 uppercase tracking-wider font-bold">2-12 jugadores</span>
                  {players.length < 12 && (
                    <button onClick={addPlayer}
                      className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-[0.6rem] font-bold border border-amber-500/30">
                      + Agregar
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {players.map((player, i) => {
                    const allChars = getAllCharactersWithSource();
                    const char = allChars.find(c => c.id === player.character);
                    const teamStyle = gameMode === 'teams' ? TEAM_STYLES[player.team] || TEAM_STYLES.A : null;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className={cn('rounded-lg p-2 border transition-all',
                          teamStyle ? `${teamStyle.bg} ${teamStyle.border}` : 'bg-slate-900/50 border-slate-700/50')}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black text-[0.5rem] font-black shrink-0">{i + 1}</div>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0 border"
                            style={{ backgroundColor: `${char?.color}20`, borderColor: `${char?.color}50` }}>
                            {char?.avatar || '?'}
                          </div>
                          <input type="text" value={player.name} onChange={e => updatePlayer(i, 'name', e.target.value)}
                            className="w-20 min-w-0 bg-slate-800/80 rounded px-1.5 py-1 text-[0.6rem] border border-slate-700 outline-none focus:border-amber-500" />
                          <select value={player.character} onChange={e => updatePlayer(i, 'character', e.target.value)}
                            className="bg-slate-800/80 rounded px-1.5 py-1 text-[0.6rem] border border-slate-700 outline-none max-w-[120px]">
                            {getAllCharactersWithSource().map(c => (<option key={c.id} value={c.id}>{c.avatar} {c.name} · HP {c.hp} · DEF {c.defense} · DMG {c.damage} · {(c as any).__sourceName || 'Juego Base'}</option>))}
                          </select>
                          <select value={player.control} onChange={e => updatePlayer(i, 'control', e.target.value)}
                            className={cn('rounded px-1.5 py-1 text-[0.6rem] border outline-none font-bold',
                              player.control === 'human' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-purple-900/40 border-purple-700 text-purple-300')}>
                            <option value="human">👤 Humano</option>
                            <option value="bot">🤖 Bot</option>
                          </select>
                          {player.control === 'bot' && (
                            <select value={player.botDifficulty || 'normal'} onChange={e => updatePlayer(i, 'botDifficulty', e.target.value)}
                              className="bg-slate-800/80 rounded px-1.5 py-1 text-[0.6rem] border border-slate-700 outline-none">
                              <option value="easy">🟢 Fácil</option>
                              <option value="normal">🟡 Normal</option>
                              <option value="hard">🔴 Difícil</option>
                            </select>
                          )}
                          {gameMode === 'teams' && (
                            <select value={player.team} onChange={e => updatePlayer(i, 'team', e.target.value)}
                              className={cn('rounded px-1.5 py-1 text-[0.6rem] border font-bold outline-none',
                                teamStyle ? `${teamStyle.bg} ${teamStyle.border} ${teamStyle.text}` : '')}>
                              {['A', 'B', 'C', 'D'].map(t => <option key={t} value={t}>Equipo {t}</option>)}
                            </select>
                          )}
                          {players.length > 2 && (
                            <button onClick={() => removePlayer(i)}
                              className="w-6 h-6 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80 text-[0.6rem] shrink-0">✕</button>
                          )}
                        </div>
                        <div className="flex gap-1.5 mt-1 text-[0.5rem] flex-wrap">
                          <span className="px-1 py-0.5 rounded bg-red-950/60 text-red-400">❤️ {char?.hp}</span>
                          <span className="px-1 py-0.5 rounded bg-blue-950/60 text-blue-400">🛡️ {char?.defense}</span>
                          <span className="px-1 py-0.5 rounded bg-orange-950/60 text-orange-400">⚔️ {char?.damage}</span>
                          <span className="px-1 py-0.5 rounded bg-slate-800/60 text-amber-500/70 italic truncate max-w-[200px]">⚡ {char?.passiveDescription}</span>
                          {/* UI POLISH FASE2: selected character badges */}
                          {char && (
                            <div className="cargas-character-mini px-2 py-1 mt-1 flex flex-wrap gap-1 items-center">
                              <span className={cn('cargas-source-pill', uiSourcePillClass(char))}>
                                {uiSourceIcon(char)} {uiSourceLabel(char)} · {(char as any).__sourceName || 'Juego Base'}
                              </span>
                              <span className="cargas-source-pill">⚡ {(char.abilities || []).length + (((char as any).teamAbilities || []).length)} hab</span>
                              <span className="cargas-source-pill">🔒 {(((char as any).passives || []).length + (((char as any).teamPassives || []).length))} pas</span>
                              <span className="cargas-source-pill">❤️ {char.hp}</span>
                              <span className="cargas-source-pill">🛡️ {char.defense}</span>
                              <span className="cargas-source-pill">⚔️ {char.damage}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'deck' && (
              <div>
                <div className="mb-2 text-[0.6rem] text-slate-400 leading-relaxed">
                  Decide qué cartas y fuentes (base, mods, DLC) entran al mazo de la partida.
                  Las cartas bloqueadas (🚫) no aparecerán en el juego.
                </div>
                <DeckRestrictionPanel
                  blockedCardBaseIds={blockedCardBaseIds}
                  enabledSourceIds={enabledSourceIds}
                  onBlockedChange={setBlockedCardBaseIds}
                  onSourcesChange={setEnabledSourceIds}
                />

                <AdvancedDeckBuilderPanel
                  value={advancedDeck}
                  onChange={setAdvancedDeck}
                  deckSize={deckSize}
                  blockedCardBaseIds={blockedCardBaseIds}
                  enabledSourceIds={enabledSourceIds}
                />
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-3">
                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                  <h3 className="text-[0.65rem] font-bold text-orange-400 mb-2">💥 Daño Crítico</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[0.55rem] mb-1">
                        <span className="text-slate-400">Probabilidad: <span className="text-white font-bold">{rules.criticalChance}%</span></span>
                      </div>
                      <input type="range" min="0" max="50" step="5" value={rules.criticalChance}
                        onChange={e => setRules(r => ({ ...r, criticalChance: +e.target.value }))}
                        className="w-full h-3 rounded-xl appearance-none cursor-pointer accent-orange-500 border border-orange-800/40 bg-slate-700"
                        style={{ background: `linear-gradient(to right, #f97316 0%, #f97316 ${(rules.criticalChance/50)*100}%, #334155 ${(rules.criticalChance/50)*100}%, #334155 100%)` }} />
                    </div>
                    <div>
                      <div className="flex justify-between text-[0.55rem] mb-1">
                        <span className="text-slate-400">Multiplicador: <span className="text-white font-bold">x{rules.criticalMultiplier}</span></span>
                      </div>
                      <input type="range" min="1.5" max="5" step="0.5" value={rules.criticalMultiplier}
                        onChange={e => setRules(r => ({ ...r, criticalMultiplier: +e.target.value }))}
                        className="w-full h-3 rounded-xl appearance-none cursor-pointer accent-orange-500 border border-orange-800/40 bg-slate-700"
                        style={{ background: `linear-gradient(to right, #f97316 0%, #f97316 ${((rules.criticalMultiplier-1.5)/3.5)*100}%, #334155 ${((rules.criticalMultiplier-1.5)/3.5)*100}%, #334155 100%)` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                  <h3 className="text-[0.65rem] font-bold text-blue-400 mb-2">🛡️ Defensa</h3>
                  <div>
                    <div className="flex justify-between text-[0.55rem] mb-1">
                      <span className="text-slate-400">Tiempo: <span className="text-white font-bold">{rules.defenseTimerSecs}s</span></span>
                    </div>
                    <input type="range" min="3" max="30" step="1" value={rules.defenseTimerSecs}
                      onChange={e => setRules(r => ({ ...r, defenseTimerSecs: +e.target.value }))}
                      className="w-full h-3 rounded-xl appearance-none cursor-pointer accent-blue-500 border border-blue-800/40 bg-slate-700"
                      style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((rules.defenseTimerSecs-3)/27)*100}%, #334155 ${((rules.defenseTimerSecs-3)/27)*100}%, #334155 100%)` }} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={rules.allowInstantCards}
                        onChange={e => setRules(r => ({ ...r, allowInstantCards: e.target.checked }))}
                        className="accent-blue-500" />
                      <span className="text-[0.6rem] text-slate-300">Permitir cartas instantáneas en defensa</span>
                    </label>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                  <h3 className="text-[0.65rem] font-bold text-amber-400 mb-2">🎴 Turno</h3>
                  <div className="mb-2">
                    <div className="flex justify-between text-[0.55rem] mb-1">
                      <span className="text-slate-400">Cartas por turno: <span className="text-white font-bold">{rules.maxCardsPerTurn}</span></span>
                    </div>
                    <input type="range" min="1" max="7" step="1" value={rules.maxCardsPerTurn}
                      onChange={e => setRules(r => ({ ...r, maxCardsPerTurn: +e.target.value }))}
                      className="w-full h-3 rounded-xl appearance-none cursor-pointer accent-amber-500 border border-amber-800/40 bg-slate-700"
                      style={{ background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((rules.maxCardsPerTurn-1)/6)*100}%, #334155 ${((rules.maxCardsPerTurn-1)/6)*100}%, #334155 100%)` }} />
                  </div>
                  <div className="space-y-1">
                    {[
                      { key: 'allowBasicAttack', label: 'Permitir ataque básico', icon: '⚔️' },
                      { key: 'dotsStackable', label: 'DoT se acumulan ilimitado', icon: '☠️' },
                      { key: 'fogOfWar', label: 'Niebla de guerra', icon: '👁️' },
                    ].map(opt => (
                      <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={rules[opt.key as keyof GameRules] as boolean}
                          onChange={e => setRules(r => ({ ...r, [opt.key]: e.target.checked }))}
                          className="accent-amber-500" />
                        <span className="text-[0.6rem] text-slate-300">{opt.icon} {opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button onClick={() => setRules({ ...DEFAULT_RULES })}
                  className="w-full py-1.5 rounded-lg bg-slate-700 text-slate-400 text-[0.6rem] hover:bg-slate-600 transition-colors">
                  🔄 Restaurar reglas por defecto
                </button>
              </div>
            )}

            {activeTab === 'mods' && <ModManager />}
            {activeTab === 'gallery' && <GalleryCompendium />}
            {activeTab === 'visual' && <VisualSettings />}
            {activeTab === 'manual' && <GameManual />}

            {/* Render de paneles modulares (mods/DLC) */}
            {modPanels.map(panel => {
              if (activeTab !== panel.id) return null;
              const PanelComponent = panel.component;
              return <PanelComponent key={panel.id} />;
            })}

            {activeTab === 'info' && (
              <div className="space-y-2 text-[0.6rem] text-slate-300 max-h-96 overflow-y-auto">
                {[
                  { title: '🎴 Flujo del turno', color: 'amber', items: [
                    'Preparas 1-3 cartas (drag & drop o click) sobre un objetivo',
                    'Trampas, buffs y utilidades se aplican INMEDIATAMENTE',
                    'Daño y DoT se acumulan hasta que terminas el turno',
                    'Al terminar turno se resuelve contra cada objetivo',
                    'Las cartas jugadas SIEMPRE vuelven al mazo',
                  ]},
                  { title: '⚔️ Combate', color: 'red', items: [
                    'Daño neto = Total - Defensa',
                    `${rules.criticalChance}% crítico = x${rules.criticalMultiplier} daño`,
                    'DoT ignoran defensa',
                    'Combos dan bonus',
                  ]},
                  { title: '🛡️ Defensa', color: 'blue', items: [
                    `Tienes ${rules.defenseTimerSecs}s para responder`,
                    'Usa cartas de defensa, esquive o contraataque',
                    'Si no respondes, recibes el daño completo',
                  ]},
                ].map(section => (
                  <div key={section.title} className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
                    <h3 className={`font-black mb-1.5 text-${section.color}-400`}>{section.title}</h3>
                    <ul className="space-y-0.5 list-disc list-inside">
                      {section.items.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="mb-4 bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30 flex flex-wrap gap-2 text-[0.55rem]">
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{gameMode === 'ffa' ? '👑 FFA' : '👥 Equipos'}</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">🃏 {deckSize} cartas</span>
          {advancedDeck.enabled && <span className="bg-fuchsia-900/60 px-2 py-0.5 rounded text-fuchsia-300 border border-fuchsia-700/40">🎛 Mazo avanzado</span>}
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">👥 {players.length} jugadores</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">💥 Crítico {rules.criticalChance}% x{rules.criticalMultiplier}</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">⏱️ Defensa {rules.defenseTimerSecs}s</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">🎴 Máx {rules.maxCardsPerTurn} cartas/turno</span>
        </motion.div>

        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="cargas-action-primary animate-cargas-soft-glow w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 text-black font-black text-lg shadow-2xl shadow-amber-500/30 border-2 border-amber-200/50 transition-all hover:-translate-y-0.5">
          ⚔️ ¡INICIAR PARTIDA!
        </motion.button>

        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => onMultiplayer?.()}
          className="cargas-action-primary w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-700 text-white font-black text-base hover:from-cyan-400 hover:to-blue-500 transition-all mt-2 border border-cyan-300/40 shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5">
          🌐 Crear o unirse a partida LAN/VPN
        </motion.button>

        <div className="mt-3 text-center text-[0.5rem] text-slate-600">
          💡 18 personajes · Cartas vuelven al mazo · Sistema de mods · Multijugador LAN
        </div>
      </div>
    </div>
  );
};
