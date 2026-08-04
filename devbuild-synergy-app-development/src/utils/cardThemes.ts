// ============================================================
// 🎨 SISTEMA DE TEMAS DE CARTA (real, alineado con CARGAS)
// ============================================================
import type React from 'react';
import { CardTheme as CardThemeInline } from '../types/game';

export interface CardThemeConfig {
  bg: string;
  bgGrad: string;
  border: string;
  glow: string;
  text: string;
  icon: string;
  label: string;
}

const BUILTIN_THEMES: Record<string, CardThemeConfig> = {
  damage:           { bg:'#7f1d1d', bgGrad:'#991b1b', border:'#f87171', glow:'rgba(248,113,113,0.35)', text:'#fecaca', icon:'⚔️',  label:'Daño'   },
  damage_over_time: { bg:'#4a1d96', bgGrad:'#5b21b6', border:'#a78bfa', glow:'rgba(167,139,250,0.35)', text:'#ede9fe', icon:'☠️',  label:'DoT'    },
  heal:             { bg:'#14532d', bgGrad:'#166534', border:'#4ade80', glow:'rgba(74,222,128,0.35)',   text:'#dcfce7', icon:'💚',  label:'Cura'   },
  defense:          { bg:'#1e3a5f', bgGrad:'#1d4ed8', border:'#60a5fa', glow:'rgba(96,165,250,0.35)',  text:'#dbeafe', icon:'🛡️', label:'Def'    },
  dodge:            { bg:'#164e63', bgGrad:'#0891b2', border:'#67e8f9', glow:'rgba(103,232,249,0.35)', text:'#cffafe', icon:'💨',  label:'Esquive'},
  utility:          { bg:'#78350f', bgGrad:'#92400e', border:'#fbbf24', glow:'rgba(251,191,36,0.35)',  text:'#fef3c7', icon:'🎯',  label:'Util'   },
  special:          { bg:'#7c2d12', bgGrad:'#9a3412', border:'#fb923c', glow:'rgba(251,146,60,0.35)',  text:'#ffedd5', icon:'⭐',  label:'Esp'    },
  elemental:        { bg:'#0c4a6e', bgGrad:'#0369a1', border:'#38bdf8', glow:'rgba(56,189,248,0.35)',  text:'#e0f2fe', icon:'🌀',  label:'Elem'   },
  summon:           { bg:'#3b0764', bgGrad:'#4c1d95', border:'#c084fc', glow:'rgba(192,132,252,0.35)', text:'#f3e8ff', icon:'👻',  label:'Inv'    },
  curse:            { bg:'#4c0519', bgGrad:'#881337', border:'#fb7185', glow:'rgba(251,113,133,0.35)', text:'#ffe4e6', icon:'🩸',  label:'Mal'    },
  buff:             { bg:'#14532d', bgGrad:'#15803d', border:'#86efac', glow:'rgba(134,239,172,0.35)', text:'#dcfce7', icon:'✨',  label:'Buff'   },
  counter:          { bg:'#7c2d12', bgGrad:'#b45309', border:'#fcd34d', glow:'rgba(252,211,77,0.35)',  text:'#fef9c3', icon:'🔄',  label:'Contra' },
  ritual:           { bg:'#500724', bgGrad:'#9f1239', border:'#f472b6', glow:'rgba(244,114,182,0.35)', text:'#fce7f3', icon:'🕯️', label:'Rito'   },
  reaction:         { bg:'#134e4a', bgGrad:'#0f766e', border:'#5eead4', glow:'rgba(94,234,212,0.35)',  text:'#ccfbf1', icon:'⚡',  label:'React'  },
  terrain:          { bg:'#451a03', bgGrad:'#713f12', border:'#fde68a', glow:'rgba(253,230,138,0.35)', text:'#fef9c3', icon:'🌍',  label:'Campo'  },
  channel:          { bg:'#1e1b4b', bgGrad:'#312e81', border:'#818cf8', glow:'rgba(129,140,248,0.35)', text:'#e0e7ff', icon:'🔮',  label:'Canal'  },
  // extra
  cosmic:           { bg:'#0f0728', bgGrad:'#1a0547', border:'#c084fc', glow:'rgba(192,132,252,0.5)', text:'#f3e8ff', icon:'🌌', label:'Cósmico' },
  toxic:            { bg:'#1a2e05', bgGrad:'#365314', border:'#a3e635', glow:'rgba(163,230,53,0.4)',  text:'#ecfccb', icon:'☢️', label:'Tóxico'  },
  shadow:           { bg:'#0f0f0f', bgGrad:'#1c1917', border:'#78716c', glow:'rgba(120,113,108,0.3)', text:'#d6d3d1', icon:'🌑', label:'Sombra'  },
  ice:              { bg:'#082f49', bgGrad:'#0c4a6e', border:'#7dd3fc', glow:'rgba(125,211,252,0.5)', text:'#e0f2fe', icon:'❄️', label:'Hielo'   },
  thunder:          { bg:'#3b1f06', bgGrad:'#78350f', border:'#fde047', glow:'rgba(253,224,71,0.5)',  text:'#fefce8', icon:'⚡', label:'Rayo'    },
  nature:           { bg:'#052e16', bgGrad:'#14532d', border:'#4ade80', glow:'rgba(74,222,128,0.4)',  text:'#f0fdf4', icon:'🌿', label:'Natural' },
  blood:            { bg:'#450a0a', bgGrad:'#7f1d1d', border:'#ef4444', glow:'rgba(239,68,68,0.5)',   text:'#fee2e2', icon:'🩸', label:'Sangre'  },
  arcane:           { bg:'#1e0a2e', bgGrad:'#3d0a4e', border:'#e879f9', glow:'rgba(232,121,249,0.45)',text:'#fae8ff', icon:'✦',  label:'Arcano'  },
  gold:             { bg:'#422006', bgGrad:'#78350f', border:'#fbbf24', glow:'rgba(251,191,36,0.5)',  text:'#fef3c7', icon:'👑', label:'Dorado'  },
  steel:            { bg:'#1c1917', bgGrad:'#292524', border:'#9ca3af', glow:'rgba(156,163,175,0.35)',text:'#f3f4f6', icon:'⚙️', label:'Acero'   },
  void:             { bg:'#050505', bgGrad:'#0a0a0a', border:'#6366f1', glow:'rgba(99,102,241,0.5)', text:'#e0e7ff', icon:'🕳️', label:'Vacío'   },
  divine:           { bg:'#451a03', bgGrad:'#7c2d12', border:'#fde68a', glow:'rgba(253,230,138,0.6)', text:'#fefce8', icon:'✦', label:'Divino'  },
  poison:           { bg:'#1a0a2e', bgGrad:'#2e1065', border:'#a855f7', glow:'rgba(168,85,247,0.4)',  text:'#f3e8ff', icon:'☠', label:'Veneno'  },
};

const customThemes: Record<string, CardThemeConfig> = {};

export function registerCardTheme(key: string, theme: CardThemeConfig): void {
  customThemes[key] = theme;
}

export function getCardTheme(key: string): CardThemeConfig {
  return customThemes[key] || BUILTIN_THEMES[key] || BUILTIN_THEMES.special;
}

export function getAllThemes(): Record<string, CardThemeConfig> {
  return { ...BUILTIN_THEMES, ...customThemes };
}

export function getCardStyleProps(key: string, isSelected = false, isInstant = false): React.CSSProperties {
  const t = getCardTheme(key);
  return {
    background: `linear-gradient(160deg, ${t.bg} 0%, ${t.bgGrad} 100%)`,
    borderColor: t.border,
    color: t.text,
    boxShadow: isSelected
      ? `0 0 0 2px #fde047, 0 0 20px ${t.glow}`
      : isInstant
        ? `0 0 0 1px rgba(103,232,249,0.5), 0 4px 12px ${t.glow}`
        : `0 4px 12px ${t.glow}`,
  };
}

/** Combina el tema del type con el customTheme inline de una carta (para DevBuild). */
export function resolveCardTheme(type: string, custom?: CardThemeInline): CardThemeConfig {
  const base = getCardTheme(custom?.key || type);
  if (!custom) return base;
  return {
    bg: custom.bg ?? base.bg,
    bgGrad: custom.bgGrad ?? base.bgGrad,
    border: custom.border ?? base.border,
    glow: custom.glow ?? base.glow,
    text: custom.text ?? base.text,
    icon: custom.icon ?? base.icon,
    label: custom.label ?? base.label,
  };
}

export type { CardThemeConfig as CardTheme };
