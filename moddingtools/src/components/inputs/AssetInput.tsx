// ============================================================
// ASSET INPUT — carga local de imagen/sonido/emoji → data URL
// ============================================================
import React, { useRef, useState } from 'react';

type AssetKind = 'image' | 'audio';

interface Props {
  kind: AssetKind;
  value: string | null;
  onChange: (dataUrlOrNull: string | null) => void;
  label: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export const AssetInput: React.FC<Props> = ({ kind, value, onChange, label }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setErr(null);
    const valid = kind === 'image' ? file.type.startsWith('image/') : file.type.startsWith('audio/');
    if (!valid) { setErr(`No es un archivo de ${kind === 'image' ? 'imagen' : 'sonido'}`); return; }
    if (file.size > 4 * 1024 * 1024) { setErr('Máximo 4 MB'); return; }
    try { onChange(await readAsDataUrl(file)); }
    catch { setErr('No se pudo leer el archivo'); }
  };

  const isData = value?.startsWith('data:');
  const isUrl = value && !isData;

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
        {value && <button onClick={() => onChange(null)} className="text-[0.6rem] text-red-400 hover:text-red-300">✕ quitar</button>}
      </div>

      <div className="flex items-center gap-3">
        {/* preview */}
        <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
          {!value ? <span className="text-slate-600 text-2xl">{kind === 'image' ? '🖼️' : '🔊'}</span>
            : kind === 'image' ? <img src={value} className="w-full h-full object-cover" />
            : <button onClick={() => { const a = new Audio(value); a.volume = 0.6; a.play().catch(() => {}); }} className="text-2xl">▶️</button>}
        </div>

        <div className="flex-1 space-y-1.5">
          <div
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
            onDragOver={e => e.preventDefault()}
            className="border border-dashed border-slate-600 rounded-lg px-2 py-1.5 text-center hover:bg-slate-800/50 cursor-pointer"
            onClick={() => ref.current?.click()}>
            <span className="text-[0.65rem] text-slate-400">📁 Subir desde tu PC {kind === 'image' ? '(PNG/JPG/SVG)' : '(MP3/WAV/OGG)'}</span>
          </div>
          <button onClick={() => setShowUrl(s => !s)} className="text-[0.6rem] text-cyan-400 hover:text-cyan-300">
            {showUrl ? '▲ ocultar URL' : '🔗 o pegar URL/data'}
          </button>
          {showUrl && (
            <input value={isUrl ? value! : ''} onChange={e => onChange(e.target.value || null)}
                   placeholder="https://... o data:..."
                   className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[0.65rem] text-white outline-none focus:border-cyan-500" />
          )}
        </div>
      </div>

      {value && <div className="text-[0.5rem] text-slate-500 truncate font-mono">{isData ? '✓ Asset embebido (data URL)' : value}</div>}
      {err && <div className="text-[0.6rem] text-red-400">⚠️ {err}</div>}
      <input ref={ref} type="file" accept={kind === 'image' ? 'image/*' : 'audio/*'} className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
};

// ── Emoji picker pequeño ──
const EMOJI_SETS = ['⚔️','🗡️','🏹','🛡️','🔮','💀','🐉','🔥','❄️','⚡','🌟','✨','💚','🩸','☠️','🌿','🌑','☀️','👑','💎','🎴','🃏','🧙','🦸','🥷','👻','💥','🌀','🕯️','🪄','🐲','🦅','🐺','🦂','🕷️','🌋','🌊','💨','🪨','☄️'];

export const EmojiInput: React.FC<{ value: string; onChange: (e: string) => void; label?: string }> = ({ value, onChange, label }) => {
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 space-y-2">
      {label && <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>}
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">{value || '❓'}</div>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="Pega un emoji"
               className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-lg text-white outline-none focus:border-fuchsia-500" />
      </div>
      <div className="grid grid-cols-10 gap-1 max-h-40 overflow-y-auto">
        {EMOJI_SETS.map(e => (
          <button key={e} onClick={() => onChange(e)}
                  className={`aspect-square rounded-md text-lg hover:bg-slate-700 ${value === e ? 'bg-fuchsia-700' : 'bg-slate-800'}`}>{e}</button>
        ))}
      </div>
    </div>
  );
};
