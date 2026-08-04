# Protocolo de Comunicación entre Programas CARGAS

## Descripción General

El ecosistema CARGAS consta de 3 programas independientes que pueden comunicarse entre sí:

1. **Game** (juego principal) - `cargas-game`
2. **DevTool** (herramienta de desarrollo) - `cargas-devtool`
3. **ModdingTool** (herramienta de modding) - `cargas-moddingtool`

## Canales de Comunicación

### 1. Archivos Compartidos (Primario)
- Ubicación: `data/bridge/`
- Formato: Archivos JSON con timestamps
- Ventaja: Funciona aunque los programas no estén corriendo simultáneamente
- Desventaja: Latencia de polling

### 2. WebSockets Locales (Opcional)
- Puerto: `9877` (configurable)
- Ventaja: Comunicación en tiempo real
- Desventaja: Requiere que ambos programas estén corriendo

### 3. Eventos de Window (Fallback)
- Solo funciona si están en la misma ventana/navegador
- Usado principalmente para desarrollo

## Tipos de Mensajes

### Mensajes de Mods
```typescript
mod_installed      // Se instaló un mod
mod_uninstalled    // Se desinstaló un mod
mod_updated        // Se actualizó un mod
mods_sync_request  // Solicita lista de mods
mods_sync_response // Respuesta con lista de mods
```

### Mensajes de DLC
```typescript
dlc_installed      // Se instaló un DLC
dlc_uninstalled    // Se desinstaló un DLC
dlc_updated        // Se actualizó un DLC
```

### Mensajes de Configuración
```typescript
config_changed           // Cambió la configuración general
visual_config_changed    // Cambió la configuración visual
```

### Mensajes de Contenido
```typescript
card_created       // Se creó una carta
card_updated       // Se actualizó una carta
card_deleted       // Se eliminó una carta

character_created  // Se creó un personaje
character_updated  // Se actualizó un personaje
character_deleted  // Se eliminó un personaje

combo_created      // Se creó un combo
combo_updated      // Se actualizó un combo
combo_deleted      // Se eliminó un combo
```

### Mensajes de Sincronización
```typescript
sync_request       // Solicita sincronización completa
sync_response      // Respuesta con estado completo
sync_complete      // Sincronización completada
```

### Mensajes Genéricos
```typescript
ping               // Verificar si está vivo
pong               // Respuesta a ping
error              // Mensaje de error
```

## Estructura de Mensaje

```typescript
interface BridgeMessage {
  type: BridgeMessageType;
  from: 'game' | 'devtool' | 'moddingtool';
  to?: 'game' | 'devtool' | 'moddingtool' | 'broadcast';
  payload: any;
  timestamp: number;
  id: string;
}
```

## Flujos de Comunicación

### Flujo 1: Instalación de Mod desde ModdingTool

```
ModdingTool                    Game
     |                          |
     |-- mod_installed -------->|
     |                          |-- Recargar mods
     |                          |-- Actualizar UI
     |<-- mod_sync_response ----|
     |                          |
```

### Flujo 2: Sincronización de Mods al Iniciar

```
Game                           DevTool
  |                              |
  |-- mods_sync_request -------->|
  |                              |-- Preparar lista de mods
  |<-- mods_sync_response -------|
  |-- Comparar listas            |
  |-- Decidir si recargar        |
  |                              |
```

### Flujo 3: Verificar Programas Corriendo

```
Game                           DevTool    ModdingTool
  |                              |            |
  |-- ping --------------------->|            |
  |-- ping ---------------------------------->|
  |<-- pong ---------------------|            |
  |<-- pong ----------------------------------|
  |-- Ambos programas activos    |            |
```

## Implementación

### En el Juego (Game)

```typescript
import { initInterprocessService } from './services/interprocess';

// Al iniciar el juego
initInterprocessService();
```

### En DevTool/ModdingTool

```typescript
import { initInterprocessService } from './services/interprocess';

// Al iniciar la herramienta
initInterprocessService();
```

## Persistencia de Mensajes

Los mensajes se persisten en `data/bridge/` con el formato:

```
data/bridge/
├── msg_1234567890_abc123.json
├── msg_1234567891_def456.json
└── msg_1234567892_ghi789.json
```

Cada archivo contiene:
```json
{
  "type": "mod_installed",
  "from": "moddingtool",
  "to": "broadcast",
  "payload": {
    "modId": "ejemplo-mod",
    "modName": "Mod de Ejemplo"
  },
  "timestamp": 1234567890,
  "id": "msg_1234567890_abc123"
}
```

Los mensajes se limpian automáticamente después de 60 segundos.

## Crossplay y Multijugador

Para crossplay entre diferentes instancias del juego:

1. **Host crea sala**: Incluye lista de mods instalados
2. **Cliente se une**: Verifica que tiene todos los mods del host
3. **Si faltan mods**: No puede unirse hasta instalarlos
4. **Sincronización**: Se hace al crear/unirse a la sala

## Seguridad

- Los mensajes son locales (no salen de la máquina)
- No se transmite código ejecutable
- Solo se sincronizan metadatos de mods (IDs, nombres, versiones)
- El contenido real de los mods debe estar instalado localmente

## Futuro

- Soporte para WebSockets locales (tiempo real)
- Cola de mensajes con reintentos
- Compresión de mensajes grandes
- Encriptación de mensajes sensibles
