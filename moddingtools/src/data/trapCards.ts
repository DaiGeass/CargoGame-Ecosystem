// ============================================================
// CARTAS TRAMPA — vacío en DevBuild
// ============================================================
// Los handlers de efectos custom (revive_from_graveyard,
// robo_selectivo, etc.) los registra el JUEGO al cargarse,
// no DevBuild.
// ============================================================
import { PlayableCard } from '../types/game';

export const trapCards: PlayableCard[] = [];
