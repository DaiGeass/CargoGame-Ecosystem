// ============================================================
// DEFINICIONES DE COMPORTAMIENTO DE HABILIDADES
// ============================================================
// Cada habilidad pertenece a una CATEGORÍA que determina CUÁNDO
// y CÓMO se aplica su efecto:
//
//   'instant'    → Se aplica inmediatamente al usarla (durante el turno)
//   'end_turn'   → Se acumula y se aplica al FINAL del turno del jugador
//   'defense'    → Es una habilidad reactiva: se "arma" y se dispara
//                  cuando el jugador recibe daño (no se usa proactivamente)
//   'buff_self'  → Buff propio inmediato (def/dmg/regen)
//
// 🛠️ PARA MODDERS: añade aquí la definición de tu habilidad nueva.
// Si una habilidad no está en este mapa, se asume 'instant'.
// ============================================================

export type AbilityCategory = 'instant' | 'end_turn' | 'defense' | 'buff_self' | 'passive';

export type AbilityTargetMode =
  | 'self'
  | 'enemy'
  | 'ally'
  | 'any';

export type AbilityArea =
  | 'single'
  | 'all_enemies'
  | 'all_allies'
  | 'all_allies_or_self';

export interface AbilityBehavior {
  category: AbilityCategory;
  // Tipo de efecto principal
  effect: 'damage' | 'heal' | 'defense' | 'buff' | 'debuff' | 'special';
  // Descripción legible de cuándo actúa
  timingLabel: string;

  // Campos opcionales para DevBuild/ModdingBuild:
  // si no existen, el juego infiere desde canTarget/descripción/nombre.
  targetMode?: AbilityTargetMode;
  area?: AbilityArea;
  ignoresDefense?: boolean;
  reflectAtEnd?: boolean;
  passive?: boolean;
}

// ─── Mapa de comportamientos por nombre de habilidad ──────────
// Clave = nombre EXACTO de la habilidad (de cards.ts)
export const ABILITY_BEHAVIORS: Record<string, AbilityBehavior> = {
  // ── DEFENSA (reactivas: se disparan al recibir daño) ──
  'Muro de Acero':        { category: 'defense', effect: 'defense', timingLabel: '🛡️ Reactiva (al recibir daño)' },
  'Escudo Protector':     { category: 'defense', effect: 'defense', timingLabel: '🛡️ Reactiva (al recibir daño)' },
  'Sigilo Avanzado':      { category: 'defense', effect: 'special', timingLabel: '💨 Reactiva (evade 1 ataque)' },
  'Camuflaje Natural':    { category: 'defense', effect: 'special', timingLabel: '💨 Reactiva (evade daño)' },
  'Guardián de la Cruz':  { category: 'defense', effect: 'special', timingLabel: '💨 Reactiva (evade aliado)' },
  'Retaguardia Segura':   { category: 'defense', effect: 'special', timingLabel: '💨 Reactiva (evade aliados)' },
  'Humo':                 { category: 'defense', effect: 'special', timingLabel: '👻 Reactiva (invulnerable 1t)' },
  'Escudo Sagrado':       { category: 'defense', effect: 'defense', timingLabel: '🛡️ Reactiva (mitiga + refleja)' },
  'Kōsokudō':             { category: 'defense', effect: 'special', timingLabel: '⚔️ Reactiva (refleja 100)' },

  // ── BUFF PROPIO (inmediato, dura varios turnos) ──
  'Grito de Guerra':      { category: 'buff_self', effect: 'buff', timingLabel: '💪 Inmediato (buff propio)' },
  'Barrera de Acero':     { category: 'buff_self', effect: 'defense', timingLabel: '🛡️ Inmediato (+def propio)' },
  'Fortificación':        { category: 'buff_self', effect: 'defense', timingLabel: '🛡️ Inmediato (+def 2t)' },
  'Furia de Batalla':     { category: 'buff_self', effect: 'buff', timingLabel: '🔥 Inmediato (+dmg 3t)' },
  'Furia Desatada':       { category: 'buff_self', effect: 'buff', timingLabel: '🔥 Inmediato (+dmg, +daño recibido)' },
  'Precisión Aumentada':  { category: 'buff_self', effect: 'buff', timingLabel: '🎯 Inmediato (+50% próx)' },
  'Golpe Sigiloso':       { category: 'buff_self', effect: 'buff', timingLabel: '🎯 Inmediato (+50% próx)' },
  'Sombra Asesina':       { category: 'buff_self', effect: 'buff', timingLabel: '👻 Inmediato (invisible +atk)' },
  'Experto Pólvora':      { category: 'buff_self', effect: 'buff', timingLabel: '💥 Inmediato (+dmg próx)' },
  'Corte Mortal':         { category: 'buff_self', effect: 'buff', timingLabel: '⚔️ Inmediato (x2 dmg 2t)' },
  'Resistencia Desafiante': { category: 'buff_self', effect: 'defense', timingLabel: '🛡️ Inmediato (-50% daño 2t)' },
  'Escudo Arcano':        { category: 'buff_self', effect: 'defense', timingLabel: '🔮 Inmediato (-50% daño 2t)' },
  'Tetsu no Kōtei':       { category: 'buff_self', effect: 'defense', timingLabel: '🛡️ Inmediato (+def + refleja)' },
  'Baluarte Divino':      { category: 'buff_self', effect: 'defense', timingLabel: '🛡️ Inmediato (+def 3t)' },
  'Rezo de Fortaleza':    { category: 'buff_self', effect: 'heal', timingLabel: '✨ Inmediato (+HP +def)' },
  'Táctica Guerrilla':    { category: 'buff_self', effect: 'defense', timingLabel: '🛡️ Inmediato (-50% daño 1t)' },
  'Determinación Implacable': { category: 'buff_self', effect: 'special', timingLabel: '✨ Inmediato (ignora efectos)' },

  // ── FIN DE TURNO (se aplican al terminar el turno) ──
  'Veneno Rápido':        { category: 'end_turn', effect: 'damage', timingLabel: '🌙 Al final del turno (veneno)' },
  'Espada Infinita':      { category: 'end_turn', effect: 'damage', timingLabel: '🌙 Al final del turno' },
  'Tormenta en Alta Mar': { category: 'end_turn', effect: 'damage', timingLabel: '🌙 Al final (daño a todos)' },
  'Rayo de Energía':      { category: 'end_turn', effect: 'damage', timingLabel: '🌙 Al final (daño a todos)' },
  'Corte de Sombras':     { category: 'end_turn', effect: 'damage', timingLabel: '🌙 Al final (daño a todos)' },

  // ── CURACIÓN INMEDIATA ──
  'Voluntad de Hierro':   { category: 'instant', effect: 'heal', timingLabel: '💚 Inmediato (cura)' },
  'Sanación Mística':     { category: 'instant', effect: 'heal', timingLabel: '💚 Inmediato (cura)' },
  'Toque Curativo':       { category: 'instant', effect: 'heal', timingLabel: '💚 Inmediato (cura)' },
  'Botiquín de Campo':    { category: 'instant', effect: 'heal', timingLabel: '💚 Inmediato (cura aliados)' },
  'Aura Curativa':        { category: 'end_turn', effect: 'heal', timingLabel: '🌙 Al final (regen aliados)' },
  'La Cura':              { category: 'instant', effect: 'heal', timingLabel: '💚 Inmediato (cura + limpia)' },
  'Aura Regeneración':    { category: 'end_turn', effect: 'heal', timingLabel: '🌙 Al final (regen aliados)' },
  'Gloria Comunitaria':   { category: 'instant', effect: 'heal', timingLabel: '💚 Inmediato (cura aliados)' },
};

/**
 * Obtiene el comportamiento de una habilidad por su nombre.
 * Si no está definido, devuelve 'instant'/'damage' por defecto.
 */
export function getAbilityBehavior(abilityName: string): AbilityBehavior {
  return ABILITY_BEHAVIORS[abilityName] || { category: 'instant', effect: 'damage', timingLabel: '⚡ Inmediato' };
}
