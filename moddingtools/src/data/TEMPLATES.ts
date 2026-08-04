// ============================================================
// PLANTILLAS DE CARTAS — DevBuild (sin datos pre-cargados)
// ============================================================
// Solo plantillas vacías para el botón "+ Nueva desde plantilla"
// del editor visual. Define la ESTRUCTURA, no el contenido.
// ============================================================
import { PlayableCard } from '../types/game';

export interface CardTemplate {
  key: string;
  label: string;
  icon: string;
  build: () => Partial<PlayableCard>;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  { key: 'damage', label: 'Daño', icon: '⚔️',
    build: () => ({ type: 'damage', value: 0, description: '', targetMode: 'enemy', tags: [], effects: [{ kind: 'damage', amount: 0, target: 'enemy' }] }) },
  { key: 'dot', label: 'Daño por turno', icon: '🔥',
    build: () => ({ type: 'damage_over_time', value: 0, description: '', effectTiming: 'start_of_turn', duration: 3, ignoresDefense: true, targetMode: 'enemy', tags: [], effects: [{ kind: 'dot', amount: 0, duration: 3, ignoresDefense: true, target: 'enemy' }] }) },
  { key: 'heal', label: 'Curación', icon: '💚',
    build: () => ({ type: 'heal', value: 0, description: '', targetMode: 'ally_or_self', tags: [], effects: [{ kind: 'heal', amount: 0, target: 'ally' }] }) },
  { key: 'defense', label: 'Defensa', icon: '🛡️',
    build: () => ({ type: 'defense', value: 0, description: '', targetMode: 'self', tags: [], effects: [{ kind: 'defense_buff', amount: 0, target: 'self' }] }) },
  { key: 'aoe', label: 'Área (AOE)', icon: '🎯',
    build: () => ({ type: 'elemental', value: 0, description: '', targetMode: 'all_enemies', tags: ['aoe'], effects: [{ kind: 'damage', amount: 0, target: 'all_enemies' }] }) },
  { key: 'formula', label: 'Con fórmula', icon: '🧮',
    build: () => ({ type: 'damage', value: 0, description: '', targetMode: 'enemy', formula: { expression: 'target.hp * 0.2', resultType: 'damage' }, effects: [] }) },
  { key: 'conditional', label: 'Condicional', icon: '❓',
    build: () => ({ type: 'special', value: 0, description: '', targetMode: 'enemy', effects: [{ kind: 'conditional', condition: { targetHpBelow: 30 }, ifTrue: [{ kind: 'execute', target: 'enemy' }], ifFalse: [{ kind: 'damage', amount: 0, target: 'enemy' }] } as any] }) },
  { key: 'choice', label: 'Elección', icon: '🔀',
    build: () => ({ type: 'special', value: 0, description: '', targetMode: 'any', effects: [{ kind: 'choice', choices: [{ label: 'Opción A', effects: [] }, { label: 'Opción B', effects: [] }] } as any] }) },
  { key: 'empty', label: 'Carta vacía', icon: '📄',
    build: () => ({ type: 'utility', value: 0, description: '', targetMode: 'self', tags: [], effects: [] }) },
];
