// ============================================================
// CONSTRUCTOR DE CARTAS VISUAL (Card Builder) — DevBuild
// ============================================================
import React, { useState } from 'react';
import { CardType, PlayableCard } from '../types/game';
import { CardEffectKind, TargetSelector } from '../types/effects';
import { getCardTheme, getAllThemes } from '../utils/cardThemes';

import { useModding } from '../store/moddingStore';
import { getInstalledMods } from '../data/mods';
import { getAllTags, addCustomTag } from '../data/registries';
import { CardView } from './CardView';
import { ColorPicker, ColorTemplate } from './inputs/ColorPicker';
import { AssetInput, EmojiInput } from './inputs/AssetInput';

const BUILDER_CARD_TYPES: { value: CardType; label: string }[] = [
  { value: 'damage', label: '⚔️ Daño' },
  { value: 'damage_over_time', label: '☠️ DoT' },
  { value: 'heal', label: '💚 Cura' },
  { value: 'defense', label: '🛡️ Defensa' },
  { value: 'utility', label: '🎯 Utilidad' },
  { value: 'special', label: '⭐ Especial' },
  { value: 'elemental', label: '🌀 Elemental' },
  { value: 'curse', label: '🩸 Maldición' },
  { value: 'buff', label: '✨ Buff' },
  { value: 'ritual', label: '🕯️ Ritual' },
  { value: 'summon', label: '👾 Invocación' },
  { value: 'reaction', label: '⚡ Reacción' },
];

const EFFECT_KINDS: { value: CardEffectKind; label: string; hasAmount: boolean; hasDuration: boolean }[] = [
  { value: 'damage', label: '⚔️ Daño Directo', hasAmount: true, hasDuration: false },
  { value: 'heal', label: '💚 Curación', hasAmount: true, hasDuration: false },
  { value: 'hot', label: '🌿 Cura/turno (HoT)', hasAmount: true, hasDuration: true },
  { value: 'dot', label: '☠️ Daño por Turno', hasAmount: true, hasDuration: true },
  { value: 'defense_buff', label: '🛡️ +Defensa', hasAmount: true, hasDuration: false },
  { value: 'stun', label: '😵 Aturdir', hasAmount: false, hasDuration: true },
  { value: 'silence', label: '🤐 Silenciar', hasAmount: false, hasDuration: true },
  { value: 'skip_turn', label: '⏭️ Saltar Turno', hasAmount: false, hasDuration: false },
  { value: 'extra_turn', label: '🔄 Turno Extra', hasAmount: false, hasDuration: false },
  { value: 'lifesteal', label: '🩸 Robo de Vida', hasAmount: true, hasDuration: false },
  { value: 'execute', label: '💀 Ejecutar (% HP umbral)', hasAmount: true, hasDuration: false },
  { value: 'draw_cards', label: '🃏 Robar Cartas', hasAmount: true, hasDuration: false },
  { value: 'discard', label: '🗑️ Descartar', hasAmount: true, hasDuration: false },
  { value: 'reveal_hand', label: '👁️ Revelar Mano', hasAmount: false, hasDuration: false },
  { value: 'shield', label: '🔰 Escudo', hasAmount: true, hasDuration: true },
  { value: 'reflect', label: '🪞 Reflejar', hasAmount: true, hasDuration: true },
  { value: 'cleanse', label: '✨ Limpiar Debuffs', hasAmount: false, hasDuration: false },
  { value: 'dispel', label: '💨 Disipar Buffs', hasAmount: false, hasDuration: false },
  { value: 'transfer_hp', label: '🔁 Transferir HP', hasAmount: true, hasDuration: false },
];

const TARGETS: { value: TargetSelector; label: string }[] = [
  { value: 'enemy', label: '🎯 Un enemigo' },
  { value: 'all_enemies', label: '💥 Todos los enemigos' },
  { value: 'self', label: '👤 A mí mismo' },
  { value: 'ally', label: '🤝 Un aliado' },
  { value: 'all_allies', label: '👥 Todos los aliados' },
  { value: 'random_enemy', label: '🎲 Enemigo aleatorio' },
  { value: 'lowest_hp_enemy', label: '🔻 Enemigo con menos HP' },
];

// Input inline para crear tag nuevo
const NewTagInline: React.FC<{ onCreate: (t: string) => void }> = ({ onCreate }) => {
  const [v, setV] = useState('');
  const create = () => { const t = v.trim().toLowerCase().replace(/\s+/g, '_'); if (!t) return; onCreate(t); setV(''); };
  return (
    <div className="flex gap-1">
      <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create(); }}
             placeholder="crear tag nuevo" className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[0.65rem] text-white outline-none" />
      <button onClick={create} className="text-[0.65rem] bg-fuchsia-700 hover:bg-fuchsia-600 text-white px-2 rounded font-bold">+ tag</button>
    </div>
  );
};

interface BuilderEffect {
  kind: CardEffectKind;
  target: TargetSelector;
  amount: number;
  duration: number;
  ignoresDefense: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
};

export const CardBuilderPanel: React.FC = () => {
  const { startEditCard, setView } = useModding();
  const [name, setName] = useState('Mi Carta Custom');
  const [type, setType] = useState<CardType>('damage');
  const [description, setDescription] = useState('Una carta creada con ModdingBuild');
  const [tags, setTags] = useState<string[]>(['custom']);
  const [themeKey, setThemeKey] = useState('cosmic');
  const [rarity, setRarity] = useState<PlayableCard['rarity']>('rare');
  const [image, setImage] = useState<string | null>(null);
  const [iconImg, setIconImg] = useState<string | null>(null);
  const [sound, setSound] = useState<string | null>(null);
  const [emoji, setEmoji] = useState('');
  const [hexColor, setHexColor] = useState('#8b5cf6');
  const [useHex, setUseHex] = useState(false);
  const [hexTheme, setHexTheme] = useState<any>(null);
  const [ignoresDef, setIgnoresDef] = useState(false);
  const [formula, setFormula] = useState('');
  const [formulaType, setFormulaType] = useState<'damage' | 'heal' | 'defense'>('damage');

  const [effects, setEffects] = useState<BuilderEffect[]>([
    { kind: 'damage', target: 'enemy', amount: 50, duration: 0, ignoresDefense: false },
  ]);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const allThemes = getAllThemes();
  const THEME_KEYS = Object.keys(allThemes).slice(0, 18);
  const _mods = getInstalledMods(); void _mods;

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const addEffect = () => setEffects(prev => [...prev, { kind: 'damage', target: 'enemy', amount: 30, duration: 0, ignoresDefense: false }]);
  const removeEffect = (i: number) => setEffects(prev => prev.filter((_, idx) => idx !== i));
  const updateEffect = (i: number, patch: Partial<BuilderEffect>) => setEffects(prev => prev.map((e, idx) => idx === i ? { ...e, ...patch } : e));

  const buildCard = (): PlayableCard => {
    const id = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`;
    const builtEffects = effects.map(e => {
      const def = EFFECT_KINDS.find(k => k.value === e.kind)!;
      const eff: any = { kind: e.kind, target: e.target };
      if (def.hasAmount) eff.amount = e.amount;
      if (def.hasDuration && e.duration > 0) eff.duration = e.duration;
      if (e.ignoresDefense) eff.ignoresDefense = true;
      return eff;
    });

    const firstTarget = effects[0]?.target;
    const targetMode = firstTarget === 'all_enemies' ? 'all_enemies'
      : firstTarget === 'all_allies' ? 'all_allies'
      : firstTarget === 'self' ? 'self'
      : firstTarget === 'ally' ? 'ally' : 'enemy';

    // tema final: hex/plantilla custom o key predefinida; siempre con emoji si lo hay
    const customTheme = useHex && hexTheme
      ? { ...hexTheme, icon: emoji || undefined, label: 'Custom' }
      : { key: themeKey, icon: emoji || undefined };

    const card: PlayableCard = {
      id, name, type, value: 0, description,
      effectTiming: 'immediate', duration: 0, isInstant: false,
      targetMode, imageFront: image || null,
      media: (image || sound || iconImg) ? { image: image || null, iconImage: iconImg || null, soundOnPlay: sound || null } : undefined,
      tags, customTheme, rarity,
      ignoresDefense: ignoresDef || undefined,
      effects: builtEffects,
    };
    if (formula.trim()) card.formula = { expression: formula.trim(), resultType: formulaType };
    return card;
  };

  const installInDevBuild = () => {
    const card = buildCard();
    startEditCard(card);
    setView('cards');
    setMessage({ type: 'ok', text: '✅ Carta abierta en el Editor Visual. Guárdala en el mod que prefieras.' });
  };

  const exportAsMod = () => {
    const card = buildCard();
    const mod = { manifest: { name: `Mod: ${name}`, author: 'ModdingBuild', version: '1.0.0', description: `Carta: ${name}` }, cards: [card] };
    const blob = new Blob([JSON.stringify(mod, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${card.id}.cargasmod.json`; a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'ok', text: `📥 Exportado como ${card.id}.cargasmod.json` });
  };

  const previewCard = buildCard();

  const inputCls = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500 transition-colors';

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-800/70 to-fuchsia-950/30 border border-fuchsia-700/30 rounded-2xl p-4">
        <h2 className="text-lg font-black text-fuchsia-300 mb-1">🛠️ Constructor Visual de Cartas</h2>
        <p className="text-xs text-slate-300">Diseña cartas con efectos modulares, configura el tema visual y expórtalas o ábrelas directamente en el Editor Visual.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          {/* básicos */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-400 block mb-1">Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs font-bold text-slate-400 block mb-1">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as CardType)} className={inputCls}>
                {BUILDER_CARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
          </div>
          <div><label className="text-xs font-bold text-slate-400 block mb-1">Descripción</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-400 block mb-1">Rareza</label>
              <select value={rarity} onChange={e => setRarity(e.target.value as any)} className={inputCls}>
                {['common','uncommon','rare','epic','legendary'].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select></div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={ignoresDef} onChange={e => setIgnoresDef(e.target.checked)} />
                <span className="text-xs">Ignora defensa</span>
              </label>
            </div>
          </div>

          {/* fórmula */}
          <div className="border-t border-slate-800 pt-3">
            <label className="text-xs font-bold text-amber-400 block mb-1">🧮 Fórmula matemática (opcional)</label>
            <div className="flex gap-2">
              <input value={formula} onChange={e => setFormula(e.target.value)} placeholder="ej: target.hp * 0.25 · sqrt(attacker.lostHp)*10"
                     className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500 font-mono" />
              <select value={formulaType} onChange={e => setFormulaType(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-sm text-white outline-none">
                <option value="damage">daño</option><option value="heal">cura</option><option value="defense">defensa</option>
              </select>
            </div>
            <div className="text-[0.6rem] text-slate-500 mt-1">Variables: attacker.hp · target.hp · attacker.lostHp · target.dots · turn · attacker.dmg</div>
          </div>

          {/* tema: plantillas pre-hechas */}
          <div className="border-t border-slate-800 pt-3">
            <label className="text-xs font-bold text-slate-400 block mb-2">Tema Visual (plantillas)</label>
            <div className="flex flex-wrap gap-1.5">
              {THEME_KEYS.map(k => { const t = getCardTheme(k); return (
                <button key={k} onClick={() => { setThemeKey(k); setUseHex(false); }} title={k}
                        className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-base transition-transform ${themeKey === k && !useHex ? 'border-white scale-110 shadow-lg' : 'border-slate-700 hover:scale-105'}`}
                        style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.bgGrad})` }}>
                  {t.icon}
                </button>
              ); })}
            </div>
          </div>

          {/* color por plantilla O hex didáctico */}
          <ColorPicker
            value={hexColor}
            onTemplate={(t: ColorTemplate) => { setHexTheme({ bg: t.bg, bgGrad: t.bgGrad, border: t.border, glow: t.glow, text: t.text }); setUseHex(true); setHexColor(t.border); }}
            onChange={(hex) => { setHexColor(hex); setHexTheme({ bg: '#0f172a', bgGrad: hex + '22', border: hex, glow: hex + '88', text: '#ffffff' }); setUseHex(true); }}
            label="Color personalizado (plantilla o HEX)"
          />

          {/* emoji icono */}
          <EmojiInput value={emoji} onChange={setEmoji} label="Emoji / icono de la carta" />

          {/* tags dinámicos */}
          <div className="border-t border-slate-800 pt-3">
            <label className="text-xs font-bold text-slate-400 block mb-2">Tags / Familias (incluye los tuyos)</label>
            <div className="flex flex-wrap gap-1 max-h-44 overflow-y-auto mb-2">
              {getAllTags().map(t => (
                <button key={t} onClick={() => toggleTag(t)}
                        className={`text-xs px-2 py-0.5 rounded-lg border font-bold uppercase transition-all ${tags.includes(t) ? 'bg-fuchsia-700/60 border-fuchsia-400 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}>
                  {t}
                </button>
              ))}
            </div>
            <NewTagInline onCreate={(t) => { addCustomTag(t); if (!tags.includes(t)) setTags([...tags, t]); }} />
          </div>

          {/* media local */}
          <div className="border-t border-slate-800 pt-3 grid grid-cols-2 gap-2">
            <AssetInput kind="image" label="Imagen principal" value={image} onChange={setImage} />
            <AssetInput kind="image" label="Icono pequeño" value={iconImg} onChange={setIconImg} />
            <AssetInput kind="audio" label="Sonido al jugar" value={sound} onChange={setSound} />
          </div>

          {/* efectos */}
          <div className="border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-fuchsia-400">⚡ Efectos Modulares ({effects.length})</label>
              <button onClick={addEffect} className="px-2.5 py-1 bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-700/50 rounded-lg text-xs font-bold hover:bg-fuchsia-900">+ Efecto</button>
            </div>
            <div className="space-y-2">
              {effects.map((eff, i) => {
                const def = EFFECT_KINDS.find(k => k.value === eff.kind)!;
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <select value={eff.kind} onChange={e => updateEffect(i, { kind: e.target.value as CardEffectKind })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none">
                      {EFFECT_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </select>
                    <select value={eff.target} onChange={e => updateEffect(i, { target: e.target.value as TargetSelector })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none">
                      {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {def.hasAmount && <input type="number" value={eff.amount} onChange={e => updateEffect(i, { amount: +e.target.value })} placeholder="Valor"
                             className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none" />}
                    {def.hasDuration && <input type="number" value={eff.duration} onChange={e => updateEffect(i, { duration: +e.target.value })} placeholder="Turnos"
                             className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none" />}
                    <label className="flex items-center gap-1 text-[0.6rem] text-slate-400">
                      <input type="checkbox" checked={eff.ignoresDefense} onChange={e => updateEffect(i, { ignoresDefense: e.target.checked })} /> ignora def
                    </label>
                    <button onClick={() => removeEffect(i)} className="ml-auto w-6 h-6 rounded-lg bg-red-950 text-red-400 flex items-center justify-center text-xs hover:bg-red-900">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* preview + acciones */}
        <div className="flex flex-col items-center gap-4 bg-slate-900/20 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs font-bold text-slate-400">Vista Previa en Vivo</div>
          <CardView card={previewCard} size="lg" />

          {/* rareza visual */}
          <div className="w-full text-center text-xs font-bold py-1 rounded-lg border"
               style={{ background: RARITY_COLORS[rarity || 'common'] + '22', borderColor: RARITY_COLORS[rarity || 'common'] + '66', color: RARITY_COLORS[rarity || 'common'] }}>
            {(rarity || 'common').toUpperCase()}
          </div>

          {message && (
            <div className={`text-xs p-2 rounded-xl border w-full text-center ${message.type === 'ok' ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/50' : 'bg-red-950/50 text-red-300 border-red-700/50'}`}>
              {message.text}
            </div>
          )}

          <div className="w-full space-y-2 mt-auto">
            <button onClick={installInDevBuild} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-lg">
              ✏️ Abrir en Editor Visual
            </button>
            <button onClick={exportAsMod} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs">
              📥 Exportar .cargasmod.json
            </button>
          </div>

          <div className="text-[0.55rem] text-slate-500 text-center leading-relaxed">
            "Abrir en Editor Visual" envía la carta al editor completo (efectos condicionales, sinergias avanzadas) antes de guardarla en un mod.
          </div>
        </div>
      </div>

      {/* plantilla de ejemplo */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4">
        <div className="text-xs font-black text-emerald-300 mb-2">📦 Ejemplo: estructura completa de un mod JSON</div>
        <pre className="text-[0.55rem] text-slate-400 overflow-x-auto leading-relaxed font-mono bg-slate-950 rounded-xl p-3 max-h-72">
{`{
  "manifest": { "name": "Mi Mod", "author": "Yo", "version": "1.0.0" },
  "cards": [{
    "id": "mi_carta", "name": "Mi Carta", "type": "damage",
    "value": -60, "description": "60 daño + veneno",
    "effectTiming": "immediate", "duration": 0,
    "isInstant": false, "targetMode": "enemy", "imageFront": null,
    "tags": ["fuego"], "rarity": "epic",
    "customTheme": { "key": "cosmic" },
    "effects": [
      { "kind": "damage", "target": "enemy", "amount": 60 },
      { "kind": "dot", "target": "enemy", "amount": 15, "duration": 3, "applyTags": ["veneno"] }
    ]
  }],
  "characters": [{ "id": "mi_heroe", "name": "Héroe", "classType": "warrior",
    "hp": 3000, "defense": 50, "damage": 55, "avatar": "🦸", "color": "#22c55e",
    "passiveDescription": "Pasiva...", "imageFront": null, "imageBack": null,
    "abilities": [ /* 3 individuales + 3 equipo */ ] }],
  "combos": [{ "id": "mi_combo", "name": "Combo", "requiredCards": ["id1","id2"],
    "description": "A+B", "effectDescription": "+50 daño", "isTeamCombo": false, "bonusValue": 50 }]
}`}
        </pre>
      </div>
    </div>
  );
};
