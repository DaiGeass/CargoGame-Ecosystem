// ============================================================
// CARGAS passive runtime
// Ejecuta passives[] y teamPassives[] de personajes editor/mod/base
// ============================================================

import { getAllCharactersWithSource } from '../data/contentRegistry';

export type RuntimePassiveTiming =
  | 'always'
  | 'start_of_turn'
  | 'end_of_turn'
  | 'on_damage_dealt'
  | 'on_damage_taken'
  | 'on_heal'
  | 'on_combo';

const n = (value: any, fallback = 0): number => {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
};

const sid = (value: any): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'passive';

function passiveTiming(passive: any): RuntimePassiveTiming {
  return (passive?.timing || passive?.passiveTiming || 'always') as RuntimePassiveTiming;
}

function passiveScope(passive: any, kind: 'passive' | 'teamPassive'): 'self' | 'team' | 'global' {
  if (passive?.scope) return passive.scope;
  return kind === 'teamPassive' ? 'team' : 'self';
}

function passiveEffect(passive: any): string {
  return String(
    passive?.effect ||
    passive?.kind ||
    (n(passive?.healing, 0) > 0 ? 'heal' : '') ||
    (n(passive?.defense, 0) !== 0 ? 'defense' : '') ||
    (n(passive?.damage, 0) > 0 ? 'damage' : '') ||
    'buff'
  );
}

function passiveId(owner: any, target: any, passive: any, timing: string): string {
  return `rt_passive:${timing}:${owner?.id}:${target?.id}:${sid(passive?.id || passive?.name)}`;
}

function readCharacterForPlayer(player: any): any | null {
  const chars = getAllCharactersWithSource();
  return chars.find((c: any) => c.id === player?.characterId) || null;
}

function readPassivesForOwner(owner: any): Array<{ passive: any; kind: 'passive' | 'teamPassive' }> {
  const char = readCharacterForPlayer(owner);
  if (!char) return [];

  const own = Array.isArray((char as any).passives)
    ? (char as any).passives.map((p: any) => ({ passive: p, kind: 'passive' as const }))
    : [];

  const team = Array.isArray((char as any).teamPassives)
    ? (char as any).teamPassives.map((p: any) => ({ passive: p, kind: 'teamPassive' as const }))
    : [];

  return [...own, ...team];
}

function targetsForPassive(state: any, owner: any, passive: any, kind: 'passive' | 'teamPassive'): any[] {
  const players = Array.isArray(state?.players) ? state.players : [];
  const alive = players.filter((p: any) => p?.isAlive);
  const scope = passiveScope(passive, kind);

  if (scope === 'global') return alive;

  if (scope === 'team') {
    if (state?.gameMode === 'teams') {
      return alive.filter((p: any) => p.id === owner.id || p.teamId === owner.teamId);
    }

    return alive.filter((p: any) => p.id === owner.id);
  }

  return alive.filter((p: any) => p.id === owner.id);
}

function hasMark(target: any, id: string): boolean {
  return Array.isArray(target?.activeEffects) &&
    target.activeEffects.some((e: any) => e?.id === id || (e?.specialRules === 'runtime_passive_mark' && e?.id === id));
}

function buildMark(id: string, owner: any, target: any, passive: any): any {
  return {
    id,
    name: `🔒 ${passive?.name || 'Pasiva'}`,
    value: 0,
    timing: 'immediate',
    duration: 999,
    stacks: 1,
    sourcePlayerId: owner.id,
    targetPlayerId: target.id,
    isStackable: false,
    ignoresDefense: false,
    description: passive?.description || 'Pasiva permanente',
    specialRules: 'runtime_passive_mark',
  };
}

function applyAlwaysPassiveToTarget(target: any, owner: any, passive: any, id: string): any {
  if (hasMark(target, id)) return target;

  const damage = n(passive?.damage, 0);
  const healing = n(passive?.healing ?? passive?.heal, 0);
  const defense = n(passive?.defense ?? passive?.defenseChange, 0);

  const next = { ...target };

  if (damage > 0) {
    next.baseDamage = Math.max(0, n(next.baseDamage, 0) + damage);
  }

  if (defense !== 0) {
    next.baseDefense = Math.max(0, n(next.baseDefense, 0) + defense);
    next.currentDefense = Math.max(0, n(next.currentDefense, 0) + defense);
  }

  if (healing > 0) {
    next.maxHp = Math.max(1, n(next.maxHp, 1) + healing);
    next.currentHp = Math.min(next.maxHp, n(next.currentHp, 0) + healing);
  }

  next.activeEffects = [...(Array.isArray(next.activeEffects) ? next.activeEffects : []), buildMark(id, owner, target, passive)];

  return next;
}

function applyTimedPassiveToTarget(target: any, owner: any, passive: any, timing: RuntimePassiveTiming, get: any): any {
  const effect = passiveEffect(passive);
  const damage = Math.abs(n(passive?.damage ?? passive?.value, 0));
  const healing = Math.abs(n(passive?.healing ?? passive?.heal, 0));
  const defense = n(passive?.defense ?? passive?.defenseChange, 0);
  const ignoresDefense = Boolean(passive?.ignoresDefense);

  let next = { ...target };

  if (damage > 0 && effect === 'damage') {
    const finalDamage = ignoresDefense ? damage : Math.max(0, damage - n(next.currentDefense, 0));
    next.currentHp = Math.max(0, n(next.currentHp, 0) - finalDamage);

    get()?.log?.(`🔒 ${passive?.name || 'Pasiva'}: -${finalDamage} HP → ${next.name}`, 'damage');
    get()?.addStat?.(owner.id, 'damageDealt', finalDamage);
    get()?.addStat?.(next.id, 'damageReceived', finalDamage);
  }

  if (healing > 0 && (effect === 'heal' || effect === 'buff')) {
    const before = n(next.currentHp, 0);
    next.currentHp = Math.min(n(next.maxHp, before), before + healing);
    const finalHeal = Math.max(0, next.currentHp - before);

    if (finalHeal > 0) {
      get()?.log?.(`🔒 ${passive?.name || 'Pasiva'}: +${finalHeal} HP → ${next.name}`, 'heal');
      get()?.addStat?.(owner.id, 'healDone', finalHeal);
      get()?.addStat?.(next.id, 'healReceived', finalHeal);
    }
  }

  if (defense !== 0 && (effect === 'defense' || effect === 'buff' || effect === 'debuff')) {
    next.currentDefense = Math.max(0, n(next.currentDefense, 0) + defense);
    next.activeEffects = [
      ...(Array.isArray(next.activeEffects) ? next.activeEffects : []),
      {
        id: `rt_passive_fx:${timing}:${owner.id}:${next.id}:${sid(passive?.id || passive?.name)}:${Date.now()}`,
        name: `🔒 ${passive?.name || 'Pasiva'}`,
        value: defense,
        timing: 'immediate',
        duration: Math.max(1, n(passive?.duration, 1)),
        stacks: 1,
        sourcePlayerId: owner.id,
        targetPlayerId: next.id,
        isStackable: false,
        ignoresDefense: false,
        description: passive?.description || '',
        specialRules: 'runtime_passive_defense',
      },
    ];

    get()?.log?.(`🔒 ${passive?.name || 'Pasiva'}: ${defense > 0 ? '+' : ''}${defense} DEF → ${next.name}`, defense > 0 ? 'defense' : 'debuff');
  }

  return next;
}

let runtimePassiveEventDepth = 0;

export function applyRuntimePassiveEvent(
  set: any,
  get: any,
  timing: RuntimePassiveTiming,
  ownerId?: string
): void {
  if (runtimePassiveEventDepth > 0) return;

  runtimePassiveEventDepth++;

  try {
    applyRuntimeCharacterPassives(set, get, timing, ownerId);
  } finally {
    runtimePassiveEventDepth--;
  }
}

export function applyRuntimeCharacterPassives(
  set: any,
  get: any,
  timing: RuntimePassiveTiming,
  ownerId?: string
): void {
  const state = get();
  const players = Array.isArray(state?.players) ? state.players : [];

  const owners = players.filter((p: any) =>
    p?.isAlive &&
    (!ownerId || p.id === ownerId)
  );

  if (!owners.length) return;

  let changed = false;
  let nextPlayers = players;

  for (const owner of owners) {
    const passives = readPassivesForOwner(owner);

    for (const entry of passives) {
      const passive = entry.passive || {};
      const pTiming = passiveTiming(passive);

      if (pTiming !== timing) continue;

      const targets = targetsForPassive({ ...state, players: nextPlayers }, owner, passive, entry.kind);

      for (const target of targets) {
        const markId = passiveId(owner, target, passive, timing);

        nextPlayers = nextPlayers.map((p: any) => {
          if (p.id !== target.id) return p;

          changed = true;

          if (timing === 'always') {
            return applyAlwaysPassiveToTarget(p, owner, passive, markId);
          }

          return applyTimedPassiveToTarget(p, owner, passive, timing, get);
        });
      }
    }
  }

  if (changed) {
    set({ players: nextPlayers });
  }
}
