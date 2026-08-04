// ============================================================
// 🎨 SISTEMA DE TEMAS DE CARTA — CATÁLOGO Y REGISTRO
// ============================================================
// Permite crear temas visuales completamente personalizados para
// cartas. Los mods pueden registrar nuevos temas con colores,
// gradientes, iconos y etiquetas propios.
//
// ════════════════════════════════════════════════════════════
// 🛠️ CÓMO CREAR UN TEMA NUEVO (para mods / DLC)
// ════════════════════════════════════════════════════════════
//
//   1. Importa `registerCardTheme` y `getCardTheme`
//   2. Registra tu tema:
//
//      registerCardTheme('mi_tipo', {
//        bg:     '#1a0a2e',          // color fondo (CSS hex)
//        bgGrad: '#3d0a4e',          // color degradado secundario
//        border: '#9d4edd',          // color del borde
//        glow:   'rgba(157,78,221,0.4)', // color del brillo hover
//        text:   '#e0aaff',          // color del texto
//        icon:   '🌌',               // emoji del tipo
//        label:  'Cósmico',          // etiqueta en la carta
//      });
//
//   3. Úsalo en tu carta:
//        { type: 'damage', customTheme: { key: 'mi_tipo' } }
//        -- o bien el type directamente si registraste el key
//        -- como un nuevo CardType
//
// ════════════════════════════════════════════════════════════
// También puedes dar `customTheme` inline a una carta:
//
//   customTheme: {
//     bgGradient: 'from-violet-900 via-purple-800 to-fuchsia-900',
//     borderColor: 'border-violet-400',
//     icon: '💜',
//     label: 'Arcano',
//   }
//
// ════════════════════════════════════════════════════════════

export interface CardThemeConfig {
  /** Color de fondo primario (hex o rgba) */
  bg: string;
  /** Color de fondo secundario para el gradiente */
  bgGrad: string;
  /** Color del borde */
  border: string;
  /** Color del brillo al hover (rgba con alpha) */
  glow: string;
  /** Color del texto */
  text: string;
  /** Emoji/icono */
  icon: string;
  /** Etiqueta corta visible en la carta */
  label: string;
}

// ─── Catálogo base de temas ────────────────────────────────
// Cada tipo de carta base tiene un tema definido aquí.
// Los estilos se aplican con style={} en GameCard para evitar
// el problema de Tailwind JIT con clases dinámicas.
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

  // ── TEMAS EXTRA (disponibles para mods con customTheme: {key:...}) ──
  // Se pueden usar tanto como type de carta como tema personalizado.
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

// ─── Registro dinámico (para mods) ────────────────────────
const customThemes: Record<string, CardThemeConfig> = {};

/**
 * Registra un nuevo tema de carta desde un mod o DLC.
 * @param key  - identificador único del tema (ej: 'mi_mod_cosmico')
 * @param theme - configuración visual completa
 *
 * @example
 * registerCardTheme('elven', {
 *   bg: '#062b1a', bgGrad: '#064e3b',
 *   border: '#34d399', glow: 'rgba(52,211,153,0.4)',
 *   text: '#d1fae5', icon: '🍃', label: 'Élfico'
 * });
 */
export function registerCardTheme(key: string, theme: CardThemeConfig): void {
  customThemes[key] = theme;
}

/**
 * Obtiene el tema de carta por clave.
 * Primero busca en temas de mods, luego en los base.
 * Si no existe, devuelve un tema neutro.
 */
export function getCardTheme(key: string): CardThemeConfig {
  return customThemes[key] || BUILTIN_THEMES[key] || BUILTIN_THEMES.special;
}

/**
 * Devuelve todos los temas disponibles (base + mods).
 * Útil para mostrar en el selector de tema en el editor de mods.
 */
export function getAllThemes(): Record<string, CardThemeConfig> {
  return { ...BUILTIN_THEMES, ...customThemes };
}

/**
 * Genera los estilos CSS `style={{...}}` para una carta,
 * aplicando el tema indicado y respetando `customTheme` inline.
 *
 * @param key - clave del tema (ej: card.type o card.customTheme.key)
 * @param isSelected - si la carta está seleccionada
 * @param isInstant  - si es carta instantánea
 */
export function getCardStyleProps(
  key: string,
  isSelected: boolean = false,
  isInstant: boolean = false,
): React.CSSProperties {
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

// Re-exporta el tipo para uso en otros archivos
export type { CardThemeConfig as CardTheme };
