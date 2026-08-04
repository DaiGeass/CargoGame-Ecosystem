// ============================================================
// ADVANCED CLI - ModdingTools
// ============================================================

import {
  applyCharacterDraftToGame,
  cleanCharacterDraft,
  createExampleCharacter,
  deleteCharacterDraft,
  loadCharacterDrafts,
  loadGameOverrides,
  normalizeCharacterId,
  removeCharacterFromGame,
  saveCharacterDraft,
  syncCharacterDraftsToGame,
} from './characterDrafts';
import { readSharedJson, getSharedDebugInfo } from './sharedDisk';

export type CliResult = {
  ok: boolean;
  output: string;
  data?: any;
};

function tokenize(input: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
        continue;
      }

      if (ch === '\\' && i + 1 < input.length) {
        cur += input[i + 1];
        i++;
        continue;
      }

      cur += ch;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = '';
      }
      continue;
    }

    cur += ch;
  }

  if (cur) out.push(cur);

  return out;
}

function parseArgs(tokens: string[]) {
  const args: Record<string, string | boolean> = {};
  const rest: string[] = [];

  for (const token of tokens) {
    const eq = token.indexOf('=');
    if (eq > 0) {
      args[token.slice(0, eq)] = token.slice(eq + 1);
    } else if (token.startsWith('--')) {
      args[token.slice(2)] = true;
    } else {
      rest.push(token);
    }
  }

  return { args, rest };
}

const fmt = (value: any) => JSON.stringify(value, null, 2);

async function commandHelp(): Promise<CliResult> {
  return {
    ok: true,
    output: `
CARGAS ModdingTools CLI

Comandos:
  help
  bridge.info
  snapshot.show

Personajes / drafts:
  char.example
  char.new id=mi_personaje name="Mi Personaje" hp=3000 defense=20 avatar=🧬
  char.list
  char.show id=mi_personaje
  char.save id=mi_personaje name="Mi Personaje" hp=3200 defense=30 avatar=🔥
  char.apply id=mi_personaje
  char.apply-all
  char.delete id=mi_personaje

Modificar juego directo:
  base.override id=mi_personaje name="Mi Personaje" hp=3500 defense=35 avatar=🧬
  base.remove id=mi_personaje
  base.list

Ejemplos:
  char.new id=lobo_azul name="Lobo Azul" hp=2800 defense=15 avatar=🐺
  char.apply id=lobo_azul
  base.override id=titan_editor name="Titán Editor" hp=5000 defense=60 avatar=🗿
`.trim()
  };
}

export async function runAdvancedCliCommand(input: string): Promise<CliResult> {
  const raw = String(input || '').trim();
  if (!raw) return { ok: true, output: '' };

  const tokens = tokenize(raw);
  const cmd = tokens.shift()?.toLowerCase() || '';
  const { args } = parseArgs(tokens);

  try {
    if (cmd === 'help' || cmd === '?') return commandHelp();

    if (cmd === 'bridge.info') {
      return { ok: true, output: fmt(await getSharedDebugInfo()) };
    }

    if (cmd === 'snapshot.show') {
      const snap = await readSharedJson<any>('data/api/game-content.json', null);
      if (!snap) {
        return {
          ok: false,
          output: 'No existe data/api/game-content.json. Abre CARGAS una vez para publicar snapshot.',
        };
      }

      return {
        ok: true,
        output: fmt({
          publishedAt: snap.publishedAt,
          cards: snap.cards?.length || 0,
          characters: snap.characters?.length || 0,
          sourceSummary: snap.sourceSummary || [],
        }),
        data: snap,
      };
    }

    if (cmd === 'char.example') {
      const c = await createExampleCharacter();
      return {
        ok: true,
        output: `Draft ejemplo creado: ${c.id}\nUsa: char.apply id=${c.id}`,
        data: c,
      };
    }

    if (cmd === 'char.new' || cmd === 'char.save' || cmd === 'base.override') {
      const name = String(args.name || args.nombre || args.id || 'Personaje CLI');
      const id = normalizeCharacterId(args.id || name);

      const character = cleanCharacterDraft({
        id,
        name,
        avatar: String(args.avatar || '🧬'),
        color: String(args.color || '#22d3ee'),
        hp: Number(args.hp || 3000),
        maxHp: Number(args.maxHp || args.hp || 3000),
        defense: Number(args.defense || args.defensa || 20),
        speed: Number(args.speed || 10),
        tags: String(args.tags || 'cli,editor').split(',').map(x => x.trim()).filter(Boolean),
        abilities: [
          {
            id: 'golpe_cli',
            name: 'Golpe CLI',
            description: 'Habilidad generada desde CLI.',
            type: 'attack',
            damage: Number(args.damage || 150),
            cooldown: Number(args.cooldown || 0),
            passive: false,
          }
        ],
      });

      await saveCharacterDraft(character);

      if (cmd === 'base.override') {
        await applyCharacterDraftToGame(character);
        return {
          ok: true,
          output: `Personaje aplicado directo al juego: ${character.id}`,
          data: character,
        };
      }

      return {
        ok: true,
        output: `Draft guardado: ${character.id}\nPara aplicarlo: char.apply id=${character.id}`,
        data: character,
      };
    }

    if (cmd === 'char.list') {
      const drafts = await loadCharacterDrafts();
      if (!drafts.length) return { ok: true, output: 'No hay drafts de personajes.' };
      return {
        ok: true,
        output: drafts.map(c =>
          `- ${c.id} · ${c.name} · HP ${c.hp} · DEF ${c.defense}`
        ).join('\n'),
        data: drafts,
      };
    }

    if (cmd === 'char.show') {
      const id = normalizeCharacterId(args.id);
      const drafts = await loadCharacterDrafts();
      const c = drafts.find(x => x.id === id);
      if (!c) return { ok: false, output: `No existe draft: ${id}` };
      return { ok: true, output: fmt(c), data: c };
    }

    if (cmd === 'char.apply') {
      const id = normalizeCharacterId(args.id);
      const drafts = await loadCharacterDrafts();
      const c = drafts.find(x => x.id === id);
      if (!c) return { ok: false, output: `No existe draft: ${id}` };
      const applied = await applyCharacterDraftToGame(c);
      return {
        ok: true,
        output: `Aplicado al juego: ${applied.id}\nReabre/recarga CARGAS o espera al watcher.`,
        data: applied,
      };
    }

    if (cmd === 'char.apply-all') {
      const applied = await syncCharacterDraftsToGame();
      return {
        ok: true,
        output: `Aplicados al juego: ${applied.length} personaje(s).`,
        data: applied,
      };
    }

    if (cmd === 'char.delete') {
      const id = normalizeCharacterId(args.id);
      await deleteCharacterDraft(id);
      return { ok: true, output: `Draft eliminado: ${id}` };
    }

    if (cmd === 'base.remove') {
      const id = normalizeCharacterId(args.id);
      await removeCharacterFromGame(id);
      return { ok: true, output: `Personaje removido/bloqueado del juego: ${id}` };
    }

    if (cmd === 'base.list') {
      const ov = await loadGameOverrides();
      const chars = Object.values(ov.characters || {}) as any[];
      if (!chars.length) return { ok: true, output: 'No hay personajes aplicados en baseOverrides.' };
      return {
        ok: true,
        output: chars.map(c => `- ${c.id} · ${c.name} · HP ${c.hp} · DEF ${c.defense}`).join('\n'),
        data: chars,
      };
    }

    return {
      ok: false,
      output: `Comando desconocido: ${cmd}\nEscribe: help`,
    };
  } catch (err: any) {
    return {
      ok: false,
      output: `ERROR: ${err?.message || String(err)}`,
    };
  }
}

export const executeAdvancedCli = runAdvancedCliCommand;
export const runCliCommand = runAdvancedCliCommand;
export const executeCliCommand = runAdvancedCliCommand;
export const executeCli = runAdvancedCliCommand;
export const runCommand = runAdvancedCliCommand;
