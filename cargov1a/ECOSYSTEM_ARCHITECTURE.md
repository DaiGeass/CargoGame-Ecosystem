# Arquitectura del Ecosistema CARGAS

## Visión General

CARGAS es un ecosistema de 3 programas independientes que se comunican entre sí para proporcionar una experiencia completa de juego y creación de contenido.

## Los 3 Programas

### 1. Game (Juego Principal)
**Propósito:** Ejecutar el juego de cartas

**Funcionalidades:**
- Jugar partidas locales (vs bots)
- Jugar partidas multijugador (LAN/VPN)
- Gestionar mods y DLC instalados
- Configuración visual y de reglas
- Galería de contenido

**Tecnologías:**
- React + TypeScript
- Tauri v2 (para empaquetado)
- WebRTC + BroadcastChannel (multijugador)
- Zustand (estado global)

**Ejecutables:**
- `cargas-game.exe` (Windows)
- `cargas-game` (Linux)
- `cargas-game.app` (macOS)

---

### 2. DevTool (Herramienta de Desarrollo)
**Propósito:** Modificar y extender el código base del juego

**Funcionalidades:**
- Editor visual de código TypeScript
- Inspector de estado en tiempo real
- Probador de fórmulas matemáticas
- Validador de balance de cartas
- Debug de efectos y sinergias
- Exportar cambios al juego

**Tecnologías:**
- Monaco Editor (VSCode en el navegador)
- WebSockets locales (comunicación con Game)
- TypeScript Compiler API

**Ejecutables:**
- `cargas-devtool.exe` (Windows)
- `cargas-devtool` (Linux)
- `cargas-devtool.app` (macOS)

---

### 3. ModdingTool (Herramienta de Modding)
**Propósito:** Crear mods y DLC sin tocar código

**Funcionalidades:**
- Constructor visual de cartas
- Editor de personajes
- Gestor de assets (imágenes/sonidos)
- Probador de mods
- Empaquetador de .cargasmod
- Publicador de mods

**Tecnologías:**
- React + TypeScript
- Constructores visuales (formularios)
- JSZip (empaquetado)
- File System API

**Ejecutables:**
- `cargas-moddingtool.exe` (Windows)
- `cargas-moddingtool` (Linux)
- `cargas-moddingtool.app` (macOS)

---

## Comunicación entre Programas

### Canales de Comunicación

```
┌─────────────────────────────────────────────────────────────┐
│                    CARPETA COMPARTIDA                        │
│                     data/bridge/                             │
│                                                              │
│  msg_123.json  ←  Mensajes JSON con timestamps              │
│  msg_456.json  ←  Limpieza automática cada 60s              │
│  msg_789.json  ←  Polling cada 100ms                        │
└─────────────────────────────────────────────────────────────┘
         ↑                    ↑                    ↑
         │                    │                    │
    ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
    │  Game   │          │ DevTool │          │Modding  │
    │         │          │         │          │  Tool   │
    └─────────┘          └─────────┘          └─────────┘
```

### Protocolo de Mensajes

Ver `BRIDGE_PROTOCOL.md` para detalles completos.

**Tipos principales:**
- `mod_installed` / `mod_uninstalled` / `mod_updated`
- `dlc_installed` / `dlc_uninstalled`
- `mods_sync_request` / `mods_sync_response`
- `config_changed` / `visual_config_changed`

### Flujo de Instalación de Mod

```
┌──────────────┐
│  Modding     │
│    Tool      │
│              │
│  1. Usuario  │
│     crea mod │
│              │
│  2. Empaqueta│
│     .cargasmod│
│              │
│  3. Instala  │
│     en Game  │
└──────┬───────┘
       │
       │ mod_installed
       │ (mensaje)
       ▼
┌──────────────┐          ┌──────────────┐
│    Game      │◄────────►│   DevTool    │
│              │  sync    │              │
│  4. Recarga  │          │  5. Ve los   │
│     mods     │          │     cambios  │
│              │          │              │
│  6. Juega    │          │  7. Debug    │
│     con mod  │          │     si quiere│
└──────────────┘          └──────────────┘
```

---

## Estructura de Carpetas Compartidas

```
CARGAS/
├── Game/
│   ├── cargas-game.exe
│   └── ...
├── DevTool/
│   ├── cargas-devtool.exe
│   └── ...
├── ModdingTool/
│   ├── cargas-moddingtool.exe
│   └── ...
└── data/                    ← Carpeta compartida
    ├── bridge/              ← Mensajes entre programas
    │   ├── msg_*.json
    │   └── (limpieza automática)
    ├── mods/                ← Mods instalados
    │   ├── mod-a/
    │   └── mod-b/
    ├── dlc/                 ← DLC instalados
    │   └── expansion-1/
    ├── assets/              ← Assets compartidos
    │   ├── images/
    │   ├── audio/
    │   └── icons/
    └── config/              ← Configuración
        ├── game.json
        ├── devtool.json
        └── moddingtool.json
```

---

## Crossplay y Multijugador

### Arquitectura de Red

```
┌──────────────┐
│   Host       │
│  (Game)      │
│              │
│  - Crea sala │
│  - Envía mods│
│  - Autoridad │
└──────┬───────┘
       │
       │ WebRTC / BroadcastChannel
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Cliente 1   │  │  Cliente 2   │  │  Cliente 3   │
│   (Game)     │  │   (Game)     │  │   (Game)     │
│              │  │              │  │              │
│ - Verifica   │  │ - Verifica   │  │ - Verifica   │
│   mods       │  │   mods       │  │   mods       │
│ - Juega      │  │ - Juega      │  │ - Juega      │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Sincronización de Mods en Crossplay

1. **Host crea sala:**
   - Obtiene lista de mods instalados localmente
   - Envía `game_state_sync` con `{ hostMods: [...] }`

2. **Cliente se une:**
   - Recibe lista de mods del host
   - Compara con sus mods locales
   - Si faltan mods → no puede jugar
   - Si tiene todos → puede jugar

3. **Durante la partida:**
   - Solo se usan cartas de mods compartidos
   - Cartas de mods no compartidos se excluyen del mazo
   - Todos los jugadores ven el mismo contenido

---

## Seguridad y Privacidad

### Local-First
- Toda la comunicación es local (no sale de la máquina)
- No se transmite código ejecutable entre programas
- Solo metadatos de mods (IDs, nombres, versiones)

### Crossplay Seguro
- Los mods deben estar instalados localmente
- No se descargan mods automáticamente
- El usuario decide qué instalar

### Sin Telemetría
- No hay tracking de usuarios
- No hay analytics
- No hay conexión a servidores externos (excepto para WebRTC si se configura)

---

## API de Contenido (window.CARGAS_API)

El juego expone una API global para que DevTool, ModdingTool y la consola
de desarrollo accedan al contenido. Está en `src/services/contentAPI.ts`.

### Lectura (siempre disponible)
```javascript
// Todas las cartas con su origen (base/mod/dlc)
window.CARGAS_API.getAllCards();
// Cartas de un mod específico
window.CARGAS_API.getCardsBySource('mi_mod');
// Todos los personajes
window.CARGAS_API.getAllCharacters();
// Resumen de fuentes
window.CARGAS_API.getSourceSummary();
// Temas de carta
window.CARGAS_API.getAllThemes();
```

### Escritura (requiere acceso write/full)
```javascript
// Instalar un mod desde archivo
await window.CARGAS_API.installMod(file);
// Desinstalar
window.CARGAS_API.uninstallMod('mod_id');
// Registrar un tema nuevo
window.CARGAS_API.registerTheme('mi_tema', {...});
// Validar contenido antes de guardar
window.CARGAS_API.validateCard(cardObj);
window.CARGAS_API.validateCharacter(charObj);
```

### Configuración de acceso
```javascript
import { configureContentAPI } from './services/contentAPI';
configureContentAPI({ source: 'devtool', access: 'full' });
```

## Comandos Tauri necesarios (backend Rust)

Para que el bridge persista mensajes en disco, el backend Tauri debe
implementar estos comandos (en `src-tauri/src/main.rs`):

```rust
#[tauri::command]
fn write_bridge_message(message: serde_json::Value) -> Result<(), String> {
    // Guardar en data/bridge/msg_<id>.json
}

#[tauri::command]
fn read_bridge_messages() -> Result<Vec<serde_json::Value>, String> {
    // Leer todos los data/bridge/*.json
}

#[tauri::command]
fn clean_old_bridge_messages(max_age_ms: u64) -> Result<(), String> {
    // Borrar mensajes más viejos que max_age_ms
}
```

Sin estos comandos, el bridge funciona solo en memoria (mismo proceso),
que es suficiente para desarrollo web. Con ellos, los 3 programas pueden
comunicarse aunque sean procesos separados.

## Carga de contenido desde disco

El juego carga al iniciar (en `App.tsx`):
```typescript
await fs.ensureFolderStructure();        // crea carpetas
await loadModsFromInstallFolder();        // carga mods Y dlc del disco
```

`loadModsFromInstallFolder()` lee:
- `mods/<id>/` → mods de usuario
- `dlc/<id>/` → DLC oficiales

Ambos con sus assets locales (images/, sounds/) incrustados como data URLs.

## Futuro

### WebSockets Locales (v2.0)
- Comunicación en tiempo real entre programas
- Menor latencia que polling de archivos
- Cola de mensajes con reintentos

### Marketplace de Mods (v3.0)
- Repositorio central de mods
- Descarga automática de mods faltantes
- Sistema de ratings y reviews

### Cloud Sync (v3.0)
- Sincronización de progreso entre dispositivos
- Backups en la nube
- Crossplay a través de internet (no solo LAN)

---

## Desarrollo

### Clonar y Compilar

```bash
# Game
git clone https://github.com/cargas/game
cd game
npm install
npm run build

# DevTool
git clone https://github.com/cargas/devtool
cd devtool
npm install
npm run build

# ModdingTool
git clone https://github.com/cargas/moddingtool
cd moddingtool
npm install
npm run build
```

### Estructura de Repositorios

```
github.com/cargas/
├── game/              ← Este repositorio
├── devtool/           ← Próximamente
├── moddingtool/       ← Próximamente
├── shared/            ← Código compartido (tipos, utils)
└── docs/              ← Documentación
```

---

## Contacto

- **Discord:** [discord.gg/cargas](https://discord.gg/cargas)
- **GitHub:** [github.com/cargas](https://github.com/cargas)
- **Email:** contacto@cargas.game
