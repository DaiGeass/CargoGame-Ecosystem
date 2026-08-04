// ============================================================
// MULTIPLAYER LOBBY
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNetworkStore, isNetworkAvailable } from '../store/networkStore';
import { useGameStore, PlayerConfig } from '../store/gameStore';
import { getAllCharactersWithSource, getAllCardsWithSource, getContentSourceSummary } from '../data/contentRegistry';
import { DEFAULT_RULES } from '../types/game';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import { ModSyncIndicator } from './ModSyncIndicator';
import { useModSync } from '../hooks/useModSync';
import { DeckRestrictionPanel } from './DeckRestrictionPanel';
import { AdvancedDeckBuilderPanel, AdvancedDeckConfig } from './AdvancedDeckBuilderPanel';
import { broadcastNetworkGameStart } from '../services/networkGameSync';

interface MultiplayerLobbyProps {
  onBack: () => void;
}

const CHARACTER_SOURCE_RULES = [
  { id: 'base', label: '🎮 Base' },
  { id: 'mod', label: '🧩 Mods' },
  { id: 'dlc', label: '💿 DLC' },
  { id: 'editor', label: '🧬 Editor' },
];

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onBack }) => {
  const net = useNetworkStore();
  const setupGame = useGameStore(s => s.setupGame);
  const { canPlay, hasMissingMods } = useModSync();
  const [blockedCardBaseIds, setBlockedCardBaseIds] = useState<string[]>([]);
  const [enabledSourceIds, setEnabledSourceIds] = useState<string[]>([]);
  const [advancedDeck, setAdvancedDeck] = useState<AdvancedDeckConfig>({ enabled: false, cards: {} });
  const [showDeckConfig, setShowDeckConfig] = useState(false);
  const contentSummary = getContentSourceSummary();

  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [playerName, setPlayerName] = useState('Jugador');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [hostIp, setHostIp] = useState('192.168.1.');
  const [hostPort, setHostPort] = useState(9876);
  const [roomCode, setRoomCode] = useState('');
  const [localIp, setLocalIp] = useState('...');
  const [networkInterfaces, setNetworkInterfaces] = useState<any[]>([]);
  const [networkGateError, setNetworkGateError] = useState('');
  const chatRef = React.useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [selectedChar, setSelectedChar] = useState('arquero');
  const [characterSourceFilter, setCharacterSourceFilter] = useState<string>('all');
  const [allowedCharacterSources, setAllowedCharacterSources] = useState<string[]>(['base', 'mod', 'dlc', 'editor']);

  const allAvailableCharacters = getAllCharactersWithSource();
  const characterSources = getContentSourceSummary().filter(s => s.characters > 0);

  const activeAllowedCharacterSources =
    net.roomInfo?.allowedCharacterSources?.length
      ? net.roomInfo.allowedCharacterSources
      : allowedCharacterSources;

  const isCharacterAllowedByRoom = (c: any) =>
    activeAllowedCharacterSources.includes(c.__source || 'base');

  const allowedCharacters = allAvailableCharacters.filter((c: any) => isCharacterAllowedByRoom(c));

  const visibleCharacters =
    characterSourceFilter === 'all'
      ? allowedCharacters
      : allowedCharacters.filter((c: any) =>
          c.__sourceId === characterSourceFilter || c.__source === characterSourceFilter
        );

  const characterSourceBadge = (c: any) => {
    const src = c.__source || 'base';
    const name = c.__sourceName || 'Juego Base';
    const icon = src === 'dlc' ? '💿' : src === 'mod' ? '🧩' : src === 'editor' ? '🧬' : '🎮';
    return `${icon} ${name}`;
  };

  const updateAllowedCharacterSources = (next: string[]) => {
    const clean = CHARACTER_SOURCE_RULES
      .map(s => s.id)
      .filter(id => next.includes(id));

    const safe = clean.length ? clean : ['base'];

    setAllowedCharacterSources(safe);

    if (net.mode === 'host' && net.roomInfo) {
      net.updateRoomInfo({ allowedCharacterSources: safe } as any);
    }
  };

  const toggleAllowedCharacterSource = (sourceId: string) => {
    const current = activeAllowedCharacterSources;
    const next = current.includes(sourceId)
      ? current.filter(id => id !== sourceId)
      : [...current, sourceId];

    updateAllowedCharacterSources(next);
  };

  const renderCharacterSourceControls = (canEditRules: boolean) => (
    <div className="mb-2 rounded-xl bg-slate-950/40 border border-slate-700/50 p-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.6rem] text-slate-500 font-bold">Filtrar personajes:</span>
        <select
          value={characterSourceFilter}
          onChange={e => setCharacterSourceFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[0.6rem] text-white outline-none"
        >
          <option value="all">Todos permitidos</option>
          <option value="base">🎮 Base</option>
          <option value="mod">🧩 Mods</option>
          <option value="dlc">💿 DLC</option>
          <option value="editor">🧬 Editor</option>
          {characterSources.map(src => (
            <option key={src.id} value={src.id}>
              {src.source === 'dlc' ? '💿' : src.source === 'mod' ? '🧩' : src.source === 'editor' ? '🧬' : '🎮'} {src.name} ({src.characters})
            </option>
          ))}
        </select>
      </div>

      {canEditRules && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[0.6rem] text-slate-500 font-bold mr-1">Reglas sala:</span>
          {CHARACTER_SOURCE_RULES.map(src => (
            <button
              key={src.id}
              type="button"
              onClick={() => toggleAllowedCharacterSource(src.id)}
              className={cn(
                'px-2 py-1 rounded-lg border text-[0.55rem] font-black transition-all',
                activeAllowedCharacterSources.includes(src.id)
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                  : 'bg-slate-900/70 border-slate-700 text-slate-500'
              )}
              title={activeAllowedCharacterSources.includes(src.id) ? 'Permitido' : 'Bloqueado'}
            >
              {activeAllowedCharacterSources.includes(src.id) ? '✅' : '🚫'} {src.label}
            </button>
          ))}
        </div>
      )}

      <div className="text-[0.55rem] text-slate-500">
        Visibles: <span className="text-cyan-300 font-bold">{visibleCharacters.length}</span> /
        Permitidos: <span className="text-emerald-300 font-bold">{allowedCharacters.length}</span> /
        Total: <span className="text-slate-300 font-bold">{allAvailableCharacters.length}</span>
      </div>
    </div>
  );

  const isTauriRuntimeForNetworkGate =
    typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

  const isValidIPv4 = (ip: string) =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(String(ip || '').trim()) &&
    String(ip || '').split('.').every(part => Number(part) >= 0 && Number(part) <= 255);

  const usableNetworkInterfaces = networkInterfaces.filter((ni: any) =>
    isValidIPv4(ni.ip) &&
    ni.kind !== 'loopback' &&
    !String(ni.ip).startsWith('127.')
  );

  const hasRecognizedNetwork =
    usableNetworkInterfaces.length > 0 ||
    (isValidIPv4(localIp) && !localIp.startsWith('127.'));

  const networkAvailable = isNetworkAvailable();

  const networkGateReason = (!networkAvailable && !isTauriRuntimeForNetworkGate)
    ? 'Tu entorno no reporta soporte de red.'
    : !hasRecognizedNetwork
      ? 'No se reconoció una red LAN/VPN válida. Abre Hamachi/Radmin/ZeroTier o revisa el adaptador de red.'
      : '';

  const availableDeckCardsForMultiplayer = () => {
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      console.log('Copiar manual:', text);
    }
  };

  useEffect(() => {
    (async () => {
      const interfaces = await net.getNetworkInterfaces();
      setNetworkInterfaces(interfaces);

      const preferred =
        interfaces.find((i: any) => i.recommended) ||
        interfaces.find((i: any) => i.kind === 'lan') ||
        interfaces.find((i: any) => i.kind !== 'loopback');

      if (preferred?.ip) setLocalIp(preferred.ip);
      else setLocalIp(await net.getLocalIp());
    })();
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [net.chatMessages]);

  useEffect(() => {
    // Garantiza que selectedChar queda permitido por las reglas de sala.
    const pool = allowedCharacters.length
      ? allowedCharacters
      : allAvailableCharacters.filter((c: any) => c.__source === 'base');

    if (pool.length && !pool.some((c: any) => c.id === selectedChar)) {
      setSelectedChar(pool[0].id);
    }
  }, [selectedChar, activeAllowedCharacterSources.join('|'), allAvailableCharacters.length]);

  useEffect(() => {
    if (net.mode !== 'disconnected' && net.localPlayerId) {
      net.updateLocalCharacter(selectedChar);
    }
  }, [selectedChar, net.mode, net.localPlayerId]);

  const handleCreateRoom = () => {
    if (networkGateReason) {
      setNetworkGateError(networkGateReason);
      return;
    }

    if (availableDeckCardsForMultiplayer().length === 0) {
      setNetworkGateError('No puedes crear sala: el mazo quedó sin cartas disponibles.');
      return;
    }

    setNetworkGateError('');
    net.createRoom(playerName, maxPlayers, 'ffa', 50, DEFAULT_RULES, hostPort, allowedCharacterSources);
    window.setTimeout(() => net.updateLocalCharacter(selectedChar), 80);
  };

  const handleJoinRoom = () => {
    if (networkGateReason) {
      setNetworkGateError(networkGateReason);
      return;
    }

    if (!isValidIPv4(hostIp)) {
      setNetworkGateError('IP del host inválida. Usa la IP LAN/VPN real, por ejemplo la de Hamachi/Radmin.');
      return;
    }

    setNetworkGateError('');
    net.joinRoom(playerName, hostIp, hostPort, roomCode.trim() || undefined);
    window.setTimeout(() => net.updateLocalCharacter(selectedChar), 250);
    window.setTimeout(() => net.updateLocalCharacter(selectedChar), 800);
  };

  const handleStartGame = () => {
    if (!net.roomInfo) return;

    if (availableDeckCardsForMultiplayer().length === 0) {
      alert('No puedes iniciar: el mazo quedó sin cartas disponibles.');
      return;
    }

    // No permitir iniciar si faltan mods del host
    if (hasMissingMods) {
      net.clearError();
      return;
    }
    const allChars = getAllCharactersWithSource();
    const allowedForRoom = allChars.filter((c: any) =>
      (net.roomInfo?.allowedCharacterSources?.length ? net.roomInfo.allowedCharacterSources : activeAllowedCharacterSources)
        .includes((c as any).__source || 'base')
    );
    const safeChars = allowedForRoom.length ? allowedForRoom : allChars.filter((c: any) => (c as any).__source === 'base');

    const blockedPlayers = net.roomInfo.players.filter((p: any) => {
      const wantedId = p.id === net.localPlayerId ? selectedChar : p.characterId;
      const char = allChars.find((c: any) => c.id === wantedId);
      return char && !safeChars.some((c: any) => c.id === char.id);
    });

    if (blockedPlayers.length) {
      alert('Hay jugador(es) con personaje bloqueado por las reglas de sala. Cambia personaje o permite esa fuente.');
      return;
    }

    // Cada jugador recibe un personaje permitido.
    const configs: PlayerConfig[] = net.roomInfo.players.map((p, idx) => ({
      name: p.name,
      networkPlayerId: p.id,
      character: p.id === net.localPlayerId ? selectedChar : (p.characterId || safeChars[idx % safeChars.length].id),
      team: net.roomInfo!.gameMode === 'teams' ? (idx % 2 === 0 ? 'A' : 'B') : String.fromCharCode(65 + idx),
      // En red real, cada jugador humano controla su propio turno.
      // Los bots añadidos manualmente siguen siendo bots.
      control: p.id.startsWith('bot_') ? ('bot' as any) : ('human' as any),
      botDifficulty: p.id.startsWith('bot_') ? ('normal' as any) : undefined,
    }));
    setupGame(net.roomInfo.gameMode, configs, net.roomInfo.deckSize, undefined, 'first', {
      blockedCardBaseIds,
      enabledSourceIds,
      advancedDeck,
    });

    window.setTimeout(() => {
      broadcastNetworkGameStart();
    }, 80);
  };

  // Host: añadir un jugador-bot para llenar la sala y poder probar la partida
  const handleAddBot = () => {
    if (!net.roomInfo) return;
    if (net.roomInfo.players.length >= net.roomInfo.maxPlayers) return;
    const allChars = allowedCharacters.length ? allowedCharacters : getAllCharactersWithSource().filter((c: any) => (c as any).__source === 'base');
    const idx = net.roomInfo.players.length;
    net.updateRoomInfo({
      players: [
        ...net.roomInfo.players,
        { id: `bot_${Date.now()}`, name: `Bot ${idx}`, characterId: allChars[idx % allChars.length].id, connected: true },
      ],
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    net.sendChatMessage(chatInput);
    setChatInput('');
  };

  return (
    <div className="min-h-screen text-white overflow-y-auto" style={{ background: 'var(--cargas-bg)' }}>
      {/* Indicador de mods faltantes */}
      <ModSyncIndicator />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-3 py-5">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🌐 PARTIDA EN RED
          </h1>
          <p className="text-slate-400 text-xs mt-1">Juega con amigos por LAN o VPN</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-4 bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className={cn('w-2 h-2 rounded-full', networkAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500')} />
              <span className="text-[0.6rem] text-slate-400">{networkAvailable ? 'WebRTC disponible' : 'No compatible'}</span>
            </div>
            <div className="text-[0.6rem] text-slate-500">
              Tu IP: <span className="text-cyan-300 font-bold">{localIp}</span>
            </div>
          </div>
          <button onClick={onBack}
            className="px-3 py-1 rounded bg-slate-700 text-slate-400 text-[0.6rem] hover:bg-slate-600 transition-colors">
            ← Volver
          </button>
        </motion.div>

        {net.mode === 'disconnected' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mb-4 bg-slate-800/40 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="flex border-b border-slate-700/50">
              {(['host', 'join'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn('flex-1 py-3 text-sm font-bold transition-colors',
                    activeTab === tab ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-500' : 'text-slate-500 hover:text-white')}>
                  {tab === 'host' ? '🏠 Crear Sala' : '🔗 Unirse a Sala'}
                </button>
              ))}
            </div>

            <div className="p-5">
              <div className="mb-4">
                <label className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tu nombre</label>
                <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)}
                  className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-sm border border-slate-600 outline-none focus:border-cyan-500"
                  placeholder="Nombre de jugador" maxLength={20} />
              </div>

              {activeTab === 'host' ? (
                <>
                  <div className="grid md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-[0.65rem] text-slate-400 font-bold block mb-0.5">Máximo de jugadores</label>
                      <input type="range" min="2" max="12" value={maxPlayers}
                        onChange={e => setMaxPlayers(+e.target.value)}
                        className="w-full h-2 rounded-lg accent-cyan-500" />
                      <div className="flex justify-between text-[0.5rem] text-slate-500">
                        <span>2</span><span>{maxPlayers}</span><span>12</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[0.65rem] text-slate-400 font-bold block mb-0.5">Puerto</label>
                      <input type="number" value={hostPort} onChange={e => setHostPort(+e.target.value)}
                        className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-sm border border-slate-600 outline-none focus:border-cyan-500" />
                    </div>
                  </div>

                  {/* Selector de personaje para el host */}
                  <div className="mb-4">
                    <label className="text-[0.65rem] text-slate-400 font-bold block mb-1">
                      Tu personaje <span className="text-slate-600">({visibleCharacters.length}/{allAvailableCharacters.length} visibles)</span>
                    </label>
                    {renderCharacterSourceControls(activeTab === 'host')}

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {visibleCharacters.map(c => (
                        <button key={c.id} onClick={() => setSelectedChar(c.id)}
                            title={characterSourceBadge(c)}
                          className={cn('flex items-center gap-1 px-2 py-1 rounded-lg border text-[0.6rem] font-bold transition-all',
                            selectedChar === c.id
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500')}>
                          <span>{c.avatar}</span><span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[0.55rem] text-slate-400 mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 leading-relaxed">
                    💡 <b>Datos para compartir:</b> Código <span className="text-cyan-300 font-bold">{net.roomId || 'se genera al crear sala'}</span>, IP <span className="text-cyan-300 font-bold">{localIp}</span> y puerto <span className="text-cyan-300 font-bold">{hostPort}</span>.
                    <br />
                    <span className="text-amber-400/80">⚠️ Para dos PCs por Hamachi/Radmin usa la IP virtual de Hamachi/Radmin y permite el puerto en firewall. En Tauri usa LAN/TCP real; en navegador usa BroadcastChannel.</span>
                  </div>

                  <button onClick={handleCreateRoom}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-lg hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all">
                    🏠 Crear Sala
                  </button>
                </>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-[0.65rem] text-slate-400 font-bold block mb-0.5">IP del host</label>
                      <input type="text" value={hostIp} onChange={e => setHostIp(e.target.value)}
                        className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-sm border border-slate-600 outline-none focus:border-cyan-500 font-mono"
                        placeholder="192.168.1.x" />
                    </div>
                    <div>
                      <label className="text-[0.65rem] text-slate-400 font-bold block mb-0.5">Puerto</label>
                      <input type="number" value={hostPort} onChange={e => setHostPort(+e.target.value)}
                        className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-sm border border-slate-600 outline-none focus:border-cyan-500" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[0.65rem] text-slate-400 font-bold block mb-0.5">Código de sala</label>
                    <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-sm border border-slate-600 outline-none focus:border-cyan-500 font-mono uppercase"
                      placeholder="Ej: ABC123" />
                    <div className="text-[0.55rem] text-slate-500 mt-1">Para la prueba actual, usa el código que muestra el host.</div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[0.65rem] text-slate-400 font-bold block mb-1">
                      Tu personaje <span className="text-slate-600">({visibleCharacters.length}/{allAvailableCharacters.length} visibles · base + mods + dlc)</span>
                    </label>
                    {renderCharacterSourceControls(false)}

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {visibleCharacters.map(c => (
                        <button key={c.id} onClick={() => setSelectedChar(c.id)}
                          className={cn('flex items-center gap-1 px-2 py-1 rounded-lg border text-[0.6rem] font-bold transition-all',
                            selectedChar === c.id
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500')}>
                          <span>{c.avatar}</span>
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleJoinRoom}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/20 transition-all">
                    🔗 Conectar
                  </button>
                </>
              )}

              {networkGateError && (
                <div className="mt-3 p-2 bg-amber-950/40 border border-amber-700/40 rounded-lg text-[0.65rem] text-amber-200">
                  ⚠️ {networkGateError}
                  <button onClick={() => setNetworkGateError('')} className="ml-2 text-amber-400 hover:text-white">✕</button>
                </div>
              )}

              {net.error && (
                <div className="mt-3 p-2 bg-red-900/40 border border-red-700/40 rounded-lg text-[0.65rem] text-red-300">
                  ❌ {net.error}
                  <button onClick={() => net.clearError()} className="ml-2 text-red-400 hover:text-white">✕</button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {net.mode !== 'disconnected' && net.roomInfo && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-slate-800/40 backdrop-blur-md rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-black text-cyan-300">
                  {net.mode === 'host' ? '🏠 Tu Sala' : '🔗 Sala conectada'}
                </h2>
                {net.mode === 'host' && (
                  <span className="text-[0.55rem] bg-cyan-900/40 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-700/50">
                    Código: {net.roomId}
                  </span>
                )}
              </div>

              {/* BLOQUE-CONEXION-VISIBLE */}
              <div className="mb-4 grid md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-cyan-950/40 border border-cyan-500/50 p-3">
                  <div className="text-[0.55rem] text-cyan-300 font-black uppercase tracking-wider mb-1">Código de sala</div>
                  <div className="text-2xl font-black text-white font-mono tracking-widest">{net.roomId}</div>
                  <button
                    onClick={() => copyToClipboard(net.roomId || '')}
                    className="mt-2 w-full text-[0.6rem] bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-2 py-1 font-bold"
                  >
                    📋 Copiar código
                  </button>
                </div>

                <div className="rounded-xl bg-slate-900/70 border border-slate-600 p-3">
                  <div className="text-[0.55rem] text-slate-400 font-black uppercase tracking-wider mb-1">IP para LAN/VPN</div>
                  <div className="text-xl font-black text-emerald-300 font-mono break-all">{localIp}</div>
                  <button
                    onClick={() => copyToClipboard(localIp)}
                    className="mt-2 w-full text-[0.6rem] bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-2 py-1 font-bold"
                  >
                    📋 Copiar IP
                  </button>
                </div>

                <div className="rounded-xl bg-slate-900/70 border border-slate-600 p-3">
                  <div className="text-[0.55rem] text-slate-400 font-black uppercase tracking-wider mb-1">Puerto</div>
                  <div className="text-xl font-black text-amber-300 font-mono">{hostPort}</div>
                  <button
                    onClick={() => copyToClipboard(String(hostPort))}
                    className="mt-2 w-full text-[0.6rem] bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-2 py-1 font-bold"
                  >
                    📋 Copiar puerto
                  </button>
                </div>
              </div>

              {networkInterfaces.length > 0 && (
                <div className="mb-3 rounded-xl bg-slate-950/50 border border-cyan-700/40 p-3">
                  <div className="text-[0.6rem] text-cyan-300 font-black uppercase tracking-wider mb-2">
                    🌐 IPs detectadas
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {networkInterfaces.map((ni: any) => (
                      <div key={ni.name + ni.ip}
                        className={cn(
                          'rounded-lg border p-2 text-[0.6rem]',
                          ni.recommended ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200' : 'bg-slate-900/60 border-slate-700 text-slate-300'
                        )}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold truncate">{ni.recommended ? '⭐ ' : ''}{ni.name}</span>
                          <span className="text-[0.5rem] uppercase text-slate-500">{ni.kind}</span>
                        </div>
                        <div className="font-mono text-cyan-200 break-all">{ni.ip}</div>
                        <button
                          onClick={() => copyToClipboard(ni.ip)}
                          className="mt-1 w-full text-[0.55rem] bg-slate-700 hover:bg-slate-600 text-white rounded px-2 py-1 font-bold"
                        >
                          📋 Copiar esta IP
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-3 rounded-xl bg-amber-950/30 border border-amber-600/40 p-3 text-[0.65rem] text-amber-200 leading-relaxed">
                <b>Para Hamachi/Radmin:</b> comparte la IP virtual de la VPN, el puerto y el código de sala.
                <br />
                <span className="text-amber-400">Estado actual:</span> la prueba local usa BroadcastChannel. Para dos PCs por VPN usa la IP virtual de Hamachi/Radmin y permite el puerto en firewall.
              </div>

              <div className="flex flex-wrap gap-2 mb-3 text-[0.6rem] text-slate-400">
                <span>🎮 {net.roomInfo.gameMode === 'ffa' ? 'FFA' : 'Equipos'}</span>
                <span>🃏 Mazo {net.roomInfo.deckSize}</span>
                <span>👥 {net.roomInfo.players.length}/{net.roomInfo.maxPlayers}</span>
                <span>🌐 {localIp}:{hostPort}</span>
                <span>🔌 Transporte: {net.transportKind || 'desconocido'}</span>
                <span>🧬 Personajes: {activeAllowedCharacterSources.join(', ')}</span>
              </div>

              {net.mode === 'host' && (
                <div className="mb-3">
                  <div className="text-[0.6rem] text-purple-300 font-black mb-1">Reglas de personajes de la sala</div>
                  {renderCharacterSourceControls(true)}
                </div>
              )}

              <div className="space-y-2">
                {net.roomInfo.players.map(p => {
                  const char = getAllCharactersWithSource().find(c => c.id === (p.id === net.localPlayerId ? selectedChar : p.characterId));
                  return (
                    <div key={p.id}
                      className={cn('flex items-center gap-2 p-2 rounded-lg border',
                        p.id === net.localPlayerId ? 'bg-cyan-950/30 border-cyan-700/50' : 'bg-slate-800/50 border-slate-700/50')}>
                      <span className={cn('w-2 h-2 rounded-full', p.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500')} />
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border-2"
                        style={{ borderColor: char?.color ? `${char.color}80` : '#475569', background: char?.color ? `${char.color}20` : '#1e293b' }}>
                        {char?.avatar || '👤'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">{p.name}</div>
                        <div className="text-[0.55rem] text-slate-400">
                          {char ? char.name : 'Eligiendo personaje...'}
                          <span className="text-slate-600"> · {p.id === net.localPlayerId ? 'Tú' : (p.id.startsWith('bot_') ? '🤖 Bot' : 'Remoto')}</span>
                          {char && (
                            <span className="text-[0.55rem] text-purple-300 ml-1">
                              · {characterSourceBadge(char)}
                            </span>
                          )}
                        </div>
                      </div>
                      {char && (
                        <div className="flex gap-1 text-[0.45rem]">
                          <span className="bg-red-950/60 text-red-400 px-1 py-0.5 rounded">❤️{char.hp}</span>
                          <span className="bg-blue-950/60 text-blue-400 px-1 py-0.5 rounded">🛡️{char.defense}</span>
                        </div>
                      )}
                      {p.id === net.localPlayerId && (
                        <span className="text-[0.5rem] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-bold">TÚ</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Config de mazo (solo host) */}
              {net.mode === 'host' && (
                <div className="mt-3">
                  <button onClick={() => setShowDeckConfig(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs font-bold text-amber-300 hover:bg-slate-800/60">
                    <span>🃏 Contenido del mazo ({contentSummary.length} fuentes)</span>
                    <span>{showDeckConfig ? '▲' : '▼'}</span>
                  </button>
                  {showDeckConfig && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-900/40 border border-slate-700/40">
                      <DeckRestrictionPanel
                        blockedCardBaseIds={blockedCardBaseIds}
                        enabledSourceIds={enabledSourceIds}
                        onBlockedChange={setBlockedCardBaseIds}
                        onSourcesChange={setEnabledSourceIds}
                      />

                      <AdvancedDeckBuilderPanel
                        value={advancedDeck}
                        onChange={setAdvancedDeck}
                        deckSize={net.roomInfo.deckSize}
                        blockedCardBaseIds={blockedCardBaseIds}
                        enabledSourceIds={enabledSourceIds}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2 flex-wrap">
                {net.mode === 'host' && net.roomInfo.players.length < net.roomInfo.maxPlayers && (
                  <button onClick={handleAddBot}
                    className="px-4 py-2.5 rounded-xl bg-purple-700/60 text-purple-100 font-bold text-sm hover:bg-purple-600/70 transition-colors border border-purple-500/50">
                    🤖 Añadir Bot
                  </button>
                )}
                {net.mode === 'host' && (
                  <button onClick={handleStartGame}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-sm shadow-lg shadow-green-500/20 hover:from-green-400 hover:to-emerald-400 transition-all">
                    ⚔️ Iniciar Partida
                  </button>
                )}
                {net.mode === 'client' && (
                  <button
                    disabled={!canPlay}
                    className={cn('flex-1 py-2.5 rounded-xl font-black text-sm transition-all',
                      canPlay
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/20'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed')}>
                    {canPlay ? '✅ Listo — esperando al host' : '🔒 Faltan mods del host'}
                  </button>
                )}
                <button onClick={net.leaveRoom}
                  className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-bold hover:bg-red-800/60 transition-colors">
                  🚪 Salir
                </button>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-slate-700/50 p-4 flex flex-col">
              <h3 className="text-xs font-bold text-cyan-300 mb-2">💬 Chat</h3>
              <div ref={chatRef} className="flex-1 overflow-y-auto space-y-1 mb-2 max-h-60">
                {net.chatMessages.map((msg, i) => (
                  <div key={i} className={cn('p-1.5 rounded-lg text-[0.6rem]',
                    msg.from === net.localPlayerName ? 'bg-cyan-950/30 text-cyan-200' : 'bg-slate-800/50 text-slate-300')}>
                    <span className="font-bold">{msg.from}: </span>
                    <span>{msg.text}</span>
                  </div>
                ))}
                {net.chatMessages.length === 0 && (
                  <div className="text-[0.55rem] text-slate-500 text-center py-4">Sin mensajes</div>
                )}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-1">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-700/50 rounded-lg px-2 py-1.5 text-xs border border-slate-600 outline-none focus:border-cyan-500"
                  placeholder="Escribe un mensaje..." maxLength={100} />
                <button type="submit" className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 transition-colors">→</button>
              </form>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-4 bg-slate-800/20 rounded-xl p-3 border border-slate-700/30">
          <div className="text-[0.55rem] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-400">🌐 Conexión por VPN:</span> Si estás en redes diferentes, usa Hamachi o ZeroTier.
            Todos deben estar en la misma red virtual. La IP de la VPN es la que compartes.
          </div>
        </motion.div>
      </div>
    </div>
  );
};
