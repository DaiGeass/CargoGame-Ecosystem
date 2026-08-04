// ============================================================
// 🎨🔊 ESTUDIO DE ASSETS — Importar imágenes y sonidos
// ============================================================
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportedAsset {
  id: string;
  name: string;
  kind: 'image' | 'audio';
  dataUrl: string;
  size: number;
}

function fileKind(file: File): 'image' | 'audio' | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmtSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B`
    : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AssetStudioPanel: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<ImportedAsset[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const next: ImportedAsset[] = [];
    for (const file of Array.from(files)) {
      const kind = fileKind(file);
      if (!kind) { setError(`"${file.name}" no es imagen ni audio.`); continue; }
      if (file.size > 3 * 1024 * 1024) { setError(`"${file.name}" supera 3 MB.`); continue; }
      try {
        const dataUrl = await readAsDataUrl(file);
        next.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`, name: file.name, kind, dataUrl, size: file.size });
      } catch { setError(`No se pudo leer "${file.name}".`); }
    }
    if (next.length) setAssets(prev => [...next, ...prev]);
  };

  const copyToClipboard = async (asset: ImportedAsset) => {
    try {
      await navigator.clipboard.writeText(asset.dataUrl);
      setCopied(asset.id);
      setTimeout(() => setCopied(null), 1800);
    } catch { setError('Portapapeles no disponible en este contexto.'); }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2 space-y-3">
      <div className="bg-gradient-to-r from-slate-800/70 to-fuchsia-950/30 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-sm font-black text-fuchsia-300 mb-1">🎨🔊 Estudio de Assets</h3>
        <p className="text-[0.6rem] text-slate-300 leading-relaxed">
          Importa <b>imágenes</b> (PNG, JPG, WebP, SVG) y <b>sonidos</b> (MP3, WAV, OGG).
          Se convierten a <code className="bg-slate-900 px-1 rounded text-cyan-300">data:URL</code> para pegar en el campo
          <code className="bg-slate-900 px-1 rounded text-cyan-300 ml-1">media</code> de cualquier carta o personaje.
        </p>
      </div>

      <div onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }} onDragOver={e => e.preventDefault()}
           className="border-2 border-dashed border-fuchsia-600/40 rounded-xl p-5 bg-fuchsia-950/10 text-center hover:bg-fuchsia-950/20 transition-colors">
        <div className="text-3xl mb-2">📥</div>
        <div className="text-sm font-black text-fuchsia-300">Arrastra imágenes o sonidos aquí</div>
        <div className="text-[0.55rem] text-slate-500 mb-3">PNG · JPG · WebP · SVG · MP3 · WAV · OGG · máx 3 MB por archivo</div>
        <button onClick={() => inputRef.current?.click()} className="px-4 py-2 rounded-lg bg-fuchsia-600 text-white text-xs font-bold hover:bg-fuchsia-500">
          📁 Elegir archivos
        </button>
        <input ref={inputRef} type="file" multiple accept="image/*,audio/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-2 rounded-lg border text-[0.6rem] bg-red-950/40 border-red-700/40 text-red-300">
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {assets.length > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
          <div className="text-[0.6rem] text-amber-300 font-black mb-1">💡 Cómo usar el data URL copiado</div>
          <pre className="bg-slate-900 rounded-lg p-2 text-[0.55rem] text-green-300 overflow-x-auto leading-relaxed">{`{
  media: {
    image: 'data:image/png;base64,...',  // ← pega aquí
    soundOnPlay: 'data:audio/mpeg;base64,...',
    iconImage: null,
  }
}`}</pre>
        </div>
      )}

      <div className="space-y-2">
        {assets.length === 0 && <div className="text-center text-[0.6rem] text-slate-500 py-6">Aún no importaste assets</div>}
        {assets.map(asset => (
          <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-2.5 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              {asset.kind === 'image'
                ? <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-cover" />
                : <button onClick={() => { const a = new Audio(asset.dataUrl); a.volume = 0.6; a.play().catch(() => {}); }} className="text-2xl hover:scale-110 transition-transform" title="Reproducir">🔊</button>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.7rem] font-bold text-white truncate">{asset.name}</div>
              <div className="text-[0.5rem] text-slate-400">{asset.kind === 'image' ? '🖼️ Imagen' : '🔊 Sonido'} · {fmtSize(asset.size)}</div>
              <div className="text-[0.45rem] text-slate-500 truncate font-mono mt-0.5">{asset.dataUrl.slice(0, 50)}…</div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => copyToClipboard(asset)}
                      className={`px-2 py-1 rounded-lg text-[0.55rem] font-bold transition-colors ${copied === asset.id ? 'bg-emerald-600 text-white' : 'bg-cyan-700 text-white hover:bg-cyan-600'}`}>
                {copied === asset.id ? '✅ Copiado' : '📋 Copiar URL'}
              </button>
              <button onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))}
                      className="px-2 py-1 rounded-lg bg-red-900/50 text-red-300 text-[0.55rem] font-bold hover:bg-red-800">
                🗑️ Quitar
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-[0.5rem] text-slate-500 leading-relaxed bg-slate-800/30 rounded-lg p-2 border border-slate-700/40">
        ℹ️ Los assets son <b>opcionales</b>. Si dejas un campo en <code className="text-cyan-300">null</code>, la carta usa su ícono/emoji por defecto.
        Para mods en .zip/.cargasmod también puedes incluir los archivos dentro del ZIP y el juego los incrusta automáticamente.
      </div>
    </div>
  );
};
