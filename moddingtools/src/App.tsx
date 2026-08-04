import React from 'react';
import { startEcosystemPresence } from './services/ecosystemPresence';
import { useModding, ModdingView } from './store/moddingStore';
import { ContentBrowser } from './components/ContentBrowser';
import { VisualEditor } from './components/VisualEditor';
import { SynergyLab } from './components/SynergyLab';
import { CharacterEditor } from './components/CharacterEditor';
import { ComboEditor } from './components/ComboEditor';
import { CodeEditor } from './components/CodeEditor';
import { PreviewPanel } from './components/PreviewPanel';
import { BridgeMonitor } from './components/BridgeMonitor';
import { CardEditor } from './components/CardEditor';
import { CardBuilderPanel } from './components/CardBuilderPanel';
import { AssetStudioPanel } from './components/AssetStudioPanel';
import { ModManager } from './components/ModManager';
import { SystemDiagnosticsPanel } from './components/SystemDiagnosticsPanel';
import { CliTerminal } from './components/CliTerminal';
import { RegistriesManager } from './components/RegistriesManager';
import { GameSyncPanel } from './components/GameSyncPanel';
import { EffectSynergyBuilder } from './components/EffectSynergyBuilder';
import { AdvancedMechanicsPanel } from './components/AdvancedMechanicsPanel';
import { CharacterV2Studio } from './components/CharacterV2Studio';
import { AbilityBuilderStudio } from './components/AbilityBuilderStudio';
import { MechanicsBuilder } from './components/MechanicsBuilder';
import { TotalConversionStudio } from './components/TotalConversionStudio';

const NAV: { view: ModdingView; icon: string; label: string }[] = [
  { view: 'home', icon: '🏠', label: 'Inicio' },
  { view: 'cards', icon: '🎴', label: 'Cartas' },
  { view: 'chars', icon: '🦸', label: 'Personajes' },
  { view: 'combos', icon: '💥', label: 'Combos' },
  { view: 'synergy', icon: '⚡', label: 'Sinergias' },
  { view: 'tc', icon: '🌐', label: 'Total Conv.' },
  { view: 'preview', icon: '👁️', label: 'Simulador' },
  { view: 'code', icon: '📝', label: 'Código' },
  { view: 'bridge', icon: '📡', label: 'Bridge' },
  { view: 'tools', icon: '🧰', label: 'Herramientas' },
];

type ToolsTab = 'builder' | 'mechanics' | 'effects' | 'cli' | 'registries' | 'assets' | 'mods' | 'sync' | 'diag' | 'advanced';

export default function App() {
  React.useEffect(() => {
    startEcosystemPresence();
  }, []);
  const { view, setView, editingCard, getAllCardsWithSource, mods, baseCharacters } = useModding();
  const [toolsTab, setToolsTab] = React.useState<ToolsTab | 'advanced'>('builder');

  const totalCards = getAllCardsWithSource().length;
  const totalChars = baseCharacters.length + mods.reduce((a, m) => a + m.characters.length, 0);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center text-lg shadow-lg">🧪</div>
          <div>
            <div className="font-black text-sm leading-tight">ModdingBuild <span className="text-rose-400">CARGAS</span></div>
            <div className="text-[0.6rem] text-slate-500">Herramienta de modding avanzada</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-wrap justify-center">
          {NAV.map((n) => (
            <button key={n.view} onClick={() => setView(n.view)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${view === n.view ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <span>{n.icon}</span><span className="hidden md:inline">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="text-[0.6rem] text-rose-400/70 hidden lg:block font-bold">v1.0 · modder</div>
      </header>

      {/* main */}
      <main className="flex-1 overflow-hidden">
        {view === 'home' && <ContentBrowser />}
        {view === 'cards' && <VisualEditor />}
        {view === 'chars' && <CharacterEditor />}
        {view === 'combos' && <ComboEditor />}
        {view === 'synergy' && <SynergyLab />}
        {view === 'tc' && <div className="h-full overflow-y-auto p-5"><div className="max-w-4xl mx-auto"><TotalConversionStudio /></div></div>}
        {view === 'preview' && <PreviewPanel />}
        {view === 'code' && <CodeEditor />}
        {view === 'bridge' && <BridgeMonitor />}
        {view === 'tools' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-1 bg-slate-900 border-b border-slate-800 px-4 py-2 shrink-0 overflow-x-auto">
              {([
                ['builder','🛠️ Constructor'],['mechanics','🧪 Mecánicas'],['effects','⚡ Efectos/Sinergias'],['advanced','🧬 Mechanics v2'],['abilitiesv2','🎯 Habilidades v2'],['charsv2','🦸 Personajes v2'],
                ['cli','🖥️ CLI'],['registries','🧬 Registros'],['assets','🎨 Assets'],
                ['mods','🧩 Mods'],['sync','🔗 Sinergia'],['diag','🔍 Diagnóstico'],
              ] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setToolsTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${toolsTab === tab ? 'bg-rose-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-4xl mx-auto">
                {toolsTab === 'builder' && <CardBuilderPanel />}
                {toolsTab === 'mechanics' && <MechanicsBuilder />}
                {toolsTab === 'effects' && <EffectSynergyBuilder />}
                {toolsTab === 'advanced' && <AdvancedMechanicsPanel />}
                {toolsTab === 'abilitiesv2' && <AbilityBuilderStudio />}
                {toolsTab === 'charsv2' && <CharacterV2Studio />}
                {toolsTab === 'cli' && <CliTerminal />}
                {toolsTab === 'registries' && <RegistriesManager />}
                {toolsTab === 'assets' && <AssetStudioPanel />}
                {toolsTab === 'mods' && <ModManager />}
                {toolsTab === 'sync' && <GameSyncPanel />}
                {toolsTab === 'diag' && <SystemDiagnosticsPanel />}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* status bar */}
      <footer className="h-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 text-[0.55rem] text-slate-500 shrink-0">
        <div>🎴 {totalCards} cartas · 🦸 {totalChars} personajes · 📦 {mods.length} mods</div>
        <div className="flex items-center gap-3">
          <span className="text-rose-400">● reconocido por CARGAS</span>
          <span>🧪 modder · 🌐 total conversion · 🖥️ GUI+CLI</span>
        </div>
      </footer>

      {editingCard && <CardEditor />}
    </div>
  );
}
