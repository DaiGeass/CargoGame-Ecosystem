import React, { useState } from 'react';
import { CardEffect, CardEffectKind, EFFECT_KIND_LABELS, TargetSelector } from '../types/effects';
import { CardSynergy } from '../types/game';
import { getCustomEffects, addCustomEffect, removeCustomEffect, getAllTags } from '../data/registries';
import { EmojiInput } from './inputs/AssetInput';
import { ColorPicker } from './inputs/ColorPicker';

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-500';
const EFFECT_KINDS = Object.keys(EFFECT_KIND_LABELS) as CardEffectKind[];
const TARGETS: TargetSelector[] = ['self','enemy','ally','all_enemies','all_allies','random_enemy','lowest_hp_enemy','highest_hp_enemy'];

export const EffectSynergyBuilder: React.FC = () => {
  const [tab, setTab] = useState<'effect' | 'synergy'>('effect');
  return (
    <div className="space-y-3">
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-black text-emerald-300 mb-1">⚡ Constructor de Efectos y Sinergias</h3>
        <p className="text-xs text-slate-400">Crea efectos personalizados (kind nuevos) y sinergias condicionales con sus efectos. Por GUI aquí, o por CLI con <code>effect.add</code>.</p>
      </div>
      <div className="flex gap-1">
        <button onClick={() => setTab('effect')} className={`flex-1 text-xs font-bold py-2 rounded-lg ${tab === 'effect' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>⚡ Efecto custom</button>
        <button onClick={() => setTab('synergy')} className={`flex-1 text-xs font-bold py-2 rounded-lg ${tab === 'synergy' ? 'bg-fuchsia-600 text-white' : 'bg-slate-800 text-slate-400'}`}>🔗 Sinergia con efectos</button>
      </div>
      {tab === 'effect' ? <EffectTab /> : <SynergyTab />}
    </div>
  );
};

// ─── Crear EFECTO custom (kind nuevo) ──────────────────────
const EffectTab: React.FC = () => {
  const [kind, setKind] = useState('');
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('⚙️');
  const [color, setColor] = useState('#22c55e');
  const [desc, setDesc] = useState('');
  const [hasAmount, setHasAmount] = useState(true);
  const [hasDuration, setHasDuration] = useState(false);
  const [, force] = useState(0);
  const list = getCustomEffects();

  const save = () => {
    if (!kind.trim() || !label.trim()) return;
    addCustomEffect({ kind: kind.toLowerCase().replace(/\s+/g, '_'), label, icon, color, description: desc, hasAmount, hasDuration });
    setKind(''); setLabel(''); setDesc(''); force(n => n + 1);
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={kind} onChange={e => setKind(e.target.value)} placeholder="kind (ej: teleport)" className={inputCls} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Etiqueta visible" className={inputCls} />
        </div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción del efecto" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <EmojiInput value={icon} onChange={setIcon} label="Icono" />
          <ColorPicker value={color} onChange={setColor} label="Color" />
        </div>
        <div className="flex gap-4 text-xs text-slate-300">
          <label className="flex items-center gap-1"><input type="checkbox" checked={hasAmount} onChange={e => setHasAmount(e.target.checked)} /> usa cantidad</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={hasDuration} onChange={e => setHasDuration(e.target.checked)} /> usa duración</label>
        </div>
        <button onClick={save} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black py-2 rounded-lg">💾 Registrar efecto custom</button>
        <div className="text-[0.6rem] text-slate-500">⚠️ Para que el efecto haga algo real en el juego, registra su handler con <code>registerEffectHandler('{kind || 'kind'}', ...)</code> en un mod JS.</div>
      </div>
      <div className="space-y-1.5">
        {list.map(e => (
          <div key={e.kind} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-800">
            <span className="text-lg">{e.icon}</span>
            <div className="flex-1"><div className="text-xs font-bold text-white">{e.label} <code className="text-[0.6rem] text-slate-500">{e.kind}</code></div><div className="text-[0.6rem] text-slate-500">{e.description}</div></div>
            <button onClick={() => { removeCustomEffect(e.kind); force(n => n + 1); }} className="text-red-400 text-sm">🗑️</button>
          </div>
        ))}
        {list.length === 0 && <div className="text-xs text-slate-500 text-center py-3">Sin efectos custom todavía.</div>}
      </div>
    </div>
  );
};

// ─── Crear SINERGIA con efectos (exportable a JSON) ────────
const SynergyTab: React.FC = () => {
  const [syn, setSyn] = useState<CardSynergy>({ condition: { targetHasTag: '' }, bonusDamage: 20 });
  const [effects, setEffects] = useState<CardEffect[]>([]);
  const tags = getAllTags();

  const addEffect = () => setEffects([...effects, { kind: 'damage', amount: 20, target: 'enemy' }]);
  const setEffect = (i: number, patch: Partial<CardEffect>) => setEffects(effects.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const removeEffect = (i: number) => setEffects(effects.filter((_, idx) => idx !== i));

  const result = {
    synergy: syn,
    appliedEffects: effects,
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'synergy.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const copyJson = () => navigator.clipboard?.writeText(JSON.stringify(result, null, 2));

  return (
    <div className="space-y-3">
      {/* condición */}
      <div className="bg-slate-900 rounded-xl p-3 border border-fuchsia-900/50 space-y-2">
        <div className="text-xs font-black text-fuchsia-300">SI (condición)</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[0.65rem] text-slate-400">Objetivo tiene tag
            <select value={syn.condition.targetHasTag || ''} onChange={e => setSyn({ ...syn, condition: { ...syn.condition, targetHasTag: e.target.value || undefined } })} className={inputCls + ' mt-1'}>
              <option value="">—</option>
              {tags.map(t => <option key={t} value={t}>#{t}</option>)}
            </select>
          </label>
          <label className="text-[0.65rem] text-slate-400">Estado objetivo
            <select value={syn.condition.targetStatus || ''} onChange={e => setSyn({ ...syn, condition: { ...syn.condition, targetStatus: (e.target.value || undefined) as any } })} className={inputCls + ' mt-1'}>
              <option value="">—</option>
              {['has_dots','low_hp','high_def','stunned','silenced'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="text-[0.65rem] text-slate-400">Atacante tiene tag
            <select value={syn.condition.attackerHasTag || ''} onChange={e => setSyn({ ...syn, condition: { ...syn.condition, attackerHasTag: e.target.value || undefined } })} className={inputCls + ' mt-1'}>
              <option value="">—</option>
              {tags.map(t => <option key={t} value={t}>#{t}</option>)}
            </select>
          </label>
          <label className="text-[0.65rem] text-slate-400">Cartas jugadas ≥
            <input type="number" value={syn.condition.cardsPlayedThisTurn ?? ''} onChange={e => setSyn({ ...syn, condition: { ...syn.condition, cardsPlayedThisTurn: e.target.value === '' ? undefined : +e.target.value } })} className={inputCls + ' mt-1'} />
          </label>
        </div>
      </div>

      {/* bonus */}
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        <div className="text-xs font-black text-emerald-300">ENTONCES (bonus simple)</div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[0.65rem] text-slate-400">+ Daño<input type="number" value={syn.bonusDamage ?? ''} onChange={e => setSyn({ ...syn, bonusDamage: e.target.value === '' ? undefined : +e.target.value })} className={inputCls + ' mt-1'} /></label>
          <label className="text-[0.65rem] text-slate-400">+ Cura<input type="number" value={syn.bonusHeal ?? ''} onChange={e => setSyn({ ...syn, bonusHeal: e.target.value === '' ? undefined : +e.target.value })} className={inputCls + ' mt-1'} /></label>
          <label className="text-[0.65rem] text-slate-400">+ Defensa<input type="number" value={syn.bonusDefense ?? ''} onChange={e => setSyn({ ...syn, bonusDefense: e.target.value === '' ? undefined : +e.target.value })} className={inputCls + ' mt-1'} /></label>
        </div>
      </div>

      {/* efectos aplicados */}
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-cyan-300">Y APLICA estos efectos ({effects.length})</div>
          <button onClick={addEffect} className="text-xs bg-cyan-700 hover:bg-cyan-600 text-white px-2 py-1 rounded-lg font-bold">+ Efecto</button>
        </div>
        {effects.map((ef, i) => {
          const meta = EFFECT_KIND_LABELS[ef.kind];
          return (
            <div key={i} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 flex-wrap">
              <span>{meta?.icon}</span>
              <select value={ef.kind} onChange={e => setEffect(i, { kind: e.target.value as CardEffectKind })} className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white outline-none">
                {EFFECT_KINDS.map(k => <option key={k} value={k}>{EFFECT_KIND_LABELS[k].label}</option>)}
              </select>
              <select value={ef.target || ''} onChange={e => setEffect(i, { target: (e.target.value || undefined) as TargetSelector })} className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white outline-none">
                <option value="">(heredar)</option>
                {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" placeholder="cant." value={ef.amount ?? ''} onChange={e => setEffect(i, { amount: e.target.value === '' ? undefined : +e.target.value })} className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white outline-none" />
              <input type="number" placeholder="dur." value={ef.duration ?? ''} onChange={e => setEffect(i, { duration: e.target.value === '' ? undefined : +e.target.value })} className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white outline-none" />
              <button onClick={() => removeEffect(i)} className="ml-auto text-red-400 text-sm">🗑️</button>
            </div>
          );
        })}
      </div>

      {/* salida */}
      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400">JSON resultante</span>
          <div className="flex gap-2">
            <button onClick={copyJson} className="text-[0.65rem] bg-slate-800 hover:bg-emerald-700 text-white px-2 py-1 rounded">📋 Copiar</button>
            <button onClick={exportJson} className="text-[0.65rem] bg-slate-800 hover:bg-blue-600 text-white px-2 py-1 rounded">📤 Exportar</button>
          </div>
        </div>
        <pre className="text-[0.6rem] text-emerald-300 overflow-x-auto font-mono max-h-72">{JSON.stringify(result, null, 2)}</pre>
        <div className="text-[0.6rem] text-slate-500 mt-2">💡 Pega el bloque <code>synergy</code> en el campo <code>synergies[]</code> de una carta, y los <code>appliedEffects</code> en su <code>effects[]</code>.</div>
      </div>
    </div>
  );
};
