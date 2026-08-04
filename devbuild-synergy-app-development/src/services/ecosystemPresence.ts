import { invoke } from '@tauri-apps/api/core';
import {
  ensureSharedStructure,
  getSharedRoot,
  readSharedText,
  writeSharedText,
  listSharedDir,
} from './sharedDisk';

export type EcosystemAppId = 'game' | 'devtool' | 'moddingtool';

export interface PresenceRecord {
  id: EcosystemAppId;
  name: string;
  status: 'online' | 'offline';
  startedAt: number;
  lastSeen: number;
  sharedRoot: string;
  version: string;
  api?: {
    available: boolean;
    name: string;
    protocol: string;
    capabilities: string[];
  };
}

export interface EcosystemMessage {
  id: string;
  type: string;
  from: EcosystemAppId;
  to: EcosystemAppId | 'broadcast';
  timestamp: number;
  payload?: any;
}

export interface EcosystemStatus {
  now: number;
  sharedRoot: string;
  apps: Record<EcosystemAppId, PresenceRecord | null>;
  online: Record<EcosystemAppId, boolean>;
  gameApi: any | null;
  files: string[];
}

const APP_ID = 'devtool' as EcosystemAppId;
const APP_NAME = 'DevBuild';
const STARTED_AT = Date.now();
const ONLINE_TTL_MS = 8000;

let heartbeatTimer: number | null = null;
let shutdownRegistered = false;

function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

function isOnline(record: PresenceRecord | null, now = Date.now()): boolean {
  if (!record) return false;
  if (record.status !== 'online') return false;
  return now - record.lastSeen <= ONLINE_TTL_MS;
}

async function publishGameApiSnapshot(sharedRoot: string, lastSeen: number) {
  if (APP_ID !== 'game') return;

  await writeSharedText('data/api/game-api.json', JSON.stringify({
    available: true,
    app: 'game',
    name: 'CARGAS_GAME_API',
    protocol: 'cargas-ecosystem-v1',
    lastSeen,
    sharedRoot,
    capabilities: [
      'presence-heartbeat',
      'shared-disk',
      'bridge-inbox',
      'mods',
      'dlc',
      'saves',
      'game-api-snapshot',
    ],
  }, null, 2));
}

export async function writeOwnPresence(status: 'online' | 'offline' = 'online'): Promise<void> {
  if (!isTauri()) return;

  await ensureSharedStructure();

  const sharedRoot = await getSharedRoot();
  const lastSeen = Date.now();

  const record: PresenceRecord = {
    id: APP_ID,
    name: APP_NAME,
    status,
    startedAt: STARTED_AT,
    lastSeen,
    sharedRoot,
    version: '1.0.0',
    api: APP_ID === 'game'
      ? {
          available: true,
          name: 'CARGAS_GAME_API',
          protocol: 'cargas-ecosystem-v1',
          capabilities: [
            'presence-heartbeat',
            'shared-disk',
            'bridge-inbox',
            'mods',
            'dlc',
            'saves',
            'game-api-snapshot',
          ],
        }
      : undefined,
  };

  await writeSharedText(`data/presence/${APP_ID}.json`, JSON.stringify(record, null, 2));
  await publishGameApiSnapshot(sharedRoot, lastSeen);
}

export function startEcosystemPresence(): void {
  if (!isTauri()) {
    console.warn('[Ecosystem] Tauri no disponible; presence desactivado.');
    return;
  }

  if (heartbeatTimer !== null) return;

  writeOwnPresence('online').catch(err => console.warn('[Ecosystem] presence inicial falló:', err));

  heartbeatTimer = window.setInterval(() => {
    writeOwnPresence('online').catch(err => console.warn('[Ecosystem] heartbeat falló:', err));
  }, 1500);

  if (!shutdownRegistered) {
    shutdownRegistered = true;
    window.addEventListener('beforeunload', () => {
      writeOwnPresence('offline').catch(() => {});
    });
  }

  console.log(`[Ecosystem] ${APP_NAME} online como ${APP_ID}`);
}

async function readPresence(id: EcosystemAppId): Promise<PresenceRecord | null> {
  const raw = await readSharedText(`data/presence/${id}.json`).catch(() => null);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PresenceRecord;
  } catch {
    return null;
  }
}

export async function getEcosystemStatus(): Promise<EcosystemStatus> {
  await ensureSharedStructure();

  const now = Date.now();
  const sharedRoot = await getSharedRoot().catch(() => '');
  const apps = {
    game: await readPresence('game'),
    devtool: await readPresence('devtool'),
    moddingtool: await readPresence('moddingtool'),
  };

  const gameApiRaw = await readSharedText('data/api/game-api.json').catch(() => null);
  let gameApi: any | null = null;

  if (gameApiRaw) {
    try {
      gameApi = JSON.parse(gameApiRaw);
    } catch {
      gameApi = null;
    }
  }

  const files = await listSharedDir('data/presence').catch(() => []);

  return {
    now,
    sharedRoot,
    apps,
    online: {
      game: isOnline(apps.game, now),
      devtool: isOnline(apps.devtool, now),
      moddingtool: isOnline(apps.moddingtool, now),
    },
    gameApi,
    files,
  };
}

export async function sendEcosystemMessage(
  type: string,
  payload: any = {},
  to: EcosystemAppId | 'broadcast' = 'broadcast',
): Promise<EcosystemMessage> {
  startEcosystemPresence();

  const message: EcosystemMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    type,
    from: APP_ID,
    to,
    timestamp: Date.now(),
    payload,
  };

  await invoke('write_bridge_message', { message });
  return message;
}

export async function readEcosystemMessages(): Promise<EcosystemMessage[]> {
  if (!isTauri()) return [];

  try {
    return await invoke<EcosystemMessage[]>('read_bridge_messages', { program: APP_ID });
  } catch (err) {
    console.warn('[Ecosystem] No se pudieron leer mensajes:', err);
    return [];
  }
}

export function startEcosystemBridgePolling(
  onMessage: (message: EcosystemMessage) => void,
  intervalMs = 500,
): () => void {
  startEcosystemPresence();

  const timer = window.setInterval(async () => {
    const messages = await readEcosystemMessages();
    for (const msg of messages) {
      onMessage(msg);
    }
  }, intervalMs);

  return () => window.clearInterval(timer);
}

export function getCurrentEcosystemAppId(): EcosystemAppId {
  return APP_ID;
}

export function getCurrentEcosystemAppName(): string {
  return APP_NAME;
}

export function isPresenceOnline(record: PresenceRecord | null): boolean {
  return isOnline(record);
}
