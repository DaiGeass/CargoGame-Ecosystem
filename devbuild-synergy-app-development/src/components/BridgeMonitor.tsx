import React from 'react';
import {
  EcosystemMessage,
  getEcosystemStatus,
  sendEcosystemMessage,
  startEcosystemBridgePolling,
  startEcosystemPresence,
} from '../services/ecosystemPresence';
import { useDevBuild } from '../store/devbuildStore';

export const BridgeMonitor: React.FC = () => {
  const { bridgeLogs, clearBridge, emitBridge } = useDevBuild();
  const [status, setStatus] = React.useState<any>(null);
  const [incoming, setIncoming] = React.useState<EcosystemMessage[]>([]);

  const refresh = React.useCallback(async () => {
    const s = await getEcosystemStatus();
    setStatus(s);
  }, []);

  React.useEffect(() => {
    startEcosystemPresence();
    refresh();

    const statusTimer = window.setInterval(refresh, 1000);

    const stopPolling = startEcosystemBridgePolling((msg) => {
      setIncoming((prev) => [msg, ...prev].slice(0, 100));
      if (msg.type === 'ping') {
        sendEcosystemMessage('pong', { ok: true, receivedFrom: msg.from }, msg.from).catch(() => {});
      }
    }, 500);

    return () => {
      window.clearInterval(statusTimer);
      stopPolling();
    };
  }, [refresh]);

  const pingAll = async () => {
    emitBridge('ping', { msg: 'ping desde DevBuild', at: Date.now() });
    await refresh();
  };

  const programs = [
    { id: 'game', icon: '⚔️', name: 'CARGAS / Game', sub: 'Juego principal', on: Boolean(status?.online?.game) },
    { id: 'devtool', icon: '🔧', name: 'DevBuild', sub: 'Herramienta de desarrollo', on: Boolean(status?.online?.devtool) },
    { id: 'moddingtool', icon: '🧪', name: 'ModdingBuild', sub: 'Herramienta de mods', on: Boolean(status?.online?.moddingtool) },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <span className="text-sm font-bold text-slate-300">Monitor real del Bridge</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 text-xs font-bold">
            ● Presence activo
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={pingAll} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg">📤 Ping real</button>
          <button onClick={refresh} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg">🔄 Refrescar</button>
          <button onClick={clearBridge} className="text-xs bg-slate-800 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg">🧹 Limpiar</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-emerald-300 mb-2">Estado real</h3>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between"><span>Modo</span><span className="text-white">Disco compartido</span></div>
              <div className="flex justify-between"><span>Presence</span><span className="text-white font-mono">data/presence/</span></div>
              <div className="flex justify-between"><span>Bridge</span><span className="text-white font-mono">data/bridge/inbox/</span></div>
              <div className="flex justify-between"><span>API juego</span><span className={status?.gameApi?.available ? 'text-emerald-400' : 'text-red-400'}>{status?.gameApi?.available ? 'Disponible' : 'No disponible'}</span></div>
              <div className="pt-2 text-[0.6rem] text-slate-500 break-all">{status?.sharedRoot || 'Cargando ruta...'}</div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Programas</h3>
            {programs.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm py-1">
                <span className="text-lg">{p.icon}</span>
                <div>
                  <div className="font-bold text-white text-xs">{p.name}</div>
                  <div className="text-[0.6rem] text-slate-500">{p.sub}</div>
                </div>
                <span className={`ml-auto text-[0.6rem] ${p.on ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {p.on ? '● En línea' : '○ Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase">
            Mensajes reales recibidos ({incoming.length}) · emitidos ({bridgeLogs.length})
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {incoming.map((m) => (
              <div key={m.id} className="bg-emerald-950/30 rounded-lg px-3 py-2 text-xs border border-emerald-900/50">
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-400">RECIBIDO {m.type}</span>
                  <span className="text-slate-500">{m.from} → {m.to}</span>
                  <span className="ml-auto text-slate-600">{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <pre className="text-slate-400 font-mono text-[0.65rem] mt-1 overflow-x-auto">{JSON.stringify(m.payload)}</pre>
              </div>
            ))}

            {bridgeLogs.map((m: any) => (
              <div key={m.id} className="bg-slate-900 rounded-lg px-3 py-2 text-xs border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-black text-cyan-400">ENVIADO {m.type}</span>
                  <span className="text-slate-500">{m.from} → {m.to}</span>
                  <span className="ml-auto text-slate-600">{new Date(m.ts).toLocaleTimeString()}</span>
                </div>
                <pre className="text-slate-400 font-mono text-[0.65rem] mt-1 overflow-x-auto">{JSON.stringify(m.payload)}</pre>
              </div>
            ))}

            {incoming.length === 0 && bridgeLogs.length === 0 && (
              <div className="text-sm text-slate-600 italic p-4 text-center">Sin mensajes. Pulsa Ping real.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
