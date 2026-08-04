// ============================================================
// BRIDGE - Comunicación entre programas CARGAS
// ============================================================
// Este módulo define el protocolo de comunicación entre los 3 programas:
//   1. Game (juego principal)
//   2. DevTool (herramienta de desarrollo)
//   3. ModdingTool (herramienta de modding)
//
// Los programas se comunican mediante:
//   - Archivos en carpeta compartida (data/bridge/)
//   - WebSockets locales (si están corriendo simultáneamente)
//   - Eventos de window (si están en la misma ventana)
//
// Este archivo define los tipos y el protocolo.
// ============================================================

export type BridgeProgram = 'game' | 'devtool' | 'moddingtool';

export type BridgeMessageType =
  // Eventos de mods
  | 'mod_installed'
  | 'mod_uninstalled'
  | 'mod_updated'
  | 'mods_sync_request'
  | 'mods_sync_response'
  // Eventos de DLC
  | 'dlc_installed'
  | 'dlc_uninstalled'
  | 'dlc_updated'
  // Eventos de configuración
  | 'config_changed'
  | 'visual_config_changed'
  // Eventos de contenido
  | 'card_created'
  | 'card_updated'
  | 'card_deleted'
  | 'character_created'
  | 'character_updated'
  | 'character_deleted'
  | 'combo_created'
  | 'combo_updated'
  | 'combo_deleted'
  // Eventos de sincronización
  | 'sync_request'
  | 'sync_response'
  | 'sync_complete'
  // Eventos genéricos
  | 'ping'
  | 'pong'
  | 'error';

export interface BridgeMessage {
  type: BridgeMessageType;
  from: BridgeProgram;
  to?: BridgeProgram | 'broadcast';
  payload: any;
  timestamp: number;
  id: string;
}

export interface BridgeEventListener {
  (message: BridgeMessage): void;
}

// Almacén de listeners
const listeners = new Map<BridgeMessageType, Set<BridgeEventListener>>();

// Detecta si estamos en Tauri v2 (para persistencia en disco)
function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

/**
 * Suscribe un listener a un tipo de mensaje
 */
export function onBridgeMessage(type: BridgeMessageType, listener: BridgeEventListener): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(listener);

  // Devuelve función de desuscripción
  return () => {
    listeners.get(type)?.delete(listener);
  };
}

/**
 * Envía un mensaje a través del bridge
 */
export function emitBridgeMessage(message: Omit<BridgeMessage, 'timestamp' | 'id'>): void {
  const fullMessage: BridgeMessage = {
    ...message,
    timestamp: Date.now(),
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  // Llamar a los listeners suscritos a este tipo de mensaje.
  // (Los listeners se registran por tipo, así que esto cubre tanto
  //  mensajes dirigidos como broadcast sin duplicar llamadas.)
  const typeListeners = listeners.get(message.type);
  if (typeListeners) {
    typeListeners.forEach(listener => {
      try {
        listener(fullMessage);
      } catch (err) {
        console.error(`Error en listener de ${message.type}:`, err);
      }
    });
  }

  // Persistir en archivo para otros programas (si estamos en Tauri)
  if (isTauriRuntime()) {
    persistMessageToFile(fullMessage).catch(err => {
      console.warn('No se pudo persistir mensaje:', err);
    });
  }
}

/**
 * Persiste un mensaje en archivo para que otros programas lo lean
 */
async function persistMessageToFile(message: BridgeMessage): Promise<void> {
  if (!isTauriRuntime()) return;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('write_bridge_message', { message });
  } catch (err) {
    console.warn('Error persistiendo mensaje:', err);
  }
}

/**
 * Lee mensajes pendientes del bridge (desde archivos) y los elimina después de leerlos
 */
export async function readPendingBridgeMessages(): Promise<BridgeMessage[]> {
  if (!isTauriRuntime()) return [];

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const messages = await invoke<BridgeMessage[]>('read_bridge_messages');
    // Limpiar mensajes después de leerlos (ya los procesaremos)
    await invoke('clean_old_bridge_messages', { maxAgeMs: 0 }).catch(() => {});
    return messages;
  } catch (err) {
    console.warn('Error leyendo mensajes:', err);
    return [];
  }
}

/**
 * Procesa mensajes pendientes del bridge y los entrega a los listeners
 */
export async function pollBridgeMessages(): Promise<void> {
  const messages = await readPendingBridgeMessages();
  for (const message of messages) {
    // Entregar a los listeners registrados para este tipo
    const typeListeners = listeners.get(message.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(message);
        } catch (err) {
          console.error(`Error en listener de ${message.type}:`, err);
        }
      });
    }
  }
}

/**
 * Limpia mensajes antiguos del bridge
 */
export async function cleanOldBridgeMessages(maxAgeMs: number = 60000): Promise<void> {
  if (!isTauriRuntime()) return;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('clean_old_bridge_messages', { maxAgeMs });
  } catch (err) {
    console.warn('Error limpiando mensajes:', err);
  }
}
