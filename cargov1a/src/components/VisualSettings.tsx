// ============================================================
// VISUAL SETTINGS - Panel de personalización visual
// ============================================================
// Los cambios se aplican usando CSS variables en :root, que se
// sobrescriben en runtime con document.documentElement.style.
// Esto evita el problema de las clases Tailwind dinámicas que no
// compila el JIT.
//
// 🛠️ PARA MODDERS: añade un nuevo tema añadiendo una entrada en
// BG_THEMES (gradiente CSS válido).
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/cn';
import { registerCardTheme, getAllThemes } from '../utils/cardThemes';

// Aplica la configuración visual al DOM mediante CSS vars
export function applyVisualConfigToDOM(config: any) {
  const root = document.documentElement;
  if (config.bgPrimary?.startsWith('linear')) {
    root.style.setProperty('--cargas-bg', config.bgPrimary);
  }
  root.style.setProperty('--cargas-card-scale', String(config.cardScale ?? 1));
  root.style.setProperty('--cargas-panel-scale', String(config.panelScale ?? 1));
  root.style.setProperty('--cargas-panel-opacity', String(config.panelOpacity ?? 0.92));
  root.style.setProperty('--cargas-card-opacity', String(config.cardOpacity ?? 0.95));
  root.style.setProperty('--cargas-anim-speed', String(config.animationSpeed ?? 1));

  const fontSizeMap: Record<string, string> = {
    'text-xs': '12px', 'text-sm': '14px', 'text-base': '16px', 'text-lg': '18px',
  };
  root.style.setProperty('--cargas-font-size-base', fontSizeMap[config.fontSize] || '14px');

  // Clases utilitarias
  document.body.classList.toggle('cargas-high-contrast', !!config.highContrast);
  document.body.classList.toggle('cargas-colorblind', !!config.colorblindMode);
  document.body.classList.toggle('cargas-no-anim', !config.enableAnimations);
}

// ─── Temas predefinidos ────────────────────────────────────
// Cada tema = gradiente CSS válido. Los mods pueden añadir más temas
// extendiendo este array desde otro módulo si lo desean.
export const BG_THEMES = [
  { label: '🌑 Oscuro Clásico', css: 'linear-gradient(135deg, #020617 0%, #1e1b4b 50%, #020617 100%)', key: 'dark' },
  { label: '🌊 Azul Profundo',  css: 'linear-gradient(135deg, #0a1628 0%, #083344 50%, #0a1628 100%)', key: 'blue' },
  { label: '🔮 Púrpura Místico', css: 'linear-gradient(135deg, #1e0a2e 0%, #4a044e 50%, #1e0a2e 100%)', key: 'purple' },
  { label: '🌲 Verde Bosque',   css: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #052e16 100%)', key: 'green' },
  { label: '🔥 Rojo Infernal',  css: 'linear-gradient(135deg, #2d0606 0%, #431407 50%, #2d0606 100%)', key: 'red' },
  { label: '👑 Dorado Real',    css: 'linear-gradient(135deg, #2d1a06 0%, #422006 50%, #2d1a06 100%)', key: 'gold' },
  { label: '🌸 Rosa Neón',      css: 'linear-gradient(135deg, #2d0620 0%, #500724 50%, #2d0620 100%)', key: 'pink' },
  { label: '🌌 Espacial',       css: 'linear-gradient(135deg, #0c0a1e 0%, #1e1b4b 35%, #312e81 70%, #0c0a1e 100%)', key: 'space' },
  { label: '⚡ Cyber',          css: 'linear-gradient(135deg, #021617 0%, #042f2e 40%, #083344 80%, #021617 100%)', key: 'cyber' },
];

const fontOptions = [
  { label: 'Sans (moderna)', value: 'font-sans' },
  { label: 'Serif (clásica)', value: 'font-serif' },
  { label: 'Mono (técnica)', value: 'font-mono' },
];

const fontSizeOptions = [
  { label: 'A⁻ Pequeño', value: 'text-xs' },
  { label: 'A Normal',   value: 'text-sm' },
  { label: 'A⁺ Grande',  value: 'text-base' },
  { label: 'A⁺⁺ Extra',  value: 'text-lg' },
];

function sliderFill(percent: number, color = '#f59e0b') {
  return {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, rgba(51,65,85,0.9) ${percent}%, rgba(51,65,85,0.9) 100%)`,
  } as React.CSSProperties;
}

const SLIDER_CLASS = 'w-full h-3 rounded-xl appearance-none cursor-pointer accent-amber-500 border border-slate-600/60 shadow-inner';

export const VisualSettings: React.FC = () => {
  const visualConfig = useGameStore(s => s.visualConfig);
  const setVisualConfig = useGameStore(s => s.setVisualConfig);
  const resetVisualConfig = useGameStore(s => s.resetVisualConfig);

  // Estado para el creador de tema de carta custom
  const [customCardTheme, setCustomCardTheme] = useState({
    key: 'mi_tema', bg: '#1a0a2e', bgGrad: '#3d0a4e',
    border: '#9d4edd', glow: 'rgba(157,78,221,0.4)',
    text: '#e0aaff', icon: '✨', label: 'Custom',
  });
  const [themeRegistered, setThemeRegistered] = useState(false);
  const allThemes = getAllThemes();

  // Aplicar config al DOM cada vez que cambia
  useEffect(() => {
    applyVisualConfigToDOM(visualConfig);
  }, [visualConfig]);

  return (
    <div className="flex flex-col h-full max-h-[70vh] overflow-y-auto pr-2 space-y-4">
      {/* ── Vista previa en vivo ── */}
      <div
        className="rounded-xl p-4 border-2 border-amber-500/40 relative overflow-hidden"
        style={{ background: visualConfig.bgPrimary?.startsWith('linear') ? visualConfig.bgPrimary : undefined }}
      >
        <div className="text-xs font-black text-amber-400 mb-2">👁️ Vista Previa en Vivo</div>
        <div className="flex gap-2 items-center">
          <div className="w-12 h-16 rounded-lg bg-red-900/60 border-2 border-red-500 flex items-center justify-center text-lg"
               style={{ transform: `scale(${visualConfig.cardScale})`, transformOrigin: 'center' }}>⚔️</div>
          <div className={cn('flex-1 rounded-lg p-2 bg-slate-800/80 border border-slate-600', visualConfig.fontMain, visualConfig.fontSize)}
               style={{ opacity: visualConfig.panelOpacity, transform: `scale(${visualConfig.panelScale})`, transformOrigin: 'left center' }}>
            <div className="font-black text-white">Texto de ejemplo</div>
            <div className="text-slate-300 text-xs">Así se verá tu interfaz</div>
          </div>
        </div>
      </div>

      {/* ── Tema de Fondo ── */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-black text-amber-400 mb-3">🎨 Tema de Fondo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BG_THEMES.map(theme => (
            <button
              key={theme.key}
              onClick={() => setVisualConfig({ bgPrimary: theme.css, bgSecondary: '', bgAccent: '' })}
              className={cn(
                'px-3 py-3 rounded-lg text-xs font-bold transition-all border-2 relative overflow-hidden',
                visualConfig.bgPrimary === theme.css
                  ? 'border-amber-400 scale-105 shadow-lg shadow-amber-500/30'
                  : 'border-slate-600 hover:border-amber-500/50'
              )}
              style={{ background: theme.css }}
            >
              <span className="relative z-10 text-white drop-shadow-lg">{theme.label}</span>
              {visualConfig.bgPrimary === theme.css && (
                <span className="absolute top-1 right-1 text-amber-300 z-10 font-black">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tipografía ── */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-black text-amber-400 mb-3">📝 Tipografía</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {fontOptions.map(opt => (
            <button key={opt.value} onClick={() => setVisualConfig({ fontMain: opt.value })}
              className={cn('px-3 py-2 rounded-lg text-xs font-bold transition-all border-2',
                opt.value,
                visualConfig.fontMain === opt.value
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-amber-500/50')}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <span className="text-xs text-slate-300">Tamaño de fuente base</span>
          <div className="flex flex-wrap gap-2">
            {fontSizeOptions.map(opt => (
              <button key={opt.value} onClick={() => setVisualConfig({ fontSize: opt.value })}
                className={cn('px-3 py-1.5 rounded-lg font-bold transition-all border-2', opt.value,
                  visualConfig.fontSize === opt.value
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-amber-500/50')}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Escalas ── */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-black text-amber-400 mb-3">📏 Escalas</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-300">Escala de cartas</span>
              <span className="text-xs text-amber-400 font-bold">{visualConfig.cardScale.toFixed(2)}x</span>
            </div>
            <input type="range" min="0.6" max="1.5" step="0.05" value={visualConfig.cardScale}
              onChange={e => setVisualConfig({ cardScale: parseFloat(e.target.value) })}
              className={SLIDER_CLASS}
              style={sliderFill(((visualConfig.cardScale - 0.6) / (1.5 - 0.6)) * 100, '#f59e0b')} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-300">Escala de paneles de jugador</span>
              <span className="text-xs text-amber-400 font-bold">{visualConfig.panelScale.toFixed(2)}x</span>
            </div>
            <input type="range" min="0.8" max="1.3" step="0.05" value={visualConfig.panelScale}
              onChange={e => setVisualConfig({ panelScale: parseFloat(e.target.value) })}
              className={SLIDER_CLASS}
              style={sliderFill(((visualConfig.panelScale - 0.8) / (1.3 - 0.8)) * 100, '#38bdf8')} />
          </div>
        </div>
      </div>

      {/* ── Opacidad ── */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-black text-amber-400 mb-3">👁️ Opacidad de Paneles</h3>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-300">Opacidad</span>
          <span className="text-xs text-amber-400 font-bold">{Math.round(visualConfig.panelOpacity * 100)}%</span>
        </div>
        <input type="range" min="0.6" max="1" step="0.05" value={visualConfig.panelOpacity}
          onChange={e => setVisualConfig({ panelOpacity: parseFloat(e.target.value) })}
          className={SLIDER_CLASS}
          style={sliderFill(((visualConfig.panelOpacity - 0.6) / (1 - 0.6)) * 100, '#34d399')} />
      </div>

      {/* ── Animaciones ── */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-black text-amber-400 mb-3">✨ Animaciones</h3>
        <label className="flex items-center justify-between cursor-pointer mb-3">
          <span className="text-xs text-slate-300">Activar animaciones (daño, shake, popups)</span>
          <input type="checkbox" checked={visualConfig.enableAnimations}
            onChange={e => setVisualConfig({ enableAnimations: e.target.checked })}
            className="w-5 h-5 rounded accent-amber-500" />
        </label>
        {visualConfig.enableAnimations && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-300">Velocidad de animaciones</span>
              <span className="text-xs text-amber-400 font-bold">{visualConfig.animationSpeed.toFixed(1)}x</span>
            </div>
            <input type="range" min="0.5" max="2" step="0.1" value={visualConfig.animationSpeed}
              onChange={e => setVisualConfig({ animationSpeed: parseFloat(e.target.value) })}
              className={SLIDER_CLASS}
              style={sliderFill(((visualConfig.animationSpeed - 0.5) / (2 - 0.5)) * 100, '#e879f9')} />
          </div>
        )}
      </div>

      {/* ── Accesibilidad ── */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-black text-amber-400 mb-3">♿ Accesibilidad</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-slate-300">🔆 Alto contraste</span>
            <input type="checkbox" checked={visualConfig.highContrast}
              onChange={e => setVisualConfig({ highContrast: e.target.checked })}
              className="w-5 h-5 rounded accent-amber-500" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-slate-300">🎨 Modo daltónico (filtro de saturación)</span>
            <input type="checkbox" checked={visualConfig.colorblindMode}
              onChange={e => setVisualConfig({ colorblindMode: e.target.checked })}
              className="w-5 h-5 rounded accent-amber-500" />
          </label>
        </div>
      </div>

      <button onClick={() => { resetVisualConfig(); }}
        className="w-full py-2.5 rounded-lg bg-red-900/40 text-red-300 text-xs font-bold hover:bg-red-800/50 transition-colors border border-red-700/40">
        🔄 Restaurar valores predeterminados
      </button>

      {/* ── Catálogo de Temas de Carta ── */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-black text-amber-400 mb-1">🎨 Temas de Carta Disponibles</h3>
        <p className="text-[0.58rem] text-slate-400 mb-3">
          Los mods pueden añadir sus propios temas con <code className="text-cyan-300 bg-slate-900 px-1 rounded">registerCardTheme(key, cfg)</code>
        </p>
        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {Object.entries(allThemes).map(([key, t]) => (
            <div key={key}
              className="rounded-lg border p-1.5 text-center relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.bgGrad})`, borderColor: t.border }}
              title={`key: "${key}"\nborder: ${t.border}`}
            >
              <div className="text-lg">{t.icon}</div>
              <div className="text-[0.38rem] font-black leading-tight" style={{ color: t.text }}>{t.label}</div>
              <div className="text-[0.32rem] text-white/50 font-mono">{key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Creador de Tema Personalizado ── */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-black text-fuchsia-400 mb-2">✦ Crear Tema Personalizado</h3>
        <p className="text-[0.58rem] text-slate-400 mb-3">
          Diseña un tema y regístralo para usarlo en tus cartas/mods con <code className="text-cyan-300 bg-slate-900 px-1 rounded">customTheme: {"{ key: '..." + customCardTheme.key + "' }"}</code>
        </p>

        {/* Vista previa */}
        <div className="flex items-center justify-center mb-3">
          <div
            className="w-20 h-28 rounded-xl border-2 p-2 flex flex-col items-center justify-center shadow-xl"
            style={{
              background: `linear-gradient(160deg, ${customCardTheme.bg}, ${customCardTheme.bgGrad})`,
              borderColor: customCardTheme.border,
              boxShadow: `0 0 16px ${customCardTheme.glow}`,
            }}
          >
            <div className="text-2xl mb-1">{customCardTheme.icon}</div>
            <div className="text-[0.5rem] font-black text-center" style={{ color: customCardTheme.text }}>
              {customCardTheme.label}
            </div>
            <div className="text-[0.4rem] text-white/60 mt-1">tu carta</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[0.6rem] text-slate-400 block mb-0.5">Key (identificador)</label>
            <input value={customCardTheme.key}
              onChange={e => setCustomCardTheme(s => ({ ...s, key: e.target.value }))}
              className="w-full bg-slate-700 rounded px-2 py-1 text-xs border border-slate-600 focus:border-fuchsia-500 outline-none text-white font-mono"
              placeholder="mi_tema" />
          </div>
          <div>
            <label className="text-[0.6rem] text-slate-400 block mb-0.5">Icono</label>
            <input value={customCardTheme.icon}
              onChange={e => setCustomCardTheme(s => ({ ...s, icon: e.target.value }))}
              className="w-full bg-slate-700 rounded px-2 py-1 text-xs border border-slate-600 focus:border-fuchsia-500 outline-none text-white"
              placeholder="✨" />
          </div>
          <div>
            <label className="text-[0.6rem] text-slate-400 block mb-0.5">Etiqueta</label>
            <input value={customCardTheme.label}
              onChange={e => setCustomCardTheme(s => ({ ...s, label: e.target.value }))}
              className="w-full bg-slate-700 rounded px-2 py-1 text-xs border border-slate-600 focus:border-fuchsia-500 outline-none text-white"
              placeholder="Custom" />
          </div>
          <div>
            <label className="text-[0.6rem] text-slate-400 block mb-0.5">Color texto</label>
            <input type="color" value={customCardTheme.text}
              onChange={e => setCustomCardTheme(s => ({ ...s, text: e.target.value }))}
              className="w-full h-8 rounded cursor-pointer border border-slate-600" />
          </div>
          <div>
            <label className="text-[0.6rem] text-slate-400 block mb-0.5">Fondo primario</label>
            <input type="color" value={customCardTheme.bg}
              onChange={e => setCustomCardTheme(s => ({ ...s, bg: e.target.value }))}
              className="w-full h-8 rounded cursor-pointer border border-slate-600" />
          </div>
          <div>
            <label className="text-[0.6rem] text-slate-400 block mb-0.5">Fondo degradado</label>
            <input type="color" value={customCardTheme.bgGrad}
              onChange={e => setCustomCardTheme(s => ({ ...s, bgGrad: e.target.value }))}
              className="w-full h-8 rounded cursor-pointer border border-slate-600" />
          </div>
          <div>
            <label className="text-[0.6rem] text-slate-400 block mb-0.5">Color borde</label>
            <input type="color" value={customCardTheme.border}
              onChange={e => setCustomCardTheme(s => ({ ...s, border: e.target.value }))}
              className="w-full h-8 rounded cursor-pointer border border-slate-600" />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              registerCardTheme(customCardTheme.key, customCardTheme);
              setThemeRegistered(true);
              setTimeout(() => setThemeRegistered(false), 2500);
            }}
            className="flex-1 py-2 rounded-lg bg-fuchsia-700/60 text-fuchsia-200 text-xs font-bold hover:bg-fuchsia-600/70 border border-fuchsia-600/50 transition-colors"
          >
            ✦ Registrar Tema
          </button>
        </div>

        {themeRegistered && (
          <div className="mt-2 text-[0.62rem] text-green-300 bg-green-950/40 rounded-lg px-3 py-2 border border-green-700/40">
            ✅ Tema "<code className="font-mono">{customCardTheme.key}</code>" registrado.
            Úsalo con <code className="bg-slate-900 px-1 rounded">customTheme: {`{ key: '${customCardTheme.key}' }`}</code>
          </div>
        )}

        <div className="mt-2 text-[0.55rem] text-slate-500 leading-relaxed">
          Para usar en tus cartas permanentemente, añade a <code className="text-cyan-300">main.tsx</code>:<br/>
          <code className="text-green-300 font-mono">registerCardTheme('{customCardTheme.key}', {'{...}'})</code>
        </div>
      </div>
    </div>
  );
};
