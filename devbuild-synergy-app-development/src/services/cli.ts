// ============================================================
// CLI ENGINE — comandos funcionales para modificar el juego base
// ============================================================
// Permite hacer TODO lo de la GUI desde texto:
//   card.add, card.list, char.add, tag.add, effect.add,
//   ability.add, passive.add, mod.create, mod.list, base.override...
// ============================================================
import {
  getInstalledMods, createEmptyMod, upsertCardInMod, deleteCardFromMod,
  uninstallMod, sanitizeId, upsertCharacterInMod,
} from '../data/mods';
import {
  addCustomTag, getAllTags, getCustomTags, removeCustomTag,
  addCustomEffect, getCustomEffects, addAbilityDef, getAbilityLibrary,
  addPassiveDef, getPassiveLibrary, setCardOverride, exportAllRegistries,
} from '../data/registries';
import { allBaseCards, getAllCharacters } from '../data/cards';
import { PlayableCard, CharacterCard } from '../types/game';

export interface CliResult { ok: boolean; lines: string[]; }

function ok(...lines: string[]): CliResult { return { ok: true, lines }; }
function err(msg: string): CliResult { return { ok: false, lines: [`❌ ${msg}`] }; }

// Parser simple: respeta comillas
function tokenize(input: string): string[] {
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  const out: string[] = [];
  let m;
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// args tipo key=value
function parseKV(tokens: string[]): Record<string, string> {
  const kv: Record<string, string> = {};
  for (const t of tokens) {
    const i = t.indexOf('=');
    if (i > 0) kv[t.slice(0, i)] = t.slice(i + 1);
  }
  return kv;
}

export const CLI_HELP = `COMANDOS DISPONIBLES (DevBuild CLI):

📋 GENERAL
  help                          muestra esta ayuda
  detect                        info de sinergia con el juego
  export                        exporta todos los registros (JSON)

🎴 CARTAS
  card.list [source]            lista cartas (base | <modId> | all)
  card.add mod=<id> name="..." type=damage value=-50 tags=fuego,aoe
  card.del mod=<id> id=<cardId>
  base.card name="..." patch '{"value":-99}'   modifica carta base

🦸 PERSONAJES
  char.list                     lista personajes base
  char.add mod=<id> name="..." class=warrior hp=3000 dmg=50 def=40

🏷️ TAGS
  tag.list                      lista todos los tags
  tag.add <nombre>              crea un tag personalizado
  tag.del <nombre>              elimina un tag personalizado

⚡ EFECTOS
  effect.list                   lista efectos custom
  effect.add kind=teleport label="Teletransporte" icon=✨ color=#22c55e

🎯 HABILIDADES / PASIVAS (librería)
  ability.add name="..." cd=6 cat=instant effect=damage target=enemy
  ability.list
  passive.add name="..." scope=individual trigger=on_attack tag=fuego value=50
  passive.list

🦸 HABILIDADES/PASIVAS EN UN PERSONAJE
  char.ability.add mod=<id> char=<charId> name="..." cd=6 team=false target=enemy
  char.passive.set mod=<id> char=<charId> scope=individual text="..."

🔗 SINERGIAS Y EFECTOS EN CARTAS
  synergy.add mod=<id> card=<cardId> tag=veneno dmg=30
  card.effect.add mod=<id> card=<cardId> kind=dot amount=15 duration=3 target=enemy tags=fuego

📦 MODS
  mod.list                      lista mods instalados
  mod.create name="..." author="..."
  mod.del <modId>

EJEMPLO COMPLETO:
  mod.create name="Mi Mod" author="Yo"
  card.add mod=mi_mod name="Rayo Brutal" type=damage value=-80 tags=rayo,magia
  tag.add dragon_negro
  effect.add kind=teleport label=Teleport icon=✨ color=#06b6d4`;

export function runCli(input: string): CliResult {
  const trimmed = input.trim();
  if (!trimmed) return ok('');
  const tokens = tokenize(trimmed);
  const cmd = tokens[0].toLowerCase();
  const rest = tokens.slice(1);
  const kv = parseKV(rest);

  try {
    switch (cmd) {
      case 'help': return ok(...CLI_HELP.split('\n'));

      case 'detect': {
        const mods = getInstalledMods();
        return ok('🔍 Sinergia con CARGAS:', `  Storage: cargas.installedMods.v1`, `  Mods compartidos: ${mods.length}`,
          `  ✓ Lo que crees aquí lo lee el juego`);
      }

      case 'export':
        return ok('📤 Export de registros:', JSON.stringify(exportAllRegistries(), null, 2));

      // ── CARTAS ──
      case 'card.list': {
        const src = rest[0] || 'all';
        const lines: string[] = [];
        if (src === 'all' || src === 'base') {
          lines.push(`📚 BASE (${allBaseCards.length} cartas):`);
          allBaseCards.slice(0, 40).forEach(c => lines.push(`  ${c.id} · ${c.name} [${c.type}] ${c.value}`));
          if (allBaseCards.length > 40) lines.push(`  ... y ${allBaseCards.length - 40} más`);
        }
        if (src === 'all' || src !== 'base') {
          for (const m of getInstalledMods()) {
            if (src !== 'all' && (m.manifest.id || sanitizeId(m.manifest.name)) !== src) continue;
            lines.push(`📦 ${m.manifest.name} (${m.cards.length}):`);
            m.cards.forEach(c => lines.push(`  ${c.id} · ${c.name} [${c.type}]`));
          }
        }
        return ok(...lines);
      }

      case 'card.add': {
        if (!kv.mod) return err('Falta mod=<id>. Crea uno con mod.create');
        if (!kv.name) return err('Falta name="..."');
        const card: PlayableCard = {
          id: `cli_${sanitizeId(kv.name)}_${Date.now().toString(36)}`,
          name: kv.name,
          type: (kv.type as any) || 'damage',
          value: kv.value ? Number(kv.value) : -30,
          description: kv.desc || kv.name,
          effectTiming: 'immediate', duration: kv.duration ? Number(kv.duration) : 0,
          isInstant: false,
          targetMode: (kv.target as any) || 'enemy',
          imageFront: null,
          tags: kv.tags ? kv.tags.split(',') : [],
          rarity: (kv.rarity as any) || 'common',
          customTheme: kv.theme ? { key: kv.theme } : undefined,
          effects: [{ kind: (kv.type === 'heal' ? 'heal' : 'damage') as any, amount: Math.abs(kv.value ? Number(kv.value) : 30), target: (kv.target as any) || 'enemy' }],
        };
        upsertCardInMod(kv.mod, card);
        return ok(`✅ Carta "${card.name}" añadida al mod "${kv.mod}"`, `   id: ${card.id}`);
      }

      case 'card.del':
        if (!kv.mod || !kv.id) return err('Uso: card.del mod=<id> id=<cardId>');
        deleteCardFromMod(kv.mod, kv.id);
        return ok(`🗑️ Carta ${kv.id} eliminada de ${kv.mod}`);

      case 'base.card': {
        if (!kv.name && !kv.id) return err('Uso: base.card id=<cardId> patch \'{"value":-99}\'');
        const target = allBaseCards.find(c => c.id === kv.id || c.name === kv.name);
        if (!target) return err('Carta base no encontrada');
        const patchIdx = rest.findIndex(t => t === 'patch');
        if (patchIdx < 0) return err('Falta patch \'{...}\'');
        const json = rest.slice(patchIdx + 1).join(' ');
        const patch = JSON.parse(json);
        setCardOverride(target.id, patch);
        return ok(`✅ Override aplicado a carta base "${target.name}"`, `   ${JSON.stringify(patch)}`);
      }

      // ── PERSONAJES ──
      case 'char.list': {
        const chars = getAllCharacters();
        return ok(`🦸 PERSONAJES BASE (${chars.length}):`, ...chars.map(c => `  ${c.id} · ${c.name} [${c.classType}] ${c.hp}HP`));
      }

      case 'char.add': {
        if (!kv.mod) return err('Falta mod=<id>');
        if (!kv.name) return err('Falta name="..."');
        const char: CharacterCard = {
          id: `cli_${sanitizeId(kv.name)}_${Date.now().toString(36)}`,
          name: kv.name, classType: (kv.class as any) || 'warrior',
          hp: kv.hp ? Number(kv.hp) : 3000, defense: kv.def ? Number(kv.def) : 40, damage: kv.dmg ? Number(kv.dmg) : 45,
          avatar: kv.avatar || '🦸', color: kv.color || '#22c55e',
          imageFront: null, imageBack: null,
          passiveDescription: kv.passive || 'Pasiva individual',
          teamPassiveDescription: kv.teampassive || 'Pasiva de equipo',
          abilities: [],
        };
        upsertCharacterInMod(kv.mod, char);
        return ok(`✅ Personaje "${char.name}" añadido a "${kv.mod}"`, `   id: ${char.id}`);
      }

      // ── TAGS ──
      case 'tag.list':
        return ok(`🏷️ TAGS (${getAllTags().length}):`, '  ' + getAllTags().join(', '), `  Custom: ${getCustomTags().join(', ') || '(ninguno)'}`);
      case 'tag.add':
        if (!rest[0]) return err('Uso: tag.add <nombre>');
        addCustomTag(rest[0]);
        return ok(`✅ Tag "${rest[0]}" creado`);
      case 'tag.del':
        if (!rest[0]) return err('Uso: tag.del <nombre>');
        removeCustomTag(rest[0]);
        return ok(`🗑️ Tag "${rest[0]}" eliminado`);

      // ── EFECTOS ──
      case 'effect.list':
        return ok(`⚡ EFECTOS CUSTOM (${getCustomEffects().length}):`, ...getCustomEffects().map(e => `  ${e.icon} ${e.kind} · ${e.label}`));
      case 'effect.add':
        if (!kv.kind || !kv.label) return err('Uso: effect.add kind=<id> label="..." icon=✨ color=#fff');
        addCustomEffect({ kind: kv.kind, label: kv.label, icon: kv.icon || '⚙️', color: kv.color || '#64748b', description: kv.desc || '', hasAmount: kv.amount !== 'false', hasDuration: kv.duration === 'true' });
        return ok(`✅ Efecto custom "${kv.kind}" registrado`);

      // ── HABILIDADES ──
      case 'ability.list':
        return ok(`🎯 HABILIDADES (${getAbilityLibrary().length}):`, ...getAbilityLibrary().map(a => `  ${a.id} · ${a.name} (cd ${a.cooldown})`));
      case 'ability.add':
        if (!kv.name) return err('Uso: ability.add name="..." cd=6 cat=instant effect=damage target=enemy');
        addAbilityDef({ id: `ab_${sanitizeId(kv.name)}_${Date.now().toString(36)}`, name: kv.name, description: kv.desc || kv.name, cooldown: kv.cd ? Number(kv.cd) : 6, category: (kv.cat as any) || 'instant', effect: (kv.effect as any) || 'damage', canTarget: (kv.target as any) || 'enemy', isTeamAbility: kv.team === 'true' });
        return ok(`✅ Habilidad "${kv.name}" añadida a la librería`);

      // ── PASIVAS ──
      case 'passive.list':
        return ok(`🔒 PASIVAS (${getPassiveLibrary().length}):`, ...getPassiveLibrary().map(p => `  ${p.id} · ${p.name} [${p.scope}]`));
      case 'passive.add':
        if (!kv.name) return err('Uso: passive.add name="..." scope=individual trigger=on_attack tag=fuego value=50');
        addPassiveDef({ id: `pas_${sanitizeId(kv.name)}_${Date.now().toString(36)}`, name: kv.name, description: kv.desc || kv.name, scope: (kv.scope as any) || 'individual', trigger: (kv.trigger as any) || 'always', tagFilter: kv.tag, value: kv.value ? Number(kv.value) : undefined });
        return ok(`✅ Pasiva "${kv.name}" añadida a la librería`);

      // ── MODS ──
      case 'mod.list':
        return ok(`📦 MODS (${getInstalledMods().length}):`, ...getInstalledMods().map(m => `  ${m.manifest.id || sanitizeId(m.manifest.name)} · ${m.manifest.name} (${m.cards.length} cartas)`));
      case 'mod.create': {
        if (!kv.name) return err('Uso: mod.create name="..." author="..."');
        const mod = createEmptyMod(kv.name, kv.author || 'CLI');
        return ok(`✅ Mod creado: "${kv.name}"`, `   id: ${mod.manifest.id || sanitizeId(mod.manifest.name)}`);
      }
      case 'mod.del':
        if (!rest[0]) return err('Uso: mod.del <modId>');
        uninstallMod(rest[0]);
        return ok(`🗑️ Mod "${rest[0]}" eliminado`);

      // ── HABILIDADES Y PASIVAS DE PERSONAJE (en mod) ──
      case 'char.ability.add': {
        if (!kv.mod || !kv.char) return err('Uso: char.ability.add mod=<id> char=<charId> name="..." cd=6 team=false target=enemy');
        if (!kv.name) return err('Falta name="..."');
        const mod = getInstalledMods().find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === kv.mod);
        if (!mod) return err('Mod no encontrado');
        const ch = mod.characters.find(c => c.id === kv.char);
        if (!ch) return err('Personaje no encontrado en el mod');
        ch.abilities = [...(ch.abilities || []), {
          id: `${kv.char}_ab_${Date.now().toString(36)}`, name: kv.name, description: kv.desc || kv.name,
          cooldown: kv.cd ? Number(kv.cd) : 6, currentCooldown: 0, isTeamAbility: kv.team === 'true', passive: '', canTarget: (kv.target as any) || 'enemy',
        }];
        upsertCharacterInMod(kv.mod, ch);
        return ok(`✅ Habilidad "${kv.name}" añadida a ${ch.name}`);
      }

      case 'char.passive.set': {
        if (!kv.mod || !kv.char) return err('Uso: char.passive.set mod=<id> char=<charId> scope=individual text="..."');
        const mod = getInstalledMods().find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === kv.mod);
        if (!mod) return err('Mod no encontrado');
        const ch = mod.characters.find(c => c.id === kv.char);
        if (!ch) return err('Personaje no encontrado');
        if (kv.scope === 'team') ch.teamPassiveDescription = kv.text || '';
        else ch.passiveDescription = kv.text || '';
        upsertCharacterInMod(kv.mod, ch);
        return ok(`✅ Pasiva ${kv.scope || 'individual'} actualizada en ${ch.name}`);
      }

      // ── SINERGIA en carta de mod ──
      case 'synergy.add': {
        if (!kv.mod || !kv.card) return err('Uso: synergy.add mod=<id> card=<cardId> tag=<tag> dmg=30');
        const mod = getInstalledMods().find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === kv.mod);
        if (!mod) return err('Mod no encontrado');
        const card = mod.cards.find(c => c.id === kv.card);
        if (!card) return err('Carta no encontrada en el mod');
        const synergy: any = { condition: {}, };
        if (kv.tag) synergy.condition.targetHasTag = kv.tag;
        if (kv.status) synergy.condition.targetStatus = kv.status;
        if (kv.dmg) synergy.bonusDamage = Number(kv.dmg);
        if (kv.heal) synergy.bonusHeal = Number(kv.heal);
        if (kv.def) synergy.bonusDefense = Number(kv.def);
        card.synergies = [...(card.synergies || []), synergy];
        upsertCardInMod(kv.mod, card);
        return ok(`✅ Sinergia añadida a "${card.name}"`, `   ${JSON.stringify(synergy)}`);
      }

      // ── EFECTO en carta de mod ──
      case 'card.effect.add': {
        if (!kv.mod || !kv.card) return err('Uso: card.effect.add mod=<id> card=<cardId> kind=dot amount=15 duration=3 target=enemy');
        const mod = getInstalledMods().find(m => (m.manifest.id || sanitizeId(m.manifest.name)) === kv.mod);
        if (!mod) return err('Mod no encontrado');
        const card = mod.cards.find(c => c.id === kv.card);
        if (!card) return err('Carta no encontrada');
        const eff: any = { kind: kv.kind || 'damage', target: kv.target || 'enemy' };
        if (kv.amount) eff.amount = Number(kv.amount);
        if (kv.duration) eff.duration = Number(kv.duration);
        if (kv.tags) eff.applyTags = kv.tags.split(',');
        if (kv.ignoredef === 'true') eff.ignoresDefense = true;
        card.effects = [...(card.effects || []), eff];
        upsertCardInMod(kv.mod, card);
        return ok(`✅ Efecto "${eff.kind}" añadido a "${card.name}"`);
      }

      case 'clear': return ok('__CLEAR__');

      default:
        return err(`Comando desconocido: "${cmd}". Escribe "help".`);
    }
  } catch (e: any) {
    return err(e?.message || 'Error ejecutando comando');
  }
}
