import React from 'react';
import { startEcosystemPresence } from './services/ecosystemPresence';
import { useDevBuild, DevBuildView } from './store/devbuildStore';
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

const NAV: { view: DevBuildView; icon: string; label: string }[] = [
  { view: 'browser', icon: '📁', label: 'Inicio' },
  { view: 'visual', icon: '🎨', label: 'Cartas' },
  { view: 'synergy', icon: '⚡', label: 'Sinergias' },
  { view: 'preview', icon: '👁️', label: 'Simulador' },
  { view: 'code', icon: '📝', label: 'Código' },
  { view: 'bridge', icon: '📡', label: 'Bridge' },
];

type ExtendedView = DevBuildView | 'chars' | 'combos' | 'tools';

export default function App() {
  React.useEffect(() => {
    startEcosystemPresence();
  }, []);
  const [view, setView] = React.useState<ExtendedView>('browser');
  const [toolsTab, setToolsTab] = React.useState<'builder' | 'effects' | 'cli' | 'registries' | 'assets' | 'mods' | 'sync' | 'diag' | 'advanced' | 'abilitiesv2' | 'charsv2'>('builder');
  const { editingCard, getAllCardsWithSource, mods, baseCharacters } = useDevBuild();

  const totalCards = getAllCardsWithSource().length;
  const totalChars = baseCharacters.length + mods.reduce((a, m) => a + m.characters.length, 0);
  const totalMods = mods.length;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-fuchsia-600 flex items-center justify-center text-lg shadow-lg">🔧</div>
          <div>
            <div className="font-black text-sm leading-tight">DevBuild <span className="text-emerald-400">CARGAS</span></div>
            <div className="text-[0.6rem] text-slate-500">Editor de sinergia del juego base</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-wrap">
          {NAV.map((n) => (
            <button key={n.view} onClick={() => setView(n.view)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${view === n.view ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <span>{n.icon}</span><span className="hidden sm:inline">{n.label}</span>
            </button>
          ))}
          <button onClick={() => setView('chars')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${view === 'chars' ? 'bg-fuchsia-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            🦸 <span className="hidden sm:inline">Personajes</span>
          </button>
          <button onClick={() => setView('combos')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${view === 'combos' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            💥 <span className="hidden sm:inline">Combos</span>
          </button>
          <button onClick={() => setView('tools')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${view === 'tools' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            🧰 <span className="hidden sm:inline">Herramientas</span>
          </button>
        </nav>

        <div className="text-[0.6rem] text-slate-500 hidden md:block">v1.0.0</div>
      </header>

      {/* main */}
      <main className="flex-1 overflow-hidden">
        {view === 'browser' && <ContentBrowser />}
        {view === 'visual' && <VisualEditor />}
        {view === 'synergy' && <SynergyLab />}
        {view === 'preview' && <PreviewPanel />}
        {view === 'code' && <CodeEditor />}
        {view === 'bridge' && <BridgeMonitor />}
        {view === 'chars' && <CharacterEditor />}
        {view === 'combos' && <ComboEditor />}
        {view === 'tools' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-1 bg-slate-900 border-b border-slate-800 px-4 py-2 shrink-0 overflow-x-auto">
              {([['builder','🛠️ Constructor'],['effects','⚡ Efectos/Sinergias'],['advanced','🧬 Mechanics v2'],['abilitiesv2','🎯 Habilidades v2'],['charsv2','🦸 Personajes v2'],['cli','🖥️ CLI'],['registries','🧬 Registros'],['assets','🎨 Assets'],['mods','🧩 Mods'],['sync','🔗 Sinergia'],['diag','🔍 Diagnóstico']] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setToolsTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${toolsTab === tab ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-4xl mx-auto">
                {toolsTab === 'builder' && <CardBuilderPanel />}
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
        <div>🎴 {totalCards} cartas · 🦸 {totalChars} personajes · 📦 {totalMods} mods</div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-500">● cargas.installedMods.v1 sincronizado</span>
          <span>📡 Bridge activo</span>
        </div>
      </footer>

      {/* modal card editor */}
      {editingCard && <CardEditor />}
    </div>
  );
}
