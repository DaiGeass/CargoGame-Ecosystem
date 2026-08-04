// ============================================================
// GALLERY COMPENDIUM
// ============================================================

import React, { useState } from 'react';
import { getAllCardsWithSource, getAllCharactersWithSource } from '../data/contentRegistry';
import { cn } from '../utils/cn';
import { tagClass } from '../utils/tagStyles';
import { getCardImage, getCharacterFrontImage } from '../utils/media';

export const GalleryCompendium: React.FC = () => {
  const [tab, setTab] = useState<'characters' | 'cards'>('characters');
  const [search, setSearch] = useState('');

  const allCharacters = getAllCharactersWithSource();
  const allCards = getAllCardsWithSource();

  const filteredCharacters = allCharacters.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.passiveDescription.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCards = allCards.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex bg-slate-800 rounded-lg overflow-hidden shrink-0">
          <button onClick={() => setTab('characters')}
            className={cn('px-4 py-2 text-xs font-bold transition-colors',
              tab === 'characters' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white')}>
            🧙 Personajes ({allCharacters.length})
          </button>
          <button onClick={() => setTab('cards')}
            className={cn('px-4 py-2 text-xs font-bold transition-colors',
              tab === 'cards' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white')}>
            🃏 Cartas ({allCards.length})
          </button>
        </div>
        <input type="text" placeholder="🔍 Buscar..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-slate-800/80 rounded-lg px-3 py-2 text-xs border border-slate-700 outline-none focus:border-cyan-500 text-white placeholder-slate-500" />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {tab === 'characters' ? (
          filteredCharacters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCharacters.map(char => (
                <div key={char.id} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl border-2 overflow-hidden"
                      style={{ backgroundColor: `${char.color}20`, borderColor: `${char.color}60` }}>
                      {getCharacterFrontImage(char)
                        ? <img src={getCharacterFrontImage(char)!} alt={char.name} className="w-full h-full object-cover" />
                        : <>{char.avatar}</>}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">{char.name}</h3>
                      <div className="flex gap-1.5 text-[0.55rem] mt-1">
                        <span className="bg-red-950/60 text-red-400 px-1.5 py-0.5 rounded">❤️ {char.hp}</span>
                        <span className="bg-blue-950/60 text-blue-400 px-1.5 py-0.5 rounded">🛡️ {char.defense}</span>
                        <span className="bg-orange-950/60 text-orange-400 px-1.5 py-0.5 rounded">⚔️ {char.damage}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[0.6rem] text-amber-300 mb-1 leading-snug bg-amber-950/30 p-1.5 rounded border border-amber-900/40">
                    {char.passiveDescription}
                  </div>
                  {char.teamPassiveDescription && (
                    <div className="text-[0.6rem] text-green-300 mb-2 leading-snug bg-green-950/30 p-1.5 rounded border border-green-900/40">
                      {char.teamPassiveDescription}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-[0.55rem] text-slate-400 font-bold uppercase tracking-wider mb-1">Habilidades:</div>
                    {char.abilities.map(ab => (
                      <div key={ab.id} className="text-[0.55rem] flex items-start gap-1">
                        <span className={ab.isTeamAbility ? 'text-green-400' : 'text-blue-400'}>
                          {ab.isTeamAbility ? '👥' : '⚡'}
                        </span>
                        <div>
                          <strong className="text-white">{ab.name}</strong> <span className="text-slate-500">({ab.cooldown}t)</span>: {ab.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-500 text-sm py-10">No se encontraron personajes.</div>
          )
        ) : (
          filteredCards.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredCards.map(card => {
                const isDmg = card.type === 'damage';
                const isHeal = card.type === 'heal';
                const isDot = card.type === 'damage_over_time';
                const isDef = card.type === 'defense';
                const img = getCardImage(card);
                return (
                  <div key={card.id} className={cn('rounded-lg p-2 border flex flex-col justify-between',
                    card.__source === 'dlc' ? 'bg-amber-950/30 border-amber-700/40' :
                    card.__source === 'mod' ? 'bg-cyan-950/30 border-cyan-700/40' :
                    'bg-slate-800/60 border-slate-700/50')}>
                    <div>
                      <div className="flex items-start justify-between mb-1 gap-1">
                        <div className="font-bold text-white text-[0.65rem] leading-tight">{card.name}</div>
                        <div className="flex gap-0.5 shrink-0">
                          {card.__source !== 'base' && (
                            <span className={cn('text-[0.4rem] px-1 rounded-sm font-black',
                              card.__source === 'dlc' ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black')}>
                              {card.__source === 'dlc' ? '📦' : '🧩'}
                            </span>
                          )}
                          {card.isInstant && <div className="text-[0.4rem] bg-cyan-500 text-black px-1 rounded-sm font-black">INST</div>}
                        </div>
                      </div>
                      {img && <img src={img} alt={card.name} className="w-full h-12 object-cover rounded mb-1 border border-white/10" />}
                      <div className="text-[0.55rem] text-slate-300 leading-snug mb-1">{card.description}</div>
                    </div>
                    <div>
                      {card.value !== 0 && (
                        <div className={cn('text-sm font-black mb-1', isHeal ? 'text-green-400' : isDmg || isDot ? 'text-red-400' : isDef ? 'text-blue-400' : 'text-amber-400')}>
                          {card.value > 0 ? '+' : ''}{card.value}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[0.4rem] bg-slate-700 text-slate-300 px-1 rounded uppercase">{card.type.replace('_', ' ')}</span>
                        {card.duration > 0 && <span className="text-[0.4rem] bg-slate-700 text-slate-300 px-1 rounded">⏱ {card.duration}t</span>}
                      </div>
                      {card.formula && (
                        <div className="text-[0.4rem] bg-fuchsia-950/50 text-fuchsia-300 px-1 py-0.5 rounded border border-fuchsia-700/40 mt-1 font-mono">
                          📐 {card.formula.expression}
                        </div>
                      )}
                      {card.tags && card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {card.tags.map(t => (
                            <span key={t} className={cn(tagClass(t), 'text-[0.35rem] border px-1 rounded-sm uppercase font-bold')}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-slate-500 text-sm py-10">No se encontraron cartas.</div>
          )
        )}
      </div>
    </div>
  );
};
