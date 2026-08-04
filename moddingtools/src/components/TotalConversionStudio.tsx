// ============================================================
// TOTAL CONVERSION STUDIO — crea "otro juego" desde CARGAS
// ============================================================
import React, { useState } from 'react';
import * as TC from '../data/totalConversion';
import { EmojiInput, AssetInput } from './inputs/AssetInput';
import { ColorPicker } from './inputs/ColorPicker';

const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-rose-500';
const inpXs = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-rose-500';

type Sec = 'meta' | 'modes' | 'status' | 'phases' | 'resources' | 'win' | 'boards' | 'ai' | 'keywords' | 'ui';

export const TotalConversionStudio: React.FC = () => {
  const [sec, setSec] = useState<Sec>('meta');
  const stats = TC.totalConversionStats();

  const SECTIONS: [Sec, string, number][] = [
    ['meta', '📦 Identidad', 0],
    ['modes', '🎮 Modos', stats.gameModes],
    ['status', '✨ Estados', stats.statusEffects],
    ['phases', '⏳ Fases', stats.turnPhases],
    ['resources', '💎 Recursos', stats.resources],
    ['win', '🏆 Victoria', stats.winConditions],
    ['boards', '🗺️ Tableros', stats.boards],
    ['ai', '🤖 IA Bots', stats.aiProfiles],
    ['keywords', '🔑 Keywords', stats.keywords],
    ['ui', '🎨 Reskin UI', 0],
  ];

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-rose-950/60 to-purple-950/40 rounded-xl p-4 border border-rose-800/50">
        <h3 className="text-sm font-black text-rose-300 mb-1">🌐 Total Conversion Studio</h3>
        <p className="text-xs text-slate-400">Crea un <b>juego completamente diferente</b> sobre el motor de CARGAS: modos, estados, fases, economía, condiciones de victoria, tableros, IA, keywords y reskin total de la UI.</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {SECTIONS.map(([s, label, count]) => (
          <button key={s} onClick={() => setSec(s)}
                  className={`text-[0.65rem] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 ${sec === s ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {label}{count > 0 && <span className="bg-black/30 px-1 rounded-full">{count}</span>}
          </button>
        ))}
      </div>

      {sec === 'meta' && <MetaSection />}
      {sec === 'modes' && <ModesSection />}
      {sec === 'status' && <StatusSection />}
      {sec === 'phases' && <PhasesSection />}
      {sec === 'resources' && <ResourcesSection />}
      {sec === 'win' && <WinSection />}
      {sec === 'boards' && <BoardsSection />}
      {sec === 'ai' && <AISection />}
      {sec === 'keywords' && <KeywordsSection />}
      {sec === 'ui' && <UISection />}

      <ExportBar />
    </div>
  );
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">{children}</div>
);

// ── META ──
const MetaSection: React.FC = () => {
  const [m, setM] = useState(TC.getModMeta());
  const save = (patch: Partial<TC.ModMeta>) => { const n = { ...m, ...patch }; setM(n); TC.setModMeta(patch); };
  return (
    <Card>
      <input className={inp} value={m.title} onChange={e => save({ title: e.target.value })} placeholder="Título del juego/conversión" />
      <div className="grid grid-cols-2 gap-2">
        <input className={inp} value={m.author} onChange={e => save({ author: e.target.value })} placeholder="Autor" />
        <input className={inp} value={m.version} onChange={e => save({ version: e.target.value })} placeholder="Versión" />
      </div>
      <textarea className={inp + ' h-16 resize-none'} value={m.description} onChange={e => save({ description: e.target.value })} placeholder="Descripción de tu mod / total conversion" />
      <AssetInput kind="image" label="Banner del mod" value={m.banner} onChange={v => save({ banner: v })} />
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={m.isTotalConversion} onChange={e => save({ isTotalConversion: e.target.checked })} />
        <span className="text-xs">Marcar como <b>Total Conversion</b> (reemplaza el juego base)</span>
      </label>
    </Card>
  );
};

// ── MODOS DE JUEGO ──
const ModesSection: React.FC = () => {
  const [, f] = useState(0); const refresh = () => f(n => n + 1);
  const [d, setD] = useState<Partial<TC.GameModeDef>>({ name: '', icon: '🎮', minPlayers: 2, maxPlayers: 4, startingHp: 3000, startingHand: 7, deckSize: 40, turnTimeSecs: 30 });
  const list = TC.getGameModes();
  return (
    <div className="space-y-2">
      <Card>
        <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
          <div className="w-32"><EmojiInput value={d.icon || '🎮'} onChange={i => setD({ ...d, icon: i })} /></div>
          <div className="space-y-2">
            <input className={inp} value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre del modo (ej: Battle Royale, Survival)" />
            <input className={inp} value={d.description || ''} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Descripción" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Num label="Min jug." v={d.minPlayers} on={v => setD({ ...d, minPlayers: v })} />
          <Num label="Max jug." v={d.maxPlayers} on={v => setD({ ...d, maxPlayers: v })} />
          <Num label="HP inicial" v={d.startingHp} on={v => setD({ ...d, startingHp: v })} />
          <Num label="Mano inicial" v={d.startingHand} on={v => setD({ ...d, startingHand: v })} />
          <Num label="Mazo" v={d.deckSize} on={v => setD({ ...d, deckSize: v })} />
          <Num label="Seg/turno" v={d.turnTimeSecs} on={v => setD({ ...d, turnTimeSecs: v })} />
        </div>
        <div className="flex gap-4 text-xs text-slate-300">
          <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.teams} onChange={e => setD({ ...d, teams: e.target.checked })} /> equipos</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.permadeath} onChange={e => setD({ ...d, permadeath: e.target.checked })} /> permadeath</label>
        </div>
        <button onClick={() => { if (d.name) { TC.addGameMode(d); setD({ name: '', icon: '🎮', minPlayers: 2, maxPlayers: 4, startingHp: 3000, startingHand: 7, deckSize: 40, turnTimeSecs: 30 }); refresh(); } }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">+ Crear modo de juego</button>
      </Card>
      {list.map(m => (
        <Row key={m.id} icon={m.icon} title={m.name} sub={`${m.minPlayers}-${m.maxPlayers} jug · ${m.startingHp}HP · ${m.teams ? 'equipos' : 'FFA'}${m.permadeath ? ' · permadeath' : ''}`} onDel={() => { TC.removeGameMode(m.id); refresh(); }} />
      ))}
      {list.length === 0 && <Empty txt="Sin modos. Crea uno (Battle Royale, Survival, Draft...)." />}
    </div>
  );
};

// ── STATUS EFFECTS ──
const StatusSection: React.FC = () => {
  const [, f] = useState(0); const refresh = () => f(n => n + 1);
  const [d, setD] = useState<Partial<TC.StatusEffectDef>>({ name: '', icon: '✨', color: '#a855f7', kind: 'debuff', tickTiming: 'start_of_turn', tickValue: 0, maxStacks: 1 });
  const list = TC.getStatusEffects();
  return (
    <div className="space-y-2">
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <EmojiInput value={d.icon || '✨'} onChange={i => setD({ ...d, icon: i })} label="Icono" />
          <ColorPicker value={d.color} onChange={c => setD({ ...d, color: c })} label="Color" />
        </div>
        <input className={inp} value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre (ej: Congelado, Maldito, Bendecido)" />
        <input className={inp} value={d.description || ''} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Qué hace" />
        <div className="grid grid-cols-3 gap-2">
          <Sel label="Tipo" v={d.kind} opts={['buff','debuff','neutral']} on={v => setD({ ...d, kind: v as any })} />
          <Sel label="Tick" v={d.tickTiming} opts={['start_of_turn','end_of_turn','none']} on={v => setD({ ...d, tickTiming: v as any })} />
          <Num label="Valor/turno" v={d.tickValue} on={v => setD({ ...d, tickValue: v })} />
          <Num label="Máx stacks" v={d.maxStacks} on={v => setD({ ...d, maxStacks: v })} />
        </div>
        <div className="flex gap-4 text-xs text-slate-300">
          <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.stackable} onChange={e => setD({ ...d, stackable: e.target.checked })} /> acumulable</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.blocksAction} onChange={e => setD({ ...d, blocksAction: e.target.checked })} /> bloquea acción</label>
        </div>
        <button onClick={() => { if (d.name) { TC.addStatusEffect(d); setD({ name: '', icon: '✨', color: '#a855f7', kind: 'debuff', tickTiming: 'start_of_turn', tickValue: 0, maxStacks: 1 }); refresh(); } }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">+ Crear estado</button>
      </Card>
      {list.map(s => <Row key={s.id} icon={s.icon} title={s.name} sub={`${s.kind} · ${s.tickValue}/t · ${s.stackable ? `x${s.maxStacks}` : 'único'}${s.blocksAction ? ' · bloquea' : ''}`} color={s.color} onDel={() => { TC.removeStatusEffect(s.id); refresh(); }} />)}
      {list.length === 0 && <Empty txt="Sin estados custom. Crea Congelado, Veneno doble, Marca..." />}
    </div>
  );
};

// ── FASES ──
const PhasesSection: React.FC = () => {
  const [, f] = useState(0); const refresh = () => f(n => n + 1);
  const [d, setD] = useState<Partial<TC.TurnPhaseDef>>({ name: '', icon: '⏳' });
  const list = TC.getTurnPhases();
  return (
    <div className="space-y-2">
      <Card>
        <div className="flex gap-2">
          <div className="w-28"><EmojiInput value={d.icon || '⏳'} onChange={i => setD({ ...d, icon: i })} /></div>
          <input className={inp} value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre de fase (ej: Robo, Mantenimiento, Combate)" />
        </div>
        <input className={inp} value={d.description || ''} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Qué ocurre en esta fase" />
        <label className="flex items-center gap-1 text-xs text-slate-300"><input type="checkbox" checked={!!d.autoSkip} onChange={e => setD({ ...d, autoSkip: e.target.checked })} /> auto-saltar si no hay acción</label>
        <button onClick={() => { if (d.name) { TC.addTurnPhase(d); setD({ name: '', icon: '⏳' }); refresh(); } }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">+ Añadir fase</button>
      </Card>
      {list.map((p, i) => <Row key={p.id} icon={p.icon} title={`${i + 1}. ${p.name}`} sub={p.description || (p.autoSkip ? 'auto-skip' : 'manual')} onDel={() => { TC.removeTurnPhase(p.id); refresh(); }} />)}
      {list.length === 0 && <Empty txt="Sin fases custom. Define tu propio flujo de turno." />}
    </div>
  );
};

// ── RECURSOS ──
const ResourcesSection: React.FC = () => {
  const [, f] = useState(0); const refresh = () => f(n => n + 1);
  const [d, setD] = useState<Partial<TC.ResourceDef>>({ name: '', icon: '💎', color: '#06b6d4', startValue: 0, perTurnGain: 1, maxValue: 10 });
  const list = TC.getResources();
  return (
    <div className="space-y-2">
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <EmojiInput value={d.icon || '💎'} onChange={i => setD({ ...d, icon: i })} label="Icono" />
          <ColorPicker value={d.color} onChange={c => setD({ ...d, color: c })} label="Color" />
        </div>
        <input className={inp} value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre (ej: Maná, Oro, Energía, Fe)" />
        <div className="grid grid-cols-3 gap-2">
          <Num label="Inicial" v={d.startValue} on={v => setD({ ...d, startValue: v })} />
          <Num label="Gana/turno" v={d.perTurnGain} on={v => setD({ ...d, perTurnGain: v })} />
          <Num label="Máximo" v={d.maxValue} on={v => setD({ ...d, maxValue: v })} />
        </div>
        <button onClick={() => { if (d.name) { TC.addResource(d); setD({ name: '', icon: '💎', color: '#06b6d4', startValue: 0, perTurnGain: 1, maxValue: 10 }); refresh(); } }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">+ Crear recurso</button>
      </Card>
      {list.map(r => <Row key={r.id} icon={r.icon} title={r.name} sub={`inicia ${r.startValue} · +${r.perTurnGain}/t · máx ${r.maxValue}`} color={r.color} onDel={() => { TC.removeResource(r.id); refresh(); }} />)}
      {list.length === 0 && <Empty txt="Sin recursos. Añade maná/energía para cartas con coste." />}
    </div>
  );
};

// ── VICTORIA ──
const WinSection: React.FC = () => {
  const [, f] = useState(0); const refresh = () => f(n => n + 1);
  const [d, setD] = useState<Partial<TC.WinConditionDef>>({ name: '', icon: '🏆', type: 'last_standing', value: 0 });
  const list = TC.getWinConditions();
  return (
    <div className="space-y-2">
      <Card>
        <div className="flex gap-2">
          <div className="w-28"><EmojiInput value={d.icon || '🏆'} onChange={i => setD({ ...d, icon: i })} /></div>
          <input className={inp} value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre de la condición" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Sel label="Tipo" v={d.type} opts={['last_standing','hp_threshold','resource_amount','survive_turns','cards_played','custom']} on={v => setD({ ...d, type: v as any })} />
          <Num label="Valor" v={d.value} on={v => setD({ ...d, value: v })} />
        </div>
        {d.type === 'custom' && <textarea className={inp + ' h-20 font-mono text-[0.65rem]'} value={d.script || ''} onChange={e => setD({ ...d, script: e.target.value })} placeholder="// function check(ctx) { return ctx.players... }" />}
        <button onClick={() => { if (d.name) { TC.addWinCondition(d); setD({ name: '', icon: '🏆', type: 'last_standing', value: 0 }); refresh(); } }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">+ Crear condición</button>
      </Card>
      {list.map(w => <Row key={w.id} icon={w.icon} title={w.name} sub={`${w.type}${w.value ? ` (${w.value})` : ''}`} onDel={() => { TC.removeWinCondition(w.id); refresh(); }} />)}
      {list.length === 0 && <Empty txt="Sin condiciones. Por defecto: último en pie." />}
    </div>
  );
};

// ── TABLEROS ──
const BoardsSection: React.FC = () => {
  const [, f] = useState(0); const refresh = () => f(n => n + 1);
  const [d, setD] = useState<Partial<TC.BoardDef>>({ name: '', icon: '🗺️', bgColor: '#0f172a', lanes: 1, slots: 0 });
  const list = TC.getBoards();
  return (
    <div className="space-y-2">
      <Card>
        <div className="flex gap-2">
          <div className="w-28"><EmojiInput value={d.icon || '🗺️'} onChange={i => setD({ ...d, icon: i })} /></div>
          <input className={inp} value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre del tablero/arena" />
        </div>
        <AssetInput kind="image" label="Fondo del tablero" value={d.bgImage ?? null} onChange={v => setD({ ...d, bgImage: v })} />
        <ColorPicker value={d.bgColor} onChange={c => setD({ ...d, bgColor: c })} label="Color de fondo" />
        <div className="grid grid-cols-2 gap-2">
          <Num label="Carriles (lanes)" v={d.lanes} on={v => setD({ ...d, lanes: v })} />
          <Num label="Slots por lado" v={d.slots} on={v => setD({ ...d, slots: v })} />
        </div>
        <button onClick={() => { if (d.name) { TC.addBoard(d); setD({ name: '', icon: '🗺️', bgColor: '#0f172a', lanes: 1, slots: 0 }); refresh(); } }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">+ Crear tablero</button>
      </Card>
      {list.map(b => <Row key={b.id} icon={b.icon} title={b.name} sub={`${b.lanes} lane(s) · ${b.slots} slots`} color={b.bgColor} onDel={() => { TC.removeBoard(b.id); refresh(); }} />)}
      {list.length === 0 && <Empty txt="Sin tableros. Crea arenas con carriles y slots (estilo Hearthstone/MTG)." />}
    </div>
  );
};

// ── IA ──
const AISection: React.FC = () => {
  const [, f] = useState(0); const refresh = () => f(n => n + 1);
  const [d, setD] = useState<Partial<TC.AIProfileDef>>({ name: '', icon: '🤖', aggression: 50, defense: 50, combo: 50, risk: 50, targetPriority: 'lowest_hp' });
  const list = TC.getAIProfiles();
  const Slider: React.FC<{ label: string; v: number; on: (n: number) => void }> = ({ label, v, on }) => (
    <label className="block"><div className="flex justify-between text-[0.65rem] text-slate-400"><span>{label}</span><span className="text-rose-400 font-bold">{v}</span></div>
      <input type="range" min={0} max={100} value={v} onChange={e => on(+e.target.value)} className="w-full accent-rose-500" /></label>
  );
  return (
    <div className="space-y-2">
      <Card>
        <div className="flex gap-2">
          <div className="w-28"><EmojiInput value={d.icon || '🤖'} onChange={i => setD({ ...d, icon: i })} /></div>
          <input className={inp} value={d.name || ''} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Nombre del perfil de IA" />
        </div>
        <Slider label="Agresión" v={d.aggression!} on={v => setD({ ...d, aggression: v })} />
        <Slider label="Defensa" v={d.defense!} on={v => setD({ ...d, defense: v })} />
        <Slider label="Tendencia a combos" v={d.combo!} on={v => setD({ ...d, combo: v })} />
        <Slider label="Riesgo" v={d.risk!} on={v => setD({ ...d, risk: v })} />
        <Sel label="Prioridad de objetivo" v={d.targetPriority} opts={['lowest_hp','highest_hp','random','most_dangerous']} on={v => setD({ ...d, targetPriority: v as any })} />
        <button onClick={() => { if (d.name) { TC.addAIProfile(d); setD({ name: '', icon: '🤖', aggression: 50, defense: 50, combo: 50, risk: 50, targetPriority: 'lowest_hp' }); refresh(); } }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">+ Crear perfil de IA</button>
      </Card>
      {list.map(a => <Row key={a.id} icon={a.icon} title={a.name} sub={`agro ${a.aggression} · def ${a.defense} · combo ${a.combo} · ${a.targetPriority}`} onDel={() => { TC.removeAIProfile(a.id); refresh(); }} />)}
      {list.length === 0 && <Empty txt="Sin perfiles de IA. Define cómo juegan los bots." />}
    </div>
  );
};

// ── KEYWORDS ──
const KeywordsSection: React.FC = () => {
  const [, f] = useState(0); const refresh = () => f(n => n + 1);
  const [d, setD] = useState<Partial<TC.KeywordDef>>({ word: '', icon: '🔑', color: '#f59e0b', rules: '' });
  const list = TC.getKeywords();
  return (
    <div className="space-y-2">
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <EmojiInput value={d.icon || '🔑'} onChange={i => setD({ ...d, icon: i })} label="Icono" />
          <ColorPicker value={d.color} onChange={c => setD({ ...d, color: c })} label="Color" />
        </div>
        <input className={inp} value={d.word || ''} onChange={e => setD({ ...d, word: e.target.value })} placeholder="Palabra clave (ej: Provocar, Sigilo, Cargar)" />
        <textarea className={inp + ' h-16 resize-none'} value={d.rules || ''} onChange={e => setD({ ...d, rules: e.target.value })} placeholder="Reglas que aplica esta keyword" />
        <button onClick={() => { if (d.word) { TC.addKeyword(d); setD({ word: '', icon: '🔑', color: '#f59e0b', rules: '' }); refresh(); } }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-2 rounded-lg">+ Crear keyword</button>
      </Card>
      {list.map(k => <Row key={k.id} icon={k.icon} title={k.word} sub={k.rules} color={k.color} onDel={() => { TC.removeKeyword(k.id); refresh(); }} />)}
      {list.length === 0 && <Empty txt="Sin keywords. Crea mecánicas reutilizables tipo TCG." />}
    </div>
  );
};

// ── UI REskin ──
const UISection: React.FC = () => {
  const [t, setT] = useState(TC.getUITheme());
  const save = (patch: Partial<TC.UITheme>) => { const n = { ...t, ...patch }; setT(n); TC.setUITheme(patch); };
  return (
    <Card>
      <ColorPicker value={t.bgPrimary} onChange={c => save({ bgPrimary: c })} label="Fondo principal" />
      <ColorPicker value={t.accent} onChange={c => save({ accent: c })} label="Color de acento" />
      <div className="grid grid-cols-2 gap-2">
        <ColorPicker value={t.danger} onChange={c => save({ danger: c })} label="Peligro" />
        <ColorPicker value={t.success} onChange={c => save({ success: c })} label="Éxito" />
      </div>
      <label className="block text-xs text-slate-400">Escala de cartas: <b className="text-rose-400">{t.cardScale.toFixed(2)}x</b>
        <input type="range" min={0.6} max={1.6} step={0.05} value={t.cardScale} onChange={e => save({ cardScale: +e.target.value })} className="w-full accent-rose-500" /></label>
      <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={t.animations} onChange={e => save({ animations: e.target.checked })} /> animaciones</label>
      {/* preview */}
      <div className="rounded-xl p-4 border" style={{ background: t.bgPrimary, borderColor: t.accent }}>
        <div className="font-black" style={{ color: t.accent }}>Vista previa del tema</div>
        <div className="flex gap-2 mt-2">
          <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ background: t.danger }}>Daño</span>
          <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ background: t.success }}>Cura</span>
          <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{ background: t.accent }}>Acción</span>
        </div>
      </div>
    </Card>
  );
};

// ── Export bar ──
const ExportBar: React.FC = () => {
  const exportTC = () => {
    const blob = new Blob([JSON.stringify(TC.exportTotalConversion(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'total_conversion.cargasmod.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const importTC = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { TC.importTotalConversion(JSON.parse(await file.text())); alert('✅ Total Conversion importada'); location.reload(); } catch { alert('❌ JSON inválido'); }
  };
  return (
    <div className="flex gap-2 pt-2 border-t border-slate-800">
      <button onClick={exportTC} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg">📤 Exportar Total Conversion</button>
      <label className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg text-center cursor-pointer">📥 Importar<input type="file" accept=".json" className="hidden" onChange={importTC} /></label>
    </div>
  );
};

// ── helpers UI ──
const Num: React.FC<{ label: string; v: any; on: (n: number) => void }> = ({ label, v, on }) => (
  <label className="text-[0.65rem] text-slate-400">{label}<input type="number" className={inpXs + ' w-full mt-0.5'} value={v} onChange={e => on(+e.target.value)} /></label>
);
const Sel: React.FC<{ label: string; v: any; opts: string[]; on: (s: string) => void }> = ({ label, v, opts, on }) => (
  <label className="text-[0.65rem] text-slate-400">{label}<select className={inpXs + ' w-full mt-0.5'} value={v} onChange={e => on(e.target.value)}>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select></label>
);
const Row: React.FC<{ icon: string; title: string; sub: string; color?: string; onDel: () => void }> = ({ icon, title, sub, color, onDel }) => (
  <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800 flex items-center gap-2">
    <span className="text-lg w-8 h-8 flex items-center justify-center rounded-lg" style={color ? { background: color + '33', border: `1px solid ${color}` } : {}}>{icon}</span>
    <div className="flex-1 min-w-0"><div className="text-xs font-bold text-white truncate">{title}</div><div className="text-[0.6rem] text-slate-500 truncate">{sub}</div></div>
    <button onClick={onDel} className="text-red-400 hover:text-red-300 text-sm">🗑️</button>
  </div>
);
const Empty: React.FC<{ txt: string }> = ({ txt }) => <div className="text-xs text-slate-500 text-center py-4">{txt}</div>;
