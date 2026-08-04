import React, { useState, useMemo } from 'react';
import { useDevBuild } from '../store/devbuildStore';

export const CodeEditor: React.FC = () => {
  const { baseCards, mods, getAllCardsWithSource } = useDevBuild();
  const [source, setSource] = useState('base');
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => {
    if (source === 'base') return JSON.stringify(baseCards, null, 2);
    if (source === 'all') return JSON.stringify(getAllCardsWithSource(), null, 2);
    const mod = mods.find((m) => m.manifest.id === source);
    return mod ? JSON.stringify(mod, null, 2) : '// fuente no encontrada';
  }, [source, baseCards, mods, getAllCardsWithSource]);

  const copy = () => { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center gap-3 px-4 shrink-0">
        <span className="text-sm font-bold text-slate-300">📝 Código JSON</span>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-white outline-none">
          <option value="base">Cartas Base</option>
          <option value="all">Todas (con fuente)</option>
          {mods.map((m) => <option key={m.manifest.id} value={m.manifest.id}>{m.manifest.name} (mod completo)</option>)}
        </select>
        <button onClick={copy} className="ml-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
          {copied ? '✓ Copiado' : '📋 Copiar'}
        </button>
      </div>
      <pre className="flex-1 overflow-auto bg-slate-950 text-emerald-200 p-4 text-xs font-mono leading-relaxed">{json}</pre>
      <div className="h-6 bg-slate-900 border-t border-slate-800 flex items-center px-4 text-[0.6rem] text-slate-500">
        {json.split('\n').length} líneas · {json.length} caracteres · solo lectura (usa el Editor Visual para modificar)
      </div>
    </div>
  );
};
