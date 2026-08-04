// ============================================================
// PLANTILLAS DE EJEMPLO PARA CARTAS (real, alineado con CARGAS)
// ============================================================
import { PlayableCard } from '../types/game';

export interface CardTemplate {
  key: string;
  label: string;
  icon: string;
  build: () => Partial<PlayableCard>;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    key: 'damage', label: 'Daño directo', icon: '⚔️',
    build: () => ({ type: 'damage', value: -50, description: '-50 daño directo', targetMode: 'enemy', tags: ['fisico'], effects: [{ kind: 'damage', amount: 50, target: 'enemy' }] }),
  },
  {
    key: 'dot', label: 'Veneno (DoT)', icon: '🔥',
    build: () => ({ type: 'damage_over_time', value: -20, description: '-20/t x4 (ignora defensa)', effectTiming: 'start_of_turn', duration: 4, ignoresDefense: true, targetMode: 'enemy', tags: ['veneno'], synergyTags: ['veneno'], effects: [{ kind: 'dot', amount: 20, duration: 4, ignoresDefense: true, stackKey: 'poison', target: 'enemy', applyTags: ['veneno'] }] }),
  },
  {
    key: 'heal', label: 'Curación', icon: '💚',
    build: () => ({ type: 'heal', value: 120, description: '+120 HP a un aliado', targetMode: 'ally_or_self', tags: ['sanador'], effects: [{ kind: 'heal', amount: 120, target: 'ally' }] }),
  },
  {
    key: 'aoe', label: 'AOE + DoT', icon: '🎯',
    build: () => ({ type: 'elemental', value: 0, description: 'Daño en área + quemadura', targetMode: 'all_enemies', tags: ['magia', 'aoe'], effects: [{ kind: 'damage', amount: 40, target: 'all_enemies' }, { kind: 'dot', amount: 15, duration: 3, target: 'all_enemies', applyTags: ['fuego'] }] }),
  },
  {
    key: 'formula', label: 'Con fórmula', icon: '🧮',
    build: () => ({ type: 'damage', value: -10, description: 'Daño = 20% del HP del enemigo', targetMode: 'enemy', rarity: 'rare', formula: { expression: 'target.hp * 0.2', resultType: 'damage' }, effects: [] }),
  },
  {
    key: 'execute', label: 'Ejecución condicional', icon: '☠️',
    build: () => ({ type: 'special', value: 0, description: 'Ejecuta si HP < 30%, si no 30 daño', targetMode: 'enemy', rarity: 'epic', ignoresDefense: true, tags: ['asesino'], effects: [{ kind: 'conditional', condition: { targetHpBelow: 30 }, ifTrue: [{ kind: 'execute', target: 'enemy' }], ifFalse: [{ kind: 'damage', amount: 30, target: 'enemy', ignoresDefense: true }] } as any] }),
  },
  {
    key: 'defense', label: 'Defensa', icon: '🛡️',
    build: () => ({ type: 'defense', value: 50, description: 'Acumula 50 de defensa', targetMode: 'self', tags: ['tanque'], effects: [{ kind: 'defense_buff', amount: 50, target: 'self' }] }),
  },
  {
    key: 'lifesteal', label: 'Robo de vida', icon: '🩸',
    build: () => ({ type: 'curse', value: -35, description: 'Daño 35 y te curas la mitad', targetMode: 'enemy', tags: ['oscuro'], effects: [{ kind: 'lifesteal', amount: 35, target: 'enemy' }] }),
  },
];
