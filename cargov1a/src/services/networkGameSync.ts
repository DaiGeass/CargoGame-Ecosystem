// ============================================================
// NETWORK GAME SYNC
// Conecta networkStore con gameStore.
// Host = autoridad. Clientes mandan comandos. Host aplica y republica estado.
// ============================================================

import { useGameStore } from '../store/gameStore';
import { useNetworkStore, NetworkMessage } from '../store/networkStore';

type AnyFn = (...args: any[]) => any;

let started = false;
let applyingRemote = false;
let originals: Record<string, AnyFn> = {};

function isNetworkSession(): boolean {
  const n = useNetworkStore.getState();
  return n.isConnected && n.mode !== 'disconnected';
}

function localGamePlayerId(): string | null {
  const n = useNetworkStore.getState();
  const g: any = useGameStore.getState();
  const room = n.roomInfo;

  if (!room || !n.localPlayerId) return null;

  // Sistema robusto:
  // cada Player del gameStore conserva el ID real de red.
  const byNetworkId = g.players?.find((p: any) => p.networkPlayerId === n.localPlayerId);
  if (byNetworkId?.id) return byNetworkId.id;

  // Fallback legacy: room.players[index] => p + index.
  const idx = room.players.findIndex((p: any) => p.id === n.localPlayerId);
  if (idx < 0) return null;

  return `p${idx}`;
}

function currentGamePlayerId(): string | null {
  const g: any = useGameStore.getState();
  return g.players?.[g.currentPlayerIndex]?.id || null;
}

function gamePlayerIdForNetworkId(networkPlayerId: string | undefined | null): string | null {
  if (!networkPlayerId) return null;

  const n = useNetworkStore.getState();
  const g: any = useGameStore.getState();

  const byNetworkId = g.players?.find((p: any) => p.networkPlayerId === networkPlayerId);
  if (byNetworkId?.id) return byNetworkId.id;

  const idx = n.roomInfo?.players?.findIndex((p: any) => p.id === networkPlayerId) ?? -1;
  if (idx >= 0) return `p${idx}`;

  return null;
}

function senderGamePlayerId(msg: NetworkMessage): string | null {
  return gamePlayerIdForNetworkId(msg.from);
}

function canLocalAct(): boolean {
  if (!isNetworkSession()) return true;
  if (applyingRemote) return true;

  const local = localGamePlayerId();
  const current = currentGamePlayerId();

  if (!local || !current) return true;
  return local === current;
}

function serializeValue(value: any): any {
  if (value instanceof Set) return [...value];
  return value;
}

export function serializeGameState(): any {
  const g: any = useGameStore.getState();
  const out: any = {};

  for (const [key, value] of Object.entries(g)) {
    if (typeof value === 'function') continue;
    out[key] = serializeValue(value);
  }

  out.__serializedAt = Date.now();
  return JSON.parse(JSON.stringify(out));
}

export function applyNetworkGameState(snapshot: any): void {
  if (!snapshot || typeof snapshot !== 'object') return;

  const clean = { ...snapshot };
  delete clean.__serializedAt;

  if (Array.isArray(clean.revealedHands)) {
    clean.revealedHands = new Set(clean.revealedHands);
  }

  useGameStore.setState(clean as any);
}

function broadcastGameState(reason: string): void {
  const n = useNetworkStore.getState();
  if (n.mode !== 'host' || !n.isConnected) return;

  n.sendMessage('game_state_sync', {
    reason,
    state: serializeGameState(),
  }, 'broadcast');
}

function broadcastGameStateSoon(reason: string): void {
  window.setTimeout(() => broadcastGameState(reason), 80);
  window.setTimeout(() => broadcastGameState(reason + ':late'), 350);
}

function sendCommandToHost(type: any, data: any): void {
  const n = useNetworkStore.getState();
  const hostId = n.roomInfo?.hostId;

  if (!n.isConnected || n.mode !== 'client') return;

  n.sendMessage(type, data, hostId);
}

function isMessageForMe(msg: NetworkMessage): boolean {
  const n = useNetworkStore.getState();
  if (!msg.to) return true;
  if (msg.to === 'broadcast') return true;
  return msg.to === n.localPlayerId;
}

function hostApplyRemoteCommand(msg: NetworkMessage): void {
  const n = useNetworkStore.getState();
  if (n.mode !== 'host') return;
  if (msg.from === n.localPlayerId) return;

  const senderGameId = senderGamePlayerId(msg);
  const currentGameId = currentGamePlayerId();
  const defenderGameId = defenseGamePlayerId();

  const remoteOwnerOk =
    msg.type === 'defense_card' || msg.type === 'skip_defense'
      ? (!defenderGameId || senderGameId === defenderGameId)
      : (!currentGameId || senderGameId === currentGameId);

  if (!remoteOwnerOk) {
    console.warn('[NetworkGameSync] Comando remoto ignorado: jugador no dueño de la acción', {
      type: msg.type,
      from: msg.from,
      senderGameId,
      currentGameId,
      defenderGameId,
    });
    return;
  }

  applyingRemote = true;

  try {
    if (msg.type === 'action_prepare') {
      if (msg.data?.kind === 'basic_attack') {
        originals.prepareBasicAttack?.(msg.data.targetId);
      } else {
        originals.prepareAction?.(msg.data.cardIds || [], msg.data.targetId);
      }
      broadcastGameStateSoon('remote:action_prepare');
      return;
    }

    if ((msg.type as any) === 'ability_use') {
      originals.useAbility?.(msg.data.abilityId, msg.data.targetId);
      broadcastGameStateSoon('remote:ability_use');
      return;
    }

    if (msg.type === 'defense_card') {
      originals.defendWithCard?.(msg.data.cardId);
      broadcastGameStateSoon('remote:defense_card');
      return;
    }

    if (msg.type === 'skip_defense') {
      originals.skipDefense?.();
      broadcastGameStateSoon('remote:skip_defense');
      return;
    }

    if ((msg.type as any) === 'end_turn') {
      originals.endTurn?.();
      broadcastGameStateSoon('remote:end_turn');
      return;
    }
  } finally {
    applyingRemote = false;
  }
}

function handleNetworkMessage(msg: NetworkMessage): void {
  if (!isMessageForMe(msg)) return;

  if (msg.type === 'game_start') {
    if (msg.data?.state) applyNetworkGameState(msg.data.state);
    window.dispatchEvent(new CustomEvent('cargas:go-game'));
    return;
  }

  if (msg.type === 'game_state_sync') {
    if (msg.data?.state) applyNetworkGameState(msg.data.state);
    return;
  }

  hostApplyRemoteCommand(msg);
}


function defenseGamePlayerId(): string | null {
  const g: any = useGameStore.getState();

  if (g.defensePhase?.defenderId) return g.defensePhase.defenderId;
  if (g.resolutionPreview?.targetId) return g.resolutionPreview.targetId;
  if (g.pendingActions?.[0]?.targetId && g.isResolvingEndTurn) return g.pendingActions[0].targetId;

  return null;
}

function isDefenseCommand(type: any): boolean {
  return type === 'defense_card' || type === 'skip_defense';
}

function canLocalDefend(): boolean {
  if (!isNetworkSession()) return true;

  const local = localGamePlayerId();
  const defender = defenseGamePlayerId();

  if (!local || !defender) return true;
  return local === defender;
}

function guardOrSend(type: any, data: any): boolean {
  const n = useNetworkStore.getState();

  if (!isNetworkSession()) return true;
  if (applyingRemote) return true;

  // Resolución/defensa:
  // aquí NO manda el turno actual, manda el defensor.
  if (isDefenseCommand(type)) {
    if (!canLocalDefend()) {
      console.warn('[NetworkGameSync] Esperando defensa/resolución del otro jugador.');
      return false;
    }

    if (n.mode === 'client') {
      sendCommandToHost(type, data);
      return false;
    }

    return true;
  }

  // Acciones activas normales:
  // cartas, ataque básico, habilidades y pasar turno pertenecen al jugador actual.
  if (!canLocalAct()) {
    console.warn('[NetworkGameSync] Esperando acción del otro jugador.');
    return false;
  }

  // Cliente: manda comando al host y espera sync autoritativo.
  if (n.mode === 'client') {
    sendCommandToHost(type, data);
    return false;
  }

  // Host: si es su turno, ejecuta local y luego sincroniza estado.
  return true;
}

function wrapGameStoreMethods(): void {
  const s: any = useGameStore.getState();

  const names = [
    'prepareAction',
    'prepareBasicAttack',
    'executeBasicAttack',
    'useAbility',
    'defendWithCard',
    'skipDefense',
    'endTurn',
  ];

  for (const name of names) {
    if (!originals[name]) originals[name] = s[name];
  }

  useGameStore.setState({
    prepareAction: (cardIds: string[], targetId: string) => {
      if (!guardOrSend('action_prepare', { kind: 'cards', cardIds, targetId })) return;
      originals.prepareAction(cardIds, targetId);
      broadcastGameStateSoon('local:prepareAction');
    },

    prepareBasicAttack: (targetId: string) => {
      if (!guardOrSend('action_prepare', { kind: 'basic_attack', targetId })) return;
      originals.prepareBasicAttack(targetId);
      broadcastGameStateSoon('local:prepareBasicAttack');
    },

    executeBasicAttack: (targetId: string) => {
      if (!guardOrSend('action_prepare', { kind: 'basic_attack', targetId })) return;
      originals.executeBasicAttack(targetId);
      broadcastGameStateSoon('local:executeBasicAttack');
    },

    useAbility: (abilityId: string, targetId: string) => {
      if (!guardOrSend('ability_use', { abilityId, targetId })) return;
      originals.useAbility(abilityId, targetId);
      broadcastGameStateSoon('local:useAbility');
    },

    defendWithCard: (cardId: string) => {
      if (!guardOrSend('defense_card', { cardId })) return;
      originals.defendWithCard(cardId);
      broadcastGameStateSoon('local:defendWithCard');
    },

    skipDefense: () => {
      if (!guardOrSend('skip_defense', {})) return;
      originals.skipDefense();
      broadcastGameStateSoon('local:skipDefense');
    },

    endTurn: () => {
      if (!guardOrSend('end_turn', {})) return;
      originals.endTurn();
      broadcastGameStateSoon('local:endTurn');
    },
  } as any);
}

export function broadcastNetworkGameStart(): void {
  const n = useNetworkStore.getState();

  if (n.mode !== 'host' || !n.isConnected) return;

  n.sendMessage('game_start', {
    roomInfo: n.roomInfo,
    state: serializeGameState(),
  }, 'broadcast');

  broadcastGameStateSoon('game_start');
  window.dispatchEvent(new CustomEvent('cargas:go-game'));
}

export function startNetworkGameSync(): void {
  if (started) return;
  started = true;

  wrapGameStoreMethods();

  useNetworkStore.getState().onGameMessage(handleNetworkMessage);

  console.log('[NetworkGameSync] Activo: host autoritativo + sync de estado');
}
