import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registerMenuPanel } from "./data/menuRegistry";
import { ModdingHelpPanel } from "./components/ModdingHelpPanel";
import { AssetStudioPanel } from "./components/AssetStudioPanel";
import { SystemDiagnosticsPanel } from "./components/SystemDiagnosticsPanel";
import { exposeContentAPI } from "./services/contentAPI";

// ─── Registro de paneles base del juego ───────────────────
// Demuestra el sistema modular: cualquier mod/DLC puede registrar
// sus propias pestañas igual que estas.
registerMenuPanel({
  id: 'modding_help',
  label: '🛠️ Modding',
  order: 90,
  component: ModdingHelpPanel,
});

// Estudio de Assets: importar imágenes/sonidos → data URLs para cartas
registerMenuPanel({
  id: 'asset_studio',
  label: '🎨 Assets',
  order: 85,
  component: AssetStudioPanel,
});

// Diagnóstico del sistema: verifica que todo se guarde en disco
registerMenuPanel({
  id: 'diagnostics',
  label: '🔍 Sistema',
  order: 95,
  component: SystemDiagnosticsPanel,
});

// Exponer la API de contenido para DevTool/ModdingTool y consola
exposeContentAPI();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
