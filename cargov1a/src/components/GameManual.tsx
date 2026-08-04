// ============================================================
// GAME MANUAL
// ============================================================

import React, { useState } from 'react';
import { getAllCharacters, allBaseCards, combos } from '../data/cards';
import { cn } from '../utils/cn';
import { tagClass } from '../utils/tagStyles';
import { getCardImage, getCharacterFrontImage } from '../utils/media';

export const GameManual: React.FC = () => {
  const [tab, setTab] = useState<'rules' | 'characters' | 'cards' | 'combos' | 'mods'>('rules');
  const [search, setSearch] = useState('');

  const allCharacters = getAllCharacters();
  
  const filteredCharacters = allCharacters.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.passiveDescription.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCards = allBaseCards.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const filteredCombos = combos.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex bg-slate-800 rounded-lg overflow-hidden shrink-0 flex-wrap">
          {([
            { id: 'rules', label: '📜 Reglas' },
            { id: 'characters', label: '🧙 Personajes' },
            { id: 'cards', label: '🃏 Cartas' },
            { id: 'combos', label: '💥 Combos' },
            { id: 'mods', label: '🧩 Mods' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-3 py-2 text-xs font-bold transition-colors ${
                tab === t.id ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="🔍 Buscar..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-slate-800/80 rounded-lg px-3 py-2 text-xs border border-slate-700 outline-none focus:border-cyan-500 text-white placeholder-slate-500" />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {tab === 'rules' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-black text-amber-400 mb-2">🎴 Flujo del Turno</h3>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
                <li>Preparas 1-3 cartas arrastrándolas sobre un objetivo</li>
                <li>Las cartas se colocan boca abajo en el tablero</li>
                <li>Haces click en "Resolver Turno"</li>
                <li>Se revelan las cartas y se aplican los efectos</li>
                <li>El objetivo puede defenderse si tiene cartas instantáneas</li>
                <li>Las cartas usadas vuelven al mazo (¡no se pierden!)</li>
              </ol>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-black text-amber-400 mb-2">⚔️ Sistema de Daño</h3>
              <div className="text-xs text-slate-300 space-y-2">
                <p><strong className="text-white">Daño Neto = Daño Total - Defensa del objetivo</strong></p>
                <p>Los efectos DoT (daño por tiempo) ignoran la defensa.</p>
                <p>Las curaciones pueden exceder el HP máximo.</p>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-black text-amber-400 mb-2">🏷️ Tags y Sinergias</h3>
              <div className="text-xs text-slate-300 space-y-2">
                <p>Cada carta tiene <strong className="text-white">tags</strong> que activan pasivas de personajes.</p>
                <p>Ejemplo: Arquero tiene pasiva "+75 con [arco][flecha]"</p>
                <p>→ Las cartas con tag 'arco' o 'flecha' reciben +75 daño.</p>
                <p className="text-amber-400">¡Los mods pueden usar cualquier tag personalizado!</p>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-black text-amber-400 mb-2">💥 Combos</h3>
              <div className="text-xs text-slate-300 space-y-2">
                <p>Los combos se activan al jugar TODAS las cartas requeridas contra el mismo objetivo.</p>
                <p>El daño bonus se suma automáticamente al daño total.</p>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-black text-amber-400 mb-2">🧩 Mods y DLCs</h3>
              <div className="text-xs text-slate-300 space-y-2">
                <p>Formatos soportados: <code className="bg-slate-700 px-1 rounded">.json</code> o <code className="bg-slate-700 px-1 rounded">.zip</code> o <code className="bg-slate-700 px-1 rounded">.cargasmod</code></p>
                <p>Los mods pueden agregar: personajes, cartas, combos e imágenes personalizadas.</p>
                <p className="text-green-400">¡No requiere modificar el código del juego!</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'characters' && (
          <div className="space-y-3">
            {filteredCharacters.length > 0 ? filteredCharacters.map(char => (
              <div key={char.id} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl border-2 overflow-hidden"
                    style={{ backgroundColor: `${char.color}20`, borderColor: `${char.color}60` }}>
                    {getCharacterFrontImage(char)
                      ? <img src={getCharacterFrontImage(char)!} alt={char.name} className="w-full h-full object-cover" />
                      : <>{char.avatar}</>}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{char.name}</h3>
                    <div className="flex gap-2 text-[0.6rem] mt-1">
                      <span className="bg-red-950/60 text-red-400 px-2 py-0.5 rounded">❤️ {char.hp}</span>
                      <span className="bg-blue-950/60 text-blue-400 px-2 py-0.5 rounded">🛡️ {char.defense}</span>
                      <span className="bg-orange-950/60 text-orange-400 px-2 py-0.5 rounded">⚔️ {char.damage}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-950/30 p-2 rounded-lg border border-amber-900/30 mb-2">
                  <div className="text-[0.6rem] text-amber-400 font-bold mb-1">⚡ PASIVA INDIVIDUAL (automática)</div>
                  <div className="text-xs text-amber-200">{char.passiveDescription}</div>
                </div>
                {char.teamPassiveDescription && (
                  <div className="bg-green-950/30 p-2 rounded-lg border border-green-900/30 mb-3">
                    <div className="text-[0.6rem] text-green-400 font-bold mb-1">👥 PASIVA DE EQUIPO (automática)</div>
                    <div className="text-xs text-green-200">{char.teamPassiveDescription}</div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-[0.6rem] text-slate-400 font-bold uppercase tracking-wider">Habilidades Individuales</div>
                  {char.abilities.filter(a => !a.isTeamAbility).map(ab => (
                    <div key={ab.id} className="text-xs flex items-start gap-2">
                      <span className="text-blue-400">⚡</span>
                      <div>
                        <div className="font-bold text-white">{ab.name} <span className="text-slate-500">({ab.cooldown}t CD)</span></div>
                        <div className="text-slate-300">{ab.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-700/50 my-3"></div>
                <div className="space-y-2">
                  <div className="text-[0.6rem] text-slate-400 font-bold uppercase tracking-wider">Habilidades de Equipo</div>
                  {char.abilities.filter(a => a.isTeamAbility).map(ab => (
                    <div key={ab.id} className="text-xs flex items-start gap-2">
                      <span className="text-green-400">👥</span>
                      <div>
                        <div className="font-bold text-white">{ab.name} <span className="text-slate-500">({ab.cooldown}t CD)</span></div>
                        <div className="text-slate-300">{ab.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )) : <div className="text-center text-slate-500 text-sm py-10">No se encontraron personajes.</div>}
          </div>
        )}

        {tab === 'cards' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredCards.length > 0 ? filteredCards.map(card => {
              const isDmg = card.type === 'damage';
              const isHeal = card.type === 'heal';
              const isDot = card.type === 'damage_over_time';
              const img = getCardImage(card);
              return (
                <div key={card.id} className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-bold text-white text-[0.65rem] leading-tight">{card.name}</div>
                      {card.isInstant && <div className="text-[0.4rem] bg-cyan-500 text-black px-1 rounded-sm font-black ml-1">INST</div>}
                    </div>
                    {img && (
                      <img src={img} alt={card.name} className="w-full h-12 object-cover rounded mb-1 border border-white/10" />
                    )}
                    <div className="text-[0.55rem] text-slate-300 leading-snug mb-1">{card.description}</div>
                  </div>
                  <div>
                    {card.value !== 0 && (
                      <div className={`text-sm font-black mb-1 ${isHeal ? 'text-green-400' : isDmg || isDot ? 'text-red-400' : 'text-amber-400'}`}>
                        {card.value > 0 ? '+' : ''}{card.value}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[0.4rem] bg-slate-700 text-slate-300 px-1 rounded uppercase">{card.type.replace('_', ' ')}</span>
                      {card.duration > 0 && <span className="text-[0.4rem] bg-slate-700 text-slate-300 px-1 rounded">⏱ {card.duration}t</span>}
                      {card.rarity && <span className="text-[0.4rem] bg-amber-900/50 text-amber-300 px-1 rounded uppercase">{card.rarity}</span>}
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
            }) : <div className="col-span-full text-center text-slate-500 text-sm py-10">No se encontraron cartas.</div>}
          </div>
        )}

        {tab === 'combos' && (
          <div className="space-y-3">
            {filteredCombos.length > 0 ? filteredCombos.map(combo => (
              <div key={combo.id} className="bg-gradient-to-br from-purple-950/40 to-pink-950/40 rounded-xl p-4 border border-purple-700/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-purple-300">{combo.name}</h3>
                  {combo.bonusValue > 0 && (
                    <span className="text-xs bg-red-950/60 text-red-400 px-2 py-0.5 rounded font-bold">+{combo.bonusValue} daño</span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mb-2">{combo.description}</div>
                <div className="text-xs text-amber-400 italic mb-2">{combo.effectDescription}</div>
                <div className="flex flex-wrap gap-1">
                  {combo.requiredCards.map(cardId => (
                    <span key={cardId} className="text-[0.55rem] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{cardId}</span>
                  ))}
                </div>
              </div>
            )) : <div className="text-center text-slate-500 text-sm py-10">No se encontraron combos.</div>}
          </div>
        )}

        {tab === 'mods' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-black text-cyan-400 mb-2">🧩 Cómo Instalar Mods</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                <li>Ve a la pestaña <strong className="text-white">🧩 Mods</strong> en el menú de setup</li>
                <li>Arrastra un archivo <code className="bg-slate-700 px-1 rounded">.json</code>, <code className="bg-slate-700 px-1 rounded">.zip</code> o <code className="bg-slate-700 px-1 rounded">.cargasmod</code></li>
                <li>O haz click en "Elegir archivo" para seleccionarlo desde tu disco</li>
                <li>El mod se guarda en disco compartido y se carga en cada nueva partida</li>
              </ol>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-black text-cyan-400 mb-2">📄 Estructura de manifest.json</h3>
              <pre className="bg-slate-900 p-3 rounded-lg overflow-x-auto text-[0.6rem] text-green-400">{`{
  "name": "Mi Mod Épico",
  "author": "Tu Nombre",
  "version": "1.0.0",
  "description": "Agrega 5 personajes y 20 cartas nuevas",
  "characters": ["characters.json"],
  "cards": ["cards.json"],
  "combos": ["combos.json"]
}`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
