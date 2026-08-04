// ╔══════════════════════════════════════════════════════════╗
// ║   📖 GUÍA MAESTRA DE MODDING — CARGAS                      ║
// ╠══════════════════════════════════════════════════════════╣
// ║ Esta es la referencia ÚNICA y COMPLETA para crear         ║
// ║ contenido: cartas, personajes, habilidades, efectos,      ║
// ║ combos, paneles de menú, y mods/DLC externos.             ║
// ║                                                            ║
// ║ Todo el contenido aquí son EJEMPLOS REALES y funcionales  ║
// ║ que puedes copiar y adaptar.                              ║
// ╚══════════════════════════════════════════════════════════╝

import { PlayableCard, CharacterCard } from '../types/game';

// ════════════════════════════════════════════════════════════
// 📍 ¿DÓNDE VA CADA COSA?
// ════════════════════════════════════════════════════════════
//
//   src/data/cards.ts          → Cartas base + personajes + combos
//   src/data/cardConcepts.ts   → Cartas de ejemplo por concepto
//   src/data/abilities.ts      → Comportamiento de habilidades
//   src/data/menuRegistry.ts   → Paneles de menú (mods/DLC)
//   src/types/effects.ts       → Tipos de efectos modulares
//   src/utils/effects.ts       → Motor que ejecuta los efectos
//   src/utils/formulas.ts      → Motor de fórmulas matemáticas
//   src/utils/cardEngine.ts    → Cálculo de daño/defensa/DoT
//
// ════════════════════════════════════════════════════════════
// 1️⃣  CÓMO CREAR UNA CARTA SIMPLE
// ════════════════════════════════════════════════════════════
//
//   Añade un objeto al array `playableCards` en cards.ts:

export const EJEMPLO_CARTA_SIMPLE: PlayableCard = {
  id: 'mi_espada',                  // ÚNICO en todo el juego
  name: 'Espada de Ejemplo',
  type: 'damage',                   // ver tipos abajo
  value: -60,                       // negativo = daño, positivo = cura
  description: '60 daño cortante',
  effectTiming: 'immediate',        // cuándo actúa
  duration: 0,                      // 0 = instantáneo
  isInstant: false,                 // true = jugable en defensa
  targetMode: 'enemy',              // a quién apunta
  imageFront: '/placeholders/x.png',
  tags: ['espada', 'melee'],        // familias (para pasivas/sinergias)
  rarity: 'common',                 // estética
};

// TIPOS DE CARTA (`type`):
//   damage           → daño directo
//   damage_over_time → daño por turno (DoT)
//   heal             → curación
//   defense          → suma defensa
//   dodge            → esquiva (instantánea)
//   utility          → robar/ver/intercambiar cartas
//   special          → trampas, buffs, silencios
//   elemental/summon/curse/buff/counter/ritual/channel/terrain → temáticas

// ════════════════════════════════════════════════════════════
// 2️⃣  CÓMO CREAR UNA CARTA CON FÓRMULA MATEMÁTICA
// ════════════════════════════════════════════════════════════
//
//   La fórmula se evalúa al jugar. Variables disponibles:
//     attacker.hp / maxHp / dmg / def / lostHp / hpPct
//     target.hp / maxHp / dmg / def / lostHp / hpPct / dots
//     turn, cardsPlayed
//   Operadores: + - * / ^ %   Funciones: sqrt min max floor ceil abs round rand

export const EJEMPLO_CARTA_FORMULA: PlayableCard = {
  id: 'golpe_proporcional',
  name: 'Golpe Proporcional',
  type: 'damage', value: -10,
  description: 'Daño = 25% del HP actual del enemigo',
  effectTiming: 'immediate', duration: 0, isInstant: false,
  targetMode: 'enemy',
  imageFront: '/placeholders/x.png',
  formula: { expression: 'target.hp * 0.25', resultType: 'damage' },
};

// ════════════════════════════════════════════════════════════
// 3️⃣  CÓMO CREAR UNA CARTA MODULAR (effects[]) ← LA MÁS POTENTE
// ════════════════════════════════════════════════════════════
//
//   `effects` es una lista de efectos que se ejecutan en orden.
//   Ignora value/formula. Permite combinar TODO.

export const EJEMPLO_CARTA_MODULAR: PlayableCard = {
  id: 'tormenta_compleja',
  name: 'Tormenta Compleja',
  type: 'elemental', value: 0,
  description: 'Daño AOE + veneno + te curas + robas carta',
  effectTiming: 'immediate', duration: 0, isInstant: false,
  targetMode: 'all_enemies',
  imageFront: '/placeholders/x.png',
  tags: ['magia', 'aoe'],
  effects: [
    // 1) Daño a todos los enemigos
    { kind: 'damage', target: 'all_enemies', amount: 40 },
    // 2) Veneno por turno a todos
    { kind: 'dot', target: 'all_enemies', amount: 15, duration: 3, applyTags: ['veneno'] },
    // 3) Te curas
    { kind: 'heal', target: 'self', amount: 30 },
    // 4) Robas una carta
    { kind: 'draw_cards', target: 'self', amount: 1 },
  ],
};

// LISTA COMPLETA DE EFECTOS (`kind`):
//
//   ── DAÑO/CURA ──
//   damage        { amount, ignoresDefense? }
//   heal          { amount }
//   hot           { amount, duration }      curación por turno
//   dot           { amount, duration, ignoresDefense? }  daño por turno
//   lifesteal     { amount }                daño + te curas la mitad
//   execute       { amount }                mata si HP < amount%
//   transfer_hp   { amount }                pierdes HP, lo das al objetivo
//
//   ── DEFENSA/PROTECCIÓN ──
//   defense_buff  { amount }                +defensa
//   shield        { amount, duration }      bloquea próximo daño
//   reflect       { amount, duration }      refleja daño x amount
//
//   ── CONTROL ──
//   stun          { duration }              aturde
//   silence       { duration }              sin habilidades
//   skip_turn     { }                       salta turno
//   extra_turn    { }                       juegas otro turno
//
//   ── CARTAS ──
//   draw_cards    { amount }                robar
//   discard       { amount }                el objetivo descarta
//   reveal_hand   { }                       revela mano enemiga
//
//   ── BUFFS/DEBUFFS ──
//   buff_self     { amount, duration, stat }   +daño/def propio
//   debuff        { amount, duration, stat }   -daño/def enemigo
//   cleanse       { }                       limpia tus debuffs
//   dispel        { }                       quita buffs del enemigo
//
//   ── AVANZADO ──
//   set_tag       { applyTags, duration }   marca con tags (sinergias)
//   stack_effect  { amount, duration, stackKey, maxStacks }  acumulable
//   multi_target  { effects[] }             aplica sub-efectos a varios
//   choice        { choices[] }             el jugador elige una rama
//   conditional   { condition, ifTrue[], ifFalse[] }  if/else
//   custom        { }                       hook JS (registerEffectHandler)

// ════════════════════════════════════════════════════════════
// 4️⃣  CÓMO CREAR UN PERSONAJE
// ════════════════════════════════════════════════════════════
//
//   Añade un objeto al array `characterCards` en cards.ts.
//   Cada personaje tiene:
//     - 6 habilidades (3 individuales + 3 de equipo)
//     - 1 pasiva individual (texto en passiveDescription)
//     - 1 pasiva de equipo (texto en teamPassiveDescription)
//
//   Las pasivas se IMPLEMENTAN en gameStore.ts → passiveCardDamage()
//   y mitigateDamage(). Las pasivas son automáticas (no botones).

export const EJEMPLO_PERSONAJE: CharacterCard = {
  id: 'mi_heroe',
  name: 'Héroe de Ejemplo',
  classType: 'warrior',             // archer/warrior/mage/assassin/healer/tank
  hp: 3200, defense: 50, damage: 55,
  avatar: '🦸', color: '#e11d48',
  imageFront: '/placeholders/char.png',
  imageBack: '/placeholders/char_back.png',
  passiveDescription: '⚡ Pasiva: +60 daño con cartas [espada]',
  teamPassiveDescription: '👥 Pasiva equipo: aliados +20 daño',
  abilities: [
    // 3 individuales (isTeamAbility: false)
    { id: 'heroe_h1', name: 'Tajo Heroico', description: '150 daño', cooldown: 6, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'enemy' },
    { id: 'heroe_h2', name: 'Grito', description: '+40 daño 2t', cooldown: 8, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'self' },
    { id: 'heroe_h3', name: 'Muralla', description: 'Resiste 1 ataque', cooldown: 10, currentCooldown: 0, isTeamAbility: false, passive: '', canTarget: 'self' },
    // 3 de equipo (isTeamAbility: true)
    { id: 'heroe_e1', name: 'Inspirar', description: '+80 daño aliados', cooldown: 10, currentCooldown: 0, isTeamAbility: true, passive: '', canTarget: 'ally' },
    { id: 'heroe_e2', name: 'Proteger', description: '+60 def aliados', cooldown: 10, currentCooldown: 0, isTeamAbility: true, passive: '', canTarget: 'ally' },
    { id: 'heroe_e3', name: 'Sanar', description: 'Cura 400 HP aliado', cooldown: 12, currentCooldown: 0, isTeamAbility: true, passive: '', canTarget: 'ally' },
  ],
};

// PASO EXTRA: para que la pasiva de daño FUNCIONE, edita en
// src/store/gameStore.ts → función passiveCardDamage():
//
//   if (attacker.characterId === 'mi_heroe' &&
//       (allTags.includes('espada'))) bonus += 60;
//
// Para pasiva defensiva, edita mitigateDamage():
//
//   if (target.characterId === 'mi_heroe') return Math.floor(dmg * 0.8);

// ════════════════════════════════════════════════════════════
// 5️⃣  CÓMO DEFINIR EL COMPORTAMIENTO DE UNA HABILIDAD
// ════════════════════════════════════════════════════════════
//
//   En src/data/abilities.ts → ABILITY_BEHAVIORS, añade:
//
//   'Tajo Heroico': { category: 'instant', effect: 'damage',
//                     timingLabel: '⚡ Inmediato' },
//
//   CATEGORÍAS:
//     instant   → se aplica al usarla
//     end_turn  → se aplica al terminar tu turno
//     defense   → reactiva: se arma y dispara al recibir daño
//     buff_self → buff propio inmediato
//
//   El daño/cura se extrae automáticamente de la `description`
//   (ej: "150 daño" → 150 de daño). Para efectos complejos,
//   edita useAbility() en gameStore.ts.

// ════════════════════════════════════════════════════════════
// 6️⃣  CÓMO CREAR UN COMBO
// ════════════════════════════════════════════════════════════
//
//   En cards.ts → array `combos`:
//
//   { id: 'combo_x', name: 'Mi Combo',
//     requiredCards: ['carta_a', 'carta_b'],  // ids base
//     description: 'A + B', effectDescription: '+50 daño',
//     isTeamCombo: false, bonusValue: 50 }
//
//   Se activa al jugar TODAS las cartas requeridas el mismo turno
//   contra el mismo objetivo.

// ════════════════════════════════════════════════════════════
// 7️⃣  CÓMO AÑADIR UNA PESTAÑA AL MENÚ (mods/DLC)
// ════════════════════════════════════════════════════════════
//
//   import { registerMenuPanel } from './data/menuRegistry';
//
//   registerMenuPanel({
//     id: 'mi_dlc',
//     label: '🎁 Mi DLC',
//     order: 50,
//     component: MiComponentePanel,   // un componente React
//   });

// ════════════════════════════════════════════════════════════
// 8️⃣  CÓMO REGISTRAR UN EFECTO PERSONALIZADO (mods avanzados)
// ════════════════════════════════════════════════════════════
//
//   import { registerEffectHandler } from './utils/effects';
//
//   registerEffectHandler('teleport', (effect, ctx) => {
//     ctx.log(`✨ ${ctx.attacker.name} se teletransporta`);
//     // tu lógica usando ctx.applyDamage, ctx.applyHeal, etc.
//   });
//
//   Luego úsalo en cualquier carta:
//     effects: [ { kind: 'teleport' } ]

// ════════════════════════════════════════════════════════════
// 9️⃣  IMÁGENES, ICONOS Y SONIDOS (base code + mods)
// ════════════════════════════════════════════════════════════
//
//   Todas las cartas y personajes soportan media opcional.
//   Si no quieres usar assets, puedes dejar todo en null.
//
//   CAMPOS DISPONIBLES EN PlayableCard:
//     imageFront: string | null         (legacy)
//     media?: {
//       image?: string | null,          // arte principal
//       iconImage?: string | null,      // icono pequeño opcional
//       soundOnHover?: string | null,
//       soundOnPlay?: string | null,
//       soundOnResolve?: string | null,
//     }
//
//   CAMPOS DISPONIBLES EN CharacterCard:
//     imageFront: string | null
//     imageBack: string | null
//     media?: {
//       imageFront?: string | null,
//       imageBack?: string | null,
//       iconImage?: string | null,
//       soundOnIntro?: string | null,
//     }
//
//   RUTAS SOPORTADAS:
//     '/placeholders/x.png'            → asset público del proyecto
//     'https://...'                    → remoto
//     'data:image/png;base64,...'      → embebido
//     null                             → sin asset
//
//   RECOMENDACIÓN:
//     - Para código base: usa rutas públicas en /public
//     - Para mods: usa ZIP/.cargasmod con imágenes/sonidos adentro
//       porque el importador las convierte a data URLs automáticamente.
//
//   EJEMPLO:
//     {
//       id: 'carta_media',
//       imageFront: '/placeholders/x.png',
//       media: {
//         image: '/placeholders/x.png',
//         iconImage: null,
//         soundOnPlay: '/audio/espada.mp3',
//         soundOnResolve: null,
//       }
//     }
//
// ════════════════════════════════════════════════════════════
// 9.5️⃣  TEMAS DE CARTA (colores personalizados)
// ════════════════════════════════════════════════════════════
//
//   Opción A — tema registrado por clave:
//     registerCardTheme('elven', {
//       bg:'#062b1a', bgGrad:'#064e3b', border:'#34d399',
//       glow:'rgba(52,211,153,0.4)', text:'#d1fae5',
//       icon:'🍃', label:'Élfico'
//     });
//
//     Luego en la carta:
//       customTheme: { key: 'elven' }
//
//   Opción B — tema inline directo (ideal para JSON):
//     customTheme: {
//       bg:'#1a0a2e', bgGrad:'#3d0a4e', border:'#9d4edd',
//       glow:'rgba(157,78,221,0.4)', text:'#e0aaff',
//       icon:'🌌', label:'Cósmico'
//     }
//
//   VER MÁS:
//     src/utils/cardThemes.ts
//     src/components/VisualSettings.tsx → creador visual de temas
//
// ════════════════════════════════════════════════════════════
// 🔟  CÓMO CREAR UN MOD EXTERNO (.json / .zip / .cargasmod)
// ════════════════════════════════════════════════════════════
//
//   Un mod es un JSON con esta forma:
//
//   {
//     "manifest": {
//       "name": "Mi Mod Épico",
//       "author": "Tu Nombre",
//       "version": "1.0.0",
//       "description": "Añade 10 cartas y 2 personajes"
//     },
//     "cards":      [ ...PlayableCard ],
//     "characters": [ ...CharacterCard ],
//     "combos":     [ ...Combo ]
//   }
//
//   O directamente un array de cartas: [ {...}, {...} ]
//
//   Se instala arrastrándolo a la pestaña 🧩 Mods del menú.
//   Las cartas entran al mazo en la siguiente partida.
//
//   Para empaquetar varias cosas + imágenes, usa un .zip:
//     mi_mod.cargasmod (es un .zip renombrado)
//       ├── manifest.json
//       ├── cards.json
//       ├── characters.json
//       └── combos.json

// ════════════════════════════════════════════════════════════
// 🔟  CHECKLIST AL CREAR CONTENIDO
// ════════════════════════════════════════════════════════════
//   ☑ El `id` es único
//   ☑ Tiene `imageFront` (aunque sea placeholder)
//   ☑ Los `tags` coinciden con las pasivas que quieres aprovechar
//   ☑ Si usas `effects`, cada efecto tiene `kind` válido
//   ☑ Si es daño, value es NEGATIVO (o usa effects/formula)
//   ☑ Probaste la carta en una partida real

export const MODDING_GUIDE_VERSION = '1.0.0';
