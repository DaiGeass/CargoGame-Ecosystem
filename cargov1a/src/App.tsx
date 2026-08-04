import React from 'react';
// ============================================================
// APP - Entry Point (JUEGO BASE)
// ============================================================
// Este es el JUEGO principal (CARGAS.exe). Las herramientas
// DevTool y ModdingTool son programas SEPARADOS que se instalan
// aparte y se comunican con el juego a través de la estructura
// de carpetas compartida (mods/, dlc/, data/).
//
// Pantallas:
//   - GameBoard (juego normal + setup integrado)
//   - MultiplayerLobby (partida en red LAN/VPN)
// ============================================================

import { useState, useEffect } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameSetupModal } from './components/GameSetupModal';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { applyVisualConfigToDOM } from './components/VisualSettings';
import { useGameStore } from './store/gameStore';
import { getFileSystem } from './utils/fileSystem';
import { loadPersistedData, readPersistedJSON } from './services/persistence';
import { pollBridgeMessages } from './services/bridge';
import { initInterprocessService } from './services/interprocess';
import { startNetworkGameSync } from './services/networkGameSync';
import { startEcosystemPresence } from './services/ecosystemPresence';
import { exposeContentAPI } from './services/contentAPI';
import { startGameContentSnapshotPublisher, publishGameContentSnapshot } from './services/gameContentSnapshot';
import { startBaseOverridesRuntimeWatcher } from './services/baseOverridesRuntime';
import { startEditorKvWatcher } from './services/editorKvWatcher';

export type AppScreen = 'game' | 'multiplayer';


function CargasHomeScreen({
  onPlay,
  onMultiplayer,
}: {
  onPlay: () => void;
  onMultiplayer: () => void;
}) {
  return (
    <div className="cargas-home-root relative flex items-center justify-center p-4 sm:p-6">
      <div className="cargas-home-grid" />

      <div className="relative z-10 w-full max-w-6xl animate-cargas-home-rise">
        <div className="cargas-home-hero rounded-[2rem] p-5 sm:p-8 lg:p-10">
          <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-950/30 px-3 py-1 text-[0.68rem] font-black text-amber-200 mb-4">
                ⚔️ CARGAS · Cartas · Habilidades · Mods · LAN
              </div>

              <h1 className="cargas-home-title">CARGAS</h1>

              <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Prepara tu partida, elige personajes base/editor/mod/DLC, juega cartas,
                activa habilidades y resuelve combates con efectos visuales.
              </p>

              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onPlay}
                  className="cargas-home-action cargas-home-primary px-5 py-4 text-left font-black"
                >
                  <div className="text-2xl">🚀 Jugar local</div>
                  <div className="text-[0.72rem] opacity-80 mt-1">
                    Configura jugadores, mazo, reglas y empieza.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onMultiplayer}
                  className="cargas-home-action cargas-home-secondary px-5 py-4 text-left font-black"
                >
                  <div className="text-2xl">🌐 Multijugador</div>
                  <div className="text-[0.72rem] opacity-85 mt-1">
                    Crea o únete por LAN/VPN.
                  </div>
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="cargas-help-chip">🎴 Cartas y combos</span>
                <span className="cargas-help-chip">⚡ Habilidades custom</span>
                <span className="cargas-help-chip">🔒 Pasivas</span>
                <span className="cargas-help-chip">🧩 Mods/DLC</span>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                ['1', 'Prepara', 'Elige modo, jugadores, personajes, mazo y reglas.'],
                ['2', 'Combate', 'Selecciona cartas, objetivos, habilidades y ataques básicos.'],
                ['3', 'Resuelve', 'El tablero muestra daño, curación, defensa, pasivas y eventos.'],
              ].map(([n, title, text]) => (
                <div key={n} className="cargas-home-card rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="cargas-step-number shrink-0">{n}</div>
                    <div>
                      <div className="text-sm font-black text-white">{title}</div>
                      <div className="text-[0.72rem] text-slate-400 mt-0.5">{text}</div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-purple-400/20 bg-purple-950/20 p-4">
                <div className="text-[0.72rem] font-black text-purple-200">
                  ✨ Estado actual
                </div>
                <div className="mt-1 text-[0.68rem] text-slate-300">
                  Motor custom, pasivas, effects[], UI polish y eventos visuales activados.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-[0.65rem] text-slate-500">
          CARGAS Ecosystem · DevBuild · ModdingTools · Shared Content
        </div>
      </div>
    </div>
  );
}

function LocalGameScreen({
  onMultiplayer,
  onHome,
}: {
  onMultiplayer: () => void;
  onHome: () => void;
}) {
  const phase = useGameStore((state) => state.phase);

  if (phase === 'setup') {
    return <GameSetupModal onMultiplayer={onMultiplayer} />;
  }

  return (
    <GameBoard
      onMultiplayer={onMultiplayer}
      onHome={onHome}
    />
  );
}

function App() {
  const [screen, setScreen] = React.useState<'home' | 'local' | 'multiplayer'>('home');

  const startLocalGame = React.useCallback(() => {
    try {
      useGameStore.getState().reset();
    } catch (err) {
      console.error('[CARGAS] reset local falló', err);
    }

    setScreen('local');
  }, []);

  return (
    <>
      {screen === 'home' && (
        <CargasHomeScreen
          onPlay={startLocalGame}
          onMultiplayer={() => setScreen('multiplayer')}
        />
      )}

      {screen === 'local' && (
        <LocalGameScreen
          onMultiplayer={() => setScreen('multiplayer')}
          onHome={() => setScreen('home')}
        />
      )}

      {screen === 'multiplayer' && (
        <MultiplayerLobby onBack={() => setScreen('home')} />
      )}
    </>
  );
}

export default App;
