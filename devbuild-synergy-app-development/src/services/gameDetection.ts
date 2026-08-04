import { getInstalledMods } from '../data/mods';
import { getEcosystemStatus, startEcosystemPresence } from './ecosystemPresence';

export interface GameDetectionResult {
  detected: boolean;
  mode: 'tauri' | 'web';
  path: string;
  storageKey: string;
  sharedMods: number;
  details: string[];
  gameOnline: boolean;
  devtoolOnline: boolean;
  moddingtoolOnline: boolean;
  apiAvailable: boolean;
  sharedRoot: string;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

export async function detectGame(): Promise<GameDetectionResult> {
  const mode = isTauri() ? 'tauri' : 'web';
  const details: string[] = [];
  const mods = getInstalledMods();

  if (!isTauri()) {
    return {
      detected: false,
      mode,
      path: 'Tauri no disponible',
      storageKey: 'disabled',
      sharedMods: mods.length,
      details: ['❌ Esta detección requiere app Tauri instalada.'],
      gameOnline: false,
      devtoolOnline: false,
      moddingtoolOnline: false,
      apiAvailable: false,
      sharedRoot: '',
    };
  }

  startEcosystemPresence();

  const status = await getEcosystemStatus();
  const gameOnline = status.online.game;
  const apiAvailable = Boolean(status.gameApi?.available);

  details.push(`📁 Carpeta compartida: ${status.sharedRoot}`);
  details.push(gameOnline ? '🟢 CARGAS está online por heartbeat' : '🔴 CARGAS no tiene heartbeat activo');
  details.push(status.online.devtool ? '🟢 DevBuild online' : '⚪ DevBuild offline/no detectado');
  details.push(status.online.moddingtool ? '🟢 ModdingBuild online' : '⚪ ModdingBuild offline/no detectado');
  details.push(apiAvailable ? '✅ API snapshot del juego disponible' : '⚠️ API snapshot del juego no disponible');
  details.push(`📦 ${mods.length} mod(s) visibles en disco compartido`);

  if (status.gameApi?.lastSeen) {
    details.push(`🕒 API lastSeen: ${new Date(status.gameApi.lastSeen).toLocaleTimeString()}`);
  }

  return {
    detected: gameOnline,
    mode,
    path: status.sharedRoot,
    storageKey: 'data/presence/game.json + data/api/game-api.json',
    sharedMods: mods.length,
    details,
    gameOnline,
    devtoolOnline: status.online.devtool,
    moddingtoolOnline: status.online.moddingtool,
    apiAvailable,
    sharedRoot: status.sharedRoot,
  };
}
