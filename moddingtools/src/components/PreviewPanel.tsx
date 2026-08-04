import React, { useState } from 'react';
import { useModding } from '../store/moddingStore';
import { CardView } from './CardView';
import { Player, SourcedCard, makeDefaultStats, ActiveEffect } from '../types/game';
import { EffectContext } from '../types/effects';
import { applyEffects } from '../utils/effects';
import { evalFormula } from '../utils/formulas';

interface LogLine { text: string; type: string; }

const TYPE_COLOR: Record<string, string> = {
  damage: '#ef4444', heal: '#22c55e', buff: '#a855f7', debuff: '#f97316',
  defense: '#3b82f6', special: '#d946ef', system: '#94a3b8',
};

function makePlayer(over: Partial<Player>): Player {
  return {
    id: over.id || 'p', name: over.name || 'Jugador', characterId: 'sim',
    currentHp: over.currentHp ?? over.maxHp ?? 100, currentDefense: over.currentDefense ?? 0,
    baseDefense: over.baseDefense ?? over.currentDefense ?? 0, maxHp: over.maxHp ?? 100,
    baseDamage: over.baseDamage ?? 30, hand: [], activeEffects: over.activeEffects || [],
    abilitiesUsed: [], abilityCooldowns: {}, isAlive: true, teamId: over.teamId,
    position: over.position ?? 0, control: 'human', stats: makeDefaultStats(), ...over,
  };
}

export const PreviewPanel: React.FC = () => {
  const { getAllCardsWithSource } = useModding();
  const all = getAllCardsWithSource();
  const [cardId, setCardId] = useState(all[0]?.id ?? '');
  const [maxHp, setMaxHp] = useState(100);
  const [defense, setDefense] = useState(20);
  const [tagsStr, setTagsStr] = useState('veneno, fuego');
  const [atkHp, setAtkHp] = useState(100);
  const [atkMaxHp, setAtkMaxHp] = useState(100);
  const [atkDmg, setAtkDmg] = useState(40);
  const [turn, setTurn] = useState(1);

  const [log, setLog] = useState<LogLine[]>([]);
  const [result, setResult] = useState<{ atk: Player; tgt: Player } | null>(null);

  const card = all.find((c) => c.id === cardId) as SourcedCard | undefined;

  const run = async () => {
    if (!card) return;
    const logs: LogLine[] = [];

    // tags del objetivo = activeEffects con esos tags (así condition.targetHasTag funciona como en el juego)
    const targetTags = tagsStr.split(',').map((s) => s.trim()).filter(Boolean);
    const tagEffects: ActiveEffect[] = targetTags.map((t) => ({
      id: 'tag_' + t, name: t, value: 0, timing: 'immediate', duration: 99, stacks: 1,
      sourcePlayerId: 'sim', targetPlayerId: 'target', isStackable: false, ignoresDefense: false,
      description: '', tags: [t],
    }));

    const attacker = makePlayer({ id: 'attacker', name: 'Atacante', maxHp: atkMaxHp, currentHp: atkHp, baseDamage: atkDmg, teamId: 'A', position: 0 });
    const target = makePlayer({ id: 'target', name: 'Maniquí', maxHp, currentHp: maxHp, currentDefense: defense, baseDefense: defense, teamId: 'B', position: 1, activeEffects: tagEffects });
    const players = [attacker, target];
    const get = (id: string) => players.find((p) => p.id === id)!;

    // ── Sinergias declarativas (como el motor de sinergias del juego) ──
    let synBonusDmg = 0, synBonusHeal = 0, synBonusDef = 0;
    for (const s of card.synergies || []) {
      const c = s.condition;
      let ok = true;
      const hpPct = (target.currentHp / target.maxHp) * 100;
      if (c.targetHasTag && !targetTags.includes(c.targetHasTag)) ok = false;
      if (c.targetStatus === 'has_dots' && !target.activeEffects.some((e) => e.timing === 'start_of_turn')) ok = false;
      if (c.targetStatus === 'low_hp' && hpPct >= 35) ok = false;
      if (c.targetStatus === 'high_def' && target.currentDefense < 40) ok = false;
      if (c.attackerHasTag && !attacker.activeEffects.some((e) => e.tags?.includes(c.attackerHasTag!))) ok = false;
      if (ok) {
        synBonusDmg += s.bonusDamage || 0;
        synBonusHeal += s.bonusHeal || 0;
        synBonusDef += s.bonusDefense || 0;
        logs.push({ text: `⚡ Sinergia activada → +${s.bonusDamage || 0} dmg / +${s.bonusHeal || 0} heal / +${s.bonusDefense || 0} def`, type: 'special' });
      }
    }

    // ── EffectContext real (idéntico al del juego) ──
    const ctx: EffectContext = {
      attacker, primaryTarget: target, allPlayers: players, turn, cardsPlayedThisTurn: 1,
      applyDamage: (id, amount, ignoreDef) => {
        const p = get(id);
        const dmg = Math.max(0, amount + (id === 'target' ? synBonusDmg : 0));
        const blocked = ignoreDef ? 0 : Math.min(p.currentDefense, dmg);
        p.currentDefense -= blocked;
        const net = dmg - blocked;
        p.currentHp = Math.max(0, p.currentHp - net);
        if (p.currentHp <= 0) p.isAlive = false;
      },
      applyHeal: (id, amount) => { const p = get(id); p.currentHp = Math.min(p.maxHp, p.currentHp + amount + (id === 'target' ? synBonusHeal : 0)); },
      applyDefense: (id, amount) => { const p = get(id); p.currentDefense += amount + (id === 'self' || id === attacker.id ? synBonusDef : 0); },
      applyStatus: (id, effect) => {
        const p = get(id);
        if (effect?._cleanse) { p.activeEffects = p.activeEffects.filter((e) => e.value >= 0); return; }
        if (effect?._dispel) { p.activeEffects = p.activeEffects.filter((e) => e.value <= 0); return; }
        if (effect?.id) p.activeEffects.push(effect as ActiveEffect);
      },
      drawCards: (id, n) => logs.push({ text: `🎴 ${get(id).name} roba ${n} carta(s)`, type: 'system' }),
      discardCards: (id, n) => logs.push({ text: `🗑️ ${get(id).name} descarta ${n} carta(s)`, type: 'system' }),
      revealHand: (id) => logs.push({ text: `👁️ Mano de ${get(id).name} revelada`, type: 'system' }),
      log: (msg, type) => logs.push({ text: msg, type: type || 'system' }),
    };

    // ── Ejecutar: effects[] real, o fórmula, o value ──
    if (card.effects && card.effects.length) {
      await applyEffects(card.effects, ctx);
    } else if (card.formula) {
      const v = evalFormula(card.formula.expression, { attacker, target, turn, cardsPlayed: 1 });
      if (card.formula.resultType === 'damage') ctx.applyDamage('target', Math.abs(v), !!card.ignoresDefense);
      else if (card.formula.resultType === 'heal') ctx.applyHeal('target', Math.abs(v));
      else ctx.applyDefense('self', Math.abs(v));
      logs.push({ text: `🧮 Fórmula "${card.formula.expression}" = ${v}`, type: 'special' });
    } else if (card.value < 0) {
      ctx.applyDamage('target', Math.abs(card.value), !!card.ignoresDefense);
    } else if (card.value > 0) {
      ctx.applyHeal('target', card.value);
    }

    setLog(logs);
    setResult({ atk: { ...attacker }, tgt: { ...target } });
  };

  const HpBar: React.FC<{ p: Player }> = ({ p }) => (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{p.name}</span><span className="text-white font-bold">{p.currentHp}/{p.maxHp} {p.currentDefense > 0 && <span className="text-blue-400">🛡{p.currentDefense}</span>}</span></div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-red-600 to-emerald-500 transition-all" style={{ width: `${Math.max(0, (p.currentHp / p.maxHp) * 100)}%` }} />
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-black text-white">👁️ Simulador (motor real)</h1>
          <p className="text-sm text-slate-400">Resuelve la carta con el <b className="text-emerald-400">mismo motor de efectos, fórmulas y sinergias</b> del juego CARGAS. Lo que veas aquí es lo que pasará en partida.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
          <div className="flex flex-col items-center gap-3">
            <select value={cardId} onChange={(e) => setCardId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none">
              {all.map((c) => <option key={c.__sourceId + c.id} value={c.id}>{c.name}</option>)}
            </select>
            {card && <CardView card={card} size="md" />}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 grid grid-cols-2 gap-3">
              <div className="col-span-2 text-sm font-black text-slate-300">⚔️ Atacante</div>
              <label className="text-xs text-slate-400">HP actual<input type="number" value={atkHp} onChange={(e) => setAtkHp(+e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none" /></label>
              <label className="text-xs text-slate-400">HP máx<input type="number" value={atkMaxHp} onChange={(e) => setAtkMaxHp(+e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none" /></label>
              <label className="text-xs text-slate-400">Daño base<input type="number" value={atkDmg} onChange={(e) => setAtkDmg(+e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none" /></label>
              <label className="text-xs text-slate-400">Turno<input type="number" value={turn} onChange={(e) => setTurn(+e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none" /></label>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="text-sm font-black text-slate-300">🎯 Objetivo</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-slate-400">HP máx<input type="number" value={maxHp} onChange={(e) => setMaxHp(+e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none" /></label>
                <label className="text-xs text-slate-400">Defensa<input type="number" value={defense} onChange={(e) => setDefense(+e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none" /></label>
              </div>
              <label className="text-xs text-slate-400 block">Tags del objetivo (coma)<input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none" /></label>
              <button onClick={run} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black px-4 py-2 rounded-lg">▶️ Resolver con motor real</button>
            </div>

            {result && (
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase">Estado tras resolver</div>
                <HpBar p={result.atk} />
                <HpBar p={result.tgt} />
                {result.tgt.activeEffects.filter(e => e.id?.startsWith('tag_') === false).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {result.tgt.activeEffects.filter(e => !e.id?.startsWith('tag_')).map((e, i) => (
                      <span key={i} className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{e.name}{e.duration ? ` (${e.duration}t)` : ''}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 min-h-[100px]">
              <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Registro del motor</div>
              {log.length === 0 ? <div className="text-sm text-slate-600 italic">Pulsa "Resolver" para simular con el motor real.</div> : (
                <div className="space-y-1 font-mono text-xs">
                  {log.map((l, i) => <div key={i} style={{ color: TYPE_COLOR[l.type] || '#cbd5e1' }}>{l.text}</div>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
