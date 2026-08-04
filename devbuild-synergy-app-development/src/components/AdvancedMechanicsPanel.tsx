import React from 'react';
import {
  MECHANIC_EFFECTS,
  STACK_MODE_CATALOG,
  ADVANCED_CARD_TEMPLATES,
  CHARACTER_PASSIVE_TEMPLATES,
  makeComplexCharacterTemplate,
} from '../data/mechanicsCatalog';
import {
  publishAdvancedMechanicsToGame,
  publishRegistriesToGame,
  publishWorkbenchExample,
} from '../services/editorLiveSync';

export const AdvancedMechanicsPanel: React.FC = () => {
  const [status, setStatus] = React.useState('');

  const run = async (label: string, fn: () => Promise<boolean>) => {
    setStatus('⏳ ' + label + '...');
    try {
      await fn();
      setStatus('✅ ' + label + ' publicado en disco compartido');
    } catch (err: any) {
      setStatus('❌ Error: ' + (err?.message || String(err)));
    }
  };

  const complexChar = React.useMemo(() => makeComplexCharacterTemplate(), []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-900/80 border border-fuchsia-700/40 p-4">
        <h2 className="text-xl font-black text-fuchsia-300 mb-1">🧬 Mechanics Studio v2</h2>
        <p className="text-xs text-slate-400">
          Herramientas avanzadas para overheal, restaurar HP original, rompearmadura,
          combos rotos, pasivas múltiples, personajes complejos y sincronización real con CARGAS.
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => run('Catálogo de mecánicas', publishAdvancedMechanicsToGame)}
            className="px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black"
          >
            📡 Publicar mecánicas al juego
          </button>
          <button
            onClick={() => run('Registros/overrides', publishRegistriesToGame)}
            className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black"
          >
            💾 Publicar overrides/registros
          </button>
          <button
            onClick={() => run('Workbench avanzado', publishWorkbenchExample)}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-black"
          >
            🧪 Generar ejemplo avanzado
          </button>
        </div>

        {status && (
          <div className="mt-3 text-xs bg-black/40 border border-slate-700 rounded-xl p-2 text-slate-200">
            {status}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-3">
          <h3 className="font-black text-cyan-300 mb-2 text-sm">⚙️ Mecánicas reconocidas</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.values(MECHANIC_EFFECTS).map((m: any) => (
              <div key={m.id} className="rounded-xl bg-slate-950/70 border border-slate-700 p-2 text-xs">
                <div className="font-black" style={{ color: m.color }}>{m.icon} {m.label}</div>
                <div className="text-slate-400 text-[0.65rem]">{m.description}</div>
                <div className="text-[0.55rem] text-slate-500 mt-1">danger: {m.danger}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-3">
          <h3 className="font-black text-amber-300 mb-2 text-sm">📚 Stack modes</h3>
          <div className="space-y-2">
            {Object.values(STACK_MODE_CATALOG).map((m: any) => (
              <div key={m.id} className="rounded-xl bg-slate-950/70 border border-slate-700 p-2 text-xs">
                <div className="font-black" style={{ color: m.color }}>{m.icon} {m.label}</div>
                <div className="text-slate-400 text-[0.65rem]">{m.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-3">
        <h3 className="font-black text-emerald-300 mb-2 text-sm">🦸 Personajes complejos</h3>
        <p className="text-xs text-slate-400 mb-2">
          Ahora puedes usar más de 3 habilidades, varias pasivas individuales, varias pasivas de equipo,
          tags, notas de rol y dificultad.
        </p>
        <pre className="text-[0.65rem] bg-black/50 rounded-xl p-3 overflow-auto max-h-80 border border-slate-800">
{JSON.stringify(complexChar, null, 2)}
        </pre>
      </div>

      <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-3">
        <h3 className="font-black text-rose-300 mb-2 text-sm">🎴 Plantillas de cartas v2</h3>
        <pre className="text-[0.65rem] bg-black/50 rounded-xl p-3 overflow-auto max-h-80 border border-slate-800">
{JSON.stringify(ADVANCED_CARD_TEMPLATES, null, 2)}
        </pre>
      </div>

      <div className="rounded-2xl bg-slate-900/70 border border-slate-700 p-3">
        <h3 className="font-black text-purple-300 mb-2 text-sm">🧠 Plantillas de pasivas</h3>
        <pre className="text-[0.65rem] bg-black/50 rounded-xl p-3 overflow-auto max-h-80 border border-slate-800">
{JSON.stringify(CHARACTER_PASSIVE_TEMPLATES, null, 2)}
        </pre>
      </div>

      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-300">
        <div className="font-black text-cyan-300 mb-1">🖥️ CLI sugerido</div>
        <pre className="text-[0.65rem] whitespace-pre-wrap">
mechanics.publish
registries.publish
workbench.example
card.add mod=mi_mod name="Bendición Excesiva" type=healing tags=overheal,broken
char.add mod=mi_mod name="Héroe Complejo V2" passives=multiple abilities=6
        </pre>
      </div>
    </div>
  );
};
