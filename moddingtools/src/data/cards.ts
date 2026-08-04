// ============================================================
// CATÁLOGO BASE — vacío en DevBuild
// ============================================================
// DevBuild NO contiene datos hardcodeados. Todo el contenido
// (cartas, personajes, combos) se recolecta DEL JUEGO en vivo
// vía window.CARGAS_API (ver src/services/gameContent.ts).
//
// Estos arrays vacíos existen solo como fallback estructural
// cuando la app se ejecuta fuera del juego (modo standalone).
// ============================================================
import { CharacterCard, PlayableCard } from '../types/game';

export const characterCards: CharacterCard[] = [];
export const playableCards: PlayableCard[] = [];

export interface Combo {
  id: string;
  name: string;
  requiredCards: string[];
  description: string;
  effectDescription: string;
  isTeamCombo: boolean;
  bonusValue: number;
}

export const combos: Combo[] = [];

export const allBaseCards: PlayableCard[] = [];
export function getAllCharacters(): CharacterCard[] { return []; }
export function getAllCombos(): Combo[] { return []; }
