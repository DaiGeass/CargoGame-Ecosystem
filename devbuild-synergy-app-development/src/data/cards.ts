// ============================================================
// CATÁLOGO BASE — VACÍO POR DISEÑO
// ============================================================
// DevBuild NO incluye datos de ejemplo. Todo el contenido se
// RECOLECTA del juego en vivo (window.CARGAS_API) o de las
// carpetas mods/ y dlc/ en la ruta de instalación.
//
// Estos arrays vacíos solo existen como fallback de tipos para
// que el editor funcione aunque el juego aún no esté conectado.
// ============================================================
import { CharacterCard, PlayableCard } from '../types/game';

export interface Combo {
  id: string;
  name: string;
  requiredCards: string[];
  description: string;
  effectDescription: string;
  isTeamCombo: boolean;
  bonusValue: number;
}

// Vacíos: el contenido real viene del juego.
export const characterCards: CharacterCard[] = [];
export const playableCards: PlayableCard[] = [];
export const combos: Combo[] = [];

export const allBaseCards: PlayableCard[] = [];
export function getAllCharacters(): CharacterCard[] { return characterCards; }
export function getAllCombos(): Combo[] { return combos; }
