// ============================================================
// CONTENT API - API pública de acceso total al contenido
// ============================================================
// Esta es la API CENTRAL que DevTool y ModdingTool usarán para
// leer y modificar TODO el contenido del juego:
//   - Cartas base, de mods y de DLC
//   - Personajes base, de mods y de DLC
//   - Combos
//   - Modificaciones al juego base
//
// El juego expone esta API en window.CARGAS_API para que las
// herramientas externas (o la consola de desarrollo) puedan
// interactuar con el contenido de forma controlada.
//
// 🔌 INTEGRACIÓN FUTURA:
//   DevTool/ModdingTool podrán:
//   1. Leer todo el contenido vía contentAPI.getAll*()
//   2. Crear/editar/borrar contenido vía contentAPI.*()
//   3. Recibir notificaciones de cambios vía el bridge
// ============================================================

import { PlayableCard, CharacterCard } from '../types/game';
import {
  getAllCardsWithSource,
  getAllCharactersWithSource,
  getAllCombosWithSource,
  getContentSourceSummary,
  SourcedCard,
  SourcedCharacter,
  SourcedCombo,
} from '../data/contentRegistry';
import {
  getInstalledMods,
  installModFromFile,
  uninstallMod,
  LoadedMod,
} from '../data/mods';
import { getCardTheme, getAllThemes, registerCardTheme } from '../utils/cardThemes';
import { evalFormula } from '../utils/formulas';
import { emitBridgeMessage } from './bridge';

// ─── Permisos de acceso ─────────────────────────────────────
// Define qué puede hacer cada origen con el contenido.
export type AccessLevel = 'read' | 'write' | 'full';

export interface ContentAPIConfig {
  /** Quién está usando la API */
  source: 'game' | 'devtool' | 'moddingtool' | 'console';
  /** Nivel de acceso concedido */
  access: AccessLevel;
}

let apiConfig: ContentAPIConfig = { source: 'game', access: 'full' };

export function configureContentAPI(config: ContentAPIConfig): void {
  apiConfig = config;
  console.log(`[ContentAPI] Configurada para ${config.source} (acceso: ${config.access})`);
}

function requireWrite(): void {
  if (apiConfig.access === 'read') {
    throw new Error('[ContentAPI] Operación de escritura denegada: acceso de solo lectura');
  }
}

// ════════════════════════════════════════════════════════════
// LECTURA - Acceso total a todo el contenido
// ════════════════════════════════════════════════════════════

export const contentAPI = {
  // ─── Metadata ──
  version: '1.0.0',
  getConfig: (): ContentAPIConfig => ({ ...apiConfig }),

  // ─── CARTAS ──
  /** Todas las cartas con su origen (base/mod/dlc) */
  getAllCards: (): SourcedCard[] => getAllCardsWithSource(),
  /** Cartas filtradas por origen */
  getCardsBySource: (sourceId: string): SourcedCard[] =>
    getAllCardsWithSource().filter(c => c.__sourceId === sourceId),
  /** Una carta por su id base */
  getCard: (baseId: string): SourcedCard | undefined =>
    getAllCardsWithSource().find(c => c.id.split('__')[0] === baseId),

  // ─── PERSONAJES ──
  getAllCharacters: (): SourcedCharacter[] => getAllCharactersWithSource(),
  getCharactersBySource: (sourceId: string): SourcedCharacter[] =>
    getAllCharactersWithSource().filter(c => c.__sourceId === sourceId),
  getCharacter: (id: string): SourcedCharacter | undefined =>
    getAllCharactersWithSource().find(c => c.id === id),

  // ─── COMBOS ──
  getAllCombos: (): SourcedCombo[] => getAllCombosWithSource(),

  // ─── FUENTES (base/mod/dlc) ──
  getSourceSummary: () => getContentSourceSummary(),
  getInstalledMods: (): LoadedMod[] => getInstalledMods(),

  // ─── TEMAS ──
  getCardTheme,
  getAllThemes,

  // ─── UTILIDADES ──
  /** Evalúa una fórmula matemática (para preview en DevTool) */
  evalFormula,

  // ════════════════════════════════════════════════════════
  // ESCRITURA - Para DevTool y ModdingTool
  // ════════════════════════════════════════════════════════

  /** Instala un mod desde un archivo (.json/.zip/.cargasmod) */
  async installMod(file: File): Promise<LoadedMod> {
    requireWrite();
    const mod = await installModFromFile(file);
    emitBridgeMessage({
      type: 'mod_installed',
      from: apiConfig.source as any,
      to: 'broadcast',
      payload: { modId: mod.manifest.id, modName: mod.manifest.name },
    });
    return mod;
  },

  /** Desinstala un mod por id */
  uninstallMod(modId: string): void {
    requireWrite();
    uninstallMod(modId);
    emitBridgeMessage({
      type: 'mod_uninstalled',
      from: apiConfig.source as any,
      to: 'broadcast',
      payload: { modId },
    });
  },

  /** Registra un tema de carta nuevo (para mods/dlc) */
  registerTheme(key: string, theme: Parameters<typeof registerCardTheme>[1]): void {
    requireWrite();
    registerCardTheme(key, theme);
  },

  /** Notifica que se creó contenido (DevTool/ModdingTool lo usan) */
  notifyContentCreated(kind: 'card' | 'character' | 'combo', data: any): void {
    requireWrite();
    emitBridgeMessage({
      type: `${kind}_created` as any,
      from: apiConfig.source as any,
      to: 'broadcast',
      payload: data,
    });
  },

  /** Valida un objeto de carta (para ModdingTool antes de guardar) */
  validateCard(card: Partial<PlayableCard>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!card.id) errors.push('Falta el id');
    if (!card.name) errors.push('Falta el nombre');
    if (!card.type) errors.push('Falta el tipo');
    if (card.formula) {
      try {
        // Validar fórmula con un contexto dummy
        evalFormula(card.formula.expression, {} as any);
      } catch {
        errors.push(`Fórmula inválida: ${card.formula.expression}`);
      }
    }
    return { valid: errors.length === 0, errors };
  },

  /** Valida un objeto de personaje */
  validateCharacter(char: Partial<CharacterCard>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!char.id) errors.push('Falta el id');
    if (!char.name) errors.push('Falta el nombre');
    if (!char.abilities || char.abilities.length === 0) errors.push('Faltan habilidades');
    if (typeof char.hp !== 'number') errors.push('HP inválido');
    return { valid: errors.length === 0, errors };
  },
};

// ─── Exponer la API globalmente para herramientas externas ──
// DevTool/ModdingTool y la consola del navegador pueden usar
// window.CARGAS_API para acceder a todo el contenido.
export function exposeContentAPI(): void {
  if (typeof window !== 'undefined') {
    (window as any).CARGAS_API = contentAPI;
    console.log('[ContentAPI] Expuesta en window.CARGAS_API');
  }
}

export type { SourcedCard, SourcedCharacter, SourcedCombo };
