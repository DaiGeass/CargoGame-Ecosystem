// ============================================================
// COLOR PICKER DIDÁCTICO — plantillas pre-hechas + HEX manual
// ============================================================
import React, { useState } from 'react';

// Plantillas de paletas pre-hechas (gradientes de carta)
export interface ColorTemplate {
  key: string;
  label: string;
  icon: string;
  bg: string;
  bgGrad: string;
  border: string;
  glow: string;
  text: string;
}

export const COLOR_TEMPLATES: ColorTemplate[] = [
  { key: 'fire',    label: 'Fuego',    icon: '🔥', bg: '#7f1d1d', bgGrad: '#991b1b', border: '#f87171', glow: 'rgba(248,113,113,0.5)', text: '#fef2f2' },
  { key: 'frost',   label: 'Hielo',    icon: '❄️', bg: '#082f49', bgGrad: '#0c4a6e', border: '#7dd3fc', glow: 'rgba(125,211,252,0.5)', text: '#e0f2fe' },
  { key: 'nature',  label: 'Natura',   icon: '🌿', bg: '#052e16', bgGrad: '#14532d', border: '#4ade80', glow: 'rgba(74,222,128,0.5)',  text: '#f0fdf4' },
  { key: 'cosmic',  label: 'Cósmico',  icon: '🌌', bg: '#0f0728', bgGrad: '#1a0547', border: '#c084fc', glow: 'rgba(192,132,252,0.5)', text: '#f3e8ff' },
  { key: 'shadow',  label: 'Sombra',   icon: '🌑', bg: '#0f0f0f', bgGrad: '#1c1917', border: '#78716c', glow: 'rgba(120,113,108,0.4)', text: '#d6d3d1' },
  { key: 'holy',    label: 'Sagrado',  icon: '☀️', bg: '#451a03', bgGrad: '#7c2d12', border: '#fde68a', glow: 'rgba(253,230,138,0.6)', text: '#fefce8' },
  { key: 'blood',   label: 'Sangre',   icon: '🩸', bg: '#450a0a', bgGrad: '#7f1d1d', border: '#ef4444', glow: 'rgba(239,68,68,0.5)',   text: '#fee2e2' },
  { key: 'poison',  label: 'Veneno',   icon: '☠️', bg: '#1a0a2e', bgGrad: '#2e1065', border: '#a855f7', glow: 'rgba(168,85,247,0.5)',  text: '#f3e8ff' },
  { key: 'arcane',  label: 'Arcano',   icon: '✦',  bg: '#1e0a2e', bgGrad: '#3d0a4e', border: '#e879f9', glow: 'rgba(232,121,249,0.5)', text: '#fae8ff' },
  { key: 'gold',    label: 'Dorado',   icon: '👑', bg: '#422006', bgGrad: '#78350f', border: '#fbbf24', glow: 'rgba(251,191,36,0.5)',  text: '#fef3c7' },
  { key: 'steel',   label: 'Acero',    icon: '⚙️', bg: '#1c1917', bgGrad: '#292524', border: '#9ca3af', glow: 'rgba(156,163,175,0.4)', text: '#f3f4f6' },
  { key: 'void',    label: 'Vacío',    icon: '🕳️', bg: '#050505', bgGrad: '#0a0a0a', border: '#6366f1', glow: 'rgba(99,102,241,0.5)',  text: '#e0e7ff' },
  { key: 'thunder', label: 'Rayo',     icon: '⚡', bg: '#3b1f06', bgGrad: '#78350f', border: '#fde047', glow: 'rgba(253,224,71,0.5)',  text: '#fefce8' },
  { key: 'toxic',   label: 'Tóxico',   icon: '☢️', bg: '#1a2e05', bgGrad: '#365314', border: '#a3e635', glow: 'rgba(163,230,53,0.4)',  text: '#ecfccb' },
];

// Paleta rápida de swatches HEX para clic directo
const QUICK_SWATCHES = [
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6',
  '#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899',
  '#f43f5e','#78716c','#64748b','#1e293b','#0f172a','#fafafa','#fbbf24','#34d399',
];

interface Props {
  /** Modo simple: solo un color */
  value?: string;
  onChange?: (hex: string) => void;
  /** Modo plantilla: aplica un set completo de colores */
  onTemplate?: (t: ColorTemplate) => void;
  label?: string;
}

export const ColorPicker: React.FC<Props> = ({ value = '#8b5cf6', onChange, onTemplate, label }) => {
  const [mode, setMode] = useState<'templates' | 'custom'>('templates');

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 space-y-3">
      {label && <div className="text-xs font-bold text-slate-400 uppercase">{label}</div>}

      {/* tabs */}
      <div className="flex gap-1">
        <button onClick={() => setMode('templates')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg ${mode === 'templates' ? 'bg-fuchsia-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          🎨 Plantillas
        </button>
        <button onClick={() => setMode('custom')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg ${mode === 'custom' ? 'bg-fuchsia-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          🎛️ Color HEX
        </button>
      </div>

      {mode === 'templates' ? (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {COLOR_TEMPLATES.map(t => (
            <button key={t.key} onClick={() => onTemplate?.(t)} title={t.label}
                    className="aspect-square rounded-xl border-2 border-slate-700 hover:border-white hover:scale-105 transition-all flex flex-col items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.bgGrad})` }}>
              <span className="text-lg">{t.icon}</span>
              <span className="text-[0.45rem] font-bold mt-0.5" style={{ color: t.text }}>{t.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* picker nativo + hex input */}
          <div className="flex items-center gap-3">
            <input type="color" value={value} onChange={e => onChange?.(e.target.value)}
                   className="w-14 h-14 rounded-xl border-2 border-slate-700 bg-transparent cursor-pointer" />
            <div className="flex-1">
              <div className="text-[0.6rem] text-slate-500 mb-1">Código HEX</div>
              <input value={value} onChange={e => onChange?.(e.target.value)} placeholder="#8b5cf6"
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-fuchsia-500 font-mono" />
            </div>
            <div className="w-14 h-14 rounded-xl border border-slate-700" style={{ background: value }} />
          </div>
          {/* swatches rápidos */}
          <div>
            <div className="text-[0.6rem] text-slate-500 mb-1.5">Colores rápidos (clic)</div>
            <div className="grid grid-cols-12 gap-1">
              {QUICK_SWATCHES.map(c => (
                <button key={c} onClick={() => onChange?.(c)} title={c}
                        className={`aspect-square rounded-md border hover:scale-110 transition-transform ${value.toLowerCase() === c.toLowerCase() ? 'border-white ring-1 ring-white' : 'border-slate-700'}`}
                        style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="text-[0.55rem] text-slate-500 bg-slate-800/50 rounded-lg p-2">
            💡 El HEX es un código de 6 dígitos: <code className="text-cyan-300">#RRGGBB</code> (Rojo, Verde, Azul de 00 a FF). Ej: <code className="text-red-400">#ff0000</code> = rojo puro.
          </div>
        </div>
      )}
    </div>
  );
};
