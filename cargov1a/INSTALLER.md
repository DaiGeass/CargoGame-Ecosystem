# 📦 CARGAS — Guía de Instalador y Estructura de Carpetas

Este documento describe cómo configurar el **instalador** (Windows/Mac/Linux con Tauri v2), los **3 programas** del ecosistema y la **estructura de carpetas compartida** que todos leen.

---

## 🎯 Arquitectura de 3 programas

El ecosistema CARGAS son **3 programas separados** que comparten la misma
carpeta de datos y se comunican a través de la estructura de carpetas
(mods/, dlc/, data/):

| # | Programa | Ejecutable | Descripción | Estado |
|---|----------|-----------|-------------|--------|
| 1 | **Juego** | `CARGAS.exe` | El juego de cartas (este proyecto) | ✅ Funcional |
| 2 | **Dev Tool** | `CARGAS-DevTool.exe` | Modifica/agrega al código base del juego (CLI + GUI) | 🔜 Próximo |
| 3 | **Modding Tool** | `CARGAS-ModdingTool.exe` | Crea mods y DLC (CLI + GUI) | 🔜 Próximo |

> **Este repositorio es el PROGRAMA 1 (el juego)**. El DevTool y ModdingTool
> serán proyectos separados que escriben en las mismas carpetas que el juego lee.

### Cómo se comunican los 3 programas

```
┌──────────────┐     escribe      ┌─────────────────────┐
│  Dev Tool    │ ───────────────► │  data/ (código base)│ ◄──┐
└──────────────┘                  └─────────────────────┘    │
                                                              │ lee
┌──────────────┐     escribe      ┌─────────────────────┐    │
│ Modding Tool │ ───────────────► │  mods/ , dlc/       │ ───┤
└──────────────┘                  └─────────────────────┘    │
                                                       ┌──────────────┐
                                                       │  CARGAS.exe  │
                                                       │   (Juego)    │
                                                       └──────────────┘
```

- El **DevTool** modifica el contenido base (cartas/personajes/efectos del juego)
- El **ModdingTool** crea mods/DLC en carpetas separadas
- El **Juego** lee todo al arrancar (`loadModsFromInstallFolder()`)

---

## 🎯 Componentes seleccionables en el instalador

El instalador debe permitir elegir qué componentes instalar (estilo NSIS/Inno Setup/WiX):

| Componente | Ejecutable | Obligatorio |
|-----------|-----------|-------------|
| ☑️ **Juego principal** | `CARGAS.exe` | Sí |
| ☐ **Dev Tool** | `CARGAS-DevTool.exe` | No |
| ☐ **Modding Tool** | `CARGAS-ModdingTool.exe` | No |

### Configuración en `tauri.conf.json` (multi-binario)

```jsonc
{
  "bundle": {
    "active": true,
    "targets": ["nsis", "msi", "dmg", "appimage"],
    "windows": {
      "nsis": {
        "installMode": "both",
        "displayLanguageSelector": true
      }
    }
  }
}
```

> **Nota:** El DevTool y ModdingTool son **proyectos Tauri separados**
> (no binarios dentro de este repo). Cada uno tiene su propio `tauri.conf.json`
> pero apuntan a la **misma carpeta de datos** (`AppLocalData/com.cargas.game/`)
> para compartir mods, dlc y configuración con el juego.

El instalador agrupa los 3 instaladores en uno solo con componentes
seleccionables, o los distribuye por separado.

---

## 📁 Estructura de carpetas de instalación

El juego crea y lee esta estructura en la carpeta de datos de la app
(`AppLocalData` en Tauri, p.ej. `%LOCALAPPDATA%/com.cargas.game/`):

```
<carpeta_instalacion>/
├── CARGAS.exe
├── CARGAS-ModdingTool.exe       (si se instaló)
├── CARGAS-DevTool.exe           (si se instaló)
│
├── data/
│   ├── config.json              # Configuración del jugador
│   ├── visual.json              # Configuración visual
│   └── saves/                   # Partidas guardadas
│
├── mods/                        # ← MODS DEL USUARIO
│   └── <mod_id>/
│       ├── manifest.json        # Metadata del mod
│       ├── cards.json           # Cartas del mod
│       ├── characters.json      # Personajes del mod
│       ├── combos.json          # Combos del mod
│       ├── images/              # 🖼️ PNG/JPG/WebP/SVG
│       │   ├── carta1.png
│       │   └── personaje1.png
│       └── sounds/              # 🔊 MP3/WAV/OGG
│           ├── golpe.mp3
│           └── intro.mp3
│
├── dlc/                         # ← DLC OFICIALES (misma estructura que mods)
│   └── <dlc_id>/
│       └── ...
│
└── assets/                      # Assets compartidos
    ├── music/                   # Música de fondo
    ├── sfx/                     # Efectos de sonido globales
    └── images/                  # Imágenes compartidas
```

> 💡 **Importante**: El juego lee automáticamente todas las carpetas dentro
> de `/mods` y `/dlc` al arrancar (ver `loadModsFromInstallFolder()`).
> Las rutas de imágenes/sonidos en los JSON son **relativas a la carpeta del mod**:
> `"imageFront": "images/carta1.png"`.

---

## 🖼️🔊 Cómo referenciar assets locales en un mod

Dentro de `cards.json`, usa rutas relativas a la carpeta del mod:

```json
[
  {
    "id": "mi_carta",
    "name": "Mi Carta",
    "type": "damage",
    "value": -50,
    "imageFront": "images/mi_carta.png",
    "media": {
      "image": "images/mi_carta.png",
      "soundOnPlay": "sounds/golpe.mp3",
      "soundOnResolve": "sounds/impacto.mp3"
    }
  }
]
```

El juego convierte estos archivos a **data URLs** al cargar el mod,
así que funcionan tanto en web como empaquetado.

---

## 🔧 Carga de música/sonidos/imágenes locales

El sistema de archivos (`src/utils/fileSystem.ts`) expone:

```typescript
const fs = getFileSystem();

// Leer una imagen local como data URL
const dataUrl = await fs.readBinaryAsDataUrl('mods/mimod/images/x.png', 'image/png');

// Leer música de fondo
const music = await fs.readBinaryAsDataUrl('assets/music/battle.mp3', 'audio/mpeg');
```

- **En Tauri**: usa `@tauri-apps/plugin-fs` real
- **En Web**: usa `localStorage` como fallback (modo demo)

---

## 🔌 Permisos de Tauri necesarios

En `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "fs:allow-read-file",
    "fs:allow-write-file",
    "fs:allow-read-dir",
    "fs:allow-mkdir",
    "fs:allow-exists",
    "fs:scope-applocaldata-recursive",
    "dialog:allow-open"
  ]
}
```

---

## 🚀 Build del instalador

```bash
# Compila el juego web
npm run build

# Genera instalador con Tauri (los 3 ejecutables)
npm run tauri:build
```

El instalador resultante estará en `src-tauri/target/release/bundle/`.

---

## ✅ Resumen del flujo

1. El usuario ejecuta el instalador y **elige componentes** (juego, modding tool, dev tool)
2. El instalador crea la **estructura de carpetas** (`mods/`, `dlc/`, `assets/`, `data/`)
3. Al abrir el juego, este **lee los mods** de `/mods` y `/dlc`
4. Las **imágenes y sonidos** locales se cargan desde las carpetas del mod
5. Las herramientas (DevTool, ModdingTool) son programas separados que escriben en las mismas carpetas
6. En **multijugador**, si al cliente le falta un mod del host, **no puede iniciar la partida** hasta instalarlo o que el host lo desactive (no se bloquean cartas individuales)
