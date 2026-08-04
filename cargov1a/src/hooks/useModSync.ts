// ============================================================
// HOOK: useModSync — Sincronización de mods en multijugador
// ============================================================
// Verifica si el jugador local tiene TODOS los mods que usa el
// host de la sala. Es a nivel de SALA (todo o nada), no carta
// por carta.
//
// Reglas:
//   - Si faltan mods del host → no puedes iniciar la partida
//   - Instala los mods o pide al host que los desactive
//
// USO:
//   const { hasMissingMods, missingMods, canPlay } = useModSync();
// ============================================================

import { useMemo } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { getInstalledMods } from '../data/mods';

export function useModSync() {
  const network = useNetworkStore();
  const roomInfo = network.roomInfo;

  const installedMods = useMemo(() => getInstalledMods(), [roomInfo]);
  const installedModIds = useMemo(
    () => new Set(installedMods.map(m => m.manifest.id || m.manifest.name.toLowerCase().replace(/\s+/g, '_'))),
    [installedMods]
  );

  // Mods del host que el cliente NO tiene
  const missingMods = useMemo(() => {
    if (!roomInfo?.hostMods) return [];
    return roomInfo.hostMods
      .filter(hm => !installedModIds.has(hm.id))
      .map(hm => ({ id: hm.id, name: hm.name, required: true }));
  }, [roomInfo?.hostMods, installedModIds]);

  const hasMissingMods = missingMods.length > 0;

  // El cliente puede jugar solo si tiene todos los mods del host
  const canPlay = !hasMissingMods;

  // Verifica si un mod específico está disponible
  const isModAvailable = (modId: string): boolean => installedModIds.has(modId);

  return {
    missingMods,
    hasMissingMods,
    canPlay,
    isModAvailable,
    installedModsCount: installedMods.length,
    syncMods: network.syncMods,
    installMissingMods: network.installMissingMods,
  };
}
