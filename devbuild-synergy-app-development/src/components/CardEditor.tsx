import React, { useState } from 'react';
import { useDevBuild } from '../store/devbuildStore';
import { CardView } from './CardView';
import {
  CARD_TYPES, CardType, RARITIES, TARGET_MODES, EFFECT_TIMINGS,
} from '../types/game';
import { CardEffect, CardEffectKind, EFFECT_KIND_LABELS, TargetSelector } from '../types/effects';
import { getAllThemes } from '../utils/cardThemes';
import { validateFormula, describeFormula } from '../utils/formulas';
import { getAllTags, addCustomTag } from '../data/registries';
import { ColorPicker, ColorTemplate } from './inputs/ColorPicker';
import { AssetInput, EmojiInput } from './inputs/AssetInput';

// Selector de tags con clic + crear nuevo tag al vuelo
const TagSelector: React.FC<{ selected: string[]; onChange: (tags: string[]) => void }> = ({ selected, onChange }) => {
  const [newTag, setNewTag] = useState('');
  const all = getAllTags();
  const toggle = (t: string) => onChange(selected.includes(t) ? selected.filter(x => x !== t) : [...selected, t]);
  const create = () => { const t = newTag.trim().toLowerCase().replace(/\s+/g, '_'); if (!t) return; addCustomTag(t); if (!selected.includes(t)) onChange([...selected, t]); setNewTag(''); };
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 space-y-2">
      <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
        {all.map(t => (
          <button key={t} onClick={() => toggle(t)}
                  className={`text-[0.6rem] px-1.5 py-0.5 rounded border font-bold uppercase ${selected.includes(t) ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
            #{t}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create(); }}
               placeholder="crear tag nuevo" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[0.65rem] text-white outline-none" />
        <button onClick={create} className="text-[0.65rem] bg-emerald-700 hover:bg-emerald-600 text-white px-2 rounded font-bold">+ tag</button>
      </div>
    </div>
  );
};

const EFFECT_KINDS = Object.keys(EFFECT_KIND_LABELS) as CardEffectKind[];
const TARGET_SELECTORS: TargetSelector[] = [
  'self', 'enemy', 'ally', 'all_enemies', 'all_allies', 'all_allies_no_self',
  'all_players', 'random_enemy', 'random_ally', 'lowest_hp_enemy', 'highest_hp_enemy', 'multi_enemy',
];

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors';

export const CardEditor: React.FC = () => {
  const { editingCard, updateEditingCard, closeEditor, saveEditingCard, mods } = useDevBuild();
  const [target, setTarget] = useState('base');

  if (!editingCard) return null;
  const c = editingCard;
  const effects = c.effects || [];

  const setEffect = (idx: number, patch: Partial<CardEffect>) => {
    const next = effects.map((e, i) => i === idx ? { ...e, ...patch } : e);
    updateEditingCard({ effects: next });
  };
  const addEffect = () => updateEditingCard({ effects: [...effects, { kind: 'damage', amount: 20, target: 'enemy' }] });
  const removeEffect = (idx: number) => updateEditingCard({ effects: effects.filter((_, i) => i !== idx) });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-5xl max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <h2 className="font-black text-white">Editor de Carta</h2>
            <code className="text-[0.6rem] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{c.id}</code>
          </div>
          <button onClick={closeEditor} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5">
          {/* form */}
          <div className="space-y-4">
            {/* básicos */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre">
                <input className={inputCls} value={c.name} onChange={(e) => updateEditingCard({ name: e.target.value })} />
              </Field>
              <Field label="Tipo">
                <select className={inputCls} value={c.type} onChange={(e) => updateEditingCard({ type: e.target.value as CardType })}>
                  {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Descripción">
              <textarea className={inputCls + ' resize-none h-16'} value={c.description} onChange={(e) => updateEditingCard({ description: e.target.value })} />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Valor (− daño / + cura)">
                <input type="number" className={inputCls} value={c.value} onChange={(e) => updateEditingCard({ value: Number(e.target.value) })} />
              </Field>
              <Field label="Rareza">
                <select className={inputCls} value={c.rarity || 'common'} onChange={(e) => updateEditingCard({ rarity: e.target.value as any })}>
                  {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Objetivo">
                <select className={inputCls} value={c.targetMode} onChange={(e) => updateEditingCard({ targetMode: e.target.value as any })}>
                  {TARGET_MODES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Timing">
                <select className={inputCls} value={c.effectTiming} onChange={(e) => updateEditingCard({ effectTiming: e.target.value as any })}>
                  {EFFECT_TIMINGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Duración (turnos)">
                <input type="number" className={inputCls} value={c.duration} onChange={(e) => updateEditingCard({ duration: Number(e.target.value) })} />
              </Field>
              <div className="flex flex-col justify-end gap-1 pb-1">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={c.isInstant} onChange={(e) => updateEditingCard({ isInstant: e.target.checked })} /> Instantánea
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={!!c.ignoresDefense} onChange={(e) => updateEditingCard({ ignoresDefense: e.target.checked })} /> Ignora defensa
                </label>
              </div>
            </div>

            {/* TAGS dinámicos (clic para añadir/quitar) */}
            <Field label="Tags (clic para activar)">
              <TagSelector selected={c.tags || []} onChange={(tags) => updateEditingCard({ tags })} />
            </Field>
            <Field label="Synergy Tags (clic para activar)">
              <TagSelector selected={c.synergyTags || []} onChange={(synergyTags) => updateEditingCard({ synergyTags })} />
            </Field>

            {/* ASSETS LOCALES */}
            <div className="grid grid-cols-2 gap-3">
              <AssetInput kind="image" label="Imagen principal" value={c.imageFront || null}
                          onChange={(v) => updateEditingCard({ imageFront: v })} />
              <AssetInput kind="image" label="Icono pequeño" value={c.media?.iconImage || null}
                          onChange={(v) => updateEditingCard({ media: { ...(c.media || {}), iconImage: v } })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AssetInput kind="audio" label="Sonido al jugar" value={c.media?.soundOnPlay || null}
                          onChange={(v) => updateEditingCard({ media: { ...(c.media || {}), soundOnPlay: v } })} />
              <AssetInput kind="audio" label="Sonido al resolver" value={c.media?.soundOnResolve || null}
                          onChange={(v) => updateEditingCard({ media: { ...(c.media || {}), soundOnResolve: v } })} />
            </div>

            {/* TEMA: plantilla pre-hecha O color hex */}
            <Field label="Tema visual">
              <select className={inputCls} value={c.customTheme?.key || ''} onChange={(e) => updateEditingCard({ customTheme: e.target.value ? { key: e.target.value } : undefined })}>
                <option value="">(usar tipo: {c.type})</option>
                {Object.entries(getAllThemes()).map(([key, theme]) => <option key={key} value={key}>{theme.icon} {theme.label} ({key})</option>)}
              </select>
            </Field>

            <ColorPicker
              onTemplate={(t: ColorTemplate) => {
                updateEditingCard({ customTheme: { bg: t.bg, bgGrad: t.bgGrad, border: t.border, glow: t.glow, text: t.text, icon: c.customTheme?.icon, label: t.label } });
              }}
              onChange={(hex) => {
                // tinte personalizado: usa el hex como borde+glow del tema
                const darker = hex + '22';
                updateEditingCard({ customTheme: { ...(c.customTheme || {}), bg: '#0f172a', bgGrad: darker, border: hex, glow: hex + '88', text: '#ffffff', label: c.customTheme?.label || 'Custom' } });
              }}
              value={c.customTheme?.border || '#8b5cf6'}
              label="Color del tema (plantilla o HEX)"
            />

            <EmojiInput value={c.customTheme?.icon || ''} onChange={(icon) => updateEditingCard({ customTheme: { ...(c.customTheme || {}), icon } })} label="Emoji / icono de la carta" />

            {/* FÓRMULA A NIVEL DE CARTA */}
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-amber-300">🧮 Fórmula matemática (opcional)</h3>
                {c.formula ? (
                  <button onClick={() => updateEditingCard({ formula: undefined })} className="text-xs text-red-400 hover:text-red-300">Quitar</button>
                ) : (
                  <button onClick={() => updateEditingCard({ formula: { expression: 'target.hp * 0.2', resultType: 'damage' } })} className="text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg">+ Fórmula</button>
                )}
              </div>
              {c.formula && (() => {
                const err = validateFormula(c.formula.expression);
                return (
                  <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700 space-y-2">
                    <div className="flex gap-2">
                      <input className={inputCls + ' font-mono'} placeholder="ej: sqrt(attacker.lostHp) * 10" value={c.formula.expression}
                             onChange={(e) => updateEditingCard({ formula: { ...c.formula!, expression: e.target.value } })} />
                      <select className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none" value={c.formula.resultType}
                              onChange={(e) => updateEditingCard({ formula: { ...c.formula!, resultType: e.target.value as any } })}>
                        <option value="damage">daño</option><option value="heal">cura</option><option value="defense">defensa</option>
                      </select>
                    </div>
                    <div className={`text-[0.65rem] font-mono ${err ? 'text-red-400' : 'text-emerald-400'}`}>
                      {err ? `❌ ${err}` : `✓ válida → ${describeFormula(c.formula.expression)}`}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* EFECTOS */}
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-emerald-300">⚡ Efectos modulares ({effects.length})</h3>
                <button onClick={addEffect} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg">+ Efecto</button>
              </div>
              <div className="space-y-2">
                {effects.map((ef, i) => {
                  const meta = EFFECT_KIND_LABELS[ef.kind];
                  return (
                    <div key={i} className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{meta.icon}</span>
                        <select className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white outline-none"
                                value={ef.kind} onChange={(e) => setEffect(i, { kind: e.target.value as CardEffectKind })}>
                          {EFFECT_KINDS.map((k) => <option key={k} value={k}>{EFFECT_KIND_LABELS[k].label}</option>)}
                        </select>
                        <select className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white outline-none"
                                value={ef.target || ''} onChange={(e) => setEffect(i, { target: (e.target.value || undefined) as TargetSelector })}>
                          <option value="">(heredar)</option>
                          {TARGET_SELECTORS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input type="number" placeholder="cantidad" className="w-20 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white outline-none"
                               value={ef.amount ?? ''} onChange={(e) => setEffect(i, { amount: e.target.value === '' ? undefined : Number(e.target.value) })} />
                        <input type="number" placeholder="dur." className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-white outline-none"
                               value={ef.duration ?? ''} onChange={(e) => setEffect(i, { duration: e.target.value === '' ? undefined : Number(e.target.value) })} />
                        <button onClick={() => removeEffect(i)} className="ml-auto text-red-400 hover:text-red-300 text-sm px-1">🗑️</button>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <label className="flex items-center gap-1 text-[0.65rem] text-slate-400">
                          <input type="checkbox" checked={!!ef.ignoresDefense} onChange={(e) => setEffect(i, { ignoresDefense: e.target.checked })} /> ignora def
                        </label>
                        <input placeholder="stackKey" className="w-24 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[0.65rem] text-white outline-none"
                               value={ef.stackKey || ''} onChange={(e) => setEffect(i, { stackKey: e.target.value || undefined })} />
                        <input placeholder="formula (ej: target.hp*0.2)" className="flex-1 min-w-[140px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[0.65rem] text-white outline-none font-mono"
                               value={ef.formula || ''} onChange={(e) => setEffect(i, { formula: e.target.value || undefined })} />
                      </div>
                    </div>
                  );
                })}
                {effects.length === 0 && <div className="text-xs text-slate-500 text-center py-3">Sin efectos. Usa el botón "+ Efecto".</div>}
              </div>
            </div>
          </div>

          {/* live preview */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-[0.65rem] font-bold text-slate-400 uppercase">Vista previa</span>
            <CardView card={c} size="lg" />
            <div className="text-[0.6rem] text-slate-500 text-center">
              Se actualiza en tiempo real mientras editas.
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] text-slate-400 uppercase font-bold">Guardar en:</span>
            <select className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="base">Juego Base</option>
              {mods.map((m) => <option key={m.manifest.id} value={m.manifest.id}>{m.manifest.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={closeEditor} className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-300 hover:bg-slate-800">Cancelar</button>
            <button onClick={() => saveEditingCard(target)} className="px-5 py-1.5 rounded-lg text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg">💾 Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
