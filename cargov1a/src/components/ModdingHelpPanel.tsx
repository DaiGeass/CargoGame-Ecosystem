// ============================================================
// PANEL DE AYUDA DE MODDING (ejemplo de panel modular de menú)
// ============================================================
// Este panel demuestra el sistema modular: se registra con
// registerMenuPanel() y aparece automáticamente como pestaña.
// También sirve como guía rápida de modding dentro del juego.
// ============================================================

import React, { useState } from 'react';
import { cn } from '../utils/cn';

// ─── Generadores de templates JSON ────────────────────────
function downloadJSON(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function buildCardTemplate(): object {
  return {
    id: 'mi_carta_id',
    name: 'Mi Carta',
    type: 'damage',
    value: -50,
    description: 'Descripción de la carta',
    effectTiming: 'immediate',
    duration: 0,
    isInstant: false,
    targetMode: 'enemy',
    imageFront: '/placeholders/mi_carta.png',
    tags: ['mi_tag'],
    rarity: 'common',
    // ── Opcional: media assets (imagen/sonido) ──
    media: {
      image: null,
      iconImage: null,
      soundOnHover: null,
      soundOnPlay: null,
      soundOnResolve: null
    },
    // ── Opcional: customTheme (colores inline) ──
    customTheme: {
      key: 'cosmic',
      // O usa colores directos: { bg:'#1a0a2e', bgGrad:'#3d0a4e', border:'#9d4edd', glow:'rgba(157,78,221,0.4)', text:'#e0aaff', icon:'🌌', label:'Cósmico' }
    }
  };
}

function buildEffectsTemplate(): object {
  return {
    id: 'mi_super_carta',
    name: 'Carta Modular',
    type: 'elemental', value: 0,
    description: 'Daño AOE + veneno + cura + robo',
    effectTiming: 'immediate', duration: 0, isInstant: false,
    targetMode: 'all_enemies',
    imageFront: null,
    tags: ['magia', 'aoe'],
    effects: [
      { kind: 'damage', target: 'all_enemies', amount: 40, label: 'Explosión' },
      { kind: 'dot', target: 'all_enemies', amount: 15, duration: 3, applyTags: ['veneno'] },
      { kind: 'heal', target: 'self', amount: 30 },
      { kind: 'draw_cards', target: 'self', amount: 1 }
    ]
  };
}

function buildCharacterTemplate(): object {
  return {
    id: 'mi_heroe',
    name: 'Mi Héroe',
    classType: 'warrior',
    hp: 3200, defense: 50, damage: 55,
    avatar: '🦸', color: '#e11d48',
    passiveDescription: '⚡ Pasiva: +50 daño con cartas [mi_tag]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +20 daño con [mi_tag]',
    imageFront: null, imageBack: null,
    media: {
      imageFront: null,
      imageBack: null,
      iconImage: null,
      soundOnIntro: null
    },
    abilities: [
      { id: 'heroe_h1', name: 'Golpe Heroico', description: '120 daño', cooldown: 6, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'enemy' },
      { id: 'heroe_h2', name: 'Defensa', description: 'Resiste 1 ataque', cooldown: 10, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'self' },
      { id: 'heroe_h3', name: 'Grito', description: '+40 daño 2t', cooldown: 8, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'self' },
      { id: 'heroe_e1', name: 'Inspirar', description: '+60 daño aliado 2t', cooldown: 10, currentCooldown: 0, isTeamAbility: true, passive: '', canTarget: 'ally' },
      { id: 'heroe_e2', name: 'Proteger', description: '+50 def aliado 2t', cooldown: 10, currentCooldown: 0, isTeamAbility: true, passive: '', canTarget: 'ally' },
      { id: 'heroe_e3', name: 'Sanar', description: 'Cura 300 HP aliado', cooldown: 12, currentCooldown: 0, isTeamAbility: true, passive: '', canTarget: 'ally' }
    ]
  };
}

function buildComboTemplate(): object {
  return {
    id: 'combo_mi_combo',
    name: 'Mi Combo',
    requiredCards: ['carta_a', 'carta_b'],
    description: 'Carta A + Carta B',
    effectDescription: '+50 daño devastador',
    isTeamCombo: false,
    bonusValue: 50
  };
}

// ─── Lista completa de tags disponibles ────────────────────
const ALL_TAGS = [
  'arco','flecha','ballesta','espada','melee','lanza','daga','veneno',
  'fuego','polvora','magia','hechizo','cura','pirata','ladron',
  'bleed','regen','nature','sagrado','trampa','robo','cementerio',
  'stack','aoe','choice','control','execute','pierce','reflejo',
  'tiempo','hielo','rayo','sombra','tierra','vampiro','cazador',
  'psiquico','tag','shield','custom','hunt','acido','oscuro',
  'combo','channel','destino','rabia','desperate','dot_synergy',
  'pierce','acido'
];

// Mapa de clases estáticas por color (Tailwind JIT necesita clases completas)
const COLOR_CLASSES: Record<string, { title: string; tipBg: string; tipText: string; tipBorder: string }> = {
  amber:   { title: 'text-amber-300',   tipBg: 'bg-amber-950/30',   tipText: 'text-amber-200',   tipBorder: 'border-amber-800/40' },
  fuchsia: { title: 'text-fuchsia-300', tipBg: 'bg-fuchsia-950/30', tipText: 'text-fuchsia-200', tipBorder: 'border-fuchsia-800/40' },
  cyan:    { title: 'text-cyan-300',    tipBg: 'bg-cyan-950/30',    tipText: 'text-cyan-200',    tipBorder: 'border-cyan-800/40' },
  red:     { title: 'text-red-300',     tipBg: 'bg-red-950/30',     tipText: 'text-red-200',     tipBorder: 'border-red-800/40' },
  purple:  { title: 'text-purple-300',  tipBg: 'bg-purple-950/30',  tipText: 'text-purple-200',  tipBorder: 'border-purple-800/40' },
  green:   { title: 'text-green-300',   tipBg: 'bg-green-950/30',   tipText: 'text-green-200',   tipBorder: 'border-green-800/40' },
  pink:    { title: 'text-pink-300',    tipBg: 'bg-pink-950/30',    tipText: 'text-pink-200',    tipBorder: 'border-pink-800/40' },
  blue:    { title: 'text-blue-300',    tipBg: 'bg-blue-950/30',    tipText: 'text-blue-200',    tipBorder: 'border-blue-800/40' },
  teal:    { title: 'text-teal-300',    tipBg: 'bg-teal-950/30',    tipText: 'text-teal-200',    tipBorder: 'border-teal-800/40' },
};

const SECTIONS = [
  {
    id: 'carta',
    title: '🎴 Crear una Carta',
    color: 'amber',
    code: `{
  id: 'mi_carta',
  name: 'Mi Carta',
  type: 'damage',     // damage|heal|defense|...
  value: -60,         // negativo = daño
  description: '60 daño',
  effectTiming: 'immediate',
  duration: 0,
  isInstant: false,
  targetMode: 'enemy',
  imageFront: '/placeholders/x.png',
  tags: ['espada', 'melee'],
  rarity: 'rare'
}`,
    tip: 'Añádela al array playableCards en src/data/cards.ts',
  },
  {
    id: 'formula',
    title: '📐 Carta con Fórmula',
    color: 'fuchsia',
    code: `{
  id: 'golpe_pct',
  name: 'Golpe Proporcional',
  type: 'damage', value: -10,
  description: '25% del HP enemigo',
  targetMode: 'enemy',
  formula: {
    expression: 'target.hp * 0.25',
    resultType: 'damage'
  }
}`,
    tip: 'Variables: attacker.hp, target.hp, target.dots, turn... Operadores: + - * / ^ %',
  },
  {
    id: 'modular',
    title: '🧩 Carta Modular (effects[])',
    color: 'cyan',
    code: `{
  id: 'combo_card',
  name: 'Carta Combo',
  type: 'elemental', value: 0,
  targetMode: 'all_enemies',
  effects: [
    { kind: 'damage', target: 'all_enemies', amount: 40 },
    { kind: 'dot', target: 'all_enemies',
      amount: 15, duration: 3 },
    { kind: 'heal', target: 'self', amount: 30 }
  ]
}`,
    tip: 'effects[] permite combinar daño, DoT, cura, control, etc. ¡Lo más potente!',
  },
  {
    id: 'ignora',
    title: '🗡️ Daño que Ignora Defensa',
    color: 'red',
    code: `// Opción 1: carta simple
{ ..., ignoresDefense: true }

// Opción 2: efecto modular
effects: [
  { kind: 'damage', amount: 50,
    ignoresDefense: true }
]`,
    tip: 'El daño que ignora defensa entra completo sin restar defensa.',
  },
  {
    id: 'dot',
    title: '☠️ Daño/Cura por Turno',
    color: 'purple',
    code: `effects: [
  // Daño por turno
  { kind: 'dot', amount: 20,
    duration: 3, ignoresDefense: true },
  // Curación por turno
  { kind: 'hot', amount: 25,
    duration: 4 }
]`,
    tip: 'dot = daño por turno, hot = curación por turno. Usa duration.',
  },
  {
    id: 'choice',
    title: '🎲 Carta con Elección',
    color: 'green',
    code: `effects: [
  { kind: 'choice', choices: [
    { label: '⚔️ Atacar',
      effects: [{ kind: 'damage',
        target: 'enemy', amount: 100 }] },
    { label: '💚 Curar',
      effects: [{ kind: 'heal',
        target: 'self', amount: 100 }] }
  ]}
]`,
    tip: 'El jugador elige una rama. El bot elige al azar.',
  },
  {
    id: 'stack',
    title: '📚 Efecto Acumulable',
    color: 'pink',
    code: `effects: [
  { kind: 'stack_effect',
    target: 'enemy',
    amount: -15, duration: 4,
    stackKey: 'mi_marca',
    maxStacks: 5 }
]`,
    tip: 'Cada copia jugada suma stacks hasta maxStacks.',
  },
  {
    id: 'personaje',
    title: '🦸 Crear Personaje',
    color: 'blue',
    code: `{
  id: 'mi_heroe',
  name: 'Héroe',
  classType: 'warrior',
  hp: 3200, defense: 50, damage: 55,
  avatar: '🦸', color: '#e11d48',
  passiveDescription: '+60 con [espada]',
  abilities: [ /* 3 indiv + 3 equipo */ ]
}`,
    tip: 'Añade a characterCards. Implementa la pasiva en passiveCardDamage() del gameStore.',
  },
  {
    id: 'mod',
    title: '📦 Mod Externo (.json)',
    color: 'teal',
    code: `{
  "manifest": {
    "name": "Mi Mod",
    "author": "Tú",
    "version": "1.0.0"
  },
  "cards": [ ... ],
  "characters": [ ... ],
  "combos": [ ... ]
}`,
    tip: 'Arrástralo a la pestaña 🧩 Mods. ¡Sin tocar código!',
  },
];

export const ModdingHelpPanel: React.FC = () => {
  const [open, setOpen] = useState<string | null>('carta');

  return (
    <div className="flex flex-col h-full max-h-[70vh] overflow-y-auto pr-2 space-y-2">
      <div className="bg-gradient-to-r from-cyan-950/60 to-purple-950/60 rounded-xl p-3 border border-cyan-500/40">
        <h3 className="text-sm font-black text-cyan-300 mb-1">🛠️ Guía de Modding Integrada</h3>
        <p className="text-[0.6rem] text-slate-300 leading-relaxed">
          Aprende a crear cartas, personajes y efectos. Toda la documentación completa
          está en <code className="bg-slate-800 px-1 rounded text-cyan-300">src/data/MODDING_GUIDE.ts</code>.
          Haz click en cada sección para ver ejemplos.
        </p>
      </div>

      {SECTIONS.map(sec => {
        const isOpen = open === sec.id;
        const colors = COLOR_CLASSES[sec.color] || COLOR_CLASSES.amber;
        return (
          <div key={sec.id} className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-800/40">
            <button
              onClick={() => setOpen(isOpen ? null : sec.id)}
              className={cn(
                'w-full px-3 py-2 flex items-center justify-between text-left transition-colors',
                isOpen ? 'bg-slate-700/40' : 'hover:bg-slate-700/20'
              )}
            >
              <span className={cn('text-xs font-black', colors.title)}>{sec.title}</span>
              <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="px-3 py-2 space-y-2">
                <pre className="bg-slate-950 rounded-lg p-3 overflow-x-auto text-[0.6rem] text-green-300 leading-relaxed border border-slate-700/50">
                  {sec.code}
                </pre>
                <div className={cn('text-[0.6rem] px-2 py-1.5 rounded-lg leading-relaxed border',
                  colors.tipBg, colors.tipText, colors.tipBorder)}>
                  💡 {sec.tip}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── DESCARGAR TEMPLATES ── */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
        <h4 className="text-[0.7rem] font-black text-emerald-400 mb-2">📥 Descargar Templates</h4>
        <p className="text-[0.55rem] text-slate-400 mb-2 leading-relaxed">
          Estos JSON contienen todos los campos disponibles con valores de ejemplo.
          Descarga, edita, y arrastra el archivo a la pestaña 🧩 Mods para instalarlo.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => downloadJSON('carta_template.json', buildCardTemplate())}
            className="px-2 py-2 rounded-lg bg-amber-900/40 text-amber-200 text-[0.6rem] font-bold border border-amber-700/40 hover:bg-amber-800/50 transition-colors text-left">
            🃏 Carta básica<br/><span className="text-[0.48rem] text-amber-400/60">daño/cura/defensa</span>
          </button>
          <button onClick={() => downloadJSON('carta_effects_template.json', buildEffectsTemplate())}
            className="px-2 py-2 rounded-lg bg-cyan-900/40 text-cyan-200 text-[0.6rem] font-bold border border-cyan-700/40 hover:bg-cyan-800/50 transition-colors text-left">
            🧩 Carta modular<br/><span className="text-[0.48rem] text-cyan-400/60">effects[], AOE, choice</span>
          </button>
          <button onClick={() => downloadJSON('personaje_template.json', buildCharacterTemplate())}
            className="px-2 py-2 rounded-lg bg-blue-900/40 text-blue-200 text-[0.6rem] font-bold border border-blue-700/40 hover:bg-blue-800/50 transition-colors text-left">
            🦸 Personaje<br/><span className="text-[0.48rem] text-blue-400/60">habilidades + pasiva</span>
          </button>
          <button onClick={() => downloadJSON('combo_template.json', buildComboTemplate())}
            className="px-2 py-2 rounded-lg bg-purple-900/40 text-purple-200 text-[0.6rem] font-bold border border-purple-700/40 hover:bg-purple-800/50 transition-colors text-left">
            💥 Combo<br/><span className="text-[0.48rem] text-purple-400/60">sinergia de cartas</span>
          </button>
        </div>
      </div>

      {/* ── TAGS DISPONIBLES ── */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
        <h4 className="text-[0.7rem] font-black text-amber-400 mb-1.5">🏷️ Tags Disponibles</h4>
        <p className="text-[0.55rem] text-slate-400 mb-2 leading-relaxed">
          Usa estos tags en tus cartas para activar pasivas y sinergias. Puedes inventar nuevos tags para mods.
        </p>
        <div className="flex flex-wrap gap-1">
          {ALL_TAGS.map(t => (
            <span key={t} className="text-[0.45rem] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600 font-bold uppercase cursor-pointer hover:border-amber-500/50 transition-colors"
                  onClick={() => navigator.clipboard?.writeText(t)} title="Click para copiar">
              {t}
            </span>
          ))}
        </div>
        <div className="text-[0.45rem] text-slate-500 mt-1.5">💡 Haz click en cualquier tag para copiarlo al portapapeles</div>
      </div>
    </div>
  );
};
