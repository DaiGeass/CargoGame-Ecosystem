// ============================================================
// CLI TERMINAL - FUNCTIONAL PATCH
// ModdingTools
// ============================================================

import React, { useState } from 'react';
import { runAdvancedCliCommand } from '../services/advancedCli';

type Line = {
  kind: 'in' | 'out' | 'err';
  text: string;
};

export const CliTerminal: React.FC = () => {
  const [input, setInput] = useState('help');
  const [lines, setLines] = useState<Line[]>([
    { kind: 'out', text: 'CARGAS ModdingTools CLI listo. Escribe help.' }
  ]);
  const [busy, setBusy] = useState(false);

  const run = async (cmd = input) => {
    const clean = String(cmd || '').trim();
    if (!clean || busy) return;

    setBusy(true);
    setLines(prev => [...prev, { kind: 'in', text: '> ' + clean }]);

    try {
      const res = await runAdvancedCliCommand(clean);
      setLines(prev => [...prev, { kind: res.ok ? 'out' : 'err', text: res.output || '(sin salida)' }]);
    } catch (err: any) {
      setLines(prev => [...prev, { kind: 'err', text: err?.message || String(err) }]);
    } finally {
      setBusy(false);
      setInput('');
    }
  };

  const examples = [
    'help',
    'bridge.info',
    'snapshot.show',
    'char.example',
    'char.list',
    'char.new id=lobo_azul name="Lobo Azul" hp=2800 defense=15 avatar=🐺',
    'char.apply id=lobo_azul',
    'base.override id=titan_editor name="Titán Editor" hp=5000 defense=60 avatar=🗿',
    'base.list',
  ];

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 text-white p-4 space-y-3">
      <div>
        <h2 className="text-xl font-black text-cyan-300">⌨️ CARGAS CLI</h2>
        <p className="text-xs text-slate-400">
          Ejecuta comandos que modifican drafts y baseOverrides del juego.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {examples.map(ex => (
          <button
            key={ex}
            onClick={() => setInput(ex)}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[0.6rem] text-slate-200 border border-slate-700"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="h-[420px] overflow-auto rounded-xl bg-black/60 border border-slate-800 p-3 font-mono text-xs whitespace-pre-wrap">
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.kind === 'in'
                ? 'text-cyan-300'
                : line.kind === 'err'
                  ? 'text-red-300'
                  : 'text-emerald-100'
            }
          >
            {line.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          run();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono outline-none focus:border-cyan-500"
          placeholder='Ej: base.override id=titan name="Titán" hp=5000 defense=50'
        />
        <button
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-800 text-xs font-black"
        >
          {busy ? '...' : 'RUN'}
        </button>
      </form>
    </div>
  );
};

export default CliTerminal;
