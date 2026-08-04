import { readPersistedJSON, writePersistedJSON } from '../services/persistence';
// ============================================================
// REGISTROS EDITABLES — tags, efectos custom, habilidades, pasivas
// ============================================================
// Estos registros permiten AMPLIAR el juego base sin tocar código:
//   - Tags personalizados (para sinergias/pasivas)
//   - Definiciones de efectos custom (kind nuevos)
//   - Catálogo de habilidades reutilizables
//   - Catálogo de pasivas reutilizables
//
// Se persisten en disco compartido (clave compartida con el juego)
// para que CARGAS pueda leerlos al iniciar.
// ============================================================

const LS = {
  tags: 'cargas.customTags.v1',
  effects: 'cargas.customEffects.v1',
  abilities: 'cargas.abilityLibrary.v1',
  passives: 'cargas.passiveLibrary.v1',
  baseOverrides: 'cargas.baseOverrides.v1',
  mechanics: 'cargas.customMechanics.v1',
  ruleOverrides: 'cargas.ruleOverrides.v1',
};

function read<T>(key: string, fallback: T): T {
  return readPersistedJSON(key, fallback);
}
function write(key: string, value: any) { writePersistedJSON(key, value); }

// ─── TAGS ──────────────────────────────────────────────────
export const BUILTIN_TAGS = [
  'arco','flecha','ballesta','espada','melee','lanza','daga','veneno','fuego','polvora',
  'magia','hechizo','cura','pirata','ladron','bleed','regen','nature','sagrado','trampa',
  'robo','cementerio','stack','aoe','choice','control','execute','pierce','reflejo','tiempo',
  'hielo','rayo','sombra','tierra','vampiro','cazador','psiquico','dragon','cosmico','acido','oscuro',
];

export function getCustomTags(): string[] { return read<string[]>(LS.tags, []); }
export function getAllTags(): string[] { return Array.from(new Set([...BUILTIN_TAGS, ...getCustomTags()])); }
export function addCustomTag(tag: string): void {
  const t = tag.trim().toLowerCase().replace(/\s+/g, '_');
  if (!t || BUILTIN_TAGS.includes(t)) return;
  const cur = getCustomTags();
  if (!cur.includes(t)) write(LS.tags, [...cur, t]);
}
export function removeCustomTag(tag: string): void {
  write(LS.tags, getCustomTags().filter(t => t !== tag));
}

// ─── EFECTOS CUSTOM ────────────────────────────────────────
export interface CustomEffectDef {
  kind: string;          // identificador único (ej: 'teleport')
  label: string;
  icon: string;
  color: string;
  description: string;
  hasAmount: boolean;
  hasDuration: boolean;
  jsHandler?: string;    // código JS opcional (para CLI/avanzado)
}

export function getCustomEffects(): CustomEffectDef[] { return read<CustomEffectDef[]>(LS.effects, []); }
export function addCustomEffect(def: CustomEffectDef): void {
  const cur = getCustomEffects().filter(e => e.kind !== def.kind);
  write(LS.effects, [...cur, def]);
}
export function removeCustomEffect(kind: string): void {
  write(LS.effects, getCustomEffects().filter(e => e.kind !== kind));
}

// ─── HABILIDADES (librería) ────────────────────────────────
export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  category: 'instant' | 'end_turn' | 'defense' | 'buff_self';
  effect: 'damage' | 'heal' | 'defense' | 'buff' | 'debuff' | 'special';
  canTarget: 'self' | 'ally' | 'enemy' | 'any' | 'ally_or_self';
  isTeamAbility: boolean;
}

export function getAbilityLibrary(): AbilityDef[] { return read<AbilityDef[]>(LS.abilities, []); }
export function addAbilityDef(def: AbilityDef): void {
  const cur = getAbilityLibrary().filter(a => a.id !== def.id);
  write(LS.abilities, [...cur, def]);
}
export function removeAbilityDef(id: string): void {
  write(LS.abilities, getAbilityLibrary().filter(a => a.id !== id));
}

// ─── PASIVAS (librería) ────────────────────────────────────
export interface PassiveDef {
  id: string;
  name: string;
  description: string;
  scope: 'individual' | 'team';
  trigger: 'on_attack' | 'on_damage_taken' | 'start_of_turn' | 'always';
  tagFilter?: string;     // se activa con cartas de este tag
  value?: number;
}

export function getPassiveLibrary(): PassiveDef[] { return read<PassiveDef[]>(LS.passives, []); }
export function addPassiveDef(def: PassiveDef): void {
  const cur = getPassiveLibrary().filter(p => p.id !== def.id);
  write(LS.passives, [...cur, def]);
}
export function removePassiveDef(id: string): void {
  write(LS.passives, getPassiveLibrary().filter(p => p.id !== id));
}

// ─── OVERRIDES DEL JUEGO BASE ──────────────────────────────
// Modificaciones aplicadas a cartas/personajes base sin perder el original.
export interface BaseOverrides {
  cards: Record<string, any>;       // cardId → patch
  characters: Record<string, any>;  // charId → patch
  deletedCards: string[];
  deletedCharacters: string[];
}

const CARGAS_BASE_OVERRIDES_KEY = 'cargas.baseOverrides.v1';

const EMPTY_BASE_OVERRIDES: BaseOverrides = {
  cards: {},
  characters: {},
  deletedCards: [],
  deletedCharacters: [],
};

function readCargasBaseOverrides(): BaseOverrides {
  return readPersistedJSON<BaseOverrides>(CARGAS_BASE_OVERRIDES_KEY, EMPTY_BASE_OVERRIDES);
}

function writeCargasBaseOverrides(value: BaseOverrides): void {
  writePersistedJSON(CARGAS_BASE_OVERRIDES_KEY, value);
  try {
    write(LS.baseOverrides, value);
  } catch {}
}

export function getBaseOverrides(): BaseOverrides {
  return readCargasBaseOverrides();
}
export function setCardOverride(cardId: string, patch: any): void {
  const o = getBaseOverrides();
  o.cards[cardId] = { ...(o.cards[cardId] || {}), ...patch };
  writeCargasBaseOverrides(o);
}
export function setCharacterOverride(charId: string, patch: any): void {
  const o = getBaseOverrides();
  o.characters[charId] = { ...(o.characters[charId] || {}), ...patch };
  writeCargasBaseOverrides(o);
}
export function deleteBaseCard(cardId: string): void {
  const o = getBaseOverrides();
  if (!o.deletedCards.includes(cardId)) o.deletedCards.push(cardId);
  writeCargasBaseOverrides(o);
}
export function restoreBaseCard(cardId: string): void {
  const o = getBaseOverrides();
  o.deletedCards = o.deletedCards.filter(id => id !== cardId);
  delete o.cards[cardId];
  writeCargasBaseOverrides(o);
}
export function resetAllOverrides(): void {
  writeCargasBaseOverrides({ cards: {}, characters: {}, deletedCards: [], deletedCharacters: [] });
}

// ─── MECÁNICAS NUEVAS (lo que distingue a un modder) ───────
// Define reglas/mecánicas que el juego NO tiene de fábrica.
// El juego CARGAS las lee y, si soporta el `hook`, las activa.
export interface MechanicDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Punto del juego donde engancha la mecánica */
  hook: 'on_turn_start' | 'on_turn_end' | 'on_card_played' | 'on_damage' | 'on_death' | 'on_game_start' | 'passive_global' | 'custom';
  /** Código JS del modder (se ejecuta en el motor del juego) */
  script: string;
  /** Parámetros configurables expuestos al jugador */
  params?: { key: string; label: string; value: number }[];
  enabled: boolean;
}

export function getCustomMechanics(): MechanicDef[] { return read<MechanicDef[]>(LS.mechanics, []); }
export function addMechanic(def: MechanicDef): void {
  const cur = getCustomMechanics().filter(m => m.id !== def.id);
  write(LS.mechanics, [...cur, def]);
}
export function removeMechanic(id: string): void {
  write(LS.mechanics, getCustomMechanics().filter(m => m.id !== id));
}
export function toggleMechanic(id: string): void {
  write(LS.mechanics, getCustomMechanics().map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
}

// ─── OVERRIDES DE REGLAS GLOBALES (modding agresivo) ───────
// Sobrescribe GameRules del juego: crítico, cartas por turno, etc.
export function getRuleOverrides(): Record<string, any> { return read<Record<string, any>>(LS.ruleOverrides, {}); }
export function setRuleOverride(key: string, value: any): void {
  const o = getRuleOverrides(); o[key] = value; write(LS.ruleOverrides, o);
}
export function clearRuleOverride(key: string): void {
  const o = getRuleOverrides(); delete o[key]; write(LS.ruleOverrides, o);
}

// ─── EXPORT TOTAL (para CLI / backup) ──────────────────────
export function exportAllRegistries() {
  return {
    customTags: getCustomTags(),
    customEffects: getCustomEffects(),
    abilityLibrary: getAbilityLibrary(),
    passiveLibrary: getPassiveLibrary(),
    baseOverrides: getBaseOverrides(),
    customMechanics: getCustomMechanics(),
    ruleOverrides: getRuleOverrides(),
  };
}
export function importAllRegistries(data: any) {
  if (data.customTags) write(LS.tags, data.customTags);
  if (data.customEffects) write(LS.effects, data.customEffects);
  if (data.abilityLibrary) write(LS.abilities, data.abilityLibrary);
  if (data.passiveLibrary) write(LS.passives, data.passiveLibrary);
  if (data.baseOverrides) writeCargasBaseOverrides(data.baseOverrides);
  if (data.customMechanics) write(LS.mechanics, data.customMechanics);
  if (data.ruleOverrides) write(LS.ruleOverrides, data.ruleOverrides);
}
