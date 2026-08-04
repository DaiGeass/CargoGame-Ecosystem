# 📦 Guía de Empaquetado e Instalación — CARGAS

Esta guía explica cómo verificar, empaquetar e instalar CARGAS en
Windows, Linux y macOS usando Tauri v2.

---

## ✅ Verificación previa (HECHO)

Antes de empaquetar, el juego ya tiene:

- ✅ **Persistencia en disco** (`src/services/persistence.ts`)
  - Configuración visual → `data/visual.json`
  - Config del jugador → `data/config.json`
  - Índice de mods → `data/mods-index.json`
  - Partidas → `data/saves/`
- ✅ **Estructura de carpetas** creada al iniciar (backend Rust + frontend)
- ✅ **Carga de mods/DLC** desde `mods/` y `dlc/`
- ✅ **Panel de diagnóstico** (pestaña 🔍 Sistema en el menú)
- ✅ **Multijugador WebRTC** con IP local vía comando Rust

### Probar la persistencia AHORA (modo web)
1. Abre el juego
2. Ve a **Setup → 🔍 Sistema**
3. Verás el diagnóstico: en web dirá "localStorage", en la app instalada dirá "Tauri: disco duro real"

---

## 🛠️ Requisitos para empaquetar

### Todas las plataformas
- **Node.js** 18+ y **npm**
- **Rust** (instalar desde https://rustup.rs)
- **Tauri CLI**: ya incluido en `devDependencies` (`@tauri-apps/cli`)

### Windows
- **Microsoft Visual Studio C++ Build Tools**
- **WebView2** (viene con Windows 10/11)

### Linux
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### macOS
- **Xcode Command Line Tools**: `xcode-select --install`

---

## 🎨 Generar los iconos

Tauri necesita iconos en varios tamaños. Hay un icono base en
`src-tauri/icons/icon-source.png`. Genera el resto con:

```bash
npx @tauri-apps/cli icon src-tauri/icons/icon-source.png
```

Esto crea automáticamente: `32x32.png`, `128x128.png`, `128x128@2x.png`,
`icon.icns` (macOS) e `icon.ico` (Windows).

---

## 📜 Scripts necesarios en package.json

Añade estos scripts a tu `package.json` (manualmente, ya que está
protegido en el entorno actual):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

---

## 🚀 Compilar / empaquetar

### Desarrollo (ventana nativa con hot-reload)
```bash
npm run tauri:dev
```

### Producción (instaladores)
```bash
npm run tauri:build
```

Los instaladores se generan en `src-tauri/target/release/bundle/`:

| Plataforma | Archivo generado |
|-----------|-----------------|
| Windows | `nsis/CARGAS_1.0.0_x64-setup.exe` |
| Windows | `msi/CARGAS_1.0.0_x64_en-US.msi` |
| Linux | `deb/cargas_1.0.0_amd64.deb` |
| Linux | `appimage/cargas_1.0.0_amd64.AppImage` |
| macOS | `dmg/CARGAS_1.0.0_x64.dmg` |

---

## 💾 Dónde se guardan los datos (disco duro real)

Tras instalar, el juego guarda TODO en:

| SO | Ruta |
|----|------|
| **Windows** | `%LOCALAPPDATA%\com.cargas.game\` |
| **Linux** | `~/.local/share/com.cargas.game/` |
| **macOS** | `~/Library/Application Support/com.cargas.game/` |

Estructura creada automáticamente:
```
com.cargas.game/
├── data/
│   ├── visual.json          ← configuración visual
│   ├── config.json          ← config del jugador
│   ├── mods-index.json      ← índice de mods
│   ├── saves/               ← partidas guardadas
│   └── bridge/              ← mensajes entre programas
├── mods/                    ← mods del usuario
├── dlc/                     ← DLC instalados
└── assets/
    ├── music/
    ├── sfx/
    └── images/
```

El usuario puede colocar mods manualmente en `mods/<id>/` y el juego
los carga al arrancar.

---

## 🔍 Verificación post-instalación

1. Instala el juego con el instalador generado
2. Ábrelo → **Setup → 🔍 Sistema**
3. Debe mostrar:
   - ✅ Modo: **Tauri: guarda en disco duro real**
   - ✅ Estructura de carpetas creada
   - ✅ Escritura y lectura funciona
   - ✅ Configuración persistida

4. Cambia algo en **🎨 Visual**, cierra el juego, vuelve a abrir →
   los cambios deben mantenerse (prueba de persistencia en disco).

---

## 📱 Android (crossplay futuro)

Tauri v2 soporta Android. Para compilar:

```bash
npm run tauri android init
npm run tauri android build
```

Requiere: Android Studio, Android SDK, NDK. El juego ya es responsive
y el multijugador WebRTC funciona en móvil.

---

## ⚠️ Notas importantes

- El `vite-plugin-singlefile` genera un único `index.html` autocontenido,
  ideal para Tauri (sin assets externos que se pierdan).
- Los permisos de filesystem están en `src-tauri/capabilities/default.json`
  y limitan el acceso a la carpeta de datos del juego (seguro).
- El identifier `com.cargas.game` debe ser único; cámbialo si publicas.
