// ============================================================
// 🧩 REGISTRO MODULAR DE PANELES DEL MENÚ (para mods / DLC)
// ============================================================
// Permite que mods y DLCs añadan sus PROPIAS pestañas al menú de
// configuración (GameSetupModal) sin modificar el componente.
//
// ════════════════════════════════════════════════════════════
// 🛠️ CÓMO AÑADIR UNA PESTAÑA NUEVA (desde un mod o el código base)
// ════════════════════════════════════════════════════════════
//
//   import { registerMenuPanel } from './data/menuRegistry';
//   import { MiPanel } from './MiPanel';
//
//   registerMenuPanel({
//     id: 'mi_panel',
//     label: '🎁 Mi DLC',
//     order: 50,                 // posición (menor = más a la izquierda)
//     component: MiPanel,        // componente React a renderizar
//   });
//
// El menú leerá automáticamente todos los paneles registrados.
// ════════════════════════════════════════════════════════════

import React from 'react';

export interface MenuPanel {
  /** Identificador único de la pestaña */
  id: string;
  /** Texto/emoji visible en la pestaña */
  label: string;
  /** Orden de aparición (menor = primero). Default: 100 */
  order?: number;
  /** Componente React que se renderiza al abrir la pestaña */
  component: React.ComponentType<any>;
  /** Si true, solo aparece cuando hay mods instalados */
  requiresMods?: boolean;
}

// Registro interno (privado)
const registeredPanels: MenuPanel[] = [];

/**
 * Registra un panel/pestaña nuevo en el menú de configuración.
 * Los mods llaman esto al cargarse.
 */
export function registerMenuPanel(panel: MenuPanel): void {
  // Evitar duplicados por id
  const existing = registeredPanels.findIndex(p => p.id === panel.id);
  if (existing >= 0) {
    registeredPanels[existing] = panel;
  } else {
    registeredPanels.push(panel);
  }
}

/**
 * Devuelve todos los paneles registrados, ordenados por `order`.
 */
export function getMenuPanels(): MenuPanel[] {
  return [...registeredPanels].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

/**
 * Elimina un panel del registro (útil al desinstalar un mod).
 */
export function unregisterMenuPanel(id: string): void {
  const idx = registeredPanels.findIndex(p => p.id === id);
  if (idx >= 0) registeredPanels.splice(idx, 1);
}
