import React, { useEffect, useMemo, useState } from 'react';
import {
  AbilityDef,
  AbilityEffect,
  AbilityKind,
  AbilityTarget,
  cleanAbilityDef,
  deleteAbilityDef,
  exportAbilityLibraryJson,
  loadAbilityLibrary,
  saveAbilityDef,
  seedExampleAbilities,
} from '../services/abilityLibrary';

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500';

const panelCls =
  'rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3 shadow-xl shadow-black/20';

const emptyAbility = (): AbilityDef =>
  cleanAbilityDef({
    name: 'Nueva habilidad',
    description: 'Describe qué hace esta habilidad.',
    icon: '⚡',
    kind: 'active',
    effect: 'damage',
    target: 'enemy',
    damage: 100,
    healing: 0,
    defense: 0,
    cooldown: 0,
    effects: [],
  });

const kindLabel: Record<string, string> = {
  active: '⚡ Activa individual',
  team_active: '👥 Activa de equipo',
  passive: '🔒 Pasiva individual',
  team_passive: '🛡️ Pasiva de equipo',
};

const effectLabel: Record<string, string> = {
  damage: 'Daño',
  heal: 'Curación',
  defense: 'Defensa/Escudo',
  buff: 'Buff',
  debuff: 'Debuff',
  special: 'Especial',
};

const targetLabel: Record<string, string> = {
  enemy: 'Enemigo',
  ally: 'Aliado',
  self: 'Yo mismo',
  ally_or_self: 'Aliado o yo',
  all_enemies: 'Todos enemigos',
  all_allies: 'Todos aliados',
  all_allies_no_self: 'Aliados sin yo',
  none: 'Sin objetivo',
};

const effectKindLabel: Record<string, string> = {
  damage: '💥 Daño',
  heal: '💚 Curar',
  defense_buff: '🛡️ Defensa',
  armor_break: '🪓 Romper armadura',
  dot: '☣️ Daño por turno',
  hot: '🌿 Cura por turno',
  lifesteal: '🩸 Robo de vida',
  cleanse: '✨ Limpiar debuffs',
  dispel: '🧹 Disipar buffs',
  overheal: '💖 Sobrecuración',
  restore_original_hp: '🫀 Restaurar HP original',
  stun: '😵 Aturdir',
  silence: '🤐 Silenciar',
  execute: '☠️ Ejecutar',
  buff_self: '💪 Buff propio',
  debuff: '🧿 Debuff',
};

const EFFECT_KIND_OPTIONS = [
  'damage',
  'heal',
  'defense_buff',
  'armor_break',
  'dot',
  'hot',
  'lifesteal',
  'cleanse',
  'dispel',
  'overheal',
  'restore_original_hp',
  'stun',
  'silence',
  'execute',
  'buff_self',
  'debuff',
];

const EFFECT_TARGET_OPTIONS = [
  'enemy',
  'ally',
  'self',
  'ally_or_self',
  'all_enemies',
  'all_allies',
  'all_allies_no_self',
  'none',
];

const PRESETS: Array<{ label: string; patch: Partial<AbilityDef>; effect: any }> = [
  {
    label: '💥 Daño enemigo',
    patch: { effect: 'damage' as AbilityEffect, target: 'enemy' as AbilityTarget, damage: 100 },
    effect: { kind: 'damage', target: 'enemy', amount: 100 },
  },
  {
    label: '☄️ Daño a todos',
    patch: { effect: 'damage' as AbilityEffect, target: 'all_enemies' as AbilityTarget, damage: 80 },
    effect: { kind: 'damage', target: 'all_enemies', amount: 80 },
  },
  {
    label: '💚 Curar aliado',
    patch: { effect: 'heal' as AbilityEffect, target: 'ally_or_self' as AbilityTarget, healing: 120 },
    effect: { kind: 'heal', target: 'ally_or_self', amount: 120 },
  },
  {
    label: '🌊 Curar equipo',
    patch: { effect: 'heal' as AbilityEffect, target: 'all_allies' as AbilityTarget, healing: 80 },
    effect: { kind: 'heal', target: 'all_allies', amount: 80 },
  },
  {
    label: '🛡️ Defensa propia',
    patch: { effect: 'defense' as AbilityEffect, target: 'self' as AbilityTarget, defense: 50 },
    effect: { kind: 'defense_buff', target: 'self', amount: 50, duration: 2 },
  },
  {
    label: '🪓 Romper armadura',
    patch: { effect: 'debuff' as AbilityEffect, target: 'enemy' as AbilityTarget },
    effect: { kind: 'armor_break', target: 'enemy', amount: 30, duration: 2 },
  },
  {
    label: '✨ Limpiar equipo',
    patch: { effect: 'buff' as AbilityEffect, target: 'all_allies' as AbilityTarget },
    effect: { kind: 'cleanse', target: 'all_allies' },
  },
  {
    label: '🧹 Disipar enemigo',
    patch: { effect: 'debuff' as AbilityEffect, target: 'enemy' as AbilityTarget },
    effect: { kind: 'dispel', target: 'enemy' },
  },
  {
    label: '💖 Sobrecuración',
    patch: { effect: 'heal' as AbilityEffect, target: 'ally_or_self' as AbilityTarget, healing: 150 },
    effect: { kind: 'overheal', target: 'ally_or_self', amount: 150, overhealLimitPct: 150 },
  },
  {
    label: '☣️ Veneno',
    patch: { effect: 'debuff' as AbilityEffect, target: 'enemy' as AbilityTarget },
    effect: { kind: 'dot', target: 'enemy', amount: 25, duration: 3, ignoresDefense: true, stackKey: 'poison' },
  },
];

function safeEffects(input: any): any[] {
  return Array.isArray(input) ? input.filter(Boolean) : [];
}

function normalizeEffect(effect: any): any {
  const out = {
    kind: effect?.kind || 'damage',
    target: effect?.target || 'enemy',
    amount: Number(effect?.amount ?? effect?.value ?? 0) || 0,
    duration: Number(effect?.duration || 0) || 0,
    ignoresDefense: Boolean(effect?.ignoresDefense),
    stackKey: String(effect?.stackKey || ''),
    overhealLimitPct: Number(effect?.overhealLimitPct || 0) || undefined,
  } as any;

  if (!out.stackKey) delete out.stackKey;
  if (!out.duration) delete out.duration;
  if (!out.amount && !['cleanse', 'dispel', 'restore_original_hp', 'execute', 'stun', 'silence'].includes(out.kind)) {
    out.amount = 0;
  }
  if (!out.overhealLimitPct) delete out.overhealLimitPct;
  if (!out.ignoresDefense) delete out.ignoresDefense;

  return out;
}

function effectSummary(effect: any): string {
  const parts = [
    effectKindLabel[effect.kind] || effect.kind || 'effect',
    targetLabel[effect.target] || effect.target,
    Number(effect.amount || 0) ? `valor ${effect.amount}` : null,
    Number(effect.duration || 0) ? `${effect.duration}t` : null,
    effect.ignoresDefense ? 'ignora DEF' : null,
    effect.stackKey ? `stack ${effect.stackKey}` : null,
  ].filter(Boolean);

  return parts.join(' · ');
}

export const AbilityBuilderStudio: React.FC = () => {
  const [library, setLibrary] = useState<AbilityDef[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [ability, setAbility] = useState<AbilityDef>(() => emptyAbility());
  const [status, setStatus] = useState('');
  const [importJson, setImportJson] = useState('');
  const [effectsJson, setEffectsJson] = useState('[]');

  const counts = useMemo(() => ({
    total: library.length,
    active: library.filter(x => x.kind === 'active').length,
    teamActive: library.filter(x => x.kind === 'team_active').length,
    passive: library.filter(x => x.kind === 'passive').length,
    teamPassive: library.filter(x => x.kind === 'team_passive').length,
    fx: library.filter(x => safeEffects(x.effects).length > 0).length,
  }), [library]);

  const refresh = async () => {
    const items = await loadAbilityLibrary();
    setLibrary(items);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setEffectsJson(JSON.stringify(safeEffects(ability.effects), null, 2));
  }, [ability.id, ability.effects]);

  const update = (patch: Partial<AbilityDef>) => {
    setAbility(prev => cleanAbilityDef({ ...prev, ...patch }));
  };

  const replaceEffects = (effects: any[]) => {
    update({ effects: safeEffects(effects).map(normalizeEffect) } as any);
  };

  const addEffect = (effect: any = {}) => {
    replaceEffects([...(ability.effects || []), normalizeEffect(effect)]);
  };

  const updateEffect = (index: number, patch: any) => {
    replaceEffects((ability.effects || []).map((fx: any, i: number) =>
      i === index ? normalizeEffect({ ...fx, ...patch }) : fx
    ));
  };

  const removeEffect = (index: number) => {
    replaceEffects((ability.effects || []).filter((_: any, i: number) => i !== index));
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setAbility(prev => cleanAbilityDef({
      ...prev,
      ...preset.patch,
      effects: [...safeEffects(prev.effects), normalizeEffect(preset.effect)],
    }));
    setStatus(`Preset agregado: ${preset.label}`);
  };

  const selectAbility = (id: string) => {
    setSelectedId(id);
    const found = library.find(x => x.id === id);
    if (found) setAbility(cleanAbilityDef(found));
  };

  const save = async () => {
    const saved = await saveAbilityDef(ability);
    setAbility(saved);
    setSelectedId(saved.id);
    await refresh();
    setStatus(`Guardada: ${saved.id}`);
  };

  const remove = async () => {
    if (!selectedId) return;
    await deleteAbilityDef(selectedId);
    setSelectedId('');
    setAbility(emptyAbility());
    await refresh();
    setStatus('Eliminada.');
  };

  const seed = async () => {
    await seedExampleAbilities();
    await refresh();
    setStatus('Ejemplos cargados.');
  };

  const exportJson = async () => {
    const json = await exportAbilityLibraryJson();
    setImportJson(json);
    try {
      await navigator.clipboard?.writeText(json);
      setStatus('Biblioteca exportada y copiada.');
    } catch {
      setStatus('Biblioteca exportada en el cuadro JSON.');
    }
  };

  const importAbility = async () => {
    try {
      const parsed = JSON.parse(importJson);
      if (Array.isArray(parsed)) {
        for (const item of parsed) await saveAbilityDef(item);
        setStatus(`Importadas: ${parsed.length}`);
      } else if (Array.isArray(parsed?.abilities)) {
        for (const item of parsed.abilities) await saveAbilityDef(item);
        setStatus(`Importadas: ${parsed.abilities.length}`);
      } else if (parsed?.abilities && typeof parsed.abilities === 'object') {
        const vals = Object.values(parsed.abilities);
        for (const item of vals as any[]) await saveAbilityDef(item);
        setStatus(`Importadas: ${vals.length}`);
      } else {
        const saved = await saveAbilityDef(parsed);
        setAbility(saved);
        setSelectedId(saved.id);
        setStatus(`Importada: ${saved.id}`);
      }
      await refresh();
    } catch (err: any) {
      setStatus(`JSON inválido: ${err?.message || err}`);
    }
  };

  const applyEffectsJson = () => {
    try {
      const parsed = JSON.parse(effectsJson);
      if (!Array.isArray(parsed)) throw new Error('effects debe ser un arreglo []');
      replaceEffects(parsed);
      setStatus(`effects[] aplicado: ${parsed.length}`);
    } catch (err: any) {
      setStatus(`effects[] inválido: ${err?.message || err}`);
    }
  };

  const fxCount = safeEffects(ability.effects).length;

  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-cyan-300">🎯 Habilidades v2</h2>
          <p className="text-xs text-slate-400">
            Editor compartido para CARGAS. Ahora incluye motor visual de effects[].
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setAbility(emptyAbility()); setSelectedId(''); }} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black hover:bg-slate-700">
            ➕ Nueva
          </button>
          <button onClick={seed} className="rounded-xl bg-amber-700 px-3 py-2 text-xs font-black hover:bg-amber-600">
            🌱 Ejemplos
          </button>
          <button onClick={save} className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black hover:bg-cyan-600">
            💾 Guardar habilidad
          </button>
          <button onClick={remove} disabled={!selectedId} className="rounded-xl bg-red-900/70 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-40">
            🗑️ Borrar
          </button>
        </div>
      </div>

      {status && (
        <div className="rounded-xl border border-cyan-700/40 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100">
          {status}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[0.7rem] font-black">
        <span className="rounded-lg bg-slate-800 px-2 py-1">Total: {counts.total}</span>
        <span className="rounded-lg bg-blue-950/50 px-2 py-1 text-blue-200">Activas: {counts.active}</span>
        <span className="rounded-lg bg-green-950/50 px-2 py-1 text-green-200">Equipo: {counts.teamActive}</span>
        <span className="rounded-lg bg-fuchsia-950/50 px-2 py-1 text-fuchsia-200">Pasivas: {counts.passive}</span>
        <span className="rounded-lg bg-emerald-950/50 px-2 py-1 text-emerald-200">Pasivas equipo: {counts.teamPassive}</span>
        <span className="rounded-lg bg-purple-950/50 px-2 py-1 text-purple-200">FX: {counts.fx}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.4fr]">
        <div className={panelCls}>
          <div className="mb-2 text-sm font-black text-slate-200">📚 Biblioteca</div>
          <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            {library.map(item => (
              <button
                key={item.id}
                onClick={() => selectAbility(item.id)}
                className={[
                  'w-full rounded-xl border p-2 text-left transition',
                  selectedId === item.id
                    ? 'border-cyan-400 bg-cyan-950/40'
                    : 'border-slate-700 bg-slate-950/40 hover:border-slate-500',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-white">
                      {item.icon || '🎯'} {item.name}
                    </div>
                    <div className="mt-1 text-[0.65rem] text-slate-400">
                      {kindLabel[item.kind]} · {effectLabel[item.effect] || item.effect}
                    </div>
                  </div>

                  {safeEffects(item.effects).length > 0 && (
                    <span className="rounded-full bg-purple-950 px-2 py-1 text-[0.6rem] font-black text-purple-200">
                      FX {safeEffects(item.effects).length}
                    </span>
                  )}
                </div>
              </button>
            ))}

            {!library.length && (
              <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
                No hay habilidades guardadas.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className={panelCls}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-black text-cyan-200">⚙️ Datos base</div>
                <div className="text-[0.65rem] text-slate-500">
                  Estos campos siguen funcionando con el motor clásico.
                </div>
              </div>
              <span className="rounded-full bg-purple-950 px-2 py-1 text-[0.65rem] font-black text-purple-200">
                effects[]: {fxCount}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Nombre</span>
                <input value={ability.name} onChange={e => update({ name: e.target.value })} className={inputCls} />
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Icono</span>
                <input value={ability.icon || ''} onChange={e => update({ icon: e.target.value })} className={inputCls} />
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Tipo</span>
                <select value={ability.kind} onChange={e => update({ kind: e.target.value as AbilityKind })} className={inputCls}>
                  <option value="active">⚡ Activa individual</option>
                  <option value="team_active">👥 Activa de equipo</option>
                  <option value="passive">🔒 Pasiva individual</option>
                  <option value="team_passive">🛡️ Pasiva de equipo</option>
                </select>
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Efecto simple</span>
                <select value={ability.effect} onChange={e => update({ effect: e.target.value as AbilityEffect })} className={inputCls}>
                  <option value="damage">Daño</option>
                  <option value="heal">Curación</option>
                  <option value="defense">Defensa/Escudo</option>
                  <option value="buff">Buff</option>
                  <option value="debuff">Debuff</option>
                  <option value="special">Especial</option>
                </select>
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Objetivo</span>
                <select value={ability.target} onChange={e => update({ target: e.target.value as AbilityTarget })} className={inputCls}>
                  {Object.entries(targetLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Cooldown</span>
                <input type="number" value={ability.cooldown} onChange={e => update({ cooldown: +e.target.value })} className={inputCls} />
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Daño simple</span>
                <input type="number" value={ability.damage} onChange={e => update({ damage: +e.target.value })} className={inputCls} />
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Curación simple</span>
                <input type="number" value={ability.healing} onChange={e => update({ healing: +e.target.value })} className={inputCls} />
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Defensa simple</span>
                <input type="number" value={ability.defense} onChange={e => update({ defense: +e.target.value })} className={inputCls} />
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-slate-400">Timing pasiva</span>
                <select value={ability.passiveTiming || 'always'} onChange={e => update({ passiveTiming: e.target.value as any })} className={inputCls}>
                  <option value="always">Siempre</option>
                  <option value="start_of_turn">Inicio de turno</option>
                  <option value="end_of_turn">Fin de turno</option>
                  <option value="on_damage_dealt">Al hacer daño</option>
                  <option value="on_damage_taken">Al recibir daño</option>
                  <option value="on_heal">Al curar</option>
                  <option value="on_combo">Al combo</option>
                </select>
              </label>

              <label className="text-xs md:col-span-2">
                <span className="mb-1 block text-slate-400">Descripción</span>
                <textarea value={ability.description} onChange={e => update({ description: e.target.value })} className={`${inputCls} min-h-[4rem]`} />
              </label>
            </div>
          </div>

          <div className={panelCls}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-black text-purple-200">🧬 Effects[] visual</div>
                <div className="text-[0.65rem] text-slate-500">
                  Estos efectos los ejecuta CARGAS desde useAbility() con applyEffects().
                </div>
              </div>

              <button onClick={() => addEffect()} className="rounded-xl bg-purple-700 px-3 py-2 text-xs font-black hover:bg-purple-600">
                ➕ Añadir efecto
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-2 py-1 text-[0.65rem] font-bold text-slate-200 hover:border-purple-500 hover:text-purple-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {safeEffects(ability.effects).map((fx: any, index: number) => (
                <div key={index} className="rounded-2xl border border-purple-800/40 bg-purple-950/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs font-black text-purple-100">
                      FX {index + 1}: {effectSummary(fx)}
                    </div>
                    <button onClick={() => removeEffect(index)} className="rounded-lg bg-red-950 px-2 py-1 text-[0.65rem] font-black text-red-200 hover:bg-red-900">
                      🗑️
                    </button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-6">
                    <label className="text-[0.65rem] md:col-span-2">
                      <span className="mb-1 block text-slate-400">Kind</span>
                      <select value={fx.kind || 'damage'} onChange={e => updateEffect(index, { kind: e.target.value })} className={inputCls}>
                        {EFFECT_KIND_OPTIONS.map(kind => (
                          <option key={kind} value={kind}>{effectKindLabel[kind] || kind}</option>
                        ))}
                      </select>
                    </label>

                    <label className="text-[0.65rem] md:col-span-2">
                      <span className="mb-1 block text-slate-400">Target</span>
                      <select value={fx.target || 'enemy'} onChange={e => updateEffect(index, { target: e.target.value })} className={inputCls}>
                        {EFFECT_TARGET_OPTIONS.map(target => (
                          <option key={target} value={target}>{targetLabel[target] || target}</option>
                        ))}
                      </select>
                    </label>

                    <label className="text-[0.65rem]">
                      <span className="mb-1 block text-slate-400">Amount</span>
                      <input type="number" value={Number(fx.amount || 0)} onChange={e => updateEffect(index, { amount: +e.target.value })} className={inputCls} />
                    </label>

                    <label className="text-[0.65rem]">
                      <span className="mb-1 block text-slate-400">Duración</span>
                      <input type="number" value={Number(fx.duration || 0)} onChange={e => updateEffect(index, { duration: +e.target.value })} className={inputCls} />
                    </label>

                    <label className="text-[0.65rem] md:col-span-2">
                      <span className="mb-1 block text-slate-400">Stack key</span>
                      <input value={fx.stackKey || ''} onChange={e => updateEffect(index, { stackKey: e.target.value })} className={inputCls} />
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-[0.65rem] md:col-span-2">
                      <input type="checkbox" checked={Boolean(fx.ignoresDefense)} onChange={e => updateEffect(index, { ignoresDefense: e.target.checked })} />
                      Ignora defensa
                    </label>

                    <label className="text-[0.65rem] md:col-span-2">
                      <span className="mb-1 block text-slate-400">Overheal limit %</span>
                      <input type="number" value={Number(fx.overhealLimitPct || 0)} onChange={e => updateEffect(index, { overhealLimitPct: +e.target.value })} className={inputCls} />
                    </label>
                  </div>
                </div>
              ))}

              {!fxCount && (
                <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
                  Sin effects[]. Usa un preset o añade un efecto manual.
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-black text-slate-300">JSON effects[]</div>
                <textarea
                  value={effectsJson}
                  onChange={e => setEffectsJson(e.target.value)}
                  className={`${inputCls} min-h-[12rem] font-mono`}
                />
                <button onClick={applyEffectsJson} className="mt-2 rounded-xl bg-purple-700 px-3 py-2 text-xs font-black hover:bg-purple-600">
                  Aplicar JSON effects[]
                </button>
              </div>

              <div>
                <div className="mb-1 text-xs font-black text-slate-300">Preview habilidad completa</div>
                <pre className="max-h-[14rem] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-3 text-[0.62rem] text-slate-300">
                  {JSON.stringify(ability, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          <div className={panelCls}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-black text-amber-200">📦 Importar / Exportar biblioteca</div>
              <div className="flex gap-2">
                <button onClick={exportJson} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black hover:bg-slate-700">
                  ⬇️ Exportar
                </button>
                <button onClick={importAbility} className="rounded-xl bg-emerald-800 px-3 py-2 text-xs font-black hover:bg-emerald-700">
                  ⬆️ Importar
                </button>
              </div>
            </div>
            <textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder="Pega aquí una habilidad, un array de habilidades o el JSON completo de la biblioteca."
              className={`${inputCls} min-h-[8rem] font-mono`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbilityBuilderStudio;
