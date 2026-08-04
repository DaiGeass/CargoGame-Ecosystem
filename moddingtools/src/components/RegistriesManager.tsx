import React, { useState } from 'react';
import {
  BUILTIN_TAGS, getCustomTags, addCustomTag, removeCustomTag,
  getCustomEffects, addCustomEffect, removeCustomEffect, CustomEffectDef,
  getAbilityLibrary, addAbilityDef, removeAbilityDef, AbilityDef,
  getPassiveLibrary, addPassiveDef, removePassiveDef, PassiveDef,
} from '../data/registries';
import { EmojiInput } from './inputs/AssetInput';
import { ColorPicker } from './inputs/ColorPicker';

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-500';

export const RegistriesManager: React.FC = () => {
  const [tab, setTab] = useState<'tags' | 'effects' | 'abilities' | 'passives'>('tags');
  const [, force] = useState(0);
  const refresh = () => force(n => n + 1);

  return (
    <div className="space-y-3">
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-black text-emerald-300 mb-1">🧬 Ampliar el juego base</h3>
        <p className="text-xs text-slate-400">Crea tags, efectos, habilidades y pasivas reutilizables. Todo se guarda en el storage compartido con CARGAS.</p>
      </div>

      <div className="flex gap-1">
        {([['tags','🏷️ Tags'],['effects','⚡ Efectos'],['abilities','🎯 Habilidades'],['passives','🔒 Pasivas']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg ${tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{l}</button>
        ))}
      </div>

      {tab === 'tags' && <TagsTab refresh={refresh} />}
      {tab === 'effects' && <EffectsTab refresh={refresh} />}
      {tab === 'abilities' && <AbilitiesTab refresh={refresh} />}
      {tab === 'passives' && <PassivesTab refresh={refresh} />}
    </div>
  );
};

const TagsTab: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [val, setVal] = useState('');
  const custom = getCustomTags();
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="nuevo_tag" className={inputCls}
               onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { addCustomTag(val); setVal(''); refresh(); } }} />
        <button onClick={() => { if (val.trim()) { addCustomTag(val); setVal(''); refresh(); } }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 rounded-lg">+ Crear</button>
      </div>
      <div>
        <div className="text-xs font-bold text-emerald-400 mb-1.5">Tus tags ({custom.length})</div>
        <div className="flex flex-wrap gap-1.5">
          {custom.length === 0 && <span className="text-xs text-slate-500">Aún no creaste tags.</span>}
          {custom.map(t => (
            <span key={t} className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded-lg border border-emerald-700 flex items-center gap-1">
              #{t} <button onClick={() => { removeCustomTag(t); refresh(); }} className="text-red-400 hover:text-red-300">✕</button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-400 mb-1.5">Tags del juego base ({BUILTIN_TAGS.length})</div>
        <div className="flex flex-wrap gap-1">
          {BUILTIN_TAGS.map(t => <span key={t} className="text-[0.6rem] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">#{t}</span>)}
        </div>
      </div>
    </div>
  );
};

const EffectsTab: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [def, setDef] = useState<CustomEffectDef>({ kind: '', label: '', icon: '⚙️', color: '#22c55e', description: '', hasAmount: true, hasDuration: false });
  const effects = getCustomEffects();
  const save = () => { if (!def.kind || !def.label) return; addCustomEffect({ ...def, kind: def.kind.toLowerCase().replace(/\s+/g, '_') }); setDef({ kind: '', label: '', icon: '⚙️', color: '#22c55e', description: '', hasAmount: true, hasDuration: false }); refresh(); };
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={def.kind} onChange={e => setDef({ ...def, kind: e.target.value })} placeholder="kind (ej: teleport)" className={inputCls} />
          <input value={def.label} onChange={e => setDef({ ...def, label: e.target.value })} placeholder="Etiqueta" className={inputCls} />
        </div>
        <input value={def.description} onChange={e => setDef({ ...def, description: e.target.value })} placeholder="Descripción" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <EmojiInput value={def.icon} onChange={i => setDef({ ...def, icon: i })} label="Icono" />
          <ColorPicker value={def.color} onChange={c => setDef({ ...def, color: c })} label="Color" />
        </div>
        <div className="flex gap-3 text-xs text-slate-300">
          <label className="flex items-center gap-1"><input type="checkbox" checked={def.hasAmount} onChange={e => setDef({ ...def, hasAmount: e.target.checked })} /> usa cantidad</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={def.hasDuration} onChange={e => setDef({ ...def, hasDuration: e.target.checked })} /> usa duración</label>
        </div>
        <button onClick={save} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black py-2 rounded-lg">💾 Registrar efecto</button>
      </div>
      <div className="space-y-1.5">
        {effects.map(e => (
          <div key={e.kind} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-800">
            <span className="text-lg">{e.icon}</span>
            <div className="flex-1"><div className="text-xs font-bold text-white">{e.label} <code className="text-[0.6rem] text-slate-500">{e.kind}</code></div><div className="text-[0.6rem] text-slate-500">{e.description}</div></div>
            <span className="w-4 h-4 rounded" style={{ background: e.color }} />
            <button onClick={() => { removeCustomEffect(e.kind); refresh(); }} className="text-red-400 hover:text-red-300 text-sm">🗑️</button>
          </div>
        ))}
        {effects.length === 0 && <div className="text-xs text-slate-500 text-center py-3">Sin efectos custom.</div>}
      </div>
    </div>
  );
};

const AbilitiesTab: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [d, setD] = useState<Partial<AbilityDef>>({ name: '', cooldown: 6, category: 'instant', effect: 'damage', canTarget: 'enemy', isTeamAbility: false });
  const lib = getAbilityLibrary();
  const save = () => { if (!d.name) return; addAbilityDef({ id: `ab_${Date.now().toString(36)}`, name: d.name!, description: d.description || d.name!, cooldown: d.cooldown || 6, category: d.category as any, effect: d.effect as any, canTarget: d.canTarget as any, isTeamAbility: !!d.isTeamAbility }); setD({ name: '', cooldown: 6, category: 'instant', effect: 'damage', canTarget: 'enemy', isTeamAbility: false }); refresh(); };
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        <input value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre de habilidad" className={inputCls} />
        <input value={d.description || ''} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Descripción (ej: 150 daño)" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">Cooldown<input type="number" value={d.cooldown} onChange={e => setD({ ...d, cooldown: +e.target.value })} className={inputCls + ' mt-1'} /></label>
          <label className="text-xs text-slate-400">Categoría
            <select value={d.category} onChange={e => setD({ ...d, category: e.target.value as any })} className={inputCls + ' mt-1'}>
              {['instant','end_turn','defense','buff_self'].map(c => <option key={c}>{c}</option>)}
            </select></label>
          <label className="text-xs text-slate-400">Efecto
            <select value={d.effect} onChange={e => setD({ ...d, effect: e.target.value as any })} className={inputCls + ' mt-1'}>
              {['damage','heal','defense','buff','debuff','special'].map(c => <option key={c}>{c}</option>)}
            </select></label>
          <label className="text-xs text-slate-400">Objetivo
            <select value={d.canTarget} onChange={e => setD({ ...d, canTarget: e.target.value as any })} className={inputCls + ' mt-1'}>
              {['enemy','ally','self','any','ally_or_self'].map(c => <option key={c}>{c}</option>)}
            </select></label>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={d.isTeamAbility} onChange={e => setD({ ...d, isTeamAbility: e.target.checked })} /> Habilidad de equipo</label>
        <button onClick={save} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black py-2 rounded-lg">💾 Añadir a librería</button>
      </div>
      <div className="space-y-1.5">
        {lib.map(a => (
          <div key={a.id} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-800">
            <span className="text-base">{a.isTeamAbility ? '🤝' : '⚡'}</span>
            <div className="flex-1"><div className="text-xs font-bold text-white">{a.name}</div><div className="text-[0.6rem] text-slate-500">{a.description} · cd {a.cooldown} · {a.category}</div></div>
            <button onClick={() => { removeAbilityDef(a.id); refresh(); }} className="text-red-400 text-sm">🗑️</button>
          </div>
        ))}
        {lib.length === 0 && <div className="text-xs text-slate-500 text-center py-3">Sin habilidades en la librería.</div>}
      </div>
    </div>
  );
};

const PassivesTab: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [d, setD] = useState<Partial<PassiveDef>>({ name: '', scope: 'individual', trigger: 'on_attack', tagFilter: '', value: 50 });
  const lib = getPassiveLibrary();
  const save = () => { if (!d.name) return; addPassiveDef({ id: `pas_${Date.now().toString(36)}`, name: d.name!, description: d.description || d.name!, scope: d.scope as any, trigger: d.trigger as any, tagFilter: d.tagFilter, value: d.value }); setD({ name: '', scope: 'individual', trigger: 'on_attack', tagFilter: '', value: 50 }); refresh(); };
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        <input value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre de pasiva" className={inputCls} />
        <input value={d.description || ''} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Descripción" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">Alcance
            <select value={d.scope} onChange={e => setD({ ...d, scope: e.target.value as any })} className={inputCls + ' mt-1'}>
              <option value="individual">individual</option><option value="team">equipo</option>
            </select></label>
          <label className="text-xs text-slate-400">Disparador
            <select value={d.trigger} onChange={e => setD({ ...d, trigger: e.target.value as any })} className={inputCls + ' mt-1'}>
              {['on_attack','on_damage_taken','start_of_turn','always'].map(c => <option key={c}>{c}</option>)}
            </select></label>
          <label className="text-xs text-slate-400">Tag filtro<input value={d.tagFilter || ''} onChange={e => setD({ ...d, tagFilter: e.target.value })} placeholder="ej: fuego" className={inputCls + ' mt-1'} /></label>
          <label className="text-xs text-slate-400">Valor<input type="number" value={d.value} onChange={e => setD({ ...d, value: +e.target.value })} className={inputCls + ' mt-1'} /></label>
        </div>
        <button onClick={save} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black py-2 rounded-lg">💾 Añadir a librería</button>
      </div>
      <div className="space-y-1.5">
        {lib.map(p => (
          <div key={p.id} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-800">
            <span className="text-base">🔒</span>
            <div className="flex-1"><div className="text-xs font-bold text-white">{p.name} <span className="text-[0.55rem] bg-slate-800 px-1 rounded text-slate-400">{p.scope}</span></div><div className="text-[0.6rem] text-slate-500">{p.description} · {p.trigger}{p.tagFilter ? ` · #${p.tagFilter}` : ''}</div></div>
            <button onClick={() => { removePassiveDef(p.id); refresh(); }} className="text-red-400 text-sm">🗑️</button>
          </div>
        ))}
        {lib.length === 0 && <div className="text-xs text-slate-500 text-center py-3">Sin pasivas en la librería.</div>}
      </div>
    </div>
  );
};
