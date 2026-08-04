import { readPersistedJSON, writePersistedJSON } from '../services/persistence';
// ============================================================
// TOTAL CONVERSION — sistemas avanzados para crear "otro juego"
// ============================================================
// Modos de juego, status effects, fases de turno, economía,
// condiciones de victoria, tableros, IA de bots, keywords y UI.
// Todo persistido en storage compartido con CARGAS.
// ============================================================

const LS = {
  gameModes: 'cargas.gameModes.v1',
  statusEffects: 'cargas.statusEffects.v1',
  turnPhases: 'cargas.turnPhases.v1',
  resources: 'cargas.resources.v1',
  winConditions: 'cargas.winConditions.v1',
  boards: 'cargas.boards.v1',
  aiProfiles: 'cargas.aiProfiles.v1',
  keywords: 'cargas.keywords.v1',
  uiTheme: 'cargas.uiTheme.v1',
  meta: 'cargas.modMeta.v1',
};

function read<T>(key: string, fallback: T): T {
  return readPersistedJSON(key, fallback);
}
function write(key: string, value: any) { writePersistedJSON(key, value); }
function uid(p: string) { return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`; }

// ─── MODOS DE JUEGO ────────────────────────────────────────
export interface GameModeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  teams: boolean;
  startingHp: number;
  startingHand: number;
  deckSize: number;
  turnTimeSecs: number;
  permadeath: boolean;
  reviveAllowed: boolean;
  enabled: boolean;
}
export function getGameModes(): GameModeDef[] { return read(LS.gameModes, []); }
export function addGameMode(d: Partial<GameModeDef>): GameModeDef {
  const def: GameModeDef = { id: d.id || uid('mode'), name: d.name || 'Modo', icon: d.icon || '🎮', description: d.description || '', minPlayers: d.minPlayers ?? 2, maxPlayers: d.maxPlayers ?? 4, teams: !!d.teams, startingHp: d.startingHp ?? 3000, startingHand: d.startingHand ?? 7, deckSize: d.deckSize ?? 40, turnTimeSecs: d.turnTimeSecs ?? 30, permadeath: !!d.permadeath, reviveAllowed: d.reviveAllowed ?? true, enabled: true };
  write(LS.gameModes, [...getGameModes().filter(m => m.id !== def.id), def]); return def;
}
export function removeGameMode(id: string) { write(LS.gameModes, getGameModes().filter(m => m.id !== id)); }

// ─── STATUS EFFECTS CUSTOM ─────────────────────────────────
export interface StatusEffectDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: 'buff' | 'debuff' | 'neutral';
  stackable: boolean;
  maxStacks: number;
  tickTiming: 'start_of_turn' | 'end_of_turn' | 'none';
  tickValue: number;          // daño(-)/cura(+) por turno
  blocksAction: boolean;      // como stun/silence
  description: string;
}
export function getStatusEffects(): StatusEffectDef[] { return read(LS.statusEffects, []); }
export function addStatusEffect(d: Partial<StatusEffectDef>): StatusEffectDef {
  const def: StatusEffectDef = { id: d.id || uid('status'), name: d.name || 'Estado', icon: d.icon || '✨', color: d.color || '#a855f7', kind: d.kind || 'debuff', stackable: !!d.stackable, maxStacks: d.maxStacks ?? 1, tickTiming: d.tickTiming || 'start_of_turn', tickValue: d.tickValue ?? 0, blocksAction: !!d.blocksAction, description: d.description || '' };
  write(LS.statusEffects, [...getStatusEffects().filter(s => s.id !== def.id), def]); return def;
}
export function removeStatusEffect(id: string) { write(LS.statusEffects, getStatusEffects().filter(s => s.id !== id)); }

// ─── FASES DE TURNO ────────────────────────────────────────
export interface TurnPhaseDef { id: string; name: string; icon: string; order: number; autoSkip: boolean; description: string; }
export function getTurnPhases(): TurnPhaseDef[] { return read<TurnPhaseDef[]>(LS.turnPhases, []).sort((a, b) => a.order - b.order); }
export function addTurnPhase(d: Partial<TurnPhaseDef>): TurnPhaseDef {
  const def: TurnPhaseDef = { id: d.id || uid('phase'), name: d.name || 'Fase', icon: d.icon || '⏳', order: d.order ?? getTurnPhases().length, autoSkip: !!d.autoSkip, description: d.description || '' };
  write(LS.turnPhases, [...getTurnPhases().filter(p => p.id !== def.id), def]); return def;
}
export function removeTurnPhase(id: string) { write(LS.turnPhases, getTurnPhases().filter(p => p.id !== id)); }

// ─── RECURSOS / ECONOMÍA ───────────────────────────────────
export interface ResourceDef { id: string; name: string; icon: string; color: string; startValue: number; perTurnGain: number; maxValue: number; description: string; }
export function getResources(): ResourceDef[] { return read(LS.resources, []); }
export function addResource(d: Partial<ResourceDef>): ResourceDef {
  const def: ResourceDef = { id: d.id || uid('res'), name: d.name || 'Recurso', icon: d.icon || '💎', color: d.color || '#06b6d4', startValue: d.startValue ?? 0, perTurnGain: d.perTurnGain ?? 1, maxValue: d.maxValue ?? 10, description: d.description || '' };
  write(LS.resources, [...getResources().filter(r => r.id !== def.id), def]); return def;
}
export function removeResource(id: string) { write(LS.resources, getResources().filter(r => r.id !== id)); }

// ─── CONDICIONES DE VICTORIA ───────────────────────────────
export interface WinConditionDef {
  id: string; name: string; icon: string;
  type: 'last_standing' | 'hp_threshold' | 'resource_amount' | 'survive_turns' | 'cards_played' | 'custom';
  value: number;
  script?: string;
  description: string;
  enabled: boolean;
}
export function getWinConditions(): WinConditionDef[] { return read(LS.winConditions, []); }
export function addWinCondition(d: Partial<WinConditionDef>): WinConditionDef {
  const def: WinConditionDef = { id: d.id || uid('win'), name: d.name || 'Victoria', icon: d.icon || '🏆', type: d.type || 'last_standing', value: d.value ?? 0, script: d.script, description: d.description || '', enabled: true };
  write(LS.winConditions, [...getWinConditions().filter(w => w.id !== def.id), def]); return def;
}
export function removeWinCondition(id: string) { write(LS.winConditions, getWinConditions().filter(w => w.id !== id)); }

// ─── TABLEROS / ARENAS ─────────────────────────────────────
export interface BoardDef { id: string; name: string; icon: string; bgImage: string | null; bgColor: string; lanes: number; slots: number; description: string; }
export function getBoards(): BoardDef[] { return read(LS.boards, []); }
export function addBoard(d: Partial<BoardDef>): BoardDef {
  const def: BoardDef = { id: d.id || uid('board'), name: d.name || 'Arena', icon: d.icon || '🗺️', bgImage: d.bgImage ?? null, bgColor: d.bgColor || '#0f172a', lanes: d.lanes ?? 1, slots: d.slots ?? 0, description: d.description || '' };
  write(LS.boards, [...getBoards().filter(b => b.id !== def.id), def]); return def;
}
export function removeBoard(id: string) { write(LS.boards, getBoards().filter(b => b.id !== id)); }

// ─── PERFILES DE IA ────────────────────────────────────────
export interface AIProfileDef { id: string; name: string; icon: string; aggression: number; defense: number; combo: number; risk: number; targetPriority: 'lowest_hp' | 'highest_hp' | 'random' | 'most_dangerous'; description: string; }
export function getAIProfiles(): AIProfileDef[] { return read(LS.aiProfiles, []); }
export function addAIProfile(d: Partial<AIProfileDef>): AIProfileDef {
  const def: AIProfileDef = { id: d.id || uid('ai'), name: d.name || 'IA', icon: d.icon || '🤖', aggression: d.aggression ?? 50, defense: d.defense ?? 50, combo: d.combo ?? 50, risk: d.risk ?? 50, targetPriority: d.targetPriority || 'lowest_hp', description: d.description || '' };
  write(LS.aiProfiles, [...getAIProfiles().filter(a => a.id !== def.id), def]); return def;
}
export function removeAIProfile(id: string) { write(LS.aiProfiles, getAIProfiles().filter(a => a.id !== id)); }

// ─── KEYWORDS (palabras clave de cartas, estilo TCG) ───────
export interface KeywordDef { id: string; word: string; icon: string; color: string; rules: string; }
export function getKeywords(): KeywordDef[] { return read(LS.keywords, []); }
export function addKeyword(d: Partial<KeywordDef>): KeywordDef {
  const def: KeywordDef = { id: d.id || uid('kw'), word: d.word || 'Keyword', icon: d.icon || '🔑', color: d.color || '#f59e0b', rules: d.rules || '' };
  write(LS.keywords, [...getKeywords().filter(k => k.id !== def.id), def]); return def;
}
export function removeKeyword(id: string) { write(LS.keywords, getKeywords().filter(k => k.id !== id)); }

// ─── TEMA DE UI GLOBAL (reskin del juego) ──────────────────
export interface UITheme {
  bgPrimary: string; accent: string; danger: string; success: string;
  fontHeading: string; borderRadius: string; cardScale: number; animations: boolean;
}
export const DEFAULT_UI_THEME: UITheme = { bgPrimary: '#020617', accent: '#f43f5e', danger: '#ef4444', success: '#22c55e', fontHeading: 'sans-serif', borderRadius: '12px', cardScale: 1, animations: true };
export function getUITheme(): UITheme { return read(LS.uiTheme, DEFAULT_UI_THEME); }
export function setUITheme(patch: Partial<UITheme>) { write(LS.uiTheme, { ...getUITheme(), ...patch }); }

// ─── METADATA DEL MOD/TOTAL CONVERSION ─────────────────────
export interface ModMeta { title: string; author: string; version: string; description: string; banner: string | null; isTotalConversion: boolean; }
export const DEFAULT_META: ModMeta = { title: 'Mi Total Conversion', author: '', version: '1.0.0', description: '', banner: null, isTotalConversion: false };
export function getModMeta(): ModMeta { return read(LS.meta, DEFAULT_META); }
export function setModMeta(patch: Partial<ModMeta>) { write(LS.meta, { ...getModMeta(), ...patch }); }

// ─── EXPORT/IMPORT TOTAL CONVERSION ────────────────────────
export function exportTotalConversion() {
  return {
    meta: getModMeta(), gameModes: getGameModes(), statusEffects: getStatusEffects(),
    turnPhases: getTurnPhases(), resources: getResources(), winConditions: getWinConditions(),
    boards: getBoards(), aiProfiles: getAIProfiles(), keywords: getKeywords(), uiTheme: getUITheme(),
  };
}
export function importTotalConversion(d: any) {
  if (d.meta) write(LS.meta, d.meta);
  if (d.gameModes) write(LS.gameModes, d.gameModes);
  if (d.statusEffects) write(LS.statusEffects, d.statusEffects);
  if (d.turnPhases) write(LS.turnPhases, d.turnPhases);
  if (d.resources) write(LS.resources, d.resources);
  if (d.winConditions) write(LS.winConditions, d.winConditions);
  if (d.boards) write(LS.boards, d.boards);
  if (d.aiProfiles) write(LS.aiProfiles, d.aiProfiles);
  if (d.keywords) write(LS.keywords, d.keywords);
  if (d.uiTheme) write(LS.uiTheme, d.uiTheme);
}

export function totalConversionStats() {
  return {
    gameModes: getGameModes().length, statusEffects: getStatusEffects().length,
    turnPhases: getTurnPhases().length, resources: getResources().length,
    winConditions: getWinConditions().length, boards: getBoards().length,
    aiProfiles: getAIProfiles().length, keywords: getKeywords().length,
  };
}
