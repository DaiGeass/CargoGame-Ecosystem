import { getAllCharactersWithSource } from '../data/contentRegistry';
// ============================================================
// GAME BOARD - Tablero principal
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useNetworkStore } from '../store/networkStore';
import { getAllCharacters, getAllCombos } from '../data/cards';
import { getAbilityRuntimeBehavior, isMultiAbilityTarget } from '../utils/abilityRuntime';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayableCard } from '../types/game';
import { GameSetupModal } from './GameSetupModal';
import { DefenseScreen } from './DefenseScreen';
import { CardChoiceModal } from './CardChoiceModal';
import { PlayTutorialShowcase } from './PlayTutorialShowcase';
import { getCardTheme, getCardStyleProps } from '../utils/cardThemes';
import { getCardImage, getCharacterFrontImage, playCardSound } from '../utils/media';
import { tagClass } from '../utils/tagStyles';
import { estimateBrokenScore, brokenLabel } from '../data/mechanicsCatalog';

interface CardProps {
  card: PlayableCard;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}

const GameCard: React.FC<CardProps> = ({ card, isSelected, size = 'md', onClick, draggable = false, onDragStart, onDragEnd, onPointerDown }) => {
  // Resolver tema: customTheme.key → registro, o tipo de carta base
  const themeKey = card.customTheme?.key || card.type;
  const theme = getCardTheme(themeKey);
  const inlineTheme = card.customTheme && (card.customTheme.bg || card.customTheme.bgGrad || card.customTheme.border)
    ? {
        bg: card.customTheme.bg || theme.bg,
        bgGrad: card.customTheme.bgGrad || theme.bgGrad,
        border: card.customTheme.border || theme.border,
        glow: card.customTheme.glow || theme.glow,
        text: card.customTheme.text || theme.text,
      }
    : null;
  const cardStyle = inlineTheme
    ? {
        background: `linear-gradient(160deg, ${inlineTheme.bg} 0%, ${inlineTheme.bgGrad} 100%)`,
        borderColor: inlineTheme.border,
        color: inlineTheme.text,
        boxShadow: isSelected
          ? `0 0 0 2px #fde047, 0 0 20px ${inlineTheme.glow}`
          : card.isInstant
            ? `0 0 0 1px rgba(103,232,249,0.5), 0 4px 12px ${inlineTheme.glow}`
            : `0 4px 12px ${inlineTheme.glow}`,
      }
    : getCardStyleProps(themeKey, isSelected, card.isInstant);
  // Para customTheme legacy (con bgGradient), dejamos que el style inline tome precedencia
  const legacyBg = card.customTheme && !card.customTheme.key && !inlineTheme ? card.customTheme.bgGradient : null;
  const icon  = card.customTheme?.icon  || theme.icon;
  const label = card.customTheme?.label || theme.label;

  const [flipped, setFlipped] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const cardImage = getCardImage(card);
  const dims: Record<string, string> = {
    sm: 'w-14 h-[4.5rem] text-[0.45rem]',
    md: 'w-[5.5rem] h-[8.5rem] text-[0.55rem]',
    lg: 'w-[6.5rem] h-[9.5rem] text-xs',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.shiftKey || e.button === 1) {
      setFlipped(x => !x);
      void playCardSound(card, 'resolve');
      return;
    }
    void playCardSound(card, 'play');
    onClick?.();
  };

  if (flipped) {
    const effectTimingLabel: Record<string, string> = {
      immediate: '⚡ Se activa al jugar',
      start_of_turn: '☀️ Al inicio del turno',
      end_of_turn: '🌙 Al final del turno',
      on_damage_taken: '🛡️ Al recibir daño',
      out_of_turn: '⏰ Fuera de turno',
    };
    const targetLabels: Record<string, string> = {
      enemy: '🎯 Enemigos',
      ally: '🤝 Aliados',
      self: '👤 A ti mismo',
      ally_or_self: '👥 Aliados o ti',
      any: '🎯 Cualquiera',
    };
    const rarityStyle: Record<string, string> = {
      common: 'text-slate-400',
      uncommon: 'text-green-400',
      rare: 'text-blue-400',
      epic: 'text-purple-400',
      legendary: 'text-amber-400',
    };
    return (
      <motion.div
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -6, scale: 1.04 }}
        onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
        className={cn(
          dims[size],
          'rounded-xl border-2 bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col p-2 shrink-0',
          'cursor-pointer relative overflow-hidden border-amber-600/60',
          isSelected && 'ring-2 ring-yellow-300'
        )}
      >
        <div className="relative text-center">
          {card.isInstant && (
            <div className="bg-cyan-500 text-black px-1 py-0.5 rounded text-[0.35rem] font-black inline-block mb-0.5">INSTANTÁNEA</div>
          )}
          {card.rarity && (
            <div className={cn('text-[0.32rem] font-black uppercase mb-0.5', rarityStyle[card.rarity])}>
              {card.rarity === 'legendary' ? '⭐ ' : card.rarity === 'epic' ? '💎 ' : ''}{card.rarity}
            </div>
          )}
          <div className="text-[0.5rem] font-black text-amber-300 mb-0.5">📜 {card.name}</div>
          <div className="text-[0.42rem] text-slate-200 mb-1 leading-tight">
            {card.description}
            {card.ignoresDefense && ' (ignora defensa)'}
          </div>
          {card.formula && (
            <div className="text-[0.38rem] bg-fuchsia-950/50 text-fuchsia-300 px-1 py-0.5 rounded border border-fuchsia-700/40 mb-0.5 font-mono">
              📐 {card.formula.expression}
            </div>
          )}
          <div className="text-[0.4rem] text-slate-300 leading-tight">{effectTimingLabel[card.effectTiming] || ''}</div>
          <div className="text-[0.4rem] text-slate-400 italic mt-0.5">{targetLabels[card.targetMode] || ''}</div>
          {card.duration > 0 && <div className="text-[0.4rem] text-amber-400 mt-0.5">⏱ {card.duration} turnos</div>}
          {card.tags && card.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 justify-center mt-1">
              {card.tags.map(t => (
                <span key={t} className={cn(tagClass(t), 'px-1 py-0.2 rounded text-[0.32rem] uppercase font-bold border')}>{t}</span>
              ))}
            </div>
          )}
          <div className="text-[0.35rem] text-slate-500 mt-1 italic">Click para cerrar</div>
        </div>
      </motion.div>
    );
  }

  // Rareza: clases de anillo estáticas (Tailwind JIT)
  const rarityRing: Record<string, string> = {
    common:    '',
    uncommon:  'ring-1 ring-emerald-400',
    rare:      'ring-1 ring-sky-400',
    epic:      'ring-2 ring-purple-400 glow-epic',
    legendary: 'ring-2 ring-amber-400 glow-pulse',
  };

  const brokenScore = estimateBrokenScore(card);
  const broken = brokenLabel(brokenScore);
  const hasFormula = !!card.formula;
  const hasEffects = !!(card.effects?.length);
  const displayValue = hasFormula || hasEffects
    ? (hasFormula ? '📐' : null)
    : (card.value !== 0 ? `${card.value > 0 ? '+' : ''}${card.value}` : null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: isSelected ? -14 : 0, scale: isSelected ? 1.07 : 1 }}
      whileHover={{ y: -7, scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onHoverStart={() => { void playCardSound(card, 'hover'); }}
      onDragStart={(e) => {
        if (!draggable) return;
        e.stopPropagation();
        onDragStart?.(e);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEnd?.(e);
      }}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      draggable={draggable}
      data-drag-card-id={draggable ? card.id : undefined}
      className={cn(
        dims[size],
        'rounded-xl border-2 flex flex-col p-1.5 shrink-0',
        'cursor-grab active:cursor-grabbing relative overflow-hidden',
        card.rarity && rarityRing[card.rarity],
      )}
      style={{
        ...cardStyle,
        // legacy bgGradient inline para retrocompatibilidad
        background: legacyBg
          ? undefined // Tailwind className override cuando hay legacy
          : cardStyle.background,
      }}
      title={card.description + (card.formula ? `\n📐 ${card.formula.expression}` : '')}
    >
      {brokenScore >= 3 && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 z-20 text-center font-black py-0.5 border-t',
            brokenScore >= 8 ? 'bg-red-600 text-white border-red-300 animate-pulse' :
            brokenScore >= 5 ? 'bg-orange-600 text-white border-orange-300' :
            'bg-amber-500 text-black border-amber-200'
          )}
          style={{ fontSize: '0.32rem' }}
          title={`Score de balance: ${brokenScore}`}
        >
          ⚠ {broken}
        </div>
      )}

      {/* Badge rareza */}
      {card.rarity === 'legendary' && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black px-1.5 py-0.5 rounded-bl-lg z-10" style={{ fontSize: '0.3rem' }}>⭐ LEG</div>
      )}
      {card.rarity === 'epic' && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-black px-1.5 py-0.5 rounded-bl-lg z-10" style={{ fontSize: '0.3rem' }}>💎 ÉPICA</div>
      )}
      {card.rarity === 'rare' && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-500 to-blue-500 text-white font-black px-1.5 py-0.5 rounded-bl-lg z-10" style={{ fontSize: '0.3rem' }}>🔹 RARA</div>
      )}

      {/* Badge INST */}
      {card.isInstant && (
        <div className="absolute top-0 left-0 bg-cyan-400 text-black font-black px-1 py-0.5 rounded-br-lg z-10" style={{ fontSize: '0.3rem' }}>INST</div>
      )}

      {/* Ilustración / icono */}
      <div className="relative mt-1 mb-1 rounded-lg overflow-hidden border border-white/10 bg-black/15 min-h-[2.8rem] flex items-center justify-center">
        {cardImage && !imageFailed ? (
          <img
            src={cardImage}
            alt={card.name}
            className="w-full h-12 object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="text-center leading-none text-xl drop-shadow-md py-2">{icon}</div>
        )}
        {cardImage && !imageFailed && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      {/* Nombre */}
      <div className="font-black text-white text-center leading-tight drop-shadow-md" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
        {card.name}
      </div>

      {/* Valor */}
      {displayValue !== null && (
        <div className={cn(
          'text-center font-black my-auto drop-shadow-md',
          hasFormula ? 'text-fuchsia-200' : card.value < 0 ? 'text-red-100' : 'text-green-100',
          size === 'sm' ? 'text-base' : 'text-2xl',
        )} style={{ textShadow: card.value < 0 ? '0 0 10px rgba(248,113,113,0.7)' : '0 0 10px rgba(74,222,128,0.7)' }}>
          {displayValue}
        </div>
      )}

      {/* Descripción */}
      <div className="text-white/90 text-center leading-tight mt-auto drop-shadow-md">
        {card.description}
      </div>

      {/* Footer: duración + tipo */}
      <div className="flex items-center justify-between mt-0.5">
        <div className="bg-black/40 text-white/70 px-1 rounded-md font-bold" style={{ fontSize: '0.33rem' }}>{label}</div>
        {card.duration > 0 && (
          <div className="bg-black/40 text-amber-300 px-1 rounded-md font-bold" style={{ fontSize: '0.33rem' }}>⏱{card.duration}t</div>
        )}
      </div>

      {/* Badge fórmula */}
      {hasFormula && (
        <div className="absolute bottom-4 right-0.5 bg-fuchsia-900/90 text-fuchsia-200 px-1 rounded-l" style={{ fontSize: '0.3rem' }} title={card.formula!.expression}>📐</div>
      )}

      {/* Badges de mecánicas */}
      <div className="absolute top-3 left-0 flex flex-col gap-0.5">
        {(card.targetMode === 'all_enemies' || card.targetMode === 'all_allies') && (
          <div className="bg-purple-600/90 text-white px-1 rounded-r font-black" style={{ fontSize: '0.3rem' }}>💥AOE</div>
        )}
        {card.effects?.some(e => e.kind === 'choice') && (
          <div className="bg-cyan-600/90 text-white px-1 rounded-r font-black" style={{ fontSize: '0.3rem' }}>🎲</div>
        )}
        {card.effects?.some(e => e.kind === 'skip_turn' || e.kind === 'extra_turn') && (
          <div className="bg-orange-600/90 text-white px-1 rounded-r font-black" style={{ fontSize: '0.3rem' }}>⏭</div>
        )}
        {card.effects?.some(e => e.kind === 'stack_effect') && (
          <div className="bg-pink-600/90 text-white px-1 rounded-r font-black" style={{ fontSize: '0.3rem' }}>📚</div>
        )}
        {card.ignoresDefense && (
          <div className="bg-red-700/90 text-white px-1 rounded-r font-black" style={{ fontSize: '0.3rem' }}>🗡️</div>
        )}
        {card.tags?.includes('cementerio') && (
          <div className="bg-fuchsia-800/90 text-white px-1 rounded-r font-black" style={{ fontSize: '0.3rem' }}>🪦</div>
        )}
      </div>
    </motion.div>
  );
};

const CardBack: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, rotateY: -180, scale: 0.5 }}
    animate={{ opacity: 1, rotateY: 0, scale: 1 }}
    transition={{ delay: index * 0.08, duration: 0.4, type: 'spring' }}
    whileHover={{ y: -3, rotateZ: 2 }}
    className="w-[3.5rem] h-[5rem] rounded-lg border-2 border-amber-700/60 bg-gradient-to-br from-amber-900 via-amber-950 to-slate-900 flex items-center justify-center shadow-lg shrink-0 relative overflow-hidden"
  >
    <div className="absolute inset-0 opacity-30">
      <div className="absolute top-1 left-1 right-1 bottom-1 border border-amber-600/30 rounded" />
    </div>
    <motion.div animate={{ rotateY: [0, 360] }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }} className="text-2xl opacity-70 relative z-10">🂠</motion.div>
  </motion.div>
);

interface PlayerPanelProps {
  player: any;
  isMe: boolean;
  isAlly: boolean;
  isTarget: boolean;
  onSelect: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isDragOver: boolean;
  canSeeHand: boolean;
  playedCards: PlayableCard[];
  hasPreparedCards: boolean;
  compactMode?: boolean;
}

const EFFECT_ICONS: Record<string, string> = {
  silenced: '🤐', stunned: '😵', invisible: '👻',
  damage_multiplier: '⚡', reflect: '🪞', trampa: '⚠️',
  frozen: '❄️', marked: '🎯', bonus_dmg: '💪',
};
function effectSummary(e: any): string {
  const total = (Number(e.value || 0) * Number(e.stacks || 1));
  const stackMode = e.stackMode || (
    e.isStackable && (e.timing === 'start_of_turn' || e.timing === 'end_of_turn')
      ? 'combine_value_duration'
      : undefined
  );
  const parts = [
    e.name,
    e.description,
    total !== 0 ? `valor/tick: ${total}` : null,
    e.duration !== undefined ? `duración: ${e.duration} turno(s)` : null,
    e.stacks && e.stacks > 1 ? `stacks: ${e.stacks}` : null,
    e.ignoresDefense ? 'ignora defensa' : null,
    e.specialRules ? `regla: ${e.specialRules}` : null,
    stackMode ? `acumulación: ${stackMode}` : null,
    e.tags?.length ? `tags: ${e.tags.join(', ')}` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}


function CombatIntentPanel({ store }: { store: any }) {
  const players = store.players || [];
  const cp = players[store.currentPlayerIndex];

  const selectedCardIds: string[] = store.selectedCardIds || [];
  const selectedTargetId: string | null = store.selectedTargetId || null;

  const selectedCards = selectedCardIds
    .map(id => cp?.hand?.find((c: any) => c.id === id))
    .filter(Boolean);

  const selectedTarget = selectedTargetId
    ? players.find((p: any) => p.id === selectedTargetId)
    : null;

  const pendingActions = store.pendingActions || [];

  const pendingSummary = pendingActions.map((a: any, i: number) => {
    const actorId =
      a.sourcePlayerId ||
      a.attackerId ||
      a.playerId ||
      a.ownerId ||
      cp?.id;

    const targetId =
      a.targetId ||
      a.defenderId ||
      a.victimId ||
      a.receiverId;

    const actor = players.find((p: any) => p.id === actorId);
    const target = players.find((p: any) => p.id === targetId);

    const cards =
      a.cards?.map((c: any) => c.name).filter(Boolean) ||
      a.cardNames ||
      (a.cardName ? [a.cardName] : []);

    const normal =
      a.normalDamage !== undefined
        ? Number(a.normalDamage || 0)
        : Math.max(0, Number(a.rawDamage || 0) - Number(a.ignoreDefenseDamage || 0));

    const pierce = Number(a.ignoreDefenseDamage || 0);
    const heal = Number(a.rawHeal || 0);
    const net = Number(a.netDamage ?? normal + pierce);

    return {
      key: i,
      actorName: actor?.name || actorId || 'Atacante',
      targetName: target?.name || targetId || 'Objetivo',
      cards,
      normal,
      pierce,
      heal,
      net,
      kind: a.kind || a.type || 'acción',
    };
  });

  const hasPreparation = selectedCards.length > 0 || selectedTarget;
  const hasPending = pendingSummary.length > 0;

  if (!hasPreparation && !hasPending) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasPreparation && (
        <span
          className="text-[0.7rem] bg-fuchsia-950/70 text-fuchsia-200 border border-fuchsia-600/50 px-2 py-0.5 rounded-full font-bold"
          title={[
            cp ? `Actor: ${cp.name}` : null,
            selectedTarget ? `Objetivo: ${selectedTarget.name}` : 'Sin objetivo',
            selectedCards.length ? `Cartas: ${selectedCards.map((c: any) => c.name).join(', ')}` : null,
          ].filter(Boolean).join(' · ')}
        >
          🎯 Preparando: {cp?.name || 'Jugador'} → {selectedTarget?.name || 'elige objetivo'}
          {selectedCards.length ? ` · ${selectedCards.length} carta(s)` : ''}
        </span>
      )}

      {hasPending && pendingSummary.slice(0, 3).map((a: any) => (
        <span
          key={a.key}
          className="text-[0.7rem] bg-slate-950/80 text-amber-200 border border-amber-600/50 px-2 py-0.5 rounded-full font-bold"
          title={[
            `Actor: ${a.actorName}`,
            `Objetivo: ${a.targetName}`,
            a.cards.length ? `Cartas: ${a.cards.join(', ')}` : null,
            a.normal ? `Daño normal: ${a.normal}` : null,
            a.pierce ? `Ignora defensa: ${a.pierce}` : null,
            a.heal ? `Cura: ${a.heal}` : null,
            a.net ? `Final estimado: ${a.net}` : null,
          ].filter(Boolean).join(' · ')}
        >
          ⚔ {a.actorName} → {a.targetName}
          {a.normal ? ` · ${a.normal} normal` : ''}
          {a.pierce ? ` · ${a.pierce} perforante` : ''}
          {a.heal ? ` · ${a.heal} cura` : ''}
          {a.net ? ` · final ~${a.net}` : ''}
        </span>
      ))}

      {pendingSummary.length > 3 && (
        <span className="text-[0.7rem] bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
          +{pendingSummary.length - 3} acción(es)
        </span>
      )}
    </div>
  );
}

function ResolutionMiniPanel({ store }: { store: any }) {
  const actions = store.pendingActions || [];
  if (!actions.length) return null;

  const sum = (fn: (a: any) => number) =>
    actions.reduce((acc: number, a: any) => acc + Number(fn(a) || 0), 0);

  const normal = sum((a: any) =>
    a.normalDamage !== undefined
      ? a.normalDamage
      : Math.max(0, Number(a.rawDamage || 0) - Number(a.ignoreDefenseDamage || 0))
  );

  const pierce = sum((a: any) => a.ignoreDefenseDamage || 0);
  const heal = sum((a: any) => a.rawHeal || 0);
  const net = sum((a: any) => a.netDamage ?? ((a.normalDamage || 0) + (a.ignoreDefenseDamage || 0)));

  const hasPierce = pierce > 0;
  const hasHeal = heal > 0;

  return (
    <span
      className="text-[0.7rem] bg-indigo-950/70 text-indigo-200 border border-indigo-600/40 px-2 py-0.5 rounded-full font-bold"
      title={`Acciones: ${actions.length} · Daño normal: ${normal} · Ignora defensa: ${pierce} · Cura: ${heal} · Final estimado: ${net}`}
    >
      ⚙ Resolución: {actions.length} acción(es) · {normal} normal
      {hasPierce ? ` · ${pierce} perforante` : ''}
      {hasHeal ? ` · ${heal} cura` : ''}
      {net > 0 ? ` · final ~${net}` : ''}
    </span>
  );
}

function effectIcon(name: string, rule?: string): string {
  if (rule && EFFECT_ICONS[rule]) return EFFECT_ICONS[rule];
  const n = name.toLowerCase();
  if (n.includes('veneno')) return '☠️';
  if (n.includes('sangr')) return '🩸';
  if (n.includes('fuego') || n.includes('quem')) return '🔥';
  if (n.includes('regen')) return '🌿';
  if (n.includes('escud') || n.includes('def')) return '🛡️';
  if (n.includes('mald')) return '👿';
  return '✨';
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player, isMe, isAlly, isTarget, onSelect,
  onDrop, onDragOver, onDragLeave, isDragOver,
  canSeeHand, playedCards, compactMode,
}) => {
  const visualConfig = useGameStore(s => s.visualConfig);
  const allChars = getAllCharactersWithSource();
  const char = allChars.find(c => c.id === player.characterId);
  const charImage = char ? getCharacterFrontImage(char) : null;
  const hpPct = Math.max(0, (player.currentHp / player.maxHp) * 100);
  const hpColor = hpPct > 60 ? 'bg-green-500' : hpPct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const [showAbilities, setShowAbilities] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const prevHpRef = React.useRef(player.currentHp);
  const [shake, setShake] = React.useState(false);
  const [damagePopup, setDamagePopup] = React.useState<number | null>(null);
  const [healPopup, setHealPopup] = React.useState<number | null>(null);

  React.useEffect(() => {
    const diff = player.currentHp - prevHpRef.current;
    if (diff < 0) {
      if (visualConfig.enableAnimations) setShake(true);
      setDamagePopup(Math.abs(diff));
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setDamagePopup(null), 1500);
    } else if (diff > 0) {
      setHealPopup(diff);
      setTimeout(() => setHealPopup(null), 1500);
    }
    prevHpRef.current = player.currentHp;
  }, [player.currentHp, visualConfig.enableAnimations]);

  const buffs = player.activeEffects.filter((e: any) =>
    e.specialRules === 'damage_multiplier' || e.specialRules === 'invisible' ||
    e.specialRules === 'reflect' || e.specialRules === 'trampa' ||
    e.specialRules === 'bonus_dmg' || e.value > 0
  );
  const debuffs = player.activeEffects.filter((e: any) =>
    e.specialRules === 'silenced' || e.specialRules === 'stunned' ||
    e.specialRules === 'frozen' || e.specialRules === 'marked' ||
    (e.value < 0 && !e.specialRules)
  );

  return (
    <div
      data-player-id={player.id}
      className={cn(
        'cargas-player-card-polish border-2 transition-all duration-150 overflow-visible relative flex flex-col animate-cargas-impact-pop',
        visualConfig.borderRadius,
        'bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-sm',
        isMe && 'cargas-player-current border-amber-500 shadow-lg shadow-amber-500/15',
        isTarget && !isMe && 'cargas-player-target animate-cargas-target-breath border-red-500 shadow-lg shadow-red-500/20 ring-1 ring-red-400/40',
        isDragOver && 'cargas-player-dragover border-yellow-400 shadow-xl shadow-yellow-400/30 ring-2 ring-yellow-400/50',
        isAlly && !isMe && !isTarget && !isDragOver && 'border-green-700/50',
        !isMe && !isTarget && !isDragOver && !isAlly && 'border-slate-700',
        !player.isAlive && 'opacity-25 grayscale pointer-events-none'
      )}
      style={{ opacity: visualConfig.panelOpacity, transform: visualConfig.panelScale !== 1 ? `scale(${visualConfig.panelScale})` : undefined, transformOrigin: 'top center' }}
    >
      <AnimatePresence>
        {damagePopup !== null && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: [1, 1, 0], y: [0, -30, -60], scale: [0.5, 1.5, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 cargas-float-damage font-black text-3xl pointer-events-none z-30 drop-shadow-lg"
          >-{damagePopup}</motion.div>
        )}
        {healPopup !== null && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: [1, 1, 0], y: [0, -30, -60], scale: [0.5, 1.5, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 cargas-float-heal font-black text-3xl pointer-events-none z-30 drop-shadow-lg"
          >+{healPopup}</motion.div>
        )}
      </AnimatePresence>

      <div className="h-1.5 bg-slate-900/80 rounded-t-xl overflow-hidden">
        <motion.div className={cn('h-full', hpColor)} animate={{ width: `${hpPct}%` }} transition={{ duration: 0.35 }} />
      </div>

      <motion.div
        animate={shake ? { x: [-4, 4, -4, 4, 0], rotate: [-1, 1, -1, 1, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={cn('flex-1 p-2 cursor-pointer relative', shake && 'bg-red-500/10')}
        onClick={onSelect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 border overflow-hidden bg-slate-900/30"
            style={{ backgroundColor: `${char?.color}20`, borderColor: `${char?.color}60` }}>
            {charImage ? (
              <img src={charImage} alt={char?.name || 'char'} className="w-full h-full object-cover" />
            ) : (
              <>{char?.avatar || '?'}</>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.6rem] font-bold text-white truncate">
              {player.name}{player.control === 'bot' && <span className="text-purple-400 ml-0.5">🤖</span>}
            </div>
            <div className="text-[0.5rem] text-slate-400 truncate">{char?.name}</div>
          </div>
          {player.teamId && (
            <div className="text-[0.4rem] font-black bg-slate-700 text-slate-300 px-1 rounded shrink-0">{player.teamId}</div>
          )}
        </div>

        <div className="mb-1">
          <div className="flex justify-between items-center text-[0.5rem] mb-0.5">
            <span className="text-red-400">❤ HP</span>
            <span className={cn('font-bold', hpPct <= 30 && 'text-red-400')}>{player.currentHp}/{player.maxHp}</span>
          </div>
          <div className="h-2 bg-slate-700/80 rounded-full overflow-hidden">
            <motion.div className={cn('h-full rounded-full', hpColor)} animate={{ width: `${hpPct}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0.5 mb-1 text-[0.5rem]">
          <div className="bg-blue-950/50 rounded px-1 py-0.5 flex items-center justify-between">
            <span className="text-blue-400">🛡</span><span className="text-white font-bold">{player.currentDefense}</span>
          </div>
          <div className="bg-orange-950/50 rounded px-1 py-0.5 flex items-center justify-between">
            <span className="text-orange-400">⚔</span><span className="text-white font-bold">{player.baseDamage}</span>
          </div>
        </div>

        {!compactMode && (buffs.length > 0 || debuffs.length > 0) && (
          <div className="mb-1 space-y-0.5">
            {buffs.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {buffs.slice(0, 3).map((e: any) => (
                  <motion.span key={e.id} initial={{ scale: 0 }} animate={{ scale: 1 }}
                    title={effectSummary(e)}
                    className="text-[0.4rem] bg-green-950/80 text-green-300 px-1 py-0.5 rounded border border-green-700/50 flex items-center gap-0.5">
                    <span>{effectIcon(e.name, e.specialRules)}</span>
                    <span>{e.value !== 0 ? `${e.value * (e.stacks || 1)}/t` : `${e.duration}t`}</span>
                    {e.duration > 1 && <span className="opacity-70">·{e.duration}t</span>}
                  </motion.span>
                ))}
                {buffs.length > 3 && <span className="text-[0.4rem] text-green-500">+{buffs.length - 3}</span>}
              </div>
            )}
            {debuffs.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {debuffs.slice(0, 3).map((e: any) => (
                  <motion.span key={e.id} initial={{ scale: 0 }} animate={{ scale: 1 }}
                    title={effectSummary(e)}
                    className="cargas-effect-token text-[0.4rem] bg-red-950/80 text-red-300 px-1 py-0.5 rounded border border-red-700/50 flex items-center gap-0.5 animate-pulse">
                    <span>{effectIcon(e.name, e.specialRules)}</span><span>{e.duration}t</span>
                  </motion.span>
                ))}
                {debuffs.length > 3 && <span className="text-[0.4rem] text-red-500">+{debuffs.length - 3}</span>}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 text-[0.45rem] text-slate-500">
          <span>🃏 {player.hand.length} cartas</span>
          {playedCards.length > 0 && <span className="text-amber-600">· {playedCards.length} jugada{playedCards.length > 1 ? 's' : ''}</span>}
        </div>

        {playedCards.length > 0 && (
          <div className="flex gap-0.5 mt-1 flex-wrap">
            {playedCards.map((_, i) => (<CardBack key={i} index={i} />))}
          </div>
        )}

        {canSeeHand && player.hand.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-700/50">
            <div className="text-[0.45rem] text-amber-500/80 mb-1 font-bold uppercase tracking-wider">
              {isMe ? '🃏 Tu mano:' : isAlly ? '🤝 Mano aliado:' : '👁️ Mano revelada:'}
            </div>
            <div className="flex flex-wrap gap-0.5">
              {player.hand.map((card: PlayableCard) => (
                <div key={card.id} className="bg-slate-800/80 rounded p-1 border border-slate-600/60 min-w-[3.5rem] max-w-[6rem]">
                  <div className="text-amber-200 font-bold leading-tight" style={{ fontSize: '0.5rem' }}>{card.name}</div>
                  <div className="text-slate-200 leading-tight" style={{ fontSize: '0.44rem' }}>{card.description}</div>
                  {card.isInstant && <div className="text-cyan-300 font-bold" style={{ fontSize: '0.4rem' }}>INST</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!compactMode && (
          <button onClick={e => { e.stopPropagation(); setShowAbilities(x => !x); }}
            className={cn('mt-1 w-full text-[0.45rem] font-bold uppercase tracking-wider rounded px-1 py-0.5 transition-all',
              showAbilities ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800/50')}>
            {showAbilities ? '▲ Ocultar' : `⚡ ${char?.abilities?.length ?? 0} Habilidades`}
          </button>
        )}

        <AnimatePresence>
          {showAbilities && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-1 space-y-0.5 overflow-hidden">
              {char?.abilities?.map((ab, i) => {
                const pCd = player.abilityCooldowns?.[ab.id] || 0;
                return (
                <motion.div key={ab.id} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className={cn('p-1 rounded border text-[0.42rem] leading-tight relative overflow-hidden',
                    ab.isTeamAbility ? 'bg-green-950/40 border-green-800/30 text-green-200' : 'bg-blue-950/40 border-blue-800/30 text-blue-200',
                    pCd === 0 && 'ring-1 ring-amber-500/20')}>
                  {pCd > 0 && (
                    <div className="absolute inset-0 bg-slate-900/40 pointer-events-none">
                      <div className="h-full bg-red-900/30" style={{ width: `${(pCd / ab.cooldown) * 100}%` }} />
                    </div>
                  )}
                  <div className="relative flex items-center justify-between">
                    <span className="font-bold">{ab.isTeamAbility ? '👥' : '⚡'} {ab.name}</span>
                    {pCd > 0 ? (
                      <span className="font-bold text-red-400 text-[0.4rem]">⏳ {pCd}/{ab.cooldown}</span>
                    ) : (
                      <span className="font-bold text-green-400">✓ LISTA</span>
                    )}
                  </div>
                  <div className="relative text-slate-400 mt-0.5">{ab.description}</div>
                </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-1 pt-0.5 border-t border-slate-700/30 flex items-center gap-1 flex-wrap">
          {isMe && <span className="text-[0.4rem] bg-amber-500/20 text-amber-300 px-1 rounded-full border border-amber-600/50 font-bold">▶ TURNO</span>}
          {player.control === 'bot' && (
            <span className="text-[0.4rem] bg-purple-900/40 text-purple-300 px-1 rounded-full border border-purple-700/50">
              🤖 {player.botDifficulty === 'hard' ? 'Difícil' : player.botDifficulty === 'easy' ? 'Fácil' : 'Normal'}
            </span>
          )}
          {player.isAlive && player.currentHp < player.maxHp * 0.2 && (
            <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
              className="text-[0.4rem] bg-red-900/60 text-red-300 px-1 rounded-full border border-red-700/50 font-bold">💀 CRÍTICO</motion.span>
          )}
        </div>

        {!compactMode && (
          <div className="mt-0.5 pt-0.5 border-t border-slate-700/30 space-y-0.5">
            <div className="text-[0.4rem] text-amber-400/90 italic leading-tight line-clamp-1" title={char?.passiveDescription}>
              {char?.passiveDescription}
            </div>
            {char?.teamPassiveDescription && (
              <div className="text-[0.4rem] text-green-400/80 italic leading-tight line-clamp-1" title={char.teamPassiveDescription}>
                {char.teamPassiveDescription}
              </div>
            )}

            {char?.passives?.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {char.passives.slice(0, 3).map((p: any) => (
                  <span
                    key={p.id || p.name}
                    title={p.description}
                    className="text-[0.35rem] bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-700/40 px-1 rounded-full"
                  >
                    🧠 {p.name}
                  </span>
                ))}
                {char.passives.length > 3 && (
                  <span className="text-[0.35rem] text-fuchsia-400">+{char.passives.length - 3}</span>
                )}
              </div>
            )}

            {char?.teamPassives?.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {char.teamPassives.slice(0, 2).map((p: any) => (
                  <span
                    key={p.id || p.name}
                    title={p.description}
                    className="text-[0.35rem] bg-emerald-950/60 text-emerald-300 border border-emerald-700/40 px-1 rounded-full"
                  >
                    👥 {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {!compactMode && player.stats && (
          <div className="mt-1 pt-1 border-t border-slate-700/30">
            <button onClick={e => { e.stopPropagation(); setShowStats(x => !x); }}
              className="w-full text-[0.4rem] text-slate-500 hover:text-amber-400 transition-colors">
              {showStats ? '▲ Ocultar stats' : '📊 Ver stats'}
            </button>
            <AnimatePresence>
              {showStats && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-0.5 text-[0.4rem] mt-1">
                    <div className="bg-red-950/50 px-1 py-0.5 rounded flex justify-between"><span className="text-red-400">⚔ Daño</span><span className="text-white font-bold">{player.stats.damageDealt}</span></div>
                    <div className="bg-orange-950/50 px-1 py-0.5 rounded flex justify-between"><span className="text-orange-400">💥 Recib</span><span className="text-white font-bold">{player.stats.damageReceived}</span></div>
                    <div className="bg-green-950/50 px-1 py-0.5 rounded flex justify-between"><span className="text-green-400">💚 Cura</span><span className="text-white font-bold">{player.stats.healDone}</span></div>
                    <div className="bg-rose-950/50 px-1 py-0.5 rounded flex justify-between"><span className="text-rose-400">💀 Kills</span><span className="text-white font-bold">{player.stats.kills}</span></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {isAlly && !isMe && (
        <div className="absolute -top-2 -left-2 bg-green-600 text-white text-[0.38rem] font-black px-1 py-0.5 rounded-full shadow z-10">ALIADO</div>
      )}
    </div>
  );
};

interface Toast { id: number; msg: string; type: string; }
const ToastSystem: React.FC = () => {
  const logs = useGameStore(s => s.gameLog);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLenRef = useRef(logs.length);

  useEffect(() => {
    if (logs.length < prevLenRef.current) {
      prevLenRef.current = logs.length;
      return;
    }
    if (logs.length <= prevLenRef.current) { prevLenRef.current = logs.length; return; }
    const newEntries = logs.slice(prevLenRef.current);
    prevLenRef.current = logs.length;
    newEntries.forEach((entry: any) => {
      if (!['crit', 'kill', 'combo', 'defense', 'instant', 'damage', 'heal', 'ability', 'buff', 'debuff', 'dot'].includes(entry.type)) return;
      const toast: Toast = { id: Date.now() + Math.random(), msg: entry.message, type: entry.type };
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    });
  }, [logs]);

  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none max-w-[min(22rem,calc(100vw-2rem))]">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 200, scale: 0.5 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 200, scale: 0.5 }}
            transition={{ type: 'spring', damping: 20 }}
            className={cn('px-4 py-2 rounded-xl shadow-2xl border-2 max-w-xs backdrop-blur-md',
              t.type === 'crit' && 'bg-gradient-to-r from-orange-900 to-red-900 border-orange-500 text-orange-200',
              t.type === 'kill' && 'bg-gradient-to-r from-rose-900 to-red-900 border-rose-500 text-rose-200',
              t.type === 'combo' && 'bg-gradient-to-r from-purple-900 to-pink-900 border-purple-500 text-purple-200',
              t.type === 'defense' && 'bg-gradient-to-r from-blue-900 to-cyan-900 border-blue-500 text-blue-200',
              t.type === 'instant' && 'bg-gradient-to-r from-cyan-900 to-teal-900 border-cyan-500 text-cyan-200',
              t.type === 'damage' && 'bg-gradient-to-r from-red-950 to-rose-900 border-red-500 text-red-100',
              t.type === 'heal' && 'bg-gradient-to-r from-green-950 to-emerald-900 border-green-500 text-green-100',
              t.type === 'ability' && 'bg-gradient-to-r from-indigo-950 to-blue-900 border-indigo-500 text-indigo-100',
              t.type === 'buff' && 'bg-gradient-to-r from-amber-950 to-yellow-900 border-yellow-500 text-yellow-100',
              t.type === 'debuff' && 'bg-gradient-to-r from-pink-950 to-rose-900 border-pink-500 text-pink-100',
              t.type === 'dot' && 'bg-gradient-to-r from-orange-950 to-red-900 border-orange-500 text-orange-100')}>
            <div className="text-sm font-black">{t.msg}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};


function battleFxTone(type: string, message: string): string {
  const msg = String(message || '').toLowerCase();

  if (msg.includes('🔒') || msg.includes('pasiva')) return 'passive';
  if (type === 'damage' || type === 'crit' || type === 'kill') return 'damage';
  if (type === 'heal') return 'heal';
  if (type === 'defense' || msg.includes('def')) return 'defense';
  if (type === 'ability' || type === 'instant') return 'ability';
  if (type === 'buff' || type === 'combo') return 'special';
  if (type === 'debuff') return 'debuff';
  if (type === 'dot') return 'dot';

  return 'special';
}

function battleFxIcon(type: string, message: string): string {
  const msg = String(message || '').toLowerCase();

  if (msg.includes('🔒') || msg.includes('pasiva')) return '🔒';
  if (type === 'kill') return '☠️';
  if (type === 'crit') return '🔥';
  if (type === 'combo') return '🌈';
  if (type === 'damage') return '💥';
  if (type === 'heal') return '💚';
  if (type === 'defense') return '🛡️';
  if (type === 'ability') return '⚡';
  if (type === 'buff') return '✨';
  if (type === 'debuff') return '🧿';
  if (type === 'dot') return '☣️';
  if (type === 'instant') return '⚡';

  return '✨';
}

function battleFxTitle(type: string, message: string): string {
  const msg = String(message || '').toLowerCase();

  if (msg.includes('🔒') || msg.includes('pasiva')) return 'Pasiva activada';
  if (type === 'kill') return 'Eliminación';
  if (type === 'crit') return 'Crítico';
  if (type === 'combo') return 'Combo';
  if (type === 'damage') return 'Daño';
  if (type === 'heal') return 'Curación';
  if (type === 'defense') return 'Defensa';
  if (type === 'ability') return 'Habilidad';
  if (type === 'buff') return 'Mejora';
  if (type === 'debuff') return 'Debuff';
  if (type === 'dot') return 'Daño por turno';
  if (type === 'instant') return 'Instantánea';

  return 'Evento';
}

function shortBattleFxMessage(message: string): string {
  const clean = String(message || '').replace(/\s+/g, ' ').trim();
  return clean.length > 92 ? `${clean.slice(0, 89)}…` : clean;
}

function BattleEventOverlay() {
  const logs = useGameStore(s => s.gameLog);
  const [events, setEvents] = React.useState<Array<{ id: number; message: string; type: string; tone: string; icon: string; title: string }>>([]);
  const prevLenRef = React.useRef(logs.length);

  React.useEffect(() => {
    if (logs.length < prevLenRef.current) {
      prevLenRef.current = logs.length;
      return;
    }

    if (logs.length <= prevLenRef.current) {
      prevLenRef.current = logs.length;
      return;
    }

    const eventTypes = ['crit', 'kill', 'combo', 'defense', 'instant', 'damage', 'heal', 'ability', 'buff', 'debuff', 'dot'];
    const newEntries = logs.slice(prevLenRef.current);
    prevLenRef.current = logs.length;

    const fx = newEntries
      .filter((entry: any) => eventTypes.includes(entry.type))
      .slice(-3)
      .map((entry: any, index: number) => {
        const id = Date.now() + Math.random() + index;
        const tone = battleFxTone(entry.type, entry.message);

        return {
          id,
          message: shortBattleFxMessage(entry.message),
          type: entry.type,
          tone,
          icon: battleFxIcon(entry.type, entry.message),
          title: battleFxTitle(entry.type, entry.message),
        };
      });

    if (!fx.length) return;

    setEvents(prev => [...prev.slice(-3), ...fx].slice(-5));

    fx.forEach(ev => {
      setTimeout(() => {
        setEvents(prev => prev.filter(x => x.id !== ev.id));
      }, 1550);
    });
  }, [logs]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[45] overflow-hidden">
      <AnimatePresence>
        {events.map((ev, i) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, scale: 0.72, y: 28, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.84, y: -24, rotate: 2 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            className={cn('cargas-battle-fx', `cargas-battle-fx-${ev.tone}`)}
            style={{
              left: `${12 + ((i * 17) % 58)}%`,
              top: `${18 + ((i * 13) % 42)}%`,
            }}
          >
            <span className="cargas-battle-fx-spark" />
            <span className="cargas-battle-fx-spark" />
            <span className="cargas-battle-fx-spark" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="cargas-battle-fx-icon">{ev.icon}</div>
              <div className="min-w-0">
                <div className="cargas-battle-fx-title">{ev.title}</div>
                <div className="cargas-battle-fx-msg truncate">{ev.message}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface GameBoardProps {

  onMultiplayer?: () => void;
  onHome?: () => void;
  forceLocalSetupKey?: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({ onMultiplayer, onHome, forceLocalSetupKey }) => {
  const store = useGameStore();
  // FIX LOCAL PLAY: al entrar desde Home/Jugar local, forzar setup visible
  React.useEffect(() => {
    if (forceLocalSetupKey === undefined) return;

    try {
      useGameStore.setState((state: any) => ({
        ...state,
        phase: 'setup',
        players: [],
        winner: null,
        selectedCardIds: [],
        selectedTargetId: null,
        pendingActions: [],
        defensePhase: undefined,
        resolutionPreview: undefined,
        isResolvingEndTurn: false,
      }));
    } catch (err) {
      console.error('[CARGAS] No se pudo forzar setup local', err);
    }
  }, [forceLocalSetupKey]);

  const visualConfig = store.visualConfig;
  const [dragCard, setDragCard] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [manualDrag, setManualDrag] = useState<{ cardId: string; x: number; y: number } | null>(null);
  const [tab, setTab] = useState<'hand' | 'abilities'>('hand');
  const [showLog, setShowLog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCompactMode, setShowCompactMode] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const phase = store.phase;
  const isSetup = phase === 'setup';
  const isDefending = phase === 'defending';
  const isGameOver = phase === 'gameOver';
  const cp = store.players[store.currentPlayerIndex];

  const net = useNetworkStore();
  const isNetworkSessionActive = net.mode === 'host' || net.mode === 'client';
  const localNetworkIndex = isNetworkSessionActive
    ? net.roomInfo?.players?.findIndex((p: any) => p.id === net.localPlayerId) ?? -1
    : -1;

  const localGamePlayer =
    isNetworkSessionActive
      ? (
          store.players.find((p: any) => p.networkPlayerId === net.localPlayerId) ||
          (localNetworkIndex >= 0 ? store.players[localNetworkIndex] : null)
        )
      : null;

  const isLocalNetworkTurn =
    !isNetworkSessionActive ||
    !localGamePlayer ||
    cp?.id === localGamePlayer.id;
  const canControlCurrentPlayer = cp?.control === 'human' && isLocalNetworkTurn;

  if (typeof window !== 'undefined') {
    (window as any).__CARGAS_DEBUG_NETWORK = () => ({
      mode: net.mode,
      localPlayerId: net.localPlayerId,
      roomId: net.roomId,
      roomPlayers: net.roomInfo?.players?.map((p: any, i: number) => ({
        index: i,
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isReady: p.isReady,
      })),
      localNetworkIndex,
      localGamePlayer: localGamePlayer ? {
        id: localGamePlayer.id,
        name: localGamePlayer.name,
        characterId: localGamePlayer.characterId,
        control: localGamePlayer.control,
        networkPlayerId: (localGamePlayer as any).networkPlayerId,
      } : null,
      currentGamePlayer: cp ? {
        id: cp.id,
        name: cp.name,
        characterId: cp.characterId,
        control: cp.control,
        networkPlayerId: (cp as any).networkPlayerId,
      } : null,
      isLocalNetworkTurn,
      canControlCurrentPlayer,
      defenseOwnerId,
      isLocalDefenseResolution,
    });

    (window as any).__CARGAS_DEBUG_GAME = () => ({
      phase: store.phase,
      currentPlayerIndex: store.currentPlayerIndex,
      isResolvingEndTurn: (store as any).isResolvingEndTurn,
      defensePhase: (store as any).defensePhase,
      resolutionPreview: (store as any).resolutionPreview,
      pendingActions: (store as any).pendingActions,
      players: store.players.map((p: any, i: number) => ({
        index: i,
        id: p.id,
        name: p.name,
        characterId: p.characterId,
        control: p.control,
        networkPlayerId: p.networkPlayerId,
        isAlive: p.isAlive,
      })),
    });
  }

  const defenseOwnerId =
    (store as any).defensePhase?.defenderId ||
    (store as any).resolutionPreview?.targetId ||
    ((store as any).isResolvingEndTurn ? (store as any).pendingActions?.[0]?.targetId : null);

  const isLocalDefenseResolution =
    !isNetworkSessionActive ||
    !defenseOwnerId ||
    !localGamePlayer ||
    defenseOwnerId === localGamePlayer.id;

  const defenseOwner = defenseOwnerId
    ? store.players.find((p: any) => p.id === defenseOwnerId)
    : null;
  const allChars = getAllCharactersWithSource();
  const cpChar = allChars.find(c => c.id === cp?.characterId);

  const selectedBaseCardIds = store.selectedCardIds
    .map(id => cp?.hand?.find((c: any) => c.id === id))
    .filter(Boolean)
    .map((c: any) => String(c.id).split('__')[0]);

  const selectedComboPreview = selectedBaseCardIds.length >= 2
    ? getAllCombos().filter((combo: any) =>
        combo.requiredCards?.every((id: string) => selectedBaseCardIds.includes(id))
      )
    : [];
  const isBotTurn = cp?.control === 'bot' && cp?.isAlive;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [store.gameLog.length]);

  // manual drag pointer listeners
  useEffect(() => {
    if (!manualDrag) return;

    const onMove = (e: PointerEvent) => {
      setManualDrag(d => d ? { ...d, x: e.clientX, y: e.clientY } : d);

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const target = el?.closest?.('[data-player-id]') as HTMLElement | null;
      setDragOver(target?.dataset?.playerId || null);
    };

    const onUp = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const target = el?.closest?.('[data-player-id]') as HTMLElement | null;
      const playerId = target?.dataset?.playerId || null;

      if (playerId) {
        playDraggedCardOn(manualDrag.cardId, playerId);
      } else {
        setDragCard(null);
        setDragOver(null);
      }

      setManualDrag(null);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [manualDrag, canControlCurrentPlayer, cp?.id, cp?.hand]);

  useEffect(() => {
    if (isBotTurn && !isGameOver && phase === 'playing') {
      const t = setTimeout(() => store.executeBotTurn(), 700);
      return () => clearTimeout(t);
    }
  }, [isBotTurn, isGameOver, phase, store.currentPlayerIndex]);

  if (isSetup) return <GameSetupModal onMultiplayer={onMultiplayer} />;

  if (!cp) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-amber-400 animate-pulse text-lg">Cargando partida...</div>
    </div>
  );

  function canSeeHand(playerId: string): boolean {
    if (playerId === cp.id) return true;
    if (!store.rules.fogOfWar) return true;
    if (store.gameMode === 'teams') {
      const p = store.players.find(x => x.id === playerId);
      if (p?.teamId === cp.teamId) return true;
    }
    if (store.revealedHands.has(playerId)) return true;
    return false;
  }

  function isAlly(playerId: string): boolean {
    if (playerId === cp.id) return false;
    if (store.gameMode === 'teams') {
      const p = store.players.find(x => x.id === playerId);
      return p?.teamId === cp.teamId;
    }
    return false;
  }

  const playDraggedCardOn = (cardId: string | null, playerId: string) => {
    if (!cardId || !canControlCurrentPlayer) {
      setDragCard(null);
      setDragOver(null);
      return;
    }

    const card = cp.hand.find(c => c.id === cardId);
    if (!card) {
      setDragCard(null);
      setDragOver(null);
      return;
    }

    const isSelf = playerId === cp.id;
    const selfOk = card.targetMode === 'self' || card.targetMode === 'ally_or_self' || card.targetMode === 'any';

    if (isSelf && !selfOk) {
      setDragCard(null);
      setDragOver(null);
      return;
    }

    if (!isSelf && card.targetMode === 'self') {
      setDragCard(null);
      setDragOver(null);
      return;
    }

    store.prepareAction([cardId], playerId);
    setDragCard(null);
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, playerId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedCardId =
      dragCard ||
      e.dataTransfer.getData('application/x-cargas-card') ||
      e.dataTransfer.getData('text/plain');

    playDraggedCardOn(droppedCardId, playerId);
  };

  const canTargetSelf = store.selectedCardIds.some(cid => {
    const c = cp.hand.find(x => x.id === cid);
    return c && (c.targetMode === 'self' || c.targetMode === 'ally_or_self' || c.targetMode === 'any');
  });

  const handleCardClick = (cardId: string) => {
    if (!canControlCurrentPlayer) return;
    if (store.selectedCardIds.includes(cardId)) store.deselectCard(cardId);
    else {
      const max = store.maxCardsPerTurn - store.cardsPlayedThisTurn;
      if (store.selectedCardIds.length < max) store.selectCard(cardId);
    }
  };

  const handlePlaySelected = () => {
    // Si todas las cartas seleccionadas son multi-target (all_enemies/all_allies),
    // no es necesario seleccionar objetivo: se usa el propio jugador como ancla.
    const selCards = store.selectedCardIds.map(id => cp.hand.find(c => c.id === id)).filter(Boolean) as PlayableCard[];
    const allMultiAoe = selCards.length > 0 && selCards.every(c =>
      c.targetMode === 'all_enemies' || c.targetMode === 'all_allies' || c.targetMode === 'self'
    );
    const effectiveTarget = store.selectedTargetId || (allMultiAoe ? cp.id : null);
    if (store.selectedCardIds.length && effectiveTarget) {
      store.prepareAction(store.selectedCardIds, effectiveTarget);
    }
  };

  // El fondo usa la CSS var --cargas-bg que es actualizada en runtime
  // por VisualSettings → applyVisualConfigToDOM (CSS vars en :root).
  return (
    <div
      className={cn(
        "h-[100dvh] min-h-0 text-white flex flex-col overflow-hidden select-none",
        visualConfig.fontMain, visualConfig.fontSize
      )}
      style={{ background: 'var(--cargas-bg)' }}
    >
      <ToastSystem />

      {manualDrag && (() => {
        const c = cp?.hand?.find((x: any) => x.id === manualDrag.cardId);
        return (
          <div
            className="fixed z-[9999] pointer-events-none rounded-xl border-2 border-amber-300 bg-slate-950/95 text-white shadow-2xl px-3 py-2 text-xs font-black max-w-[10rem]"
            style={{
              left: manualDrag.x + 12,
              top: manualDrag.y + 12,
              transform: 'rotate(-3deg) scale(0.95)',
            }}
          >
            <div className="text-amber-300">🃏 Arrastrando</div>
            <div className="truncate">{c?.name || manualDrag.cardId}</div>
            <div className="text-[0.55rem] text-slate-400 mt-1">Suelta sobre objetivo</div>
          </div>
        );
      })()}

      <AnimatePresence>
        {showHelp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-40 p-4">
            <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-cyan-500/40 p-5 max-w-2xl w-full shadow-2xl max-h-[calc(100dvh-3rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-cyan-300">❓ Reglas del juego</h2>
                <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-3 text-[0.6rem] text-slate-300">
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                  <h3 className="font-black text-amber-400 mb-1">🎴 Flujo del turno</h3>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Preparas 1-3 cartas arrastrándolas sobre un objetivo</li>
                    <li>Cartas de efecto inmediato (trampas, buffs) se aplican YA</li>
                    <li>Al terminar turno, se resuelve contra cada objetivo</li>
                    <li>El objetivo puede defenderse si tiene cartas instantáneas</li>
                    <li>Las cartas jugadas vuelven al mazo</li>
                  </ol>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                  <h3 className="font-black text-red-400 mb-1">⚔️ Combate</h3>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Daño neto = (Daño total - Defensa objetivo)</li>
                    <li><b className="text-orange-400">{store.rules.criticalChance}% de crítico:</b> x{store.rules.criticalMultiplier} daño</li>
                    <li>DoT ignoran defensa y se acumulan</li>
                    <li>Combos: cartas específicas juntas da bonus</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isDefending && <DefenseScreen />}
      <CardChoiceModal />
      <PlayTutorialShowcase open={showTutorial} onClose={() => setShowTutorial(false)} />

      <AnimatePresence>
        {isGameOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
              className="bg-gradient-to-br from-amber-900/50 to-slate-900 rounded-3xl p-8 border-2 border-amber-500/50 text-center max-w-sm w-full shadow-2xl mx-4">
              <div className="text-6xl mb-3 animate-bounce">🏆</div>
              <h2 className="text-3xl font-black text-amber-300 mb-2">¡VICTORIA!</h2>
              <p className="text-lg text-white mb-1">
                {store.winner ? (() => {
                  const w = store.players.find(p => p.id === store.winner);
                  return w ? `${w.avatar} ${w.name}` : `Equipo ${store.winner}`;
                })() : '¡Empate!'}
              </p>
              <p className="text-slate-400 text-sm mb-4">Ronda #{store.globalTurnNumber}</p>

              <div className="bg-black/30 rounded-xl p-3 mb-4 text-left max-h-[36dvh] overflow-y-auto">
                <div className="text-xs font-black text-amber-400 mb-2 text-center">📊 Estadísticas</div>
                <div className="space-y-1.5">
                  {store.players.map(p => {
                    const char = allChars.find(c => c.id === p.characterId);
                    const isMVP = p.stats && p.stats.damageDealt === Math.max(...store.players.map(x => x.stats?.damageDealt || 0));
                    return (
                      <div key={p.id} className={cn('bg-slate-800/50 rounded-lg p-2 border text-[0.5rem]',
                        p.isAlive ? 'border-green-700/40' : 'border-slate-700/40 opacity-70',
                        isMVP && 'border-amber-500/50 bg-amber-950/20')}>
                        <div className="flex items-center gap-1 font-bold mb-1">
                          <span>{char?.avatar}</span>
                          <span className="text-white">{p.name}</span>
                          {!p.isAlive && <span className="text-red-400">💀</span>}
                          {isMVP && <span className="text-amber-400">⭐ MVP</span>}
                        </div>
                        <div className="grid grid-cols-4 gap-0.5 text-[0.4rem]">
                          <div className="flex justify-between"><span className="text-red-400">⚔</span><span className="text-white">{p.stats?.damageDealt || 0}</span></div>
                          <div className="flex justify-between"><span className="text-green-400">💚</span><span className="text-white">{p.stats?.healDone || 0}</span></div>
                          <div className="flex justify-between"><span className="text-rose-400">💀</span><span className="text-white">{p.stats?.kills || 0}</span></div>
                          <div className="flex justify-between"><span className="text-amber-400">💥</span><span className="text-white">{p.stats?.critsLanded || 0}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => store.reset()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-lg">
                🔄 Nueva Partida
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BattleEventOverlay />
      <div className="cargas-topbar-polish px-4 py-2 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-black text-base bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent drop-shadow-glow">⚔️ CARGAS</span>
          <span className="text-[0.7rem] text-slate-300">Ronda <span className="text-amber-400 font-bold text-sm">#{store.globalTurnNumber}</span></span>
          <span className="text-[0.7rem] text-slate-300">🃏 <span className="text-white font-bold text-sm">{store.deck.cards.length}</span>/<span className="text-slate-500">{store.deckSize}</span></span>
          <ResolutionMiniPanel store={store} />
          <CombatIntentPanel store={store} />

          {/* UI POLISH FASE1: contextual battle hint */}
          {cp && !isGameOver && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="cargas-context-hint w-full lg:min-w-[34rem] rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 animate-cargas-hint-in"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl animate-cargas-soft-float">
                  {isDefending ? '🛡️' : store.selectedCardIds.length > 0 ? '🎴' : store.selectedTargetId ? '🎯' : '⚔️'}
                </span>
                <div className="min-w-0">
                  <div className="text-[0.68rem] font-black text-white truncate">
                    {isDefending
                      ? 'Fase de defensa: responde o deja pasar el daño'
                      : store.selectedCardIds.length > 0 && store.selectedTargetId
                        ? 'Listo: ya puedes jugar tus cartas'
                        : store.selectedCardIds.length > 0
                          ? 'Ahora elige un objetivo o usa una carta de área'
                          : store.selectedTargetId
                            ? 'Objetivo seleccionado: elige cartas, habilidad o ataque básico'
                            : 'Tu turno: selecciona cartas, habilidad o un objetivo'}
                  </div>
                  <div className="text-[0.56rem] text-slate-400 truncate">
                    {isDefending
                      ? 'Las defensas pueden reducir, rebotar o absorber daño.'
                      : 'Tip: las habilidades de área no necesitan objetivo manual.'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                <span className="cargas-help-chip">🎴 {store.selectedCardIds.length}/{store.maxCardsPerTurn || store.rules.maxCardsPerTurn} cartas</span>
                <span className="cargas-help-chip">🎯 {store.selectedTargetId ? store.players.find((p: any) => p.id === store.selectedTargetId)?.name || 'objetivo' : 'sin objetivo'}</span>
                <span className="cargas-help-chip">⚡ {cp.abilityCooldowns ? Object.values(cp.abilityCooldowns).filter((x: any) => Number(x) > 0).length : 0} CD</span>
              </div>
            </motion.div>
          )}

          {selectedComboPreview.length > 0 && (
            <span className="text-[0.7rem] bg-fuchsia-950/80 text-fuchsia-200 border border-fuchsia-500/60 px-2 py-0.5 rounded-full font-black animate-pulse">
              🌈 COMBO: {selectedComboPreview.map((c: any) => c.name).join(', ')}
            </span>
          )}
          {isNetworkSessionActive && defenseOwner && !isLocalDefenseResolution && (
            <span className="text-[0.7rem] bg-indigo-950/80 text-indigo-200 border border-indigo-600/50 px-2 py-0.5 rounded-full font-black animate-pulse">
              🛡️ Esperando defensa de {defenseOwner.name}
            </span>
          )}
          {isNetworkSessionActive && !defenseOwner && !isLocalNetworkTurn && cp && (
            <span className="text-[0.7rem] bg-slate-950/80 text-cyan-200 border border-cyan-600/50 px-2 py-0.5 rounded-full font-black animate-pulse">
              ⏳ Esperando acción de {cp.name}
            </span>
          )}
          {isNetworkSessionActive && defenseOwner && isLocalDefenseResolution && (
            <span className="text-[0.7rem] bg-amber-950/70 text-amber-200 border border-amber-600/50 px-2 py-0.5 rounded-full font-black">
              🛡️ Tu defensa/resolución
            </span>
          )}
          {isNetworkSessionActive && !defenseOwner && isLocalNetworkTurn && cp && (
            <span className="text-[0.7rem] bg-emerald-950/70 text-emerald-200 border border-emerald-600/50 px-2 py-0.5 rounded-full font-black">
              ✅ Tu turno
            </span>
          )}
          {isBotTurn && (
            <span className="text-[0.6rem] bg-purple-900/50 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full animate-pulse">
              🤖 {cp.name} pensando...
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowLog(x => !x)}
            className={cn("px-2 py-1 rounded text-[0.6rem] font-bold", showLog ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-500 hover:text-white")}>📋 Historial</button>
          <button onClick={() => setShowHelp(x => !x)}
            className={cn("px-2 py-1 rounded text-[0.6rem] font-bold hidden sm:block", showHelp ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-500 hover:text-white")}>❓ Ayuda</button>
          <button onClick={() => setShowTutorial(true)}
            className="px-2 py-1 rounded text-[0.6rem] font-bold bg-fuchsia-900/40 text-fuchsia-300 hover:bg-fuchsia-800/50 border border-fuchsia-700/40">
            🎬 Tutorial
          </button>
          <button onClick={() => setShowCompactMode(x => !x)}
            className={cn("px-2 py-1 rounded text-[0.6rem] font-bold", showCompactMode ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-500 hover:text-white")}>📱 {showCompactMode ? 'Vista normal' : 'Vista compacta'}</button>
          <button onClick={() => { store.reset(); onHome?.(); }} className="px-2 py-1 rounded bg-red-950/60 text-red-400 text-[0.6rem] hover:bg-red-800 hover:text-white">🏠 Menú</button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 pt-2 pb-1 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[0.55rem] text-slate-500 uppercase tracking-widest font-bold">⚔ Tablero — {store.players.filter(p => p.isAlive).length} activos</span>
              {canControlCurrentPlayer && (
                <span className="text-[0.5rem] text-amber-700">💡 Arrastra carta sobre objetivo · Selecciona cartas + click en jugador</span>
              )}
            </div>
            {store.selectedTargetId && (
              <div className="flex items-center gap-1.5 text-[0.6rem] bg-amber-900/30 border border-amber-700/30 rounded-full px-2 py-0.5">
                <span className="text-amber-400">🎯</span>
                <span className="text-white font-bold">{store.players.find(p => p.id === store.selectedTargetId)?.name}</span>
                <button onClick={() => store.clearSelection()} className="text-slate-500 hover:text-red-400 ml-0.5">✕</button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-2 pt-1">
            <div className={cn('grid gap-2 items-start',
              showCompactMode ? (
                store.players.length <= 4 ? 'grid-cols-4' :
                store.players.length <= 6 ? 'grid-cols-3 sm:grid-cols-6' :
                'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8'
              ) : (
                store.players.length <= 2 ? 'grid-cols-2' :
                store.players.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
                store.players.length <= 6 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' :
                'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
              )
            )}>
              {store.players.map(player => {
                const isMe = player.id === cp.id;
                const ally = isAlly(player.id);
                const seeHand = canSeeHand(player.id);
                const played = store.playedCardsOnBoard.find(x => x.playerId === player.id)?.cards ?? [];
                return (
                  <PlayerPanel key={player.id}
                    player={player}
                    isMe={isMe}
                    isAlly={ally}
                    isTarget={store.selectedTargetId === player.id}
                    onSelect={() => {
                      if (!canControlCurrentPlayer) return;
                      if (!player.isAlive) return;
                      if (isMe && !canTargetSelf && store.selectedCardIds.length > 0) return;
                      store.selectTarget(player.id);
                    }}
                    onDrop={e => handleDrop(e, player.id)}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOver(player.id);
                    }}
                    onDragLeave={() => setDragOver(null)}
                    isDragOver={dragOver === player.id}
                    canSeeHand={seeHand}
                    playedCards={played}
                    hasPreparedCards={played.length > 0}
                    compactMode={showCompactMode}
                  />
                );
              })}
            </div>
          </div>

          {canControlCurrentPlayer && !isGameOver && (
            <div className="cargas-hand-panel shrink-0 animate-cargas-panel-slide-up">
              <div className="px-3 py-2 flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/50 cargas-hand-tabs">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1 rounded-xl overflow-visible">
                    <button onClick={() => setTab('hand')}
                      className={cn("cargas-tab-polish",
                        tab === 'hand' ? "cargas-tab-active" : "cargas-tab-idle")}>
                      🃏 Mano ({cp.hand.length})
                    </button>
                    <button onClick={() => setTab('abilities')}
                      className={cn("cargas-tab-polish",
                        tab === 'abilities' ? "cargas-tab-active" : "cargas-tab-idle")}>
                      ⚡ Habilidades
                    </button>
                  </div>

                  <div className="text-[0.55rem] bg-slate-800 rounded px-2 py-1">
                    <span className="text-slate-500">Jugadas: </span>
                    <span className={cn("font-bold", store.cardsPlayedThisTurn >= store.maxCardsPerTurn ? 'text-red-400' : 'text-amber-400')}>
                      {store.cardsPlayedThisTurn}/{store.maxCardsPerTurn}
                    </span>
                  </div>

                  {store.rules.allowBasicAttack && (
                    <div className="flex gap-1">
                      {store.players.filter(p => p.isAlive && p.id !== cp.id).map(p => (
                        <motion.button key={p.id} whileTap={{ scale: 0.93 }}
                          onClick={() => store.prepareBasicAttack(p.id)}
                          disabled={!store.canUseBasicAttack}
                          className={cn("flex items-center gap-0.5 px-1.5 py-1 rounded border text-[0.52rem] font-bold transition-all",
                            store.canUseBasicAttack
                              ? "bg-red-950/60 border-red-800/50 text-red-300 hover:bg-red-900/70"
                              : "bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed")}>
                          <span>{p.avatar}</span>
                          <span className="hidden sm:inline">{p.name}</span>
                        </motion.button>
                      ))}
                      {!store.canUseBasicAttack && <span className="text-[0.5rem] text-slate-600 self-center ml-1">⚔ usado</span>}
                    </div>
                  )}
                </div>

                {/* UI POLISH FASE4 V2: hand action guide */}
                <div className="cargas-action-strip px-3 py-2 mb-2 flex flex-wrap items-center justify-between gap-2 text-[0.58rem]">
                  <div className="font-bold text-slate-200">
                    {tab === 'hand'
                      ? '🎴 Selecciona cartas, elige objetivo y resuelve.'
                      : '⚡ Elige una habilidad. Algunas necesitan objetivo; otras son de área.'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="cargas-help-chip">Click: seleccionar</span>
                    <span className="cargas-help-chip">Arrastrar: objetivo</span>
                    <span className="cargas-help-chip">AoE: sin objetivo</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {(() => {
                    const selCards = store.selectedCardIds.map(id => cp.hand.find(c => c.id === id)).filter(Boolean) as PlayableCard[];
                    const allAoe = selCards.length > 0 && selCards.every(c =>
                      c.targetMode === 'all_enemies' || c.targetMode === 'all_allies' || c.targetMode === 'self'
                    );
                    const canPlay = store.selectedCardIds.length > 0 && (store.selectedTargetId || allAoe);
                    return (
                      <>
                        {store.selectedCardIds.length > 0 && (
                          <div className="cargas-action-strip text-[0.58rem] flex items-center gap-1 rounded-xl px-3 py-1.5">
                            <span className="text-blue-300 font-bold">{store.selectedCardIds.length} carta(s)</span>
                            {store.selectedTargetId
                              ? <span className="text-amber-300">→ {store.players.find(p => p.id === store.selectedTargetId)?.name}</span>
                              : allAoe
                                ? <span className="text-fuchsia-300 font-bold">💥 AOE (no requiere objetivo)</span>
                                : <span className="text-amber-300 font-black animate-pulse">← elige objetivo</span>
                            }
                          </div>
                        )}
                        {canPlay && (
                          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                            onClick={handlePlaySelected}
                            className="cargas-big-play px-4 py-1.5 text-white text-[0.68rem] font-black shadow-lg">
                            ▶ Resolver {store.selectedCardIds.length} carta(s)
                          </motion.button>
                        )}
                      </>
                    );
                  })()}
                  {store.selectedCardIds.length > 0 && (
                    <button onClick={() => store.clearSelection()}
                      className="px-2 py-1 text-[0.6rem] text-slate-500 hover:text-white">✕</button>
                  )}
                  {/* ── BOTÓN GOLPEAR ── */}
                  {/* Aparece cuando hay un objetivo seleccionado y queda ataque básico.
                      Al golpear, se prepara el ataque básico contra el objetivo + se fusiona
                      con las cartas que el jugador haya seleccionado. */}
                  {store.selectedTargetId && store.rules.allowBasicAttack && !store.basicAttackUsed && (
                    <motion.button
                      key="golpear-btn"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const targetId = store.selectedTargetId;
                        if (!targetId) return;
                        // Primero preparar el ataque básico
                        store.prepareBasicAttack(targetId);
                        // Luego jugar las cartas seleccionadas
                        if (store.selectedCardIds.length > 0) {
                          store.prepareAction(store.selectedCardIds, targetId);
                        }
                      }}
                      className="cargas-basic-hit px-4 py-1.5 rounded-lg text-white text-[0.65rem] font-black shadow-lg shadow-red-500/30 border border-red-400/50"
                    >
                      ⚔️ Golpear {store.players.find(p => p.id === store.selectedTargetId)?.avatar}
                    </motion.button>
                  )}

                  {store.playedCardsOnBoard.some(x => x.playerId === cp.id) && (
                    <button onClick={() => store.cancelPreparedTurn()}
                      className="cargas-muted-action px-2 py-1 rounded-lg text-slate-400 hover:text-red-300 text-[0.58rem] font-bold transition-colors">
                      ↩ Retirar
                    </button>
                  )}
                  <button onClick={() => store.endTurn()}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[0.65rem] font-black shadow-lg shadow-amber-500/20 border border-amber-200/40">
                    {store.pendingActions.length > 0 ? `⏭ Resolver (${store.pendingActions.length})` : '⏭ Pasar'}
                  </button>
                </div>
              </div>

              {tab === 'hand' ? (
                <div className="px-3 py-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {cp.hand.map(card => (
                      <GameCard
                        key={card.id}
                        card={card}
                        draggable={canControlCurrentPlayer}
                        onPointerDown={(e) => {
                          if (!canControlCurrentPlayer) return;
                          if ((e as any).button !== 0) return;
                          setDragCard(card.id);
                          setManualDrag({ cardId: card.id, x: e.clientX, y: e.clientY });
                        }}
                        isSelected={store.selectedCardIds.includes(card.id)}
                        size="md"
                        onClick={() => handleCardClick(card.id)}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/x-cargas-card', card.id);
                          e.dataTransfer.setData('text/plain', card.id);
                          setDragCard(card.id);
                        }}
                        onDragEnd={() => {
                          window.setTimeout(() => {
                            setDragCard(null);
                            setDragOver(null);
                          }, 80);
                        }}
                      />
                    ))}
                    {cp.hand.length === 0 && (
                      <div className="text-slate-600 text-xs py-4 px-3">Sin cartas en mano</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2">
                  {/* ── PASIVAS DEL PERSONAJE (automáticas, NO son botones) ── */}
                  <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className="bg-amber-950/40 border border-amber-700/40 rounded-lg px-2 py-1.5">
                      <div className="text-[0.5rem] text-amber-400 font-black uppercase tracking-wider mb-0.5">⚡ Pasiva Individual (auto)</div>
                      <div className="text-[0.56rem] text-amber-100 leading-tight">{cpChar?.passiveDescription}</div>
                    </div>
                    {cpChar?.teamPassiveDescription && (
                      <div className="bg-green-950/40 border border-green-700/40 rounded-lg px-2 py-1.5">
                        <div className="text-[0.5rem] text-green-400 font-black uppercase tracking-wider mb-0.5">👥 Pasiva de Equipo (auto)</div>
                        <div className="text-[0.56rem] text-green-100 leading-tight">{cpChar.teamPassiveDescription}</div>
                      </div>
                    )}
                  </div>

                  <div className="mb-2 flex items-center justify-between flex-wrap gap-1">
                    <div className="text-[0.55rem] flex items-center gap-1">
                      <span className="text-amber-400 font-bold">🎮 Habilidades activas de {cpChar?.name}</span>
                    </div>
                    {!store.selectedTargetId && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="text-[0.5rem] bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full border border-amber-700/40 animate-pulse">
                        ⚠️ Selecciona un objetivo (no necesario para defensas)
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[32dvh] overflow-y-auto pr-1">
                    {/* UI POLISH FASE4 V2: ability shell */}
                    <div className="cargas-action-strip px-3 py-2 mb-2 text-[0.58rem] text-slate-200 font-bold">
                      ⚡ Habilidades listas: usa el objetivo seleccionado o activa habilidades de área.
                    </div>
                    {cpChar?.abilities.filter((ab: any) => !ab.passive).map((ab, i) => {
                      // Cooldown POR JUGADOR (no del objeto global)
                      const playerCd = cp.abilityCooldowns?.[ab.id] || 0;
                      const onCD = playerCd > 0;
                      const isTeam = ab.isTeamAbility;
                      const hasAllies = store.players.some(p => p.id !== cp.id && p.teamId === cp.teamId && p.isAlive);
                      const blocked = isTeam && (store.gameMode !== 'teams' || !hasAllies);
                      const ready = !onCD && !blocked;
                      const behavior = getAbilityRuntimeBehavior(ab as any);
                      // Color según categoría de la habilidad
                      const catColor =
                        behavior.category === 'defense' ? { bg: 'from-cyan-950/70 to-sky-950/50', border: 'border-cyan-600/60 hover:border-cyan-400', text: 'text-cyan-200', badge: 'bg-cyan-500' } :
                        behavior.category === 'end_turn' ? { bg: 'from-purple-950/70 to-violet-950/50', border: 'border-purple-600/60 hover:border-purple-400', text: 'text-purple-200', badge: 'bg-purple-500' } :
                        isTeam ? { bg: 'from-green-950/70 to-emerald-950/50', border: 'border-green-600/60 hover:border-green-400', text: 'text-green-200', badge: 'bg-green-500' } :
                        { bg: 'from-blue-950/70 to-indigo-950/50', border: 'border-blue-600/60 hover:border-blue-400', text: 'text-blue-200', badge: 'bg-blue-500' };

                      return (
                        <motion.button key={ab.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          whileHover={ready ? { scale: 1.04, y: -2 } : {}}
                          whileTap={ready ? { scale: 0.97 } : {}}
                          disabled={onCD || blocked}
                          onClick={() => {
                            const targetRule = (ab as any).targetMode || (ab as any).canTarget || behavior.targetMode || (
                              behavior.category === 'defense' || behavior.category === 'buff_self'
                                ? 'self'
                                : 'enemy'
                            );

                            let target = store.selectedTargetId || null;

                            if (targetRule === 'self' || targetRule === 'none') {
                              target = cp.id;
                            }

                            if ((behavior.category === 'defense' || behavior.category === 'buff_self' || isMultiAbilityTarget(targetRule)) && !target) {
                              target = cp.id;
                            }

                            if (!target) {
                              store.log(`⚠️ Selecciona un objetivo primero`, 'system');
                              return;
                            }

                            const targetPlayer = store.players.find(p => p.id === target);
                            if (!targetPlayer) {
                              store.log(`⚠️ Objetivo inválido`, 'system');
                              return;
                            }

                            if (targetRule === 'enemy' && targetPlayer.id === cp.id) {
                              store.log(`⚠️ Esa habilidad necesita un enemigo`, 'system');
                              return;
                            }

                            if (targetRule === 'ally' && targetPlayer.id === cp.id) {
                              store.log(`⚠️ Esa habilidad necesita un aliado`, 'system');
                              return;
                            }

                            if (targetRule === 'ally' && store.gameMode === 'teams' && targetPlayer.teamId !== cp.teamId) {
                              store.log(`⚠️ Ese objetivo no es aliado`, 'system');
                              return;
                            }

                            if (targetRule === 'enemy' && store.gameMode === 'teams' && targetPlayer.teamId === cp.teamId) {
                              store.log(`⚠️ Ese objetivo no es enemigo`, 'system');
                              return;
                            }

                            if (onCD || blocked) return;
                            store.useAbility(ab.id, target);
                          }}
                          title={`${ab.name} — ${behavior.timingLabel}`}
                          className={cn('p-2 rounded-xl border-2 text-left relative overflow-hidden transition-all shadow-lg',
                            blocked ? 'opacity-40 cursor-not-allowed bg-slate-800/50 border-slate-700/40' :
                            onCD ? 'cursor-not-allowed bg-slate-800/60 border-slate-700/50' :
                            cn('bg-gradient-to-br cursor-pointer', catColor.bg, catColor.border))}>
                          {onCD && (
                            <div className="absolute inset-y-0 left-0 bg-red-900/40 pointer-events-none"
                              style={{ width: `${(playerCd / ab.cooldown) * 100}%` }} />
                          )}
                          {/* Badge de categoría */}
                          <div className={cn('absolute top-0 right-0 text-black font-black px-1.5 py-0.5 rounded-bl-lg z-10', catColor.badge)} style={{ fontSize: '0.4rem' }}>
                            {isTeam ? '👥 EQUIPO' :
                             behavior.category === 'defense' ? '🛡️ DEFENSA' :
                             behavior.category === 'end_turn' ? '🌙 FIN TURNO' :
                             behavior.category === 'buff_self' ? '💪 BUFF' : '⚡ AHORA'}
                          </div>
                          <div className="relative flex items-start gap-1.5 mb-1 mt-3.5">
                            <span className="text-lg drop-shadow-md">
                              {behavior.category === 'defense' ? '🛡️' : behavior.category === 'end_turn' ? '🌙' : isTeam ? '👥' : '⚡'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={cn('font-black leading-tight text-[0.68rem]', catColor.text)}>{ab.name}</div>
                              <div className="text-slate-200 leading-snug mt-0.5 text-[0.54rem]">{ab.description}</div>
                            </div>
                          </div>
                          <div className="relative border-t border-slate-600/50 pt-1 mt-1">
                            <div className="flex items-center justify-between text-[0.46rem]">
                              {onCD ? (
                                <span className="cargas-cooldown-chip rounded-full px-1.5 py-0.5 font-bold text-red-200">⏳ {playerCd}/{ab.cooldown}t</span>
                              ) : blocked ? (
                                <span className="font-bold text-orange-300">⚠ Bloqueada</span>
                              ) : (
                                <span className="font-bold text-emerald-300">▶ Usar</span>
                              )}
                              <span className="text-slate-400 italic">{behavior.timingLabel.replace(/^[^ ]+ /, '')}</span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showLog && (
            <motion.div initial={{ x: 260 }} animate={{ x: 0 }} exit={{ x: 260 }}
              className="w-56 bg-slate-900/90 border-l border-slate-800 flex flex-col shrink-0 hidden md:flex">
              <div className="p-2 border-b border-slate-800 shrink-0">
                <span className="text-[0.65rem] font-bold text-amber-400">📋 Registro</span>
              </div>
              <div ref={logRef} className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {store.gameLog.map((entry: any, i: number) => (
                  <div key={i} className={cn("text-[0.52rem] px-1.5 py-0.5 rounded leading-tight",
                    entry.type === 'damage'  ? "cargas-log-row-polish cargas-log-damage text-red-200" :
                    entry.type === 'crit'    ? "bg-orange-950/40 text-orange-300 font-black" :
                    entry.type === 'kill'    ? "bg-rose-950/40 text-rose-300 font-black" :
                    entry.type === 'heal'    ? "cargas-log-row-polish cargas-log-heal text-green-200" :
                    entry.type === 'victory' ? "bg-amber-950/40 text-amber-300 font-bold" :
                    entry.type === 'turn'    ? "bg-slate-800/80 text-amber-400 font-bold" :
                    entry.type === 'combo'   ? "bg-purple-950/40 text-purple-300 font-bold" :
                    entry.type === 'ability' ? "cargas-log-row-polish cargas-log-ability text-blue-200" :
                    entry.type === 'instant' ? "bg-cyan-950/30 text-cyan-300 font-bold" :
                    entry.type === 'dot'     ? "bg-orange-950/30 text-orange-300" :
                    entry.type === 'buff'    ? "bg-emerald-950/30 text-emerald-300" :
                    entry.type === 'debuff'  ? "bg-pink-950/30 text-pink-300" :
                    entry.type === 'defense' ? "cargas-log-row-polish cargas-log-defense text-blue-100" :
                    entry.type === 'utility' ? "bg-yellow-950/30 text-yellow-300" :
                    "text-slate-500"
                  )}>
                    {entry.message}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
