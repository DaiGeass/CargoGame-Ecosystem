import React from 'react';
import { PlayableCard } from '../types/game';
import { resolveCardTheme } from '../utils/cardThemes';
import { EFFECT_KIND_LABELS } from '../types/effects';

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
};

interface Props {
  card: PlayableCard;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const CardView: React.FC<Props> = ({ card, size = 'md', onClick }) => {
  const theme = resolveCardTheme(card.type, card.customTheme);
  const rarityColor = RARITY_COLORS[card.rarity || 'common'];

  const dims = size === 'lg' ? 'w-56' : size === 'sm' ? 'w-32' : 'w-44';
  const titleSize = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-[0.6rem]' : 'text-sm';

  return (
    <div
      onClick={onClick}
      className={`${dims} shrink-0 rounded-2xl p-[2px] transition-transform ${onClick ? 'cursor-pointer hover:scale-[1.04]' : ''}`}
      style={{ background: `linear-gradient(135deg, ${theme.border}, ${rarityColor})`, boxShadow: `0 8px 24px ${theme.glow}` }}
    >
      <div
        className="rounded-2xl h-full flex flex-col overflow-hidden relative"
        style={{ background: `linear-gradient(160deg, ${theme.bg}, ${theme.bgGrad})` }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-2.5 pt-2">
          <span className="text-2xl drop-shadow">{theme.icon}</span>
          <span
            className="text-[0.5rem] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider"
            style={{ background: rarityColor + '33', color: rarityColor, border: `1px solid ${rarityColor}` }}
          >
            {card.rarity || 'common'}
          </span>
        </div>

        {/* art zone */}
        <div className="mx-2.5 mt-1.5 rounded-lg flex items-center justify-center relative overflow-hidden"
             style={{ aspectRatio: '16/10', background: 'rgba(0,0,0,0.25)' }}>
          {card.imageFront || card.media?.image ? (
            <img src={(card.media?.image || card.imageFront) as string} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl opacity-40">{theme.icon}</span>
          )}
          {/* value badge */}
          {card.value !== 0 && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[0.6rem] font-black"
                 style={{ background: card.value < 0 ? '#7f1d1d' : '#14532d', color: card.value < 0 ? '#fecaca' : '#bbf7d0' }}>
              {card.value > 0 ? '+' : ''}{card.value}
            </div>
          )}
        </div>

        {/* title */}
        <div className={`px-2.5 pt-1.5 font-black leading-tight ${titleSize}`} style={{ color: theme.text }}>
          {card.name}
        </div>

        {/* type label */}
        <div className="px-2.5 text-[0.55rem] uppercase tracking-wide opacity-70" style={{ color: theme.text }}>
          {theme.label} · {card.targetMode.replace(/_/g, ' ')}
        </div>

        {/* description */}
        {size !== 'sm' && (
          <div className="px-2.5 py-1.5 text-[0.62rem] leading-snug opacity-90 flex-1" style={{ color: theme.text }}>
            {card.description || <span className="opacity-40 italic">Sin descripción</span>}
          </div>
        )}

        {/* effects chips */}
        {card.effects && card.effects.length > 0 && size !== 'sm' && (
          <div className="px-2 pb-2 flex flex-wrap gap-1">
            {card.effects.slice(0, 4).map((e, i) => {
              const meta = EFFECT_KIND_LABELS[e.kind];
              return (
                <span key={i} className="text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      style={{ background: meta.color + '33', color: meta.color, border: `1px solid ${meta.color}66` }}>
                  {meta.icon}{e.amount ? ` ${e.amount}` : ''}
                </span>
              );
            })}
          </div>
        )}

        {/* synergy indicator */}
        {card.synergies && card.synergies.length > 0 && (
          <div className="absolute top-9 left-1.5 text-[0.5rem] font-black px-1 py-0.5 rounded bg-fuchsia-600/80 text-white">
            ⚡{card.synergies.length}
          </div>
        )}
      </div>
    </div>
  );
};
