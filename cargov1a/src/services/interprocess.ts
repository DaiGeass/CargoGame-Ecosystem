// ============================================================
// INTERPROCESS - Servicio de comunicación entre programas
// ============================================================
// Este servicio maneja la comunicación de alto nivel entre los 3 programas.
// Usa el bridge de bajo nivel (bridge.ts) para enviar/recibir mensajes.
//
// Funciones principales:
//   - Sincronizar mods entre programas
//   - Notificar cambios en el contenido
//   - Coordinar actualizaciones de configuración
// ============================================================

import {
  emitBridgeMessage,
  onBridgeMessage,
  BridgeProgram,
} from './bridge';
import { getInstalledMods } from '../data/mods';
import { getAllCardsWithSource } from '../data/contentRegistry';
import { getAllCharacters } from '../data/cards';
import { loadBaseOverridesFromDisk } from './baseOverridesRuntime';
import { publishGameContentSnapshot } from './gameContentSnapshot';

export const CURRENT_PROGRAM: BridgeProgram = 'game';

/**
 * Inicializa el servicio de interprocess
 */
export function initInterprocessService(): void {
  console.log('[Interprocess] Inicializando servicio...');

  // Escuchar solicitudes de sincronización de mods
  onBridgeMessage('mods_sync_request', (msg) => {
    console.log('[Interprocess] Recibida solicitud de sync mods desde', msg.from);
    sendModsSyncResponse(msg.from);
  });

  // Escuchar respuestas de sincronización
  onBridgeMessage('mods_sync_response', (msg) => {
    console.log('[Interprocess] Recibida respuesta de sync mods desde', msg.from);
    handleModsSyncResponse(msg.payload);
  });

  // Escuchar cambios en mods — solo reaccionar si vienen de OTRO programa
  // (evita bucle infinito cuando el propio juego instala/desinstala).
  onBridgeMessage('mod_installed', (msg) => {
    if (msg.from === CURRENT_PROGRAM) return;
    console.log('[Interprocess] Mod instalado en', msg.from, ':', msg.payload);
    // Otro programa instaló un mod → recargar para integrarlo
    window.location.reload();
  });

  onBridgeMessage('mod_uninstalled', (msg) => {
    if (msg.from === CURRENT_PROGRAM) return;
    console.log('[Interprocess] Mod desinstalado en', msg.from, ':', msg.payload);
    window.location.reload();
  });

  onBridgeMessage('mod_updated', (msg) => {
    if (msg.from === CURRENT_PROGRAM) return;
    console.log('[Interprocess] Mod actualizado en', msg.from, ':', msg.payload);
    window.location.reload();
  });

  // DevBuild/ModdingTool publicaron overrides/registros.
  // El juego refresca el archivo baseOverrides y vuelve a publicar game-content.json.
  (onBridgeMessage as any)('editor_registries_updated', async (msg: any) => {
    if (msg.from === CURRENT_PROGRAM) return;

    console.log('[Interprocess] Registros/overrides actualizados desde', msg.from, msg.payload);

    await loadBaseOverridesFromDisk().catch(err =>
      console.warn('[Interprocess] No se pudieron recargar overrides:', err)
    );

    await publishGameContentSnapshot().catch(err =>
      console.warn('[Interprocess] No se pudo republicar game-content:', err)
    );
  });

  // Catálogo de mecánicas actualizado.
  // Por ahora lo dejamos como señal viva + snapshot; no fuerza reload.
  (onBridgeMessage as any)('mechanics_catalog_updated', async (msg: any) => {
    if (msg.from === CURRENT_PROGRAM) return;

    console.log('[Interprocess] Catálogo de mecánicas actualizado desde', msg.from, msg.payload);

    await publishGameContentSnapshot().catch(err =>
      console.warn('[Interprocess] No se pudo republicar snapshot tras mechanics update:', err)
    );
  });

  // Workbench avanzado publicado desde Dev/Mod.
  (onBridgeMessage as any)('advanced_workbench_updated', async (msg: any) => {
    if (msg.from === CURRENT_PROGRAM) return;
    console.log('[Interprocess] Workbench avanzado actualizado desde', msg.from, msg.payload);
  });

  // Responder a pings de otros programas con un pong (para detección)
  onBridgeMessage('ping', (msg) => {
    if (msg.from === CURRENT_PROGRAM) return;
    emitBridgeMessage({
      type: 'pong',
      from: CURRENT_PROGRAM,
      to: msg.from,
      payload: { program: CURRENT_PROGRAM },
    });
  });

  console.log('[Interprocess] Servicio inicializado');
}

/**
 * Envía una solicitud de sincronización de mods a otro programa
 */
export function requestModsSync(target: BridgeProgram | 'broadcast' = 'broadcast'): void {
  emitBridgeMessage({
    type: 'mods_sync_request',
    from: CURRENT_PROGRAM,
    to: target,
    payload: {
      modsCount: getInstalledMods().length,
    },
  });
}

/**
 * Envía una respuesta de sincronización con la lista de mods
 */
function sendModsSyncResponse(to: BridgeProgram): void {
  const mods = getInstalledMods();
  const cards = getAllCardsWithSource();
  const characters = getAllCharacters();

  emitBridgeMessage({
    type: 'mods_sync_response',
    from: CURRENT_PROGRAM,
    to,
    payload: {
      mods,
      cardsCount: cards.length,
      charactersCount: characters.length,
      timestamp: Date.now(),
    },
  });
}

/**
 * Maneja una respuesta de sincronización de mods
 */
function handleModsSyncResponse(payload: any): void {
  console.log('[Interprocess] Mods del otro programa:', payload.mods?.length || 0);
  // Aquí podríamos comparar con nuestros mods y decidir si recargar
}

/**
 * Notifica a otros programas que se instaló un mod
 */
export function notifyModInstalled(modId: string, modName: string): void {
  emitBridgeMessage({
    type: 'mod_installed',
    from: CURRENT_PROGRAM,
    to: 'broadcast',
    payload: { modId, modName },
  });
}

/**
 * Notifica a otros programas que se desinstaló un mod
 */
export function notifyModUninstalled(modId: string): void {
  emitBridgeMessage({
    type: 'mod_uninstalled',
    from: CURRENT_PROGRAM,
    to: 'broadcast',
    payload: { modId },
  });
}

/**
 * Notifica a otros programas que se actualizó un mod
 */
export function notifyModUpdated(modId: string, modName: string): void {
  emitBridgeMessage({
    type: 'mod_updated',
    from: CURRENT_PROGRAM,
    to: 'broadcast',
    payload: { modId, modName },
  });
}

/**
 * Verifica si otros programas están corriendo.
 * Envía un ping y recolecta los pongs recibidos durante 500ms.
 */
export async function checkOtherProgramsRunning(): Promise<{ devtool: boolean; moddingtool: boolean }> {
  const responses = { devtool: false, moddingtool: false };

  // Recolectar pongs temporalmente
  const off = onBridgeMessage('pong', (msg) => {
    if (msg.from === 'devtool') responses.devtool = true;
    if (msg.from === 'moddingtool') responses.moddingtool = true;
  });

  emitBridgeMessage({
    type: 'ping',
    from: CURRENT_PROGRAM,
    to: 'broadcast',
    payload: {},
  });

  await new Promise(resolve => setTimeout(resolve, 500));
  off(); // dejar de escuchar pongs
  return responses;
}
