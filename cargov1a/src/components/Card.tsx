// ============================================================
// PLAYABLE CARD COMPONENT
// ============================================================

import React from 'react';
import { PlayableCard } from '../types/game';
import { cn } from '../utils/cn';

interface PlayableCardProps {
  card: PlayableCard;
  isSelected?: boolean;
  isHidden?: boolean;
  onClick?: () => void;
  isInstant?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const typeColors: Record<string, string> = {
  damage: 'from-red-900/80 to-red-700/60 border-red-500',
  damage_over_time: 'from-purple-900/80 to-purple-700/60 border-purple-500',
  heal: 'from-green-900/80 to-green-700/60 border-green-500',
  defense: 'from-blue-900/80 to-blue-700/60 border-blue-500',
  dodge: 'from-cyan-900/80 to-cyan-700/60 border-cyan-400',
  utility: 'from-amber-900/80 to-amber-700/60 border-amber-500',
  special: 'from-yellow-900/80 to-yellow-600/60 border-yellow-400',
};

const typeIcons: Record<string, string> = {
  damage: '⚔️',
  damage_over_time: '☠️',
  heal: '💚',
  defense: '🛡️',
  dodge: '💨',
  utility: '🎯',
  special: '⭐',
};

const sizeClasses = {
  sm: 'w-20 min-w-[5rem] h-28 text-[0.55rem] p-1',
  md: 'w-28 min-w-[7rem] h-40 text-xs p-1.5',
  lg: 'w-36 min-w-[9rem] h-48 text-sm p-2',
};

export const PlayableCardComponent: React.FC<PlayableCardProps> = ({
  card,
  isSelected = false,
  isHidden = false,
  onClick,
  size = 'md',
}) => {
  if (isHidden) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 border-amber-700/60 bg-gradient-to-br from-amber-950 to-amber-900',
          'flex items-center justify-center cursor-pointer',
          sizeClasses[size],
          isSelected && 'ring-2 ring-yellow-400 scale-105'
        )}
        onClick={onClick}
      >
        <div className="text-center">
          <div className="text-2xl">🂠</div>
          <div className="text-amber-300/60 text-[0.5rem] mt-1">Carta Oculta</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-gradient-to-br cursor-pointer transition-all duration-200 relative flex flex-col',
        'hover:scale-105 hover:shadow-lg hover:shadow-black/40',
        typeColors[card.type] || typeColors.damage,
        sizeClasses[size],
        isSelected && 'ring-2 ring-yellow-400 scale-110 shadow-yellow-400/30 -translate-y-2',
        card.isInstant && 'animate-pulse-slow'
      )}
      onClick={onClick}
    >
      <div className="text-center mb-0.5">
        <span className="text-base">{typeIcons[card.type] || '🃏'}</span>
      </div>
      <div className="font-bold text-center leading-tight mb-0.5 truncate">{card.name}</div>
      <div className="text-center opacity-80 leading-tight flex-1">{card.description}</div>
      {card.isInstant && (
        <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[0.45rem] font-bold px-1 rounded-bl">INST</div>
      )}
      <div className="text-center text-[0.45rem] opacity-50 mt-auto">{card.type.replace('_', ' ')}</div>
    </div>
  );
};
