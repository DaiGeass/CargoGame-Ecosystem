# 📜 Tutorial de Modding - CARGAS

Este documento es la **guía completa** para crear contenido: cartas, personajes, pasivas, efectos, trampas, temas de carta, combos, paneles de menú y paquetes completos (DLC/Addons/Mods).

---

## 📦 Estructura de Archivos

```
src/
├── types/
│   ├── game.ts          # Tipos: PlayableCard, Player, CharacterCard, etc.
│   └── effects.ts       # Tipos de efectos modulares (CardEffect, CardEffectKind)
│
├── data/
│   ├── cards.ts         # Catálogo base: personajes, cartas, combos
│   ├── cardConcepts.ts  # Cartas de ejemplo por concepto (REFERENCIA)
│   ├── trapCards.ts     # Cartas trampa y mecánicas de cementerio
│   ├── abilities.ts     # Comportamiento de habilidades (timing, categoría)
│   ├── menuRegistry.ts  # Registro de pestañas de menú (mods/DLC)
│   ├── TEMPLATES.ts     # Plantillas simples
│   └── MODDING_GUIDE.ts # Guía completa con ejemplos reales
│
├── utils/
│   ├── cardEngine.ts    # Motor de cálculo de daño/defensa/DoT
│   ├── cardThemes.ts    # Sistema de temas visuales de carta (CSS vars)
│   ├── effects.ts       # Motor de efectos modulares
│   └── formulas.ts      # Motor de fórmulas matemáticas (target.hp * 0.2, etc.)
│
├── components/
│   └── ModdingHelpPanel.tsx  # Guía interactiva dentro del juego
│
└── public/placeholders/  # Imágenes de cartas (PNG recomendado)
```

---

## 🃏 1. AGREGAR UNA CARTA NUEVA

Abre `src/data/cards.ts` y busca la sección correspondiente.

### Ejemplo: Carta de Daño
```typescript
{ id: 'mi_carta_daño', name: 'Golpe de Fuego', type: 'damage', value: -55,
  description: '-55 daño + 10 de fuego extra', effectTiming: 'immediate',
  duration: 0, isInstant: false, targetMode: 'enemy',
  imageFront: '/placeholders/mi_carta.png' }
```

### Ejemplo: Carta de Curación
```typescript
{ id: 'mi_cura', name: 'Vendaje Mágico', type: 'heal', value: 120,
  description: '+120 HP a un aliado', effectTiming: 'immediate',
  duration: 0, isInstant: false, targetMode: 'ally_or_self',
  imageFront: '/placeholders/mi_cura.png' }
```

### Ejemplo: Carta de Veneno (DoT)
```typescript
{ id: 'mi_veneno', name: 'Neurotoxina', type: 'damage_over_time', value: -18,
  description: '-18/t x5 turnos, ignora defensa', effectTiming: 'start_of_turn',
  duration: 5, isInstant: false, ignoresDefense: true, targetMode: 'enemy',
  imageFront: '/placeholders/mi_veneno.png' }
```

### Ejemplo: Carta Instantánea (Defensa)
```typescript
{ id: 'mi_defensa', name: 'Campo de Fuerza', type: 'dodge', value: 0,
  description: 'Evade todo el daño recibido', effectTiming: 'on_damage_taken',
  duration: 0, isInstant: true, instantCondition: 'Al recibir un ataque',
  targetMode: 'self', imageFront: '/placeholders/mi_defensa.png' }
```

### Campos de una Carta
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador único |
| `name` | string | Nombre visible |
| `type` | 'damage' \| 'damage_over_time' \| 'heal' \| 'defense' \| 'dodge' \| 'utility' \| 'special' |
| `value` | number | Daño (-) o cura (+) |
| `description` | string | Texto visible |
| `effectTiming` | 'immediate' \| 'start_of_turn' \| 'end_of_turn' \| 'on_damage_taken' |
| `duration` | number | 0 = único, >0 = dura N turnos |
| `isInstant` | boolean | true = jugable fuera de turno |
| `targetMode` | 'enemy' \| 'ally' \| 'self' \| 'any' \| 'ally_or_self' |
| `ignoresDefense` | boolean | Ignora defensa |
| `imageFront` | string | Ruta a la imagen |

---

## 🧙 2. AGREGAR UN PERSONAJE NUEVO

⚠️ **ESTRUCTURA OBLIGATORIA de cada personaje:**
- **3 habilidades individuales** (`isTeamAbility: false`)
- **3 habilidades de equipo** (`isTeamAbility: true`)
- **1 pasiva individual** → `passiveDescription` (automática, NO es botón)
- **1 pasiva de equipo** → `teamPassiveDescription` (automática, NO es botón)

> 🚫 Las **pasivas NO son habilidades con botón**. Son efectos automáticos.
> NO las pongas en el array `abilities`. Solo en `passiveDescription` /
> `teamPassiveDescription`.

En `src/data/cards.ts`, usa el helper `h(id, nombre, desc, cooldown, esEquipo, objetivo)`:

```typescript
{
  id: 'mi_personaje', name: 'Nigromante', classType: 'mage',
  hp: 2600, defense: 18, damage: 45,
  avatar: '🧛', color: '#8b5cf6',
  imageFront: '/placeholders/char_mio_front.png',
  imageBack: '/placeholders/char_mio_back.png',
  passiveDescription: '🧛 Pasiva: +30 daño con ataques de sombra',
  teamPassiveDescription: '👥 Pasiva equipo: aliados +15 daño con sombra',
  abilities: [
    // 3 INDIVIDUALES (isTeamAbility = false, 5º parámetro)
    h('mio_h1', 'Golpe Sombra', '70 daño directo', 6, false, 'enemy'),
    h('mio_h2', 'Drenar Vida', 'Cura 150 HP', 8, false, 'self'),
    h('mio_h3', 'Explosión Oscura', '100 daño + aturde', 14, false, 'enemy'),
    // 3 DE EQUIPO (isTeamAbility = true)
    h('mio_e1', 'Manto Aliado', '+20 def aliado 2t', 10, true, 'ally'),
    h('mio_e2', 'Vínculo Oscuro', '+60 HP aliado', 12, true, 'ally'),
    h('mio_e3', 'Sombra Colectiva', '+30 daño aliado', 9, true, 'ally_or_self'),
  ],
}
```

### ⏱️ Cooldowns (¡importante!)
- El **cooldown se cuenta POR JUGADOR** (en `Player.abilityCooldowns`),
  no en el objeto global del personaje. Así dos jugadores con el mismo
  personaje tienen cooldowns independientes.
- El cooldown DEBE ser ≥ 1. Se reduce 1 por ronda completa.
- Una habilidad en cooldown NO puede usarse (botón deshabilitado).

### 🎯 Categoría de cada habilidad (cuándo actúa)
Define en `src/data/abilities.ts` → `ABILITY_BEHAVIORS` el comportamiento:
```typescript
'Golpe Sombra':   { category: 'instant',   effect: 'damage', timingLabel: '⚡ Inmediato' },
'Manto Aliado':   { category: 'buff_self', effect: 'defense', timingLabel: '🛡️ Inmediato' },
'Explosión Oscura': { category: 'end_turn', effect: 'damage', timingLabel: '🌙 Fin de turno' },
'Muro de Sombra': { category: 'defense',   effect: 'defense', timingLabel: '🛡️ Reactiva' },
```

### Paso 3: (Opcional) Dale una pasiva real

En `src/store/gameStore.ts`:

**En `passiveCardDamage()`** (bonus ofensivo):
```typescript
if (attacker.characterId === 'mi_personaje' && id.includes('sombra')) bonus += 30;
```

**En `mitigateDamage()`** (bonus defensivo):
```typescript
if (target.characterId === 'mi_personaje') return Math.max(0, dmg - 8);
```

---

## 🧩 3. MODS / DLC / ADDONS

El juego soporta paquetes externos. Hay 3 formas de instalarlos:

1. **Desde el juego**: Setup → pestaña `Mods` → arrastra un `.json`, `.zip` o `.cargasmod`.
2. **En Tauri empaquetado**: botón `Importar con Tauri` y selecciona el archivo desde disco.
3. **Modo carpeta**: crea una carpeta `mods/` junto al ejecutable o proyecto.

### Estructura de un Mod
```
mods/mi_mod/
├── manifest.json         # Metadata del mod
├── cards.json            # Cartas adicionales
├── characters.json       # Personajes adicionales
├── combos.json           # Combos adicionales
└── images/               # Imágenes del mod
```

### Ejemplo de manifest.json
```json
{
  "name": "Mod Oscuro",
  "author": "Tu Nombre",
  "version": "1.0.0",
  "description": "Agrega 10 cartas oscuras y 1 personaje nuevo",
  "cards": ["cards.json"],
  "characters": ["characters.json"],
  "combos": ["combos.json"],
  "icon": "images/mod_icon.png"
}
```

### Integración de mods en el juego
El importador guarda los mods en `localStorage` para uso inmediato.
Al iniciar una partida, `src/store/gameStore.ts → buildDeck()` mezcla:

```typescript
const sourceCards = [...playableCards, ...getRuntimeModCards()];
```

Así las cartas de mods entran al mazo como cualquier carta base.

---

## 🔄 4. AGREGAR UN COMBO

Los combos se activan automáticamente cuando juegas varias cartas específicas en el mismo turno contra el mismo objetivo.

```typescript
{
  id: 'combo_mi_combo',
  name: 'Mi Combo Épico',
  requiredCards: ['carta1', 'carta2'],
  description: 'Carta1 + Carta2',
  effectDescription: '+80 daño devastador',
  isTeamCombo: false,
  bonusValue: 80,
}
```

---

## 🧩 5. SISTEMA MODULAR DE EFECTOS (RECOMENDADO PARA MODS)

¡La forma **más potente** de crear cartas! En lugar de usar el campo `value`
y dejar que el sistema adivine qué hacer, usa el array `effects[]` con
efectos componibles. Cada efecto es declarativo (JSON) y puede combinarse
con otros para crear cartas complejas.

### Estructura básica
```json
{
  "id": "mi_carta_potente",
  "name": "Carta Potente",
  "type": "damage",
  "value": -10,
  "description": "Daño + DoT + buff propio",
  "effectTiming": "immediate", "duration": 0, "isInstant": false,
  "targetMode": "enemy", "imageFront": "/placeholders/x.png",
  "effects": [
    { "kind": "damage", "target": "enemy", "amount": 50 },
    { "kind": "dot", "target": "enemy", "amount": 15, "duration": 3, "stackKey": "fire", "applyTags": ["fire"] },
    { "kind": "buff_self", "target": "self", "amount": 20, "duration": 2, "label": "Furia" }
  ]
}
```

### Tipos de efecto (`kind`)
| Kind | Efecto |
|------|--------|
| `damage` | Daño directo |
| `heal` | Curación |
| `defense_buff` | +defensa acumulada |
| `dot` | Daño/efecto por turno |
| `buff_self` / `debuff` | Buff/debuff con `stat: 'damage'\|'defense'\|'hp_regen'` |
| `stun` | Aturde (pierde turno) |
| `silence` | No puede usar habilidades |
| `skip_turn` | Salta próximo turno del objetivo |
| `extra_turn` | El lanzador juega un turno extra |
| `draw_cards` | Roba N cartas |
| `discard` | Descarta cartas del objetivo |
| `reveal_hand` | Revela la mano |
| `shield` | Bloquea próximo daño |
| `reflect` | Refleja daño x N |
| `lifesteal` | Daño + cura al lanzador (½) |
| `execute` | Mata si HP < % (amount es el umbral) |
| `transfer_hp` | Transfiere HP entre jugadores |
| `cleanse` | Limpia debuffs |
| `dispel` | Quita buffs del objetivo |
| `set_tag` | Marca con tags personalizables |
| `stack_effect` | Apila efectos del mismo `stackKey` |
| `multi_target` | Aplica `effects[]` a múltiples objetivos |
| `choice` | Da opciones al jugador (con `choices[]`) |
| `conditional` | Aplica `ifTrue`/`ifFalse` según `condition` |
| `custom` | Hook para mods (registra handler en JS) |

### Selectores de objetivo (`target`)
- `self` · `enemy` · `ally` · `all_enemies` · `all_allies`
- `all_allies_no_self` · `all_players`
- `random_enemy` · `random_ally`
- `lowest_hp_enemy` · `highest_hp_enemy`
- `multi_enemy` (el jugador elige varios)

### Tags personalizables
Cada efecto puede aplicar tags al objetivo con `applyTags: ['fire', 'marked']`.
Otros efectos pueden chequear esos tags con `condition: { targetHasTag: 'fire' }`.
**Los mods pueden inventar cualquier tag** sin tocar código.

### Ejemplo: carta multi-objetivo (AOE)
```json
{
  "id": "mod_lluvia_fuego", "name": "Lluvia de Fuego",
  "targetMode": "all_enemies",
  "effects": [
    { "kind": "damage", "target": "all_enemies", "amount": 40 },
    { "kind": "dot", "target": "all_enemies", "amount": 15, "duration": 2, "applyTags": ["fire"] }
  ]
}
```

### Ejemplo: carta con elección (choice)
```json
{
  "id": "mod_pacto", "name": "Pacto Oscuro",
  "effects": [
    { "kind": "choice", "label": "Elige", "choices": [
      { "label": "🩸 Drenar 100", "effects": [
        { "kind": "lifesteal", "target": "enemy", "amount": 100 }
      ]},
      { "kind": "damage", "target": "self", "amount": 50, "effects": [
        { "kind": "damage", "target": "enemy", "amount": 150 }
      ]}
    ]}
  ]
}
```

### Ejemplo: salto de turno
```json
{
  "id": "mod_paralisis", "name": "Parálisis",
  "effects": [ { "kind": "skip_turn", "target": "enemy" } ]
}
```

### Ejemplo: efecto acumulable (stack)
```json
{
  "id": "mod_marca", "name": "Marca de Caza",
  "effects": [
    { "kind": "stack_effect", "target": "enemy",
      "amount": -15, "duration": 4,
      "stackKey": "hunt", "maxStacks": 5,
      "label": "🏹 Marca", "applyTags": ["hunted"] }
  ]
}
```

### Condicionales (sinergias dinámicas)
```json
{
  "kind": "conditional",
  "condition": { "targetHpBelow": 30 },
  "ifTrue":  [ { "kind": "execute", "target": "enemy", "amount": 30 } ],
  "ifFalse": [ { "kind": "damage", "target": "enemy", "amount": 50 } ]
}
```

Condiciones disponibles:
- `targetHasTag` / `attackerHasTag` (string)
- `targetHpBelow` / `targetHpAbove` (%)
- `attackerHpBelow` / `attackerHpAbove` (%)
- `targetHasStatus`: `'stunned' | 'silenced' | 'shielded' | 'invisible' | 'has_dots'`
- `cardsPlayedThisTurn`: número mínimo
- `turnAbove`: ronda mínima
- `custom`: expresión booleana (motor de fórmulas)

### Para devs: registrar efectos personalizados (mods con JS)
```typescript
import { registerEffectHandler } from './utils/effects';

registerEffectHandler('teleport', (effect, ctx) => {
  ctx.log(`✨ ${ctx.attacker.name} se teletransporta`, 'special');
  // tu lógica
});
```

---

## 🧮 6. CARTAS CON FÓRMULAS MATEMÁTICAS

¡Ahora puedes crear cartas cuyo valor se calcula con una **fórmula matemática**
en tiempo de ejecución! Esto permite cartas mucho más dinámicas sin tocar código.

### Operadores soportados
| Operador | Significado | Ejemplo |
|----------|-------------|---------|
| `+` | Suma | `attacker.dmg + 50` |
| `-` | Resta / negación | `target.hp - 100` |
| `*` | Multiplicación | `target.hp * 0.2` |
| `/` | División (protegida /0) | `attacker.maxHp / 10` |
| `^` | Potencia | `attacker.dmg ^ 1.5` |
| `%` | Módulo | `turn % 5` |

### Funciones soportadas
`sqrt(x)` raíz · `abs(x)` · `min(a,b)` · `max(a,b)` · `floor(x)` · `ceil(x)` · `round(x)` · `rand()` aleatorio 0-1

### Variables disponibles
- **Atacante:** `attacker.hp`, `attacker.maxHp`, `attacker.def`, `attacker.dmg`, `attacker.lostHp`, `attacker.hpPct`
- **Objetivo:** `target.hp`, `target.maxHp`, `target.def`, `target.dmg`, `target.lostHp`, `target.hpPct`, `target.dots`
- **Globales:** `turn` (ronda actual), `cardsPlayed`, `random`

### Comparaciones y ternario
`< > <= >= == !=` y operador ternario `(condicion ? siVerdadero : siFalso)`

### Ejemplos completos

```json
{
  "id": "mod_golpe_vital",
  "name": "Golpe Vital",
  "type": "damage",
  "value": -10,
  "description": "-20% del HP actual del enemigo",
  "effectTiming": "immediate", "duration": 0, "isInstant": false,
  "targetMode": "enemy", "imageFront": "/placeholders/x.png",
  "formula": { "expression": "target.hp * 0.2", "resultType": "damage" }
}
```

```json
{
  "id": "mod_ejecucion",
  "name": "Ejecución",
  "type": "damage", "value": -10,
  "description": "Si HP enemigo < 30%: x3 daño base",
  "effectTiming": "immediate", "duration": 0, "isInstant": false,
  "targetMode": "enemy", "imageFront": "/placeholders/x.png",
  "formula": { "expression": "target.hpPct < 30 ? attacker.dmg * 3 : attacker.dmg", "resultType": "damage" }
}
```

```json
{
  "id": "mod_furia_raiz",
  "name": "Furia Desesperada",
  "type": "damage", "value": -10,
  "description": "Daño = raíz del HP perdido × 10",
  "formula": { "expression": "sqrt(attacker.lostHp) * 10", "resultType": "damage" }
}
```

> **`resultType`** define el signo automáticamente:
> - `"damage"` → siempre se convierte en daño (negativo)
> - `"heal"` → siempre curación (positivo)
> - `"defense"` → siempre defensa (positivo)
>
> Para DoTs con fórmula, el valor total se reparte entre los turnos de `duration`.

---

## 🎯 6. HABILIDADES Y SUS CATEGORÍAS (¡NUEVO!)

Las habilidades de los personajes ahora tienen **categorías** que definen
CUÁNDO actúan. Se configuran en `src/data/abilities.ts`:

| Categoría | Cuándo actúa | Ejemplo |
|-----------|--------------|---------|
| `instant` | Inmediato al usarla | Daño directo, cura |
| `buff_self` | Inmediato, buff propio | Grito de Guerra, +def |
| `end_turn` | Al FINAL del turno | Venenos, daño diferido |
| `defense` | Al RECIBIR daño (reactiva) | Muro de Acero, Escudo |

### Cómo añadir el comportamiento de tu habilidad

En `src/data/abilities.ts` → `ABILITY_BEHAVIORS`:

```typescript
'Mi Habilidad': {
  category: 'defense',          // instant | buff_self | end_turn | defense
  effect: 'defense',            // damage | heal | defense | buff | debuff | special
  timingLabel: '🛡️ Reactiva (al recibir daño)'
}
```

- **Habilidades de defensa** se "arman" y reducen el daño cuando el jugador
  es atacado, luego se consumen. NO requieren seleccionar objetivo.
- **Habilidades de fin de turno** acumulan su efecto y lo aplican cuando el
  jugador termina su turno (ideal para venenos/daño diferido).
- Todas respetan el **cooldown** estrictamente.

---

## ⚡ 7. SINERGIAS DE CARTAS (Efectos Condicionales)

El juego cuenta con un **Motor Declarativo de Sinergias**. Puedes definir sinergias puramente con JSON:

```json
{
  "id": "fuego_estelar",
  "name": "Fuego Estelar",
  "type": "damage",
  "value": -75,
  "description": "-75 daño; +45 extra si el objetivo tiene DoTs",
  "synergies": [
    {
      "condition": { "targetStatus": "has_dots" },
      "bonusDamage": 45
    }
  ]
}
```

### Temas Personalizados (Aesthetic Overrides)

```json
{
  "customTheme": {
    "bgGradient": "from-amber-950 via-purple-950 to-pink-950",
    "borderColor": "border-pink-400",
    "icon": "✨",
    "label": "Cósmico"
  }
}
```

---

## 💡 FLUJO DE JUEGO

```
TU TURNO:
1. startTurn() → aplica DoTs/regeneración/aturdimiento
2. Puedes:
   a) Arrastrar/click carta → prepareAction()
   b) Ataque básico → prepareBasicAttack()
3. Click "Resolver Turno" → endTurn() → ejecuta acciones
4. Por cada target con acciones:
   - executeAction() → si tiene defensa, defensePhase
   - Si defiende: defendWithCard()
   - Si no defiende: applyResolved()
5. finishTurn() → cartas van al mazo → siguiente jugador

CARTAS SIEMPRE VUELVEN AL MAZO (nunca se pierden)
```

---

---

## 🖼️🔊 8. IMÁGENES Y SONIDOS (media opcional)

Todas las cartas y personajes soportan assets multimedia opcionales. Si no quieres usar un asset, usa `null`.

### Campos de media en PlayableCard
```typescript
media?: {
  image?: string | null,           // arte principal (PNG/JPG/data URL)
  iconImage?: string | null,       // icono pequeño opcional
  soundOnHover?: string | null,    // sonido al hacer hover
  soundOnPlay?: string | null,     // sonido al jugar la carta
  soundOnResolve?: string | null,  // sonido al resolver el efecto
}
```

### Campos de media en CharacterCard
```typescript
media?: {
  imageFront?: string | null,      // arte frontal
  imageBack?: string | null,       // arte reverso
  iconImage?: string | null,       // avatar personalizado
  soundOnIntro?: string | null,    // sonido al entrar en juego
}
```

### Rutas soportadas
- `/placeholders/x.png` → asset público del proyecto (si existe)
- `https://...` → remoto
- `data:image/png;base64,...` → embebido (ideal para mods ZIP)
- `null` → sin asset

### Importar assets para tu mod
1. Abre la pestaña **🎨 Assets** en el menú de configuración
2. Arrastra imágenes PNG/JPG/WebP/SVG o sonidos MP3/WAV/OGG
3. Haz click en **📋 Copiar URL** para obtener la data URL
4. Pega la data URL en el campo `media` de tu carta

Para mods empaquetados (.cargasmod/.zip), el importador convierte automáticamente los archivos internos a data URLs.

---

## ⬇️ 9. DESCARGAR TEMPLATES JSON

Desde la pestaña **🛠️ Modding** del menú puedes descargar templates completos:

| Botón | Contenido |
|-------|-----------|
| 🃏 Carta básica | Todos los campos con valores ejemplo |
| 🧩 Carta modular | Ejemplo con `effects[]` (AOE, DoT, choice...) |
| 🦸 Personaje | 6 habilidades + pasiva + media |
| 💥 Combo | Sinergia de 2 cartas |

Descarga, edita el JSON, y arrástralo a la pestaña **🧩 Mods** para instalarlo.

---

## 🎨 10. SISTEMA DE TEMAS VISUALES DE CARTA

### Por qué existe este sistema
Las clases Tailwind dinámicas (ej: `from-${color}-800`) no se compilan. El sistema de temas usa **CSS inline** para que los colores se apliquen en tiempo real sin recompilar.

### Usar un tema existente
```typescript
// En tu carta:
{
  id: 'mi_carta',
  customTheme: { key: 'cosmic' }  // ← clave de un tema registrado
  // ... resto de la carta
}
```

### Temas disponibles
`damage`, `damage_over_time`, `heal`, `defense`, `dodge`, `utility`, `special`, `elemental`, `summon`, `curse`, `buff`, `counter`, `ritual`, `reaction`, `terrain`, `channel`, `cosmic`, `toxic`, `shadow`, `ice`, `thunder`, `nature`, `blood`, `arcane`, `gold`, `steel`, `void`, `divine`, `poison`

### Crear un tema propio
```typescript
// En tu mod o en main.tsx:
import { registerCardTheme } from './utils/cardThemes';

registerCardTheme('elven', {
  bg:     '#062b1a',                // color fondo primario (hex)
  bgGrad: '#064e3b',                // color fondo degradado
  border: '#34d399',                // color del borde
  glow:   'rgba(52,211,153,0.4)',   // brillo en hover
  text:   '#d1fae5',                // color del texto
  icon:   '🍃',                     // emoji del tipo
  label:  'Élfico',                 // etiqueta en la carta
});
```

Luego úsalo en tu carta:
```typescript
{ ..., customTheme: { key: 'elven' } }
```

O pruébalo visualmente desde el menú: **🎨 Visual → Crear Tema Personalizado** (selector de color en tiempo real).

### Para mods (JSON)
```json
{
  "id": "mod_mi_carta",
  "customTheme": { "key": "elven" }
}
```
El tema debe estar registrado antes de iniciar la partida.

---

## 🪤 11. CARTAS TRAMPA Y CEMENTERIO

### Tipos de trampas
El juego distingue varios conceptos en `src/data/trapCards.ts`:

| Tipo | Ejemplo | Cómo funciona |
|------|---------|---------------|
| Trampa reactiva | Trampa de Espinas | `effectTiming: 'on_damage_taken'` |
| Robo selectivo  | Hurto Selectivo | Ver mano + elegir carta |
| Cementerio      | Llamada del Cementerio | `discardPile` |
| Diferida        | Bomba Temporal | DoT con tag `bomba_activa` |
| Desinformación  | Espejo Mnemotécnico | Copia última carta del enemigo |

### Crear una carta trampa reactiva
```typescript
{
  id: 'mi_trampa_reactiva',
  name: 'Mi Trampa',
  type: 'reaction', value: 0,
  description: 'Al recibir daño: 40 de vuelta al atacante',
  effectTiming: 'on_damage_taken', duration: 2,
  isInstant: false, targetMode: 'self',
  customTheme: { key: 'shadow' },
  effects: [
    { kind: 'reflect', target: 'self', amount: 0.4, duration: 2 }
  ]
}
```

### Acceder al cementerio (discardPile)
La mecánica de cementerio usa el handler de tipo `custom`:
```typescript
effects: [{ kind: 'custom', label: 'revive_from_graveyard', amount: 1 }]
```

Y se registra el handler en tu mod:
```typescript
import { registerEffectHandler } from './utils/effects';

registerEffectHandler('revive_from_graveyard', (_effect, ctx) => {
  // ctx.allPlayers, ctx.attacker, ctx.drawCards, ctx.log
  ctx.drawCards(ctx.attacker.id, 1);
  ctx.log(`🪦 Carta revivida del cementerio`, 'utility');
});
```

Ver el archivo `src/data/trapCards.ts` para ejemplos completos.

---

## 🏷️ 12. SISTEMA DE TAGS EXPANDIDO

Los tags sirven para:
1. **Activar pasivas de personajes** (ej: Arquero +75 con `[arco]`)
2. **Condiciones de sinergias** (ej: si objetivo tiene tag `[veneno]`)
3. **Identificar familias** para combos y efectos

### Tags base disponibles
`arco`, `flecha`, `ballesta`, `espada`, `melee`, `lanza`, `daga`, `veneno`, `fuego`, `polvora`, `magia`, `hechizo`, `cura`, `pirata`, `ladron`, `bleed`, `regen`, `nature`, `sagrado`

### Tags de mecánica
`trampa`, `robo`, `cementerio`, `stack`, `aoe`, `choice`, `control`, `execute`, `pierce`, `trampa`, `reflejo`, `tiempo`

### Tags de familias temáticas
`arco`, `daga`, `espada`, `lanza`, `magia`, `fuego`, `hielo`, `rayo`, `sombra`, `tierra`, `vampiro`, `cazador`, `psiquico`

### Añadir un tag nuevo
1. Agrega el tag a tu carta: `tags: ['mi_tag']`
2. Si quieres que active una pasiva, edita `passiveCardDamage()` en `gameStore.ts`
3. Si quieres que condicione una sinergia, úsalo en `condition: { targetHasTag: 'mi_tag' }`

### CSS de tags (colores)
En `index.css` cada familia tiene su clase `.tag-{nombre}`. Puedes añadir:
```css
.tag-mi_tag { background: #1a0a2e; color: #c084fc; border-color: #5b21b6; }
```

---

## 🧩 13. AÑADIR PESTAÑA AL MENÚ (mods/DLC)

```typescript
// En tu mod o en main.tsx:
import { registerMenuPanel } from './data/menuRegistry';
import { MiPanelDLC } from './MiPanelDLC';

registerMenuPanel({
  id: 'mi_dlc',
  label: '🎁 Mi DLC',
  order: 50,             // posición en la barra (menor = más a la izquierda)
  component: MiPanelDLC, // componente React
});
```

La pestaña aparece automáticamente en el menú de configuración con color cyan (diferenciado de las pestañas base).

---

## ⚡ 14. REGISTRAR UN EFECTO PERSONALIZADO

```typescript
import { registerEffectHandler } from './utils/effects';

registerEffectHandler('teletransporte', (effect, ctx) => {
  // ctx.attacker  → jugador que lanzó la carta
  // ctx.primaryTarget → objetivo seleccionado
  // ctx.allPlayers → todos los jugadores vivos
  // ctx.applyDamage(playerId, amount, ignoraDef?)
  // ctx.applyHeal(playerId, amount)
  // ctx.applyDefense(playerId, amount)
  // ctx.applyStatus(playerId, activeEffect)
  // ctx.drawCards(playerId, n)
  // ctx.discardCards(playerId, n)
  // ctx.revealHand(playerId)
  // ctx.log(mensaje, tipo)
  ctx.log(`✨ ${ctx.attacker.name} se teletransporta`, 'special');
});

// Úsalo en tu carta:
// effects: [{ kind: 'teletransporte' }]
```

---

**¡A crear contenido!** ⚔️

> 💡 **Tip final**: Abre la pestaña **🛠️ Modding** dentro del juego para ver esta guía de forma interactiva con ejemplos de código expandibles.
