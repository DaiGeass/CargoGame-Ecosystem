# ⚔️ CARGAS - Juego de Cartas Estratégico

Juego de cartas multijugador con personajes únicos, pasivas, combos, trampas, sistema de defensa y soporte para mods/DLC.

## 🚀 Inicio rápido

```bash
npm install
npm run dev          # Desarrollo web
npm run tauri:dev    # Desarrollo escritorio (Tauri v2)
npm run tauri:build  # Build para distribución
```

## 🎮 Características

### Jugabilidad
- **18 personajes** con pasivas únicas (Arquero, Guerrero, Mago, Asesino, Sanador, Tanque, Druida, Bárbaro, Espadachín, Caballero, Cruzado, Explorador, Ladrón, Ballestero, Lancero, Ninja, Pirata, Mosquetero, Mercenario, Médico, Campeón, Samurái, Sargento)
- **60+ cartas** de: daño, DoT, curación, defensa, utilidad, especiales, trampas e instantáneas
- **10 combos** que se activan al jugar cartas específicas juntas
- **Sistema de resolución por target**: varias cartas se fusionan en un solo ataque
- **Fase de defensa**: el atacado puede responder con cartas de defensa/instantáneas
- **Daño crítico** configurable (15% x2 por defecto)
- **Stats detalladas**: daño, cura, kills, críticos, defensas, etc.

### Multijugador (LAN / P2P)
- **Local**: humano vs bots (IA con 3 dificultades)
- **LAN/VPN**: WebRTC P2P real con `simple-peer` + BroadcastChannel para multipestaña
- **Host autoridad**: el host valida acciones y sincroniza el estado a todos
- **2-12 jugadores** en modo FFA o equipos
- **🔒 Sincronización de mods**: si un jugador no tiene un mod del host, sus cartas se ven en gris y bloqueadas hasta instalarlo
- **Chat en sala** + lista de jugadores en tiempo real

### Herramientas dedicadas (instalables por separado)
- **🛠️ Modding Tool** (`CARGAS-ModdingTool.exe`): editor visual de cartas/personajes/mods sin código
- **🔧 Dev Tool** (`CARGAS-DevTool.exe`): inspector, probador de fórmulas, validador JSON, estadísticas de balance
- Ver **`INSTALLER.md`** para configuración del instalador y componentes seleccionables

### Configurable
- Críticos: 0% - 50%, multi x1.5 - x5
- Timer defensa: 3s - 30s
- Cartas por turno: 1 - 7
- Mano inicial/máxima: 3 - 12
- Niebla de guerra, ataque básico, DoT acumulable

### Sistemas Técnicos
- **Tauri v2** para distribución de escritorio (3 ejecutables seleccionables)
- **📁 Sistema de archivos local**: estructura `mods/`, `dlc/`, `assets/`, `data/` (ver `INSTALLER.md`)
- **🖼️🔊 Carga de assets locales**: imágenes/sonidos desde carpetas del mod (PNG/JPG/MP3/WAV/OGG)
- **Sistema de mods**: carga `.json`, `.zip`, `.cargasmod` + carpetas de disco con assets incrustados
- **🔒 Sincronización de mods en multijugador**: detecta y bloquea contenido faltante
- **Motor de efectos modular**: 25+ tipos de efecto componibles (`effects[]`)
- **✨ Efectos personalizados**: mods registran nuevos efectos con `registerCustomEffect()`
- **Motor de fórmulas matemáticas**: `target.hp * 0.2`, `sqrt(...)`, ternarios, etc.
- **Sistema de temas de carta**: 40+ temas registrables, colores inline, creador visual
- **🏷️ Tags y colores**: 50+ tags con CSS propio; fallback para tags de mods
- **🎨🔊 Estudio de Assets**: importa imágenes/sonidos como data URLs para cartas
- **🎬 Tutorial visual interactivo**: 6 slides animadas en menú principal y juego
- **🧩 Menú modular**: mods registran sus propias pestañas con `registerMenuPanel()`
- **📥 Descarga de templates JSON**: cartas, efectos, personajes, combos desde el menú
- **📦 Mod de ejemplo**: `public/mods/ejemplo_mod_completo.json` listo para probar

## 📖 Tutorial de Modding

Ver archivo `TUTORIAL_MODDING.md` para guía completa sobre:
- Agregar cartas nuevas
- Crear personajes (6 habilidades + pasiva)
- Sistema de pasivas (dónde editarlas en el código)
- Efectos de cartas
- Imágenes/placeholders
- Mods/DLC/Addons
- Combos

## 📂 Estructura del Proyecto

```
src/
├── types/
│   ├── game.ts            # Tipos: PlayableCard, Player, Ability, Media, Tags
│   └── effects.ts         # 25+ tipos de efecto modular (CardEffectKind)
├── data/
│   ├── cards.ts           # Personajes (18), cartas base, combos
│   ├── cardConcepts.ts    # 15+ cartas de ejemplo por concepto
│   ├── trapCards.ts       # Cartas trampa y mecánicas de cementerio
│   ├── abilities.ts       # Comportamiento de habilidades
│   ├── mods.ts            # Carga e incrustación de assets desde ZIP/JSON
│   ├── menuRegistry.ts    # Registro de pestañas del menú (mods/DLC)
│   ├── TEMPLATES.ts       # Plantillas estáticas (legacy)
│   └── MODDING_GUIDE.ts   # Guía maestra con ejemplos reales
├── store/
│   ├── gameStore.ts       # Lógica completa (Zustand)
│   └── networkStore.ts    # Sistema multijugador LAN
├── utils/
│   ├── cardEngine.ts      # Motor de cálculo de daño/defensa/DoT
│   ├── cardThemes.ts      # 40+ temas de carta registrables
│   ├── effects.ts         # Motor de efectos modulares (extensible)
│   ├── formulas.ts        # Parser matemático completo (+ - * / ^ % sqrt...)
│   ├── media.ts           # Resolución de imágenes/sonidos
│   └── tagStyles.ts       # Colores CSS por tag
├── components/
│   ├── GameBoard.tsx          # Tablero principal
│   ├── GameSetupModal.tsx     # Configuración de partida (menú)
│   ├── DefenseScreen.tsx      # Fase de defensa
│   ├── CardChoiceModal.tsx    # Elección de opciones
│   ├── PlayTutorialShowcase.tsx # Tutorial visual interactivo
│   ├── ModdingHelpPanel.tsx   # Guía + descarga de templates JSON
│   ├── AssetStudioPanel.tsx   # Importador de imágenes/sonidos → data URLs
│   ├── ModManager.tsx         # Gestor de mods
│   ├── VisualSettings.tsx     # Configuración visual + creador de temas
│   ├── GalleryCompendium.tsx  # Galería de cartas/personajes
│   ├── GameManual.tsx         # Manual del juego
│   └── MultiplayerLobby.tsx   # Multijugador LAN/VPN
├── App.tsx                # Entry point
├── main.tsx               # Registro de paneles modulares
└── index.css              # 30+ animaciones CSS + 50+ estilos de tag
```

## 🛠️ Comandos

```bash
npm run dev                # Servidor web desarrollo
npm run build              # Build web (dist/)
npm run tauri:dev          # Desarrollo con Tauri
npm run tauri:build        # Build de escritorio (.exe, .dmg, .AppImage)
```

## 📜 Reglas básicas

- 🃏 Mano de 7 cartas. Juega 1-3 por turno.
- ⚔️ Arrastra cartas al objetivo o selecciona + click en jugador.
- 💡 Ctrl+click en una carta para ver su descripción detallada.
- 🛡️ Si te atacan, puedes defenderte (12s para responder).
- 🃏 Las cartas SIEMPRE vuelven al mazo después de usarse.
- 🏆 Gana el último jugador/equipo en pie.

## 🧩 Mods

Coloca mods en la carpeta `mods/` o usa la UI de instalación:

```
mods/mi_mod/
├── manifest.json          # Metadata
├── cards.json             # Cartas adicionales
├── characters.json        # Personajes adicionales
├── combos.json            # Combos adicionales
└── images/                # Imágenes
```

Ver `TUTORIAL_MODDING.md` para el formato exacto.

## 📦 Dependencias

- React 19, TypeScript 5, Vite 7
- Zustand (estado global)
- Framer Motion (animaciones)
- Tauri v2 (escritorio)
- Tailwind CSS 4 (estilos)
- JSZip (carga de mods .zip)

## 🤝 Contribuciones

1. Fork
2. Rama: `feature/nueva-carta`
3. Commit: `Agrega carta X`
4. Pull Request

## 📄 Licencia

Proyecto educativo de ejemplo.
