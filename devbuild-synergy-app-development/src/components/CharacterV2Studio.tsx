// ============================================================
// CHARACTER V2 STUDIO + ABILITY LIBRARY ATTACH
// DevBuild / ModdingTools
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  AnyCharacter,
  applyCharacterDraftToGame,
  cleanCharacterDraft,
  createExampleCharacter,
  deleteCharacterDraft,
  loadCharacterDrafts,
  saveCharacterDraft,
} from '../services/characterDrafts';
import {
  AbilityDef,
  abilityToCharacterSlot,
  loadAbilityLibrary,
} from '../services/abilityLibrary';

const inputCls = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500';
const labelCls = 'text-[0.62rem] font-black text-slate-400 uppercase tracking-wide';

const emptyCharacter = (): AnyCharacter => cleanCharacterDraft({
  id: `personaje_${Date.now()}`,
  name: 'Nuevo personaje',
  avatar: '🧬',
  color: '#22d3ee',
  hp: 3000,
  maxHp: 3000,
  defense: 20,
  damage: 100,
  speed: 10,
  tags: ['editor'],
  abilities: [
    {
      id: 'golpe_editor',
      name: 'Golpe Editor',
      description: 'Daño básico para que el personaje sea jugable.',
      effect: 'damage',
      type: 'attack',
      damage: 150,
      cooldown: 0,
      canTarget: 'enemy',
    },
  ],
  passives: [],
  teamPassives: [],
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="mb-3 text-sm font-black text-slate-200">{title}</div>
      {children}
    </div>
  );
}

function MiniCard({
  item,
  onRemove,
}: {
  item: any;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-black text-white">{item.icon || '🎯'} {item.name}</div>
          <div className="text-[0.62rem] text-slate-500">{item.id}</div>
        </div>
        <button onClick={onRemove} className="rounded-lg bg-red-900/70 px-2 py-1 text-[0.6rem] font-black text-red-100 hover:bg-red-800">
          quitar
        </button>
      </div>
      <div className="mt-1 text-xs text-slate-300">{item.description}</div>
      <div className="mt-2 flex flex-wrap gap-1 text-[0.58rem]">
        {item.isTeamAbility && <span className="rounded bg-blue-950 px-1.5 py-0.5 text-blue-200">equipo</span>}
        {item.effect && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">{item.effect}</span>}
        {item.canTarget && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">{item.canTarget}</span>}
        {Number(item.cooldown || 0) > 0 && <span className="rounded bg-amber-950 px-1.5 py-0.5 text-amber-200">CD {item.cooldown}</span>}
        {Number(item.damage || 0) > 0 && <span className="rounded bg-red-950 px-1.5 py-0.5 text-red-200">DMG {item.damage}</span>}
        {Number(item.healing || 0) > 0 && <span className="rounded bg-green-950 px-1.5 py-0.5 text-green-200">HEAL {item.healing}</span>}
        {Number(item.defense || 0) !== 0 && <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-cyan-200">DEF {item.defense}</span>}
        {/* UI FASE7 FX badge */}
        {Array.isArray((item as any).effects) && (item as any).effects.length > 0 && (
          <span className="rounded bg-purple-950 px-1.5 py-0.5 text-purple-200">FX {(item as any).effects.length}</span>
        )}
      </div>
    </div>
  );
}

export const CharacterV2Studio: React.FC = () => {
  const [drafts, setDrafts] = useState<AnyCharacter[]>([]);
  const [library, setLibrary] = useState<AbilityDef[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedAbilityId, setSelectedAbilityId] = useState('');
  const [character, setCharacter] = useState<AnyCharacter>(() => emptyCharacter());
  const [jsonText, setJsonText] = useState('');
  const [status, setStatus] = useState('Listo.');
  const [tab, setTab] = useState<'base' | 'abilities' | 'passives' | 'json'>('base');

  const counts = useMemo(() => {
    const abilities = Array.isArray(character.abilities) ? character.abilities : [];
    const passives = Array.isArray(character.passives) ? character.passives : [];
    const teamPassives = Array.isArray(character.teamPassives) ? character.teamPassives : [];

    return {
      active: abilities.filter((x: any) => !x.isTeamAbility).length,
      team: abilities.filter((x: any) => x.isTeamAbility).length,
      passives: passives.length,
      teamPassives: teamPassives.length,
      total: abilities.length + passives.length + teamPassives.length,
    };
  }, [character]);

  const refresh = async () => {
    const [d, l] = await Promise.all([
      loadCharacterDrafts(),
      loadAbilityLibrary(),
    ]);

    setDrafts(d);
    setLibrary(l);
    return { d, l };
  };

  useEffect(() => {
    refresh().catch(err => setStatus(`ERROR cargando: ${err?.message || String(err)}`));
  }, []);

  useEffect(() => {
    setJsonText(JSON.stringify(character, null, 2));
  }, [character]);

  const update = (patch: Partial<AnyCharacter>) => {
    setCharacter(prev => cleanCharacterDraft({ ...prev, ...patch }));
  };

  const selectDraft = (id: string) => {
    setSelectedId(id);
    const found = drafts.find(d => d.id === id);
    if (found) setCharacter(cleanCharacterDraft(found));
  };

  const saveDraft = async () => {
    const saved = await saveCharacterDraft(character);
    setCharacter(saved);
    setSelectedId(saved.id);
    await refresh();
    setStatus(`Draft guardado: ${saved.id}`);
  };

  const applyToGame = async () => {
    const applied = await applyCharacterDraftToGame(character);
    setCharacter(applied);
    setSelectedId(applied.id);
    await refresh();
    setStatus(`Aplicado al juego: ${applied.id}`);
  };

  const createExample = async () => {
    const created = await createExampleCharacter();
    setCharacter(created);
    setSelectedId(created.id);
    await refresh();
    setStatus(`Ejemplo creado: ${created.id}`);
  };

  const removeDraft = async () => {
    if (!selectedId) return;
    await deleteCharacterDraft(selectedId);
    setSelectedId('');
    setCharacter(emptyCharacter());
    await refresh();
    setStatus(`Draft eliminado: ${selectedId}`);
  };

  const attachAbility = () => {
    const found = library.find(x => x.id === selectedAbilityId);
    if (!found) {
      setStatus('Selecciona una habilidad de la librería.');
      return;
    }

    const slot = abilityToCharacterSlot(found);

    setCharacter(prev => {
      const current = cleanCharacterDraft(prev);

      if (found.kind === 'passive') {
        return cleanCharacterDraft({
          ...current,
          passives: [...(current.passives || []), slot],
          passiveDescription: [...(current.passives || []), slot].map((p: any) => p.name).join(' · '),
        });
      }

      if (found.kind === 'team_passive') {
        return cleanCharacterDraft({
          ...current,
          teamPassives: [...(current.teamPassives || []), slot],
          teamPassiveDescription: [...(current.teamPassives || []), slot].map((p: any) => p.name).join(' · '),
        });
      }

      return cleanCharacterDraft({
        ...current,
        abilities: [...(current.abilities || []), slot],
      });
    });

    setStatus(`Adjuntada: ${found.name}`);
  };

  const removeAbilityAt = (index: number) => {
    setCharacter(prev => cleanCharacterDraft({
      ...prev,
      abilities: (prev.abilities || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const removePassiveAt = (index: number) => {
    setCharacter(prev => {
      const passives = (prev.passives || []).filter((_: any, i: number) => i !== index);
      return cleanCharacterDraft({
        ...prev,
        passives,
        passiveDescription: passives.map((p: any) => p.name).join(' · '),
      });
    });
  };

  const removeTeamPassiveAt = (index: number) => {
    setCharacter(prev => {
      const teamPassives = (prev.teamPassives || []).filter((_: any, i: number) => i !== index);
      return cleanCharacterDraft({
        ...prev,
        teamPassives,
        teamPassiveDescription: teamPassives.map((p: any) => p.name).join(' · '),
      });
    });
  };

  const importJson = async () => {
    const parsed = JSON.parse(jsonText);
    const clean = cleanCharacterDraft(parsed);
    setCharacter(clean);
    await saveCharacterDraft(clean);
    await refresh();
    setStatus(`JSON importado y guardado: ${clean.id}`);
  };

  const activeAbilities = (character.abilities || []).filter((x: any) => !x.isTeamAbility);
  const teamAbilities = (character.abilities || []).filter((x: any) => x.isTeamAbility);
  const passives = character.passives || [];
  const teamPassives = character.teamPassives || [];

  return (
    <div className="space-y-4 text-white">
      <Section title="🦸 Personajes V2">
        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedId} onChange={e => selectDraft(e.target.value)} className={`${inputCls} max-w-sm`}>
            <option value="">Seleccionar draft...</option>
            {drafts.map(d => (
              <option key={d.id} value={d.id}>{d.avatar} {d.name} · {d.id}</option>
            ))}
          </select>

          <button onClick={() => { setCharacter(emptyCharacter()); setSelectedId(''); }} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black hover:bg-slate-700">
            ➕ Nuevo
          </button>
          <button onClick={createExample} className="rounded-xl bg-purple-700 px-3 py-2 text-xs font-black hover:bg-purple-600">
            🧪 Ejemplo
          </button>
          <button onClick={saveDraft} className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black hover:bg-cyan-600">
            💾 Guardar draft
          </button>
          <button onClick={applyToGame} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black hover:bg-emerald-600">
            🚀 Aplicar al juego
          </button>
          <button onClick={removeDraft} disabled={!selectedId} className="rounded-xl bg-red-800 px-3 py-2 text-xs font-black hover:bg-red-700 disabled:opacity-40">
            🗑️ Borrar draft
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
          {status}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem]">
          <span className="rounded-lg bg-red-950/50 px-2 py-1 text-red-200">Indiv: {counts.active}</span>
          <span className="rounded-lg bg-blue-950/50 px-2 py-1 text-blue-200">Equipo: {counts.team}</span>
          <span className="rounded-lg bg-fuchsia-950/50 px-2 py-1 text-fuchsia-200">Pasivas: {counts.passives}</span>
          <span className="rounded-lg bg-emerald-950/50 px-2 py-1 text-emerald-200">Pasivas equipo: {counts.teamPassives}</span>
          <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-200">Total: {counts.total}</span>
          <span className="rounded-lg bg-amber-950/50 px-2 py-1 text-amber-200">Sin límite duro 3+3+2</span>
        </div>
      </Section>

      <div className="flex flex-wrap gap-2">
        {([
          ['base', '🧬 Base'],
          ['abilities', '🎯 Habilidades'],
          ['passives', '🔒 Pasivas'],
          ['json', '🧾 JSON'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl px-3 py-2 text-xs font-black ${
              tab === id ? 'bg-cyan-700 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'base' && (
        <Section title="🧬 Datos base">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className={labelCls}>ID</div>
              <input value={character.id || ''} onChange={e => update({ id: e.target.value })} className={inputCls} />
            </div>
            <div>
              <div className={labelCls}>Nombre</div>
              <input value={character.name || ''} onChange={e => update({ name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <div className={labelCls}>Avatar</div>
              <input value={character.avatar || ''} onChange={e => update({ avatar: e.target.value })} className={inputCls} />
            </div>
            <div>
              <div className={labelCls}>Color</div>
              <input value={character.color || ''} onChange={e => update({ color: e.target.value })} className={inputCls} />
            </div>
            <div>
              <div className={labelCls}>HP</div>
              <input type="number" value={character.hp || 0} onChange={e => update({ hp: +e.target.value, maxHp: +e.target.value })} className={inputCls} />
            </div>
            <div>
              <div className={labelCls}>Defensa</div>
              <input type="number" value={character.defense || 0} onChange={e => update({ defense: +e.target.value })} className={inputCls} />
            </div>
            <div>
              <div className={labelCls}>Daño base</div>
              <input type="number" value={character.damage || 0} onChange={e => update({ damage: +e.target.value })} className={inputCls} />
            </div>
            <div>
              <div className={labelCls}>Velocidad</div>
              <input type="number" value={character.speed || 0} onChange={e => update({ speed: +e.target.value })} className={inputCls} />
            </div>
          </div>

          <div className="mt-3">
            <div className={labelCls}>Tags separados por coma</div>
            <input
              value={(character.tags || []).join(',')}
              onChange={e => update({ tags: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })}
              className={inputCls}
            />
          </div>
        </Section>
      )}

      {tab === 'abilities' && (
        <Section title="🎯 Adjuntar habilidades activas">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select value={selectedAbilityId} onChange={e => setSelectedAbilityId(e.target.value)} className={inputCls}>
              <option value="">Seleccionar de la librería...</option>
              {library.map(a => (
                <option key={a.id} value={a.id}>
                  {a.icon || '🎯'} {a.name} · {a.kind} · {a.effect}
                </option>
              ))}
            </select>
            <button onClick={attachAbility} className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black hover:bg-cyan-600">
              ➕ Adjuntar
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-black text-red-300">⚔️ Individuales ({activeAbilities.length})</div>
              <div className="space-y-2">
                {activeAbilities.map((ab: any) => {
                  const globalIndex = (character.abilities || []).indexOf(ab);
                  return <MiniCard key={`${ab.id}-${globalIndex}`} item={ab} onRemove={() => removeAbilityAt(globalIndex)} />;
                })}
                {!activeAbilities.length && <div className="text-xs text-slate-500">Sin habilidades individuales.</div>}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-black text-blue-300">👥 De equipo ({teamAbilities.length})</div>
              <div className="space-y-2">
                {teamAbilities.map((ab: any) => {
                  const globalIndex = (character.abilities || []).indexOf(ab);
                  return <MiniCard key={`${ab.id}-${globalIndex}`} item={ab} onRemove={() => removeAbilityAt(globalIndex)} />;
                })}
                {!teamAbilities.length && <div className="text-xs text-slate-500">Sin habilidades de equipo.</div>}
              </div>
            </div>
          </div>
        </Section>
      )}

      {tab === 'passives' && (
        <Section title="🔒 Pasivas">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select value={selectedAbilityId} onChange={e => setSelectedAbilityId(e.target.value)} className={inputCls}>
              <option value="">Seleccionar de la librería...</option>
              {library.filter(a => a.kind === 'passive' || a.kind === 'team_passive').map(a => (
                <option key={a.id} value={a.id}>
                  {a.icon || '🔒'} {a.name} · {a.kind}
                </option>
              ))}
            </select>
            <button onClick={attachAbility} className="rounded-xl bg-fuchsia-700 px-3 py-2 text-xs font-black hover:bg-fuchsia-600">
              ➕ Adjuntar pasiva
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-black text-fuchsia-300">🔒 Pasivas individuales ({passives.length})</div>
              <div className="space-y-2">
                {passives.map((p: any, i: number) => (
                  <MiniCard key={`${p.id}-${i}`} item={p} onRemove={() => removePassiveAt(i)} />
                ))}
                {!passives.length && <div className="text-xs text-slate-500">Sin pasivas individuales.</div>}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-black text-emerald-300">🛡️ Pasivas de equipo ({teamPassives.length})</div>
              <div className="space-y-2">
                {teamPassives.map((p: any, i: number) => (
                  <MiniCard key={`${p.id}-${i}`} item={p} onRemove={() => removeTeamPassiveAt(i)} />
                ))}
                {!teamPassives.length && <div className="text-xs text-slate-500">Sin pasivas de equipo.</div>}
              </div>
            </div>
          </div>
        </Section>
      )}

      {tab === 'json' && (
        <Section title="🧾 JSON avanzado">
          <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} className={`${inputCls} min-h-[520px] font-mono`} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={importJson} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black hover:bg-emerald-600">
              Importar JSON como draft
            </button>
            <button onClick={() => setJsonText(JSON.stringify(character, null, 2))} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black hover:bg-slate-700">
              Refrescar JSON
            </button>
          </div>
        </Section>
      )}
    </div>
  );
};

export default CharacterV2Studio;
