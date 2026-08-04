// ============================================================
// NETWORK STORE - Sistema Multijugador por IP / LAN
// ============================================================
// Este sistema permite jugar partidas en red local usando
// WebRTC (via simple-peer) con un servidor de señalización
// ligero integrado en la misma aplicación.
//
// FLUJO:
//   1. Un jugador crea una sala (host) → genera un código
//   2. Otro jugador se une por IP:puerto o código de sala
//   3. Se establece conexión P2P WebRTC
//   4. El host controla el estado del juego y sincroniza
//
// Para VPN (Hamachi/ZeroTier): se usa la IP virtual de la VPN.
// Para LAN local: IP local + puerto 9876.
// ============================================================

import { create } from 'zustand';
import { GameMode, GameRules } from '../types/game';
import { createTransport, NetTransport, TransportMessage } from './netTransport';

// Transporte activo y listeners de juego (fuera del store para no serializar)
let activeTransport: NetTransport | null = null;
const gameMessageListeners = new Set<(msg: NetworkMessage) => void>();

// ─── Tipos de mensajes de red ──────────────────────────────
export type NetworkMessageType =
  | 'join_request'
  | 'join_accepted'
  | 'join_rejected'
  | 'player_list'
  | 'player_update'
  | 'game_start'
  | 'action_prepare'
  | 'action_resolve'
  | 'defense_card'
  | 'skip_defense'
  | 'end_turn'
  | 'ability_use'
  | 'game_state_sync'
  | 'mods_sync'
  | 'chat_message'
  | 'ping'
  | 'pong'
  | 'disconnect';

export interface NetworkMessage {
  type: NetworkMessageType;
  from: string;
  to?: string;
  data: any;
  timestamp: number;
}

// ─── Información de mods instalados ───────────────────────
export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  kind: 'vpn' | 'lan' | 'loopback' | 'other' | string;
  recommended: boolean;
}

export interface ModInfo {
  id: string;
  name: string;
  version: string;
  author: string;
  cardsCount: number;
  charactersCount: number;
  combosCount: number;
}

// ─── Información de sala ──────────────────────────────────
export interface RoomInfo {
  id: string;
  hostId: string;
  players: { id: string; name: string; characterId: string; connected: boolean }[];
  maxPlayers: number;
  gameMode: GameMode;
  deckSize: number;
  rules: GameRules;
  started: boolean;
  // Lista de mods instalados en el host (para sincronización)
  hostMods?: ModInfo[];
  // Mods que el jugador local necesita instalar
  missingMods?: { id: string; name: string; required: boolean }[];
  // Fuentes de personajes permitidas en la sala: base/mod/dlc/editor.
  allowedCharacterSources?: string[];
}

// ─── Estado de red ─────────────────────────────────────────
export interface NetworkState {
  mode: 'disconnected' | 'host' | 'client';
  roomId: string | null;
  localPlayerId: string | null;
  localPlayerName: string;
  remotePlayers: { id: string; name: string; connected: boolean; latency: number }[];
  hostIp: string;
  hostPort: number;
  isConnected: boolean;
  latency: number;
  roomInfo: RoomInfo | null;
  chatMessages: { from: string; text: string; timestamp: number }[];
  error: string | null;

  // Estado del transporte real (WebRTC/BroadcastChannel)
  transportKind: 'lan' | 'webrtc' | 'broadcast' | 'loopback' | null;
  // Mensajes de juego recibidos (acciones sincronizadas)
  lastGameMessage: NetworkMessage | null;

  createRoom: (playerName: string, maxPlayers: number, gameMode: GameMode, deckSize: number, rules: GameRules, port?: number, allowedCharacterSources?: string[]) => void;
  joinRoom: (playerName: string, ip: string, port: number, roomCode?: string) => void;
  leaveRoom: () => void;
  sendMessage: (type: NetworkMessageType, data: any, targetId?: string) => void;
  sendChatMessage: (text: string) => void;
  // Sincronización de mods
  syncMods: () => void;
  installMissingMods: (modIds: string[]) => Promise<void>;
  getLocalMods: () => ModInfo[];
  updateRoomInfo: (info: Partial<RoomInfo>) => void;
  clearError: () => void;
  getLocalIp: () => Promise<string>;
  getNetworkInterfaces: () => Promise<NetworkInterfaceInfo[]>;
  updateLocalCharacter: (characterId: string) => void;
  // Suscribirse a mensajes de juego (acciones de otros jugadores)
  onGameMessage: (listener: (msg: NetworkMessage) => void) => () => void;
}

// ─── Señalización simple por WebSocket (simulada) ────────
// En producción real usarías un servidor WebSocket en el puerto 9876
// o un servicio como PeerJS/SimplePeer con servidor de señalización.
// Para esta demo, simulamos la conexión P2P directa.

let mockRoomState: RoomInfo | null = null;

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerId(): string {
  return `player_${Math.random().toString(36).substring(2, 8)}`;
}

// ─── Manejo de mensajes entrantes del transporte ──────────
// El HOST es la autoridad: cuando un cliente pide unirse, el host
// lo añade a la sala y reenvía la lista de jugadores a todos.
// Los mensajes de juego (acciones) se reenvían a los listeners.
function handleIncoming(tm: TransportMessage, set: any, get: any): void {
  const state = get();
  console.log('[Network] incoming', tm.type, { from: tm.from, to: tm.to, mode: state.mode, roomId: state.roomId });

  switch (tm.type) {
    case 'join_request': {
      // Solo el host procesa solicitudes de unión
      if (state.mode !== 'host' || !state.roomInfo) break;
      const { name, playerId, characterId } = tm.data || {};
      if (!playerId) break;
      // Evitar duplicados
      if (state.roomInfo.players.some((p: any) => p.id === playerId)) break;
      if (state.roomInfo.players.length >= state.roomInfo.maxPlayers) {
        activeTransport?.send({ type: 'join_rejected', from: state.localPlayerId, to: playerId, data: { reason: 'Sala llena' }, ts: Date.now() });
        break;
      }
      const updatedPlayers = [...state.roomInfo.players, { id: playerId, name, characterId: characterId || 'arquero', connected: true }];
      const updatedRoom = { ...state.roomInfo, players: updatedPlayers };
      mockRoomState = updatedRoom;
      set({
        roomInfo: updatedRoom,
        remotePlayers: updatedPlayers.filter((p: any) => p.id !== state.localPlayerId)
          .map((p: any) => ({ id: p.id, name: p.name, connected: true, latency: 0 })),
      });
      // Reenviar lista actualizada + mods del host a todos
      activeTransport?.send({ type: 'player_list', from: state.localPlayerId, data: { room: updatedRoom }, ts: Date.now() });
      get().syncMods();
      break;
    }

    case 'player_update': {
      const { playerId, characterId } = tm.data || {};
      if (!playerId || !characterId || !state.roomInfo) break;

      const updatedPlayers = state.roomInfo.players.map((p: any) =>
        p.id === playerId ? { ...p, characterId } : p
      );

      const updatedRoom = { ...state.roomInfo, players: updatedPlayers };
      mockRoomState = updatedRoom;

      set({
        roomInfo: updatedRoom,
        remotePlayers: updatedPlayers.filter((p: any) => p.id !== state.localPlayerId)
          .map((p: any) => ({ id: p.id, name: p.name, connected: true, latency: 0 })),
      });

      if (state.mode === 'host') {
        activeTransport?.send({
          type: 'player_list',
          from: state.localPlayerId,
          data: { room: updatedRoom },
          ts: Date.now(),
        });
      }

      break;
    }

    case 'player_list': {
      // Cliente recibe la lista oficial de jugadores del host
      const room = tm.data?.room;
      if (room) {
        mockRoomState = room;
        set({
          roomInfo: room,
          remotePlayers: room.players.filter((p: any) => p.id !== state.localPlayerId)
            .map((p: any) => ({ id: p.id, name: p.name, connected: true, latency: 0 })),
        });
        // Tras recibir la sala, verificar mods
        get().syncMods();
      }
      break;
    }

    case 'mods_sync':
    case 'game_state_sync': {
      // Sincronización de mods o estado
      if (tm.data?.hostMods && state.roomInfo) {
        set({ roomInfo: { ...state.roomInfo, hostMods: tm.data.hostMods } });
        get().syncMods();
      }
      // Reenviar a listeners de juego
      const msg: NetworkMessage = { type: tm.type as any, from: tm.from, to: tm.to, data: tm.data, timestamp: tm.ts };
      set({ lastGameMessage: msg });
      gameMessageListeners.forEach(l => l(msg));
      break;
    }

    case 'chat_message': {
      const { from, text } = tm.data || {};
      set({ chatMessages: [...state.chatMessages, { from: from || 'Remoto', text, timestamp: tm.ts }] });
      break;
    }

    case 'disconnect': {
      // Un jugador se fue
      if (state.roomInfo) {
        const updatedPlayers = state.roomInfo.players.filter((p: any) => p.id !== tm.from);
        const updatedRoom = { ...state.roomInfo, players: updatedPlayers };
        mockRoomState = updatedRoom;
        set({
          roomInfo: updatedRoom,
          remotePlayers: state.remotePlayers.filter((p: any) => p.id !== tm.from),
        });
        if (state.mode === 'host') {
          activeTransport?.send({ type: 'player_list', from: state.localPlayerId, data: { room: updatedRoom }, ts: Date.now() });
        }
      }
      break;
    }

    default: {
      // Acciones de juego: reenviar a los listeners suscritos
      const msg: NetworkMessage = { type: tm.type as any, from: tm.from, to: tm.to, data: tm.data, timestamp: tm.ts };
      set({ lastGameMessage: msg });
      gameMessageListeners.forEach(l => l(msg));
      break;
    }
  }
}

// ─── Store ─────────────────────────────────────────────────
export const useNetworkStore = create<NetworkState>((set, get) => ({
  mode: 'disconnected',
  roomId: null,
  localPlayerId: null,
  localPlayerName: 'Jugador',
  remotePlayers: [],
  hostIp: 'localhost',
  hostPort: 9876,
  isConnected: false,
  latency: 0,
  roomInfo: null,
  chatMessages: [],
  error: null,
  transportKind: null,
  lastGameMessage: null,

  createRoom: (playerName, maxPlayers, gameMode, deckSize, rules, portArg, allowedCharacterSourcesArg) => {
    const playerId = generatePlayerId();
    const roomId = generateRoomId();
    const selectedPort = Number(portArg || get().hostPort || 9876);

    const roomInfo: RoomInfo = {
      id: roomId,
      hostId: playerId,
      players: [{ id: playerId, name: playerName, characterId: 'arquero', connected: true }],
      maxPlayers,
      gameMode,
      deckSize,
      rules,
      started: false,
      allowedCharacterSources: allowedCharacterSourcesArg?.length ? allowedCharacterSourcesArg : ['base', 'mod', 'dlc', 'editor'],
    };

    mockRoomState = roomInfo;

    // ── Crear transporte real (BroadcastChannel para LAN/multipestaña) ──
    try {
      activeTransport = createTransport({
        roomId,
        selfId: playerId,
        isHost: true,
        preferLan: true,
        hostPort: selectedPort,
      });
      activeTransport.onMessage((tm: TransportMessage) => handleIncoming(tm, set, get));
    } catch (err) {
      console.error('No se pudo crear el transporte:', err);
    }

    set({
      mode: 'host',
      roomId,
      localPlayerId: playerId,
      localPlayerName: playerName,
      hostPort: selectedPort,
      isConnected: true,
      roomInfo,
      remotePlayers: [],
      error: null,
      transportKind: activeTransport?.kind ?? null,
    });

    console.log(`🏠 Sala creada: ${roomId} (transporte: ${activeTransport?.kind})`);
    // Registrar los mods del host en la info de sala
    get().syncMods();
  },

  joinRoom: (playerName, ip, port, roomCode) => {
    const playerId = generatePlayerId();
    const targetRoom = roomCode || mockRoomState?.id;

    if (!targetRoom) {
      set({ error: 'Indica un código de sala o IP del host válida.' });
      return;
    }

    // ── Crear transporte y anunciar entrada al host ──
    try {
      activeTransport = createTransport({
        roomId: targetRoom,
        selfId: playerId,
        isHost: false,
        preferLan: true,
        hostIp: ip,
        hostPort: port,
      });
      activeTransport.onMessage((tm: TransportMessage) => handleIncoming(tm, set, get));
      // Anunciar nuestra llegada
      activeTransport.send({
        type: 'join_request',
        from: playerId,
        data: { name: playerName, playerId },
        ts: Date.now(),
      });
    } catch (err) {
      console.error('No se pudo conectar:', err);
      set({ error: 'No se pudo establecer conexión.' });
      return;
    }

    set({
      mode: 'client',
      roomId: targetRoom,
      localPlayerId: playerId,
      localPlayerName: playerName,
      hostIp: ip,
      hostPort: port,
      isConnected: true,
      transportKind: activeTransport?.kind ?? null,
      // El roomInfo real llegará por el mensaje player_list del host
      roomInfo: mockRoomState ? { ...mockRoomState } : null,
      error: null,
    });

    console.log(`🔗 Uniéndose a sala ${targetRoom} (transporte: ${activeTransport?.kind})`);
  },

  leaveRoom: () => {
    // Anunciar salida y cerrar transporte
    if (activeTransport) {
      try {
        activeTransport.send({ type: 'disconnect', from: get().localPlayerId || '', data: {}, ts: Date.now() });
        activeTransport.close();
      } catch {}
      activeTransport = null;
    }
    mockRoomState = null;
    set({
      mode: 'disconnected',
      roomId: null,
      localPlayerId: null,
      isConnected: false,
      remotePlayers: [],
      roomInfo: null,
      error: null,
      transportKind: null,
    });
  },

  sendMessage: (type, data, targetId) => {
    const { localPlayerId } = get();
    const msg: NetworkMessage = {
      type,
      from: localPlayerId || 'unknown',
      to: targetId,
      data,
      timestamp: Date.now(),
    };

    console.log('[Network] send', type, { targetId, data });

    // Enviar por el transporte real si existe
    if (activeTransport) {
      activeTransport.send({
        type: type as string,
        from: localPlayerId || 'unknown',
        to: targetId === 'broadcast' ? undefined : targetId,
        data,
        ts: msg.timestamp,
      });
    }

    if (type === 'ping') {
      const t0 = Date.now();
      setTimeout(() => set({ latency: Date.now() - t0 }), 30 + Math.random() * 60);
    }
  },

  onGameMessage: (listener) => {
    gameMessageListeners.add(listener);
    return () => gameMessageListeners.delete(listener);
  },

  sendChatMessage: (text) => {
    const { localPlayerName, chatMessages } = get();
    const newMsg = { from: localPlayerName, text, timestamp: Date.now() };
    set({ chatMessages: [...chatMessages, newMsg] });
    // Enviar a los demás jugadores
    if (activeTransport) {
      activeTransport.send({
        type: 'chat_message',
        from: get().localPlayerId || '',
        data: { from: localPlayerName, text },
        ts: newMsg.timestamp,
      });
    }
  },

  updateLocalCharacter: (characterId) => {
    const state = get();
    const playerId = state.localPlayerId;

    if (!playerId) return;

    if (state.roomInfo) {
      const updatedPlayers = state.roomInfo.players.map((p: any) =>
        p.id === playerId ? { ...p, characterId } : p
      );

      const updatedRoom = { ...state.roomInfo, players: updatedPlayers };
      mockRoomState = updatedRoom;

      set({
        roomInfo: updatedRoom,
        remotePlayers: updatedPlayers.filter((p: any) => p.id !== playerId)
          .map((p: any) => ({ id: p.id, name: p.name, connected: true, latency: 0 })),
      });

      if (state.mode === 'host') {
        activeTransport?.send({
          type: 'player_list',
          from: playerId,
          data: { room: updatedRoom },
          ts: Date.now(),
        });
      }
    }

    if (state.mode === 'client') {
      get().sendMessage('player_update', { playerId, characterId }, state.roomInfo?.hostId);
    }
  },

  updateRoomInfo: (info) => {
    const { roomInfo, mode, localPlayerId } = get();
    if (roomInfo) {
      const updated = { ...roomInfo, ...info };
      mockRoomState = updated;
      set({ roomInfo: updated });

      if (mode === 'host') {
        activeTransport?.send({
          type: 'player_list',
          from: localPlayerId || '',
          data: { room: updated },
          ts: Date.now(),
        });
      }
    }
  },

  clearError: () => set({ error: null }),

  // ─── Sincronización de mods ─────────────────────────────
  getLocalMods: (): ModInfo[] => {
    try {
      const { getInstalledMods } = require('../data/mods');
      const mods = getInstalledMods();
      return mods.map((m: any) => ({
        id: m.manifest.id || m.manifest.name.toLowerCase().replace(/\s+/g, '_'),
        name: m.manifest.name,
        version: m.manifest.version,
        author: m.manifest.author,
        cardsCount: m.cards.length,
        charactersCount: m.characters.length,
        combosCount: m.combos.length,
      }));
    } catch {
      return [];
    }
  },

  syncMods: () => {
    const { roomInfo, getLocalMods } = get();
    if (!roomInfo) return;

    // Host envía sus mods a los clientes
    if (get().mode === 'host') {
      const hostMods = getLocalMods();
      set({ roomInfo: { ...roomInfo, hostMods } });
      mockRoomState = { ...roomInfo, hostMods };
      get().sendMessage('game_state_sync', { hostMods }, 'broadcast');
      console.log(`[Network] Host sincronizando ${hostMods.length} mods con clientes`);
    }

    // Cliente compara mods y detecta faltantes
    if (get().mode === 'client' && roomInfo.hostMods) {
      const localMods = getLocalMods();
      const localIds = new Set(localMods.map(m => m.id));
      const missing = roomInfo.hostMods
        .filter(m => !localIds.has(m.id))
        .map(m => ({ id: m.id, name: m.name, required: true }));
      
      set({ roomInfo: { ...roomInfo, missingMods: missing } });
      console.log(`[Network] Cliente detectó ${missing.length} mods faltantes`);
      if (missing.length > 0) {
        set({ error: `Faltan ${missing.length} mod(s) del host. Instálalos para jugar.` });
      }
    }
  },

  installMissingMods: async (modIds) => {
    // En una implementación real, esto descargaría los mods
    // desde el host o desde un repositorio. Por ahora es un stub.
    console.log('Instalando mods faltantes:', modIds);
    get().syncMods();
  },

  getNetworkInterfaces: async () => {
    try {
      const isTauri = typeof window !== 'undefined' &&
                      Boolean((window as any).__TAURI_INTERNALS__);

      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<NetworkInterfaceInfo[]>('get_network_interfaces');
      }

      return [];
    } catch {
      return [];
    }
  },

  getLocalIp: async () => {
    try {
      const isTauri = typeof window !== 'undefined' &&
                      Boolean((window as any).__TAURI_INTERNALS__);

      if (isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const interfaces = await invoke<NetworkInterfaceInfo[]>('get_network_interfaces').catch(() => []);
          const preferred =
            interfaces.find(i => i.recommended) ||
            interfaces.find(i => i.kind === 'lan') ||
            interfaces.find(i => i.kind !== 'loopback');

          if (preferred?.ip) return preferred.ip;

          const ip = await invoke<string>('get_system_info');
          return ip;
        } catch {
          // Si el comando no existe, caemos al fallback web
        }
      }

      return new Promise((resolve) => {
        try {
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.createDataChannel('');
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
          pc.onicecandidate = (ice) => {
            if (ice.candidate) {
              const ipMatch = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
              if (ipMatch) {
                pc.close();
                resolve(ipMatch[1]);
              }
            }
          };
          setTimeout(() => {
            pc.close();
            resolve('192.168.x.x');
          }, 2000);
        } catch {
          resolve('192.168.1.x (red local)');
        }
      });
    } catch {
      return 'localhost';
    }
  },
}));

export function isNetworkAvailable(): boolean {
  return typeof window !== 'undefined' && 'RTCPeerConnection' in window;
}
