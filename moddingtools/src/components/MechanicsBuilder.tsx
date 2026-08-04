// ============================================================
// MECHANICS BUILDER — crear MECÁNICAS nuevas (solo modders)
// ============================================================
// Lo que diferencia a ModdingBuild: añadir reglas/mecánicas que
// el juego base NO trae, con script JS que el motor ejecuta.
// ============================================================
import React, { useState } from 'react';
import {
  MechanicDef, getCustomMechanics, addMechanic, removeMechanic, toggleMechanic,
  getRuleOverrides, setRuleOverride, clearRuleOverride,
} from '../data/registries';
import { EmojiInput } from './inputs/AssetInput';

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-rose-500';

const HOOKS: { value: MechanicDef['hook']; label: string; desc: string }[] = [
  { value: 'on_game_start', label: '🚀 Inicio de partida', desc: 'Una vez al comenzar (setup, repartir, reglas)' },
  { value: 'on_turn_start', label: '▶️ Inicio de turno', desc: 'Cada vez que empieza el turno de un jugador' },
  { value: 'on_turn_end', label: '⏹️ Fin de turno', desc: 'Al terminar el turno (DoTs, economía)' },
  { value: 'on_card_played', label: '🎴 Carta jugada', desc: 'Cuando alguien juega una carta' },
  { value: 'on_damage', label: '💥 Al recibir/infligir daño', desc: 'Intercepta y modifica el cálculo de daño' },
  { value: 'on_death', label: '💀 Muerte', desc: 'Cuando un jugador llega a 0 HP (revivir, herencia)' },
  { value: 'passive_global', label: '♾️ Pasiva global', desc: 'Regla siempre activa todo el juego' },
  { value: 'custom', label: '⚙️ Custom / evento propio', desc: 'Disparador manual desde otra mecánica' },
];

const PRESETS: { label: string; script: string }[] = [
  { label: '🩸 Sangrado global', script: `function run(ctx, params){ for(const p of ctx.players) ctx.dealDamage(p.id, params.sangrado||5); ctx.log('Sangrado global'); }` },
  { label: '💰 Renta por turno', script: `function run(ctx, params){ ctx.giveResource(ctx.currentPlayer.id, 'oro', params.renta||2); }` },
  { label: '⚖️ Muerte súbita (turno N)', script: `function run(ctx, params){ if(ctx.turn>=(params.turno||10)) for(const p of ctx.players) ctx.dealDamage(p.id, 50); }` },
  { label: '🔁 Robar al matar', script: `function run(ctx){ if(ctx.lastKill) ctx.drawCards(ctx.lastKill.killerId, 2); }` },
  { label: '🌀 Caos: barajar manos', script: `function run(ctx){ ctx.shuffleHandsBetweenPlayers(); ctx.log('¡Caos! Manos barajadas'); }` },
];

const SCRIPT_SNIPPET = `// ctx disponible: players, currentPlayer, log(), dealDamage(id, n), heal(id, n)
// params: tus parámetros configurables
function run(ctx, params) {
  // Ejemplo: al inicio de turno, todos pierden 'sangrado' HP
  for (const p of ctx.players) {
    ctx.dealDamage(p.id, params.sangrado || 5);
  }
  ctx.log('☠️ Mecánica de sangrado global activa');
}`;

// Reglas globales editables (modding agresivo)
const RULE_FIELDS: { key: string; label: string; def: number }[] = [
  { key: 'criticalChance', label: '% Crítico', def: 15 },
  { key: 'criticalMultiplier', label: 'Multiplicador crítico', def: 2 },
  { key: 'startingHandSize', label: 'Cartas iniciales', def: 7 },
  { key: 'maxHandSize', label: 'Máx. en mano', def: 7 },
  { key: 'maxCardsPerTurn', label: 'Cartas por turno', def: 3 },
  { key: 'defenseTimerSecs', label: 'Segundos de defensa', def: 12 },
];

export const MechanicsBuilder: React.FC = () => {
  const [tab, setTab] = useState<'mechanics' | 'rules'>('mechanics');
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-rose-950/50 to-slate-900 rounded-xl p-4 border border-rose-800/50">
        <h3 className="text-sm font-black text-rose-300 mb-1">🧪 Mecánicas y Reglas (modding agresivo)</h3>
        <p className="text-xs text-slate-400">Crea mecánicas que el juego <b>no trae de fábrica</b> y reescribe las reglas globales. El juego CARGAS las ejecuta si soporta el hook.</p>
      </div>
      <div className="flex gap-1">
        <button onClick={() => setTab('mechanics')} className={`flex-1 text-xs font-bold py-2 rounded-lg ${tab === 'mechanics' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>🧪 Mecánicas nuevas</button>
        <button onClick={() => setTab('rules')} className={`flex-1 text-xs font-bold py-2 rounded-lg ${tab === 'rules' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>⚙️ Reglas globales</button>
      </div>
      {tab === 'mechanics' ? <MechanicsTab /> : <RulesTab />}
    </div>
  );
};

const MechanicsTab: React.FC = () => {
  const [d, setD] = useState<Partial<MechanicDef>>({ name: '', icon: '🧪', description: '', hook: 'on_turn_start', script: SCRIPT_SNIPPET, params: [], enabled: true });
  const [, force] = useState(0);
  const list = getCustomMechanics();

  const addParam = () => setD({ ...d, params: [...(d.params || []), { key: 'param', label: 'Parámetro', value: 0 }] });
  const setParam = (i: number, patch: any) => setD({ ...d, params: (d.params || []).map((p, idx) => idx === i ? { ...p, ...patch } : p) });
  const save = () => {
    if (!d.name) return;
    addMechanic({ id: `mech_${Date.now().toString(36)}`, name: d.name!, icon: d.icon || '🧪', description: d.description || '', hook: d.hook as any, script: d.script || '', params: d.params || [], enabled: true });
    setD({ name: '', icon: '🧪', description: '', hook: 'on_turn_start', script: SCRIPT_SNIPPET, params: [], enabled: true });
    force(n => n + 1);
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre de la mecánica" className={inputCls} />
          <div className="w-40"><EmojiInput value={d.icon || '🧪'} onChange={i => setD({ ...d, icon: i })} /></div>
        </div>
        <input value={d.description || ''} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Qué hace" className={inputCls} />
        <label className="text-xs text-slate-400 block">Hook (cuándo se ejecuta)
          <select value={d.hook} onChange={e => setD({ ...d, hook: e.target.value as any })} className={inputCls + ' mt-1'}>
            {HOOKS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
          <span className="text-[0.6rem] text-slate-500">{HOOKS.find(h => h.value === d.hook)?.desc}</span>
        </label>

        {/* parámetros */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-300">Parámetros configurables</span>
            <button onClick={addParam} className="text-[0.65rem] bg-rose-700 hover:bg-rose-600 text-white px-2 py-0.5 rounded">+ param</button>
          </div>
          {(d.params || []).map((p, i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input value={p.key} onChange={e => setParam(i, { key: e.target.value })} placeholder="key" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none" />
              <input value={p.label} onChange={e => setParam(i, { label: e.target.value })} placeholder="etiqueta" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none" />
              <input type="number" value={p.value} onChange={e => setParam(i, { value: +e.target.value })} className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none" />
            </div>
          ))}
        </div>

        {/* presets rápidos */}
        <div>
          <div className="text-[0.65rem] font-bold text-slate-400 mb-1">Plantillas rápidas (rellenan el script)</div>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => setD({ ...d, script: p.script, name: d.name || p.label.replace(/^\S+\s/, '') })}
                      className="text-[0.6rem] bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white px-2 py-1 rounded border border-slate-700">{p.label}</button>
            ))}
          </div>
        </div>

        {/* script */}
        <label className="text-xs font-bold text-rose-300 block">Script JS (lo ejecuta el motor del juego)</label>
        <textarea value={d.script} onChange={e => setD({ ...d, script: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[0.65rem] text-emerald-300 font-mono outline-none focus:border-rose-500 h-40 resize-none" spellCheck={false} />

        <button onClick={save} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">💾 Registrar mecánica</button>
        <div className="text-[0.6rem] text-slate-500">⚠️ El script se guarda en <code>cargas.customMechanics.v1</code>. El juego lo evalúa en su motor si soporta el hook (sandbox del juego).</div>
      </div>

      <div className="space-y-1.5">
        {list.map(m => (
          <div key={m.id} className="bg-slate-900 rounded-lg p-2.5 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">{m.icon}</span>
              <div className="flex-1"><div className="text-xs font-bold text-white">{m.name}</div><div className="text-[0.6rem] text-slate-500">{m.description} · {m.hook}</div></div>
              <button onClick={() => { toggleMechanic(m.id); force(n => n + 1); }} className={`text-[0.6rem] font-bold px-2 py-1 rounded ${m.enabled ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>{m.enabled ? '● ON' : '○ OFF'}</button>
              <button onClick={() => { removeMechanic(m.id); force(n => n + 1); }} className="text-red-400 text-sm">🗑️</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="text-xs text-slate-500 text-center py-3">Sin mecánicas todavía. Crea la primera.</div>}
      </div>
    </div>
  );
};

const RulesTab: React.FC = () => {
  const [, force] = useState(0);
  const overrides = getRuleOverrides();
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        {RULE_FIELDS.map(f => {
          const active = f.key in overrides;
          return (
            <div key={f.key} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{f.label}</div>
                <div className="text-[0.6rem] text-slate-500">default: {f.def} · {active ? <span className="text-rose-400">override: {overrides[f.key]}</span> : 'sin cambios'}</div>
              </div>
              <input type="number" defaultValue={active ? overrides[f.key] : f.def}
                     onChange={e => { setRuleOverride(f.key, +e.target.value); force(n => n + 1); }}
                     className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-rose-500" />
              {active && <button onClick={() => { clearRuleOverride(f.key); force(n => n + 1); }} className="text-[0.6rem] text-slate-400 hover:text-red-400">reset</button>}
            </div>
          );
        })}
      </div>
      <div className="text-[0.6rem] text-slate-500 bg-slate-800/40 rounded-lg p-2 border border-slate-700/40">
        ℹ️ Estos overrides se guardan en <code className="text-cyan-300">cargas.ruleOverrides.v1</code>. El juego los aplica sobre sus <code>GameRules</code> al iniciar partida.
      </div>
    </div>
  );
};
