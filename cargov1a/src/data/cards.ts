// ============================================================
// DATOS DE CARTAS, PERSONAJES Y HABILIDADES
// ============================================================

import { CharacterCard, PlayableCard, Ability } from '../types/game';

// Helper para crear una habilidad ACTIVA (con cooldown y botón).
// Las pasivas NO se crean con esto: van en passiveDescription / teamPassiveDescription.
//
// 🛠️ ESTRUCTURA DE CADA PERSONAJE:
//   - 3 habilidades individuales (isTeamAbility: false)
//   - 3 habilidades de equipo    (isTeamAbility: true)
//   - 1 pasiva individual  → passiveDescription (automática, sin botón)
//   - 1 pasiva de equipo   → teamPassiveDescription (automática, sin botón)
//
// El campo `cd` (cooldown) DEBE ser > 0 para todas las habilidades activas.
function h(id: string, name: string, desc: string, cd: number, team: boolean, target: Ability['canTarget'] = 'enemy'): Ability {
  return { id, name, description: desc, cooldown: Math.max(1, cd), currentCooldown: 0, isTeamAbility: team, passive: '', canTarget: target };
}

// ════════════════════════════════════════════════════════════
// PERSONAJES — 18 con habilidades y pasivas funcionales
// ════════════════════════════════════════════════════════════
export const characterCards: CharacterCard[] = [
  { id: 'arquero', name: 'Arquero', classType: 'archer', hp: 2900, defense: 20, damage: 40, avatar: '🏹', color: '#22c55e',
    imageFront: '/placeholders/arquero.png', imageBack: '/placeholders/arquero_back.png',
    passiveDescription: '🎯 Pasiva: +75 daño con cartas [arco][flecha]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +25 daño con arcos',
    abilities: [
      h('arq_h1','Disparo Letal','Duplica daño si enemigo <50% HP',6,false),
      h('arq_h2','Perforación','x3 ataque ignorando defensa',12,false),
      h('arq_h3','Lluvia de Flechas','120 daño al objetivo',8,false),
      h('arq_e1','Flecha Humeante','+80 daño aliados arcos 2t',6,true,'ally'),
      h('arq_e2','Camuflaje Natural','Evade daño aliado/propio',15,true,'ally_or_self'),
      h('arq_e3','Desvanecimiento','No puede ser objetivo 2t',10,true,'ally_or_self'),
    ]},
  { id: 'caballero', name: 'Caballero', classType: 'warrior', hp: 3600, defense: 75, damage: 45, avatar: '🛡️', color: '#3b82f6',
    imageFront: '/placeholders/caballero.png', imageBack: '/placeholders/caballero_back.png',
    passiveDescription: '🛡️ Pasiva: +20 defensa base permanente',
    teamPassiveDescription: '👥 Pasiva equipo: aliados -5 daño recibido',
    abilities: [
      h('cab_h1','Espada de Héroe','x3 ataque a objetivo',10,false),
      h('cab_h2','Muro de Acero','Resiste todo daño 1 ataque',10,false,'self'),
      h('cab_h3','Voluntad de Hierro','Cura 1000 HP',15,false,'self'),
      h('cab_e1','Victoria del Reino','+200 ataque aliados',10,true,'ally'),
      h('cab_e2','Escudo del León','+100 defensa aliados',10,true,'ally'),
      h('cab_e3','Gloria Comunitaria','Cura 500 HP aliados',15,true,'ally'),
    ]},
  { id: 'explorador', name: 'Explorador', classType: 'assassin', hp: 3100, defense: 10, damage: 30, avatar: '🔍', color: '#10b981',
    imageFront: '/placeholders/explorador.png', imageBack: '/placeholders/explorador_back.png',
    passiveDescription: '🔍 Pasiva: roba 1 carta extra al inicio del turno',
    teamPassiveDescription: '👥 Pasiva equipo: aliados ven el mazo restante',
    abilities: [
      h('exp_h1','Sigilo Avanzado','Evade primer ataque',8,false,'self'),
      h('exp_h2','Precisión Aumentada','+50% daño próx turno',10,false,'self'),
      h('exp_h3','Rastreo','Revela mano + roba carta',12,false),
      h('exp_e1','Botiquín de Campo','Cura 500 HP aliados',15,true,'ally'),
      h('exp_e2','Antorcha Brillante','Aliados +1 carta extra',12,true,'ally'),
      h('exp_e3','Aliado Silencioso','Aliado no objetivo 1t',8,true,'ally'),
    ]},
  { id: 'sargento', name: 'Sargento', classType: 'tank', hp: 3800, defense: 80, damage: 45, avatar: '🎖️', color: '#6b7280',
    imageFront: '/placeholders/sargento.png', imageBack: '/placeholders/sargento_back.png',
    passiveDescription: '🎖️ Pasiva: -50% daño recibido si HP >50%',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +15 defensa base',
    abilities: [
      h('sar_h1','Escudo Protector','Reduce daño 50% 1t',8,false,'self'),
      h('sar_h2','Orden de Retirada','Redirige daño a otro',12,false),
      h('sar_h3','Fortificación','+50 defensa 2t',10,false,'self'),
      h('sar_e1','Formación Defensiva','+80 defensa aliados',10,true,'ally'),
      h('sar_e2','Retaguardia Segura','Aliados evaden ataque',18,true,'ally'),
      h('sar_e3','Apoyo Estratégico','-2 CD habilidades aliados',15,true,'ally'),
    ]},
  { id: 'espadachin', name: 'Espadachín', classType: 'warrior', hp: 3400, defense: 75, damage: 50, avatar: '⚔️', color: '#ef4444',
    imageFront: '/placeholders/espadachin.png', imageBack: '/placeholders/espadachin_back.png',
    passiveDescription: '⚔️ Pasiva: +50 daño con cartas [espada][melee]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +20 daño melee',
    abilities: [
      h('esp_h1','Corte Veloz','100 daño adicional',8,false),
      h('esp_h2','Furia de Batalla','+20 daño 3t',10,false,'self'),
      h('esp_h3','Estocada Mortal','Ignora defensa, 150 daño',12,false),
      h('esp_e1','Formación Ofensiva','+80 ataque aliados',10,true,'ally'),
      h('esp_e2','Estrategia Vanguardia','Aliados ataque adicional',12,true,'ally'),
      h('esp_e3','Inspiración Guerrera','+500 HP máx aliados 2t',15,true,'ally'),
    ]},
  { id: 'campeon', name: 'Campeón', classType: 'warrior', hp: 3600, defense: 70, damage: 55, avatar: '👑', color: '#f59e0b',
    imageFront: '/placeholders/campeon.png', imageBack: '/placeholders/campeon_back.png',
    passiveDescription: '👑 Pasiva: +1 daño por cada 50 HP perdido',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +1 daño por cada 100 HP perdido',
    abilities: [
      h('cam_h1','Furia Desatada','+300 daño 2t, +50% daño recibido',8,false,'self'),
      h('cam_h2','Golpe Devastador','200 daño a objetivo',10,false),
      h('cam_h3','Resistencia Desafiante','-50% daño recibido 2t',12,false,'self'),
      h('cam_e1','Liderazgo Inspirador','+300 ataque aliados',10,true,'ally'),
      h('cam_e2','Determinación Implacable','Ignora efectos 1t',12,true,'self'),
      h('cam_e3','Escudo de Valor','-30% daño aliados 2t',15,true,'ally'),
    ]},
  { id: 'ladron', name: 'Ladrón', classType: 'assassin', hp: 2600, defense: 15, damage: 15, avatar: '🗡️', color: '#8b5cf6',
    imageFront: '/placeholders/ladron.png', imageBack: '/placeholders/ladron_back.png',
    passiveDescription: '🗡️ Pasiva: +50 daño con cartas [daga]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados roban carta al eliminar',
    abilities: [
      h('lad_h1','Asalto','Destruye defensa 2t, 100 daño',10,false),
      h('lad_h2','Puñalada Trapera','x2 daño si enemigo <40% HP',8,false),
      h('lad_h3','Robo Veloz','Roba 1 carta + 50 daño',9,false),
      h('lad_e1','Sabotaje','-150 ataque enemigos',6,true,'ally'),
      h('lad_e2','Emboscada Mortal','Aliados ataque adicional',8,true,'ally'),
      h('lad_e3','Confusión Estratégica','+2 CD habilidades enemigo',12,true),
    ]},
  { id: 'lancero', name: 'Lancero', classType: 'warrior', hp: 3200, defense: 55, damage: 40, avatar: '🔱', color: '#0ea5e9',
    imageFront: '/placeholders/lancero.png', imageBack: '/placeholders/lancero_back.png',
    passiveDescription: '🔱 Pasiva: +70 daño con cartas [lanza]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados ignoran 10 defensa',
    abilities: [
      h('lan_h1','Perforación','Ignora def + -20 def 2t',10,false),
      h('lan_h2','Estocada','+50% daño si enemigo <50%',12,false),
      h('lan_h3','Carga Lancera','130 daño a objetivo',8,false),
      h('lan_e1','Punta de Lanza','+150 daño aliados 2t',10,true,'ally'),
      h('lan_e2','Formación Falange','+500 def absorbible',12,true,'ally'),
      h('lan_e3','Ataque Coordinado','Ignoran defensa 1t',15,true,'ally'),
    ]},
  { id: 'ballestero', name: 'Ballestero', classType: 'archer', hp: 3200, defense: 35, damage: 50, avatar: '🎯', color: '#84cc16',
    imageFront: '/placeholders/ballestero.png', imageBack: '/placeholders/ballestero_back.png',
    passiveDescription: '🎯 Pasiva: +50 daño con [arco][ballesta]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados ignoran 10 def con arcos',
    abilities: [
      h('bal_h1','Disparo Preciso','150 daño ignora defensa',8,false),
      h('bal_h2','Barrage de Flechas','+80 daño a todos',10,false),
      h('bal_h3','Puntería Letal','+200 daño si <50% HP',12,false),
      h('bal_e1','Apoyo Táctico','+50 daño aliados arcos',10,true,'ally'),
      h('bal_e2','Confusión de Flechas','Aturde enemigo',12,true),
      h('bal_e3','Cazador de Presas','x2 daño a objetivo 2t',15,true),
    ]},
  { id: 'mercenario', name: 'Mercenario', classType: 'assassin', hp: 3400, defense: 50, damage: 40, avatar: '💰', color: '#a3a3a3',
    imageFront: '/placeholders/mercenario.png', imageBack: '/placeholders/mercenario_back.png',
    passiveDescription: '💰 Pasiva: +30 daño, gana oro al eliminar',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +1 carta extra inicial',
    abilities: [
      h('mer_h1','Regateo Audaz','Roba carta y la juega',12,false),
      h('mer_h2','Contrato','120 daño a objetivo',8,false),
      h('mer_h3','Mercado Negro','150 daño ignora defensa',20,false),
      h('mer_e1','Alianza Ocasional','+60 daño aliados 2t',12,true,'ally'),
      h('mer_e2','Contrato Renegado','-50 def enemigos 1t',25,true,'any'),
      h('mer_e3','Engaño','Confunde rival',15,true),
    ]},
  { id: 'medico', name: 'Médico', classType: 'healer', hp: 2400, defense: 10, damage: 10, avatar: '🩺', color: '#14b8a6',
    imageFront: '/placeholders/medico.png', imageBack: '/placeholders/medico_back.png',
    passiveDescription: '🩺 Pasiva: +50% a todas las curaciones',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +200 HP máx',
    abilities: [
      h('med_h1','Toque Curativo','Cura 200 HP',8,false,'ally_or_self'),
      h('med_h2','Medicina Caducada','100 daño a enemigo',10,false),
      h('med_h3','Cirugía de Campo','Cura 400 HP',12,false,'ally_or_self'),
      h('med_e1','Infección','120 daño a enemigo',12,true),
      h('med_e2','Aura Curativa','+80 HP aliados x5t',10,true,'ally'),
      h('med_e3','La Cura','Elimina efectos + 500 HP',18,true,'ally'),
    ]},
  { id: 'asesino', name: 'Asesino', classType: 'assassin', hp: 2500, defense: 10, damage: 60, avatar: '💀', color: '#334155',
    imageFront: '/placeholders/asesino.png', imageBack: '/placeholders/asesino_back.png',
    passiveDescription: '💀 Pasiva: +60 daño con cartas [veneno][daga]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +30 daño con venenos',
    abilities: [
      h('ase_h1','Veneno Rápido','100 daño veneno x4t',8,false),
      h('ase_h2','Corte Mortal','x2 daño 2 turnos',8,false,'self'),
      h('ase_h3','Sombra Asesina','Invisible 1t +50% ataque',10,false,'self'),
      h('ase_e1','Acecho','+50% daño recibido enemigo 3t',8,true),
      h('ase_e2','Emboscada','Ignora def +50% daño',10,true),
      h('ase_e3','Hermandad Sangre','Cura aliado 300 HP',12,true,'ally'),
    ]},
  { id: 'pirata', name: 'Pirata', classType: 'assassin', hp: 3000, defense: 35, damage: 55, avatar: '🏴‍☠️', color: '#7c3aed',
    imageFront: '/placeholders/pirata.png', imageBack: '/placeholders/pirata_back.png',
    passiveDescription: '🏴‍☠️ Pasiva: +80 daño con cartas [pirata][ladrón]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados roban carta al ganar',
    abilities: [
      h('pir_h1','Robo de Botín','Roba carta y la usa',8,false),
      h('pir_h2','Cañonazo','150 daño a objetivo',9,false),
      h('pir_h3','Tormenta en Alta Mar','200 daño a todos',12,false),
      h('pir_e1','Parley','-400 daño aliados 1t',18,true,'ally'),
      h('pir_e2','Alianza Corsarios','+100 ataque aliados',10,true,'ally'),
      h('pir_e3','Viento a Favor','Aliado +1 carta extra',10,true,'ally'),
    ]},
  { id: 'mosquetero', name: 'Mosquetero', classType: 'archer', hp: 3000, defense: 45, damage: 45, avatar: '🔫', color: '#b45309',
    imageFront: '/placeholders/mosquetero.png', imageBack: '/placeholders/mosquetero_back.png',
    passiveDescription: '🔫 Pasiva: +60 daño con cartas [fuego][polvora]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +30 daño con fuego',
    abilities: [
      h('mos_h1','Experto Pólvora','+100 daño próx ataque',8,false,'self'),
      h('mos_h2','Doble Descarga','180 daño a objetivo',12,false),
      h('mos_h3','Táctica Guerrilla','-50% daño recibido 1t',10,false,'self'),
      h('mos_e1','Fuego de Cobertura','+60 daño aliados fuego',6,true,'ally'),
      h('mos_e2','Disparo Coordinado','x2 daño aliado mismo obj',10,true,'ally'),
      h('mos_e3','Aumento de Moral','+70 daño y def 3t',15,true,'ally'),
    ]},
  { id: 'cruzado', name: 'Cruzado', classType: 'tank', hp: 3800, defense: 100, damage: 60, avatar: '⛪', color: '#fbbf24',
    imageFront: '/placeholders/cruzado.png', imageBack: '/placeholders/cruzado_back.png',
    passiveDescription: '⛪ Pasiva: +30 def, refleja 20% daño recibido',
    teamPassiveDescription: '👥 Pasiva equipo: aliados -15% daño recibido',
    abilities: [
      h('cru_h1','Baluarte Divino','+150 def 3t',5,false,'self'),
      h('cru_h2','Escudo Sagrado','Mitiga todo + refleja',10,false,'self'),
      h('cru_h3','Rezo de Fortaleza','+500 HP +50 def',12,false,'self'),
      h('cru_e1','Muro de Fe','+50 def aliados 5t',10,true,'ally'),
      h('cru_e2','Guardián de la Cruz','Evade ataque aliado',15,true,'ally'),
      h('cru_e3','Aura de Protección','-50% daño aliados 3t',12,true,'ally'),
    ]},
  { id: 'mago', name: 'Mago', classType: 'mage', hp: 2000, defense: 10, damage: 80, avatar: '🔮', color: '#a855f7',
    imageFront: '/placeholders/mago.png', imageBack: '/placeholders/mago_back.png',
    passiveDescription: '🔮 Pasiva: +50% daño con cartas [magia][hechizo]',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +25% daño mágico',
    abilities: [
      h('mag_h1','Escudo Arcano','-50% daño recibido 2t',8,false,'self'),
      h('mag_h2','Sanación Mística','Cura 300 HP',7,false,'self'),
      h('mag_h3','Bola de Fuego','180 daño mágico',9,false),
      h('mag_e1','Protección Mágica','-50% daño mágico equipo',10,true,'ally'),
      h('mag_e2','Rayo de Energía','300 daño a todos',12,true),
      h('mag_e3','Aura Regeneración','+100 HP aliados x3t',15,true,'ally'),
    ]},
  { id: 'ninja', name: 'Ninja', classType: 'assassin', hp: 2200, defense: 5, damage: 65, avatar: '🥷', color: '#1e293b',
    imageFront: '/placeholders/ninja.png', imageBack: '/placeholders/ninja_back.png',
    passiveDescription: '🥷 Pasiva: +200 daño si no fue atacado turno anterior',
    teamPassiveDescription: '👥 Pasiva equipo: aliados +50 daño sigiloso',
    abilities: [
      h('nin_h1','Ataque Sorpresa','200 daño si no fue atacado',6,false),
      h('nin_h2','Golpe Sigiloso','+50% daño próx ataque',8,false,'self'),
      h('nin_h3','Humo','Invulnerable 1 turno',12,false,'self'),
      h('nin_e1','Corte de Sombras','200 daño a todos',10,true),
      h('nin_e2','Trampa de Humo','-50% daño aliados 2t',10,true,'ally'),
      h('nin_e3','Shuriken Explosivo','150 daño -30 def',12,true),
    ]},
  { id: 'samurai', name: 'Samurái', classType: 'warrior', hp: 3500, defense: 60, damage: 70, avatar: '⚔️', color: '#dc2626',
    imageFront: '/placeholders/samurai.png', imageBack: '/placeholders/samurai_back.png',
    passiveDescription: '⚔️ Pasiva: refleja 100 daño al atacante al ser golpeado',
    teamPassiveDescription: '👥 Pasiva equipo: aliados reflejan 50 daño',
    abilities: [
      h('sam_h1','Jarakiri','180 daño -30 def enemigo',8,false),
      h('sam_h2','Kōsokudō','Al recibir ataque, 100 al atacante',10,false,'self'),
      h('sam_h3','Tetsu no Kōtei','+100 def 3t + refleja 50%',12,false,'self'),
      h('sam_e1','Senshi','+80 daño aliados 4t',10,true,'ally'),
      h('sam_e2','Kōzui','+50 def -50% daño aliados 3t',12,true,'ally'),
      h('sam_e3','Bōgyo','120 daño -20 daño enemigo 2t',10,true),
    ]},
];

// ════════════════════════════════════════════════════════════
// CARTAS JUGABLES
// ════════════════════════════════════════════════════════════
export const playableCards: PlayableCard[] = [
  // ⚔️ DAÑO DIRECTO
  { id: 'charco_acido', name: 'Charco de Ácido', type: 'damage', value: -35, description: '-35 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_charco_acido.png', tags: ['acido'] },
  { id: 'bola_canon', name: 'Bola de Cañón', type: 'damage', value: -50, description: '-50 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_bola_canon.png', tags: ['polvora','fuego'] },
  { id: 'rayo', name: 'Rayo', type: 'damage', value: -45, description: '-45 daño mágico', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_rayo.png', tags: ['magia','hechizo'] },
  { id: 'meteorito', name: 'Meteorito', type: 'damage', value: -90, description: '-90 daño devastador', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_meteorito.png', tags: ['magia','hechizo','fuego'] },
  { id: 'daga', name: 'Daga Rápida', type: 'damage', value: -20, description: '-20 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_daga.png', tags: ['daga','melee'] },
  { id: 'lanza', name: 'Lanza Afilada', type: 'damage', value: -55, description: '-55 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_lanza.png', tags: ['lanza','melee'] },
  { id: 'hachazo', name: 'Hachazo', type: 'damage', value: -65, description: '-65 daño brutal', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_hachazo.png', tags: ['espada','melee'] },
  { id: 'espada_corta', name: 'Espada Corta', type: 'damage', value: -35, description: '-35 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_espada_corta.png', tags: ['espada','melee'] },
  { id: 'espada_larga', name: 'Espada Larga', type: 'damage', value: -70, description: '-70 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_espada_larga.png', tags: ['espada','melee'] },
  { id: 'mandoble', name: 'Mandoble', type: 'damage', value: -85, description: '-85 daño masivo', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_mandoble.png', tags: ['espada','melee'] },
  { id: 'martillo', name: 'Martillo de Guerra', type: 'damage', value: -75, description: '-75 daño aplastante', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_martillo.png', tags: ['melee'] },

  // 🏹 ARCOS Y FLECHAS
  { id: 'arco_corto', name: 'Arco Corto', type: 'damage', value: -40, description: '-40 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_arco_corto.png', tags: ['arco','flecha'] },
  { id: 'arco_largo', name: 'Arco Largo', type: 'damage', value: -60, description: '-60 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_arco_largo.png', tags: ['arco','flecha'] },
  { id: 'arco_mongol', name: 'Arco Mongol', type: 'damage', value: -80, description: '-80 daño', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_arco_mongol.png', tags: ['arco','flecha','ballesta'] },
  { id: 'flecha_fuego', name: 'Flecha de Fuego', type: 'damage_over_time', value: -25, description: '-25/t x3 (final)', effectTiming: 'end_of_turn', duration: 3, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_flecha_fuego.png', tags: ['arco','flecha','fuego'] },
  { id: 'flecha_envenenada', name: 'Flecha Envenenada', type: 'damage_over_time', value: -15, description: '-15/t x5 (ignora def)', effectTiming: 'start_of_turn', duration: 5, isInstant: false, ignoresDefense: true, targetMode: 'enemy', imageFront: '/placeholders/card_flecha_veneno.png', tags: ['arco','flecha','veneno'] },

  // ☠️ DoT
  { id: 'veneno', name: 'Veneno', type: 'damage_over_time', value: -15, description: '-15/t x5', effectTiming: 'start_of_turn', duration: 5, isInstant: false, ignoresDefense: true, targetMode: 'enemy', imageFront: '/placeholders/card_veneno.png', tags: ['veneno','daga'] },
  { id: 'fuego', name: 'Fuego', type: 'damage_over_time', value: -30, description: '-30/t x3', effectTiming: 'end_of_turn', duration: 3, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_fuego.png', tags: ['fuego','magia'] },
  { id: 'sangria', name: 'Sangría', type: 'damage_over_time', value: -20, description: '-20/t x4', effectTiming: 'start_of_turn', duration: 4, isInstant: false, ignoresDefense: true, targetMode: 'enemy', imageFront: '/placeholders/card_sangria.png', tags: ['daga','veneno'] },
  { id: 'maldicion', name: 'Maldición', type: 'damage_over_time', value: -25, description: '-25/t x4', effectTiming: 'start_of_turn', duration: 4, isInstant: false, ignoresDefense: true, targetMode: 'enemy', imageFront: '/placeholders/card_maldicion.png', tags: ['magia','hechizo'] },
  { id: 'plaga', name: 'Plaga', type: 'damage_over_time', value: -10, description: '-10/t x6', effectTiming: 'start_of_turn', duration: 6, isInstant: false, ignoresDefense: true, targetMode: 'enemy', imageFront: '/placeholders/card_plaga.png', tags: ['veneno'] },

  // 💚 CURACIÓN
  { id: 'pocion_menor', name: 'Poción Menor', type: 'heal', value: 50, description: '+50 HP', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_pocion_menor.png', tags: ['cura'] },
  { id: 'pocion_media', name: 'Poción Media', type: 'heal', value: 100, description: '+100 HP', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_pocion_media.png', tags: ['cura'] },
  { id: 'pocion_mayor', name: 'Poción Mayor', type: 'heal', value: 200, description: '+200 HP', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_pocion_mayor.png', tags: ['cura'] },
  { id: 'ventaje', name: 'Ventaje', type: 'heal', value: 30, description: '+30 HP', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_ventaje.png', tags: ['cura'] },
  { id: 'bendicion', name: 'Bendición', type: 'heal', value: 75, description: '+75 HP', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_bendicion.png', tags: ['cura','magia'] },
  { id: 'pocion_elixir', name: 'Elixir', type: 'heal', value: 300, description: '+300 HP', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_pocion_elixir.png', tags: ['cura'] },

  // 🛡️ DEFENSA
  { id: 'escudo_men', name: 'Escudo Menor', type: 'defense', value: 15, description: '+15 def x2t', effectTiming: 'immediate', duration: 2, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_escudo_men.png' },
  { id: 'escudo_may', name: 'Escudo Mayor', type: 'defense', value: 30, description: '+30 def x2t', effectTiming: 'immediate', duration: 2, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_escudo_may.png' },
  { id: 'rompe_armadura', name: 'Rompe Armadura', type: 'defense', value: -25, description: '-25 def x3t', effectTiming: 'immediate', duration: 3, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_rompe_armadura.png', tags: ['melee'] },
  { id: 'blindaje', name: 'Blindaje Total', type: 'defense', value: 50, description: '+50 def x1t', effectTiming: 'immediate', duration: 1, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_blindaje.png' },
  { id: 'coraza', name: 'Coraza', type: 'defense', value: 40, description: '+40 def x3t', effectTiming: 'immediate', duration: 3, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_coraza.png' },

  // 💨 INSTANTÁNEAS
  { id: 'esquive', name: 'Esquivar', type: 'dodge', value: 0, description: 'Evade el daño', effectTiming: 'on_damage_taken', duration: 0, isInstant: true, instantCondition: 'Al recibir ataque', targetMode: 'self', imageFront: '/placeholders/card_esquive.png' },
  { id: 'contraataque', name: 'Contraataque', type: 'special', value: 2, description: 'Devuelve daño x2', effectTiming: 'on_damage_taken', duration: 0, isInstant: true, instantCondition: 'Al recibir ataque', targetMode: 'self', imageFront: '/placeholders/card_contraataque.png' },
  { id: 'represalia', name: 'Represalia', type: 'special', value: 3, description: 'Devuelve daño x3', effectTiming: 'on_damage_taken', duration: 0, isInstant: true, instantCondition: 'Al recibir daño >50', targetMode: 'self', imageFront: '/placeholders/card_represalia.png' },
  { id: 'absorber', name: 'Absorber', type: 'special', value: 0, description: 'Daño → curación', effectTiming: 'on_damage_taken', duration: 0, isInstant: true, instantCondition: 'Al recibir ataque', targetMode: 'self', imageFront: '/placeholders/card_absorber.png' },

  // 🎯 UTILIDAD
  { id: 'ver_carta', name: 'Ver Carta', type: 'utility', value: 0, description: 'Revela mano enemiga', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_ver_carta.png' },
  { id: 'robar_carta', name: 'Robar Carta', type: 'utility', value: 0, description: 'Roba 1 carta', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_robar.png', tags: ['pirata','ladron'] },
  { id: 'intercambio', name: 'Intercambio', type: 'utility', value: 0, description: 'Intercambia manos', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_intercambio.png', tags: ['pirata','ladron'] },
  { id: 'descarte', name: 'Descarte Forzado', type: 'utility', value: 0, description: 'Enemigo descarta 2', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_descarte.png' },
  { id: 'barajeo', name: 'Barajeo', type: 'utility', value: 0, description: 'Baraja el mazo', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_barajeo.png' },
  { id: 'robo_extra', name: 'Robo Extra', type: 'utility', value: 0, description: 'Roba 2 cartas', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_robo_extra.png' },

  // ⭐ ESPECIALES
  { id: 'multiplicador_2', name: 'Potenciar', type: 'special', value: 2, description: 'Próx. ataque x2', effectTiming: 'immediate', duration: 1, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_potenciar.png' },
  { id: 'multiplicador_3', name: 'Potenciar Max', type: 'special', value: 3, description: 'Próx. ataque x3', effectTiming: 'immediate', duration: 1, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_potenciar_extremo.png' },
  { id: 'racha_7', name: 'Racha de 7', type: 'special', value: 7, description: 'Hasta 7 cartas/turno', effectTiming: 'immediate', duration: 1, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_racha7.png' },
  { id: 'silencio', name: 'Silencio', type: 'special', value: 0, description: 'Sin habilidades 2t', effectTiming: 'immediate', duration: 2, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_silencio.png', tags: ['magia'] },
  { id: 'aturdimiento', name: 'Aturdimiento', type: 'special', value: 0, description: 'Pierde próx. turno', effectTiming: 'immediate', duration: 1, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_aturdir.png' },
  { id: 'furia', name: 'Furia', type: 'special', value: 0, description: '+50 daño -20 def 2t', effectTiming: 'immediate', duration: 2, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_furia.png' },
  { id: 'regeneracion', name: 'Regeneración', type: 'special', value: 25, description: '+25 HP/t x4', effectTiming: 'start_of_turn', duration: 4, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_regen.png', tags: ['cura'] },

  // ⚠️ TRAMPAS
  { id: 'trampa_explosiva', name: 'Trampa Explosiva', type: 'special', value: -40, description: 'Devuelve 40 al atacar', effectTiming: 'immediate', duration: 3, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_trampa_exp.png' },
  { id: 'trampa_veneno', name: 'Trampa Venenosa', type: 'special', value: -20, description: 'Veneno atacante 3t', effectTiming: 'immediate', duration: 3, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_trampa_ven.png', tags: ['veneno'] },
  { id: 'trampa_espejo', name: 'Trampa Espejo', type: 'special', value: 2, description: 'Refleja x2 próx ataque', effectTiming: 'immediate', duration: 3, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_trampa_esp.png' },

  // 💎 ÉPICAS
  { id: 'cometa', name: 'Cometa Celestial', type: 'elemental', value: -120, description: '-120 daño cósmico + aturde 1t', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_cometa.png', tags: ['magia', 'hechizo'] },
  { id: 'tormenta_milenaria', name: 'Tormenta Milenaria', type: 'elemental', value: -95, description: '-95 daño a TODOS los enemigos', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_tormenta_millen.png' },
  { id: 'portal_dim', name: 'Portal Dimensional', type: 'summon', value: 50, description: '+50 HP/t + elimina debuffs x4t', effectTiming: 'start_of_turn', duration: 4, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_portal.png' },
  { id: 'sombra_ancestral', name: 'Sombra Ancestral', type: 'summon', value: -30, description: '-30/t x6 a enemigo, cura a ti 15/t', effectTiming: 'start_of_turn', duration: 6, isInstant: false, ignoresDefense: true, targetMode: 'enemy', imageFront: '/placeholders/card_sombra_anc.png' },
  { id: 'eco_maligno', name: 'Eco Maligno', type: 'curse', value: -40, description: 'Objetivo recibe -40 def 4t', effectTiming: 'immediate', duration: 4, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_eco_maligno.png' },
  { id: 'inmunidad_total', name: 'Inmunidad Divina', type: 'buff', value: 0, description: 'Inmune a TODO daño 2 turnos', effectTiming: 'immediate', duration: 2, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_inmunidad.png' },
  { id: 'frenesi_sangriento', name: 'Frenesí Sangriento', type: 'buff', value: 0, description: '+100 daño base 2t, -50% curación', effectTiming: 'immediate', duration: 2, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_frenesi.png' },
  { id: 'escudo_total', name: 'Escudo Infinito', type: 'defense', value: 999, description: '+999 defensa 1t (absorbe casi todo)', effectTiming: 'immediate', duration: 1, isInstant: false, targetMode: 'ally_or_self', imageFront: '/placeholders/card_escudo_inf.png' },
  { id: 'contra_total', name: 'Contraataque Letal', type: 'counter', value: 5, description: 'Devuelve daño x5', effectTiming: 'on_damage_taken', duration: 0, isInstant: true, instantCondition: 'Al recibir daño', targetMode: 'self', imageFront: '/placeholders/card_contra_letal.png' },
  { id: 'invocacion_suprema', name: 'Invocación Suprema', type: 'ritual', value: -250, description: '-250 daño masivo a un enemigo', effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_invoc_sup.png' },
  { id: 'campo_temp', name: 'Campo Temporal', type: 'terrain', value: 0, description: 'El tiempo se detiene: +1 turno extra', effectTiming: 'immediate', duration: 1, isInstant: false, targetMode: 'self', imageFront: '/placeholders/card_campo_temp.png' },
  { id: 'espada_infinita', name: 'Espada Infinita', type: 'channel', value: -30, description: '-30/t se duplica cada turno (max 240)', effectTiming: 'start_of_turn', duration: 5, isInstant: false, targetMode: 'enemy', imageFront: '/placeholders/card_espada_inf.png' },

  // ═══════════════════════════════════════════════════════════════
  // 💎 CARTAS CON FÓRMULAS MATEMÁTICAS (dinámicas/moddables)
  // ═══════════════════════════════════════════════════════════════
  // Estas cartas evalúan una fórmula matemática al jugarse.
  // Operadores: + - * / ^ %   Funciones: sqrt, abs, min, max, floor
  // Variables: attacker.hp, target.hp, attacker.lostHp, target.def, turn
  // Comparaciones y ternario: (target.hpPct < 30 ? attacker.dmg * 3 : attacker.dmg)

  { id: 'formula_vital', name: 'Golpe Vital', type: 'damage', value: -10, rarity: 'rare',
    description: '-20% del HP actual del enemigo',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_vital.png',
    formula: { expression: 'target.hp * 0.2', resultType: 'damage' } },

  { id: 'formula_furia', name: 'Furia Desesperada', type: 'damage', value: -10, rarity: 'epic',
    description: 'Daño = √(HP perdido) × 10',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_furia.png',
    formula: { expression: 'sqrt(attacker.lostHp) * 10', resultType: 'damage' } },

  { id: 'formula_exponencial', name: 'Golpe Exponencial', type: 'damage', value: -10, rarity: 'legendary',
    description: 'Daño = tu daño_base ^ 1.5',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_exp.png',
    formula: { expression: 'attacker.dmg ^ 1.5', resultType: 'damage' } },

  { id: 'formula_pct', name: 'Porcentaje Letal', type: 'damage', value: -10, rarity: 'rare',
    description: 'Daño = 15% HP máx enemigo + 50',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_pct.png',
    formula: { expression: 'target.maxHp * 0.15 + 50', resultType: 'damage' } },

  { id: 'formula_condicional', name: 'Ejecución', type: 'damage', value: -10, rarity: 'epic',
    description: 'Si HP enemigo < 30%: x3 daño base; sino: daño base',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_ejec.png',
    formula: { expression: 'target.hpPct < 30 ? attacker.dmg * 3 : attacker.dmg', resultType: 'damage' } },

  { id: 'formula_acumulador', name: 'Castigo Acumulado', type: 'damage', value: -10, rarity: 'rare',
    description: 'Daño = 25 × cantidad de DoTs activos',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_acum.png', tags: ['dot_synergy'],
    formula: { expression: 'target.dots * 25', resultType: 'damage' } },

  { id: 'formula_raiz', name: 'Raíz Curativa', type: 'heal', value: 10, rarity: 'rare',
    description: 'Cura = √(tu HP perdido) × 8',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'ally_or_self',
    imageFront: '/placeholders/card_formula_raiz.png', tags: ['cura'],
    formula: { expression: 'sqrt(attacker.lostHp) * 8', resultType: 'heal' } },

  { id: 'formula_escudo', name: 'Escudo Adaptativo', type: 'defense', value: 10, rarity: 'rare',
    description: 'Defensa = 10% de tu HP máx',
    effectTiming: 'immediate', duration: 2, isInstant: false, targetMode: 'ally_or_self',
    imageFront: '/placeholders/card_formula_escudo.png',
    formula: { expression: 'attacker.maxHp * 0.1', resultType: 'defense' } },

  { id: 'formula_turno', name: 'Carga Temporal', type: 'damage', value: -10, rarity: 'epic',
    description: 'Daño = turno_actual × 15',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_turno.png',
    formula: { expression: 'turn * 15', resultType: 'damage' } },

  { id: 'formula_minmax', name: 'Golpe Balanceado', type: 'damage', value: -10, rarity: 'uncommon',
    description: 'Daño = min(tu daño_base × 2, 200)',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_bal.png',
    formula: { expression: 'min(attacker.dmg * 2, 200)', resultType: 'damage' } },

  { id: 'formula_modulo', name: 'Golpe Cíclico', type: 'damage', value: -10, rarity: 'uncommon',
    description: 'Daño = (turno % 5 + 1) × 40',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_ciclo.png',
    formula: { expression: '(turn % 5 + 1) * 40', resultType: 'damage' } },

  { id: 'formula_random', name: 'Caos Arcano', type: 'damage', value: -10, rarity: 'epic',
    description: 'Daño = aleatorio entre 50 y 250',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_caos.png', tags: ['magia'],
    formula: { expression: 'floor(rand() * 200) + 50', resultType: 'damage' } },

  { id: 'formula_divina', name: 'Justicia Divina', type: 'damage', value: -10, rarity: 'legendary',
    description: 'Daño = (HP perdido enemigo) × 0.5',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_just.png',
    formula: { expression: 'target.lostHp * 0.5', resultType: 'damage' } },

  { id: 'formula_poder', name: 'Poder Absoluto', type: 'damage', value: -10, rarity: 'legendary',
    description: 'Daño = (tu HP actual + daño_base) / 2',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_poder.png',
    formula: { expression: '(attacker.hp + attacker.dmg) / 2', resultType: 'damage' } },

  { id: 'formula_berserker', name: 'Sed de Sangre', type: 'damage_over_time', value: -10, rarity: 'epic',
    description: 'DoT = 5% HP máx enemigo por turno (3t)',
    effectTiming: 'start_of_turn', duration: 3, isInstant: false, ignoresDefense: true, targetMode: 'enemy',
    imageFront: '/placeholders/card_formula_bers.png', tags: ['bleed'],
    formula: { expression: 'target.maxHp * 0.05', resultType: 'damage' } },

  // ═══════════════════════════════════════════════════════════════
  // 🧩 CARTAS MODULARES (sistema de `effects` componibles)
  // ═══════════════════════════════════════════════════════════════
  // Estas cartas usan el motor `effects[]` declarativo. Ideales como
  // referencia para hacer mods. Combinan: daño, DoT, buffs, multi-target,
  // choice (elegir), skip-turn, sinergias, acumulables, etc.

  // ── MULTI-OBJETIVO: el jugador elige varios enemigos ──
  { id: 'lluvia_acida', name: 'Lluvia Ácida', type: 'damage', value: -40, rarity: 'epic',
    description: '-40 daño a TODOS los enemigos + ácido (DoT 10/t x2)',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'all_enemies',
    imageFront: '/placeholders/card_lluvia_acida.png', tags: ['acido', 'aoe'],
    effects: [
      { kind: 'damage', target: 'all_enemies', amount: 40, label: 'Lluvia Ácida' },
      { kind: 'dot', target: 'all_enemies', amount: 10, duration: 2, stackKey: 'acido', applyTags: ['acido'], label: 'Ácido' },
    ]},

  { id: 'cantico_curativo', name: 'Cántico Curativo', type: 'heal', value: 60, rarity: 'rare',
    description: '+60 HP a todos los aliados + regeneración 20/t x3',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'all_allies',
    imageFront: '/placeholders/card_cantico.png', tags: ['cura', 'aoe'],
    effects: [
      { kind: 'heal', target: 'all_allies', amount: 60 },
      { kind: 'hot', target: 'all_allies', amount: 20, duration: 3, label: 'Regeneración', applyTags: ['regen'] },
    ]},

  // ── SALTO DE TURNO ──
  { id: 'paralisis_temporal', name: 'Parálisis Temporal', type: 'special', value: 0, rarity: 'rare',
    description: 'El enemigo pierde su próximo turno',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_paralisis.png', tags: ['control'],
    effects: [
      { kind: 'skip_turn', target: 'enemy', applyTags: ['skipped'] },
    ]},

  { id: 'doble_accion', name: 'Doble Acción', type: 'buff', value: 0, rarity: 'epic',
    description: 'Juegas un TURNO EXTRA después de este',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_doble.png', tags: ['tiempo'],
    effects: [
      { kind: 'extra_turn', target: 'self' },
    ]},

  // ── CHOICE: dos opciones al jugar ──
  { id: 'eleccion_oscura', name: 'Elección Oscura', type: 'special', value: 0, rarity: 'epic',
    description: 'ELIGE: 80 daño puro · O · curarte 80 HP + 20 def',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'any',
    imageFront: '/placeholders/card_eleccion.png', tags: ['choice'],
    effects: [
      { kind: 'choice', label: 'Elige tu camino', choices: [
        { label: '⚔️ Atacar (-80 al enemigo)', effects: [
          { kind: 'damage', target: 'enemy', amount: 80 },
        ]},
        { label: '💚 Defender (+80 HP, +20 def)', effects: [
          { kind: 'heal', target: 'self', amount: 80 },
          { kind: 'defense_buff', target: 'self', amount: 20 },
        ]},
      ]},
    ]},

  { id: 'pacto_arcano', name: 'Pacto Arcano', type: 'ritual', value: 0, rarity: 'legendary',
    description: 'ELIGE: drenar 100 HP · O · sacrificar 50 HP por 150 daño',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_pacto.png', tags: ['choice', 'magia'],
    effects: [
      { kind: 'choice', label: 'Pacto', choices: [
        { label: '🩸 Drenar 100 HP (vida-robo)', effects: [
          { kind: 'lifesteal', target: 'enemy', amount: 100 },
        ]},
        { label: '💀 Sacrificio: -50 propio +150 daño', effects: [
          { kind: 'transfer_hp', target: 'enemy', amount: 0 },
          { kind: 'damage', target: 'self', amount: 50 },
          { kind: 'damage', target: 'enemy', amount: 150 },
        ]},
      ]},
    ]},

  // ── ACUMULABLES (stack_effect) ──
  { id: 'marca_caza', name: 'Marca de Caza', type: 'curse', value: 0, rarity: 'uncommon',
    description: 'Apila marca de caza (acumulable, x5 max). +15 dmg recibido por stack',
    effectTiming: 'immediate', duration: 4, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_marca_caza.png', tags: ['hunt', 'stack'],
    effects: [
      { kind: 'stack_effect', target: 'enemy', amount: -15, duration: 4,
        stackKey: 'hunt_mark', maxStacks: 5, label: '🏹 Marca de Caza', applyTags: ['marked'] },
    ]},

  { id: 'llamas_persistentes', name: 'Llamas Persistentes', type: 'damage_over_time', value: -15, rarity: 'rare',
    description: 'Llamas acumulables: cada copia añade 15/t x3',
    effectTiming: 'start_of_turn', duration: 3, isInstant: false, ignoresDefense: true, targetMode: 'enemy',
    imageFront: '/placeholders/card_llamas_pers.png', tags: ['fire', 'stack'],
    effects: [
      { kind: 'stack_effect', target: 'enemy', amount: -15, duration: 3,
        stackKey: 'fire_stack', maxStacks: 10, label: '🔥 Llamas', applyTags: ['fire'] },
    ]},

  // ── SINERGIA / CONDICIONAL ──
  { id: 'remate_letal', name: 'Remate Letal', type: 'damage', value: -60, rarity: 'rare',
    description: '-60 daño base. Si el enemigo está por debajo del 30% HP, ¡ejecuta!',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_remate.png', tags: ['execute'],
    effects: [
      { kind: 'damage', target: 'enemy', amount: 60 },
      { kind: 'conditional',
        condition: { targetHpBelow: 30 },
        ifTrue: [ { kind: 'execute', target: 'enemy', amount: 30 } ],
      },
    ]},

  { id: 'represalia_total', name: 'Represalia Total', type: 'damage', value: -10, rarity: 'epic',
    description: 'Si TU HP < 30%: x3 daño. Sino: daño normal',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_represalia_total.png', tags: ['desperate'],
    effects: [
      { kind: 'conditional',
        condition: { attackerHpBelow: 30 },
        ifTrue: [ { kind: 'damage', target: 'enemy', formula: 'attacker.dmg * 3', label: 'Represalia Letal' } ],
        ifFalse: [ { kind: 'damage', target: 'enemy', formula: 'attacker.dmg' } ],
      },
    ]},

  // ── COMBINACIÓN COMPLEJA: daño + DoT + buff propio + debuff ──
  { id: 'tormenta_furia', name: 'Tormenta de Furia', type: 'damage', value: -50, rarity: 'legendary',
    description: '-50 daño + sangrado 3t + tú ganas +30 dmg 2t + enemigo silenciado 1t',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_tormenta_furia.png', tags: ['combo', 'bleed', 'silence'],
    effects: [
      { kind: 'damage', target: 'enemy', amount: 50 },
      { kind: 'dot', target: 'enemy', amount: 20, duration: 3, stackKey: 'bleed', applyTags: ['bleed'], label: 'Sangrado' },
      { kind: 'buff_self', target: 'self', amount: 30, duration: 2, label: '⚔️ Furia' } as any,
      { kind: 'silence', target: 'enemy', duration: 1, applyTags: ['silenced'] },
    ]},

  // ── REVELAR Y ROBAR ──
  { id: 'rapina_completa', name: 'Rapiña Completa', type: 'utility', value: 0, rarity: 'rare',
    description: 'Revela mano enemiga + roba 2 cartas + descarta 1',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_rapina.png', tags: ['pirata', 'ladron'],
    effects: [
      { kind: 'reveal_hand', target: 'enemy' },
      { kind: 'draw_cards', target: 'self', amount: 2 },
      { kind: 'discard', target: 'enemy', amount: 1 },
    ]},

  // ── EJECUTAR + CONDICIÓN POR DOTS ──
  { id: 'detonar_dots', name: 'Detonar Plagas', type: 'damage', value: -10, rarity: 'epic',
    description: 'Daño = 30 × cantidad de DoTs en el enemigo. Los consume.',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_detonar.png', tags: ['dot_synergy'],
    effects: [
      { kind: 'damage', target: 'enemy', formula: 'target.dots * 30', label: 'Detonación' },
      { kind: 'cleanse', target: 'enemy' },
    ]},

  // ── ESCUDO + REFLECT ──
  { id: 'fortaleza_espejo', name: 'Fortaleza Espejo', type: 'defense', value: 50, rarity: 'rare',
    description: '+50 defensa + refleja x2 próximo daño (2t)',
    effectTiming: 'immediate', duration: 2, isInstant: false, targetMode: 'self',
    imageFront: '/placeholders/card_fort_espejo.png', tags: ['shield', 'reflect'],
    effects: [
      { kind: 'defense_buff', target: 'self', amount: 50 },
      { kind: 'reflect', target: 'self', amount: 2, duration: 2, label: 'Espejo Mágico' },
    ]},

  // ── MARCA + ACUMULACIÓN ──
  { id: 'cazador_supremo', name: 'Cazador Supremo', type: 'curse', value: 0, rarity: 'epic',
    description: 'Marca enemigo con tag [hunted]. Sinergiza con cartas de caza.',
    effectTiming: 'immediate', duration: 5, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_cazador.png', tags: ['hunt', 'tag'],
    effects: [
      { kind: 'set_tag', target: 'enemy', applyTags: ['hunted'], duration: 5, label: '🎯 Cazado' },
      { kind: 'damage', target: 'enemy', amount: 20 },
    ]},

  // ── MULTI-TARGET CON SUB-EFECTOS ──
  { id: 'explosion_arcana', name: 'Explosión Arcana', type: 'elemental', value: -45, rarity: 'legendary',
    description: 'A cada enemigo: -45 daño + DoT fuego 15/t x2 + silencio 1t',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'all_enemies',
    imageFront: '/placeholders/card_explosion_arc.png', tags: ['magia', 'aoe', 'fire'],
    effects: [
      { kind: 'multi_target', target: 'all_enemies', effects: [
        { kind: 'damage', amount: 45 },
        { kind: 'dot', amount: 15, duration: 2, stackKey: 'fire', applyTags: ['fire'], label: 'Fuego Arcano' },
        { kind: 'silence', duration: 1, applyTags: ['silenced'] },
      ]},
    ]},

  // ── EJEMPLO PEDIDO: daño que ignora defensa + daño por turno ──
  { id: 'virote_septico', name: 'Virote Séptico', type: 'damage', value: -35, rarity: 'epic',
    description: '35 daño que IGNORA defensa + veneno 18/t x3',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_virote_septico.png', tags: ['ballesta', 'veneno', 'pierce'],
    effects: [
      { kind: 'damage', target: 'enemy', amount: 35, ignoresDefense: true, label: 'Perforación Séptica' },
      { kind: 'dot', target: 'enemy', amount: 18, duration: 3, ignoresDefense: true, stackKey: 'septic', applyTags: ['veneno', 'septic'], label: 'Sepsis' },
    ]},

  { id: 'hoja_fantasma', name: 'Hoja Fantasma', type: 'damage', value: -60, rarity: 'epic',
    description: '60 daño que ignora defensa. Si el objetivo ya está marcado, además sangra 20/t x2',
    effectTiming: 'immediate', duration: 0, isInstant: false, targetMode: 'enemy',
    imageFront: '/placeholders/card_hoja_fantasma.png', tags: ['daga', 'pierce', 'bleed'],
    effects: [
      { kind: 'damage', target: 'enemy', amount: 60, ignoresDefense: true, label: 'Hoja Etérea' },
      { kind: 'conditional', condition: { targetHasTag: 'marked' }, ifTrue: [
        { kind: 'dot', target: 'enemy', amount: 20, duration: 2, ignoresDefense: true, stackKey: 'bleed', applyTags: ['bleed'], label: 'Sangrado Fantasma' }
      ]},
    ]},
];

// ════════════════════════════════════════════════════════════
// COMBOS
// ════════════════════════════════════════════════════════════
export interface Combo { id: string; name: string; requiredCards: string[]; description: string; effectDescription: string; isTeamCombo: boolean; bonusValue: number; }

export const combos: Combo[] = [
  { id: 'combo_espia', name: 'Espía Maestro', requiredCards: ['ver_carta', 'robar_carta'], description: 'Ver + Robar', effectDescription: 'Ves la mano y robas carta', isTeamCombo: false, bonusValue: 0 },
  { id: 'combo_tormenta', name: 'Tormenta Elemental', requiredCards: ['fuego', 'veneno'], description: 'Fuego + Veneno', effectDescription: '+50 daño', isTeamCombo: false, bonusValue: 50 },
  { id: 'combo_doble_fil', name: 'Doble Filo', requiredCards: ['multiplicador_2', 'bola_canon'], description: 'Potenciar + Cañón', effectDescription: '+50 daño', isTeamCombo: false, bonusValue: 50 },
  { id: 'combo_cura', name: 'Curación Divina', requiredCards: ['pocion_mayor', 'bendicion'], description: 'Poción + Bendición', effectDescription: '+50 HP', isTeamCombo: false, bonusValue: 50 },
  { id: 'combo_plaga', name: 'Plaga Letal', requiredCards: ['veneno', 'sangria'], description: 'Veneno + Sangría', effectDescription: '+40 daño', isTeamCombo: false, bonusValue: 40 },
  { id: 'combo_berserker', name: 'Berserker', requiredCards: ['furia', 'multiplicador_3'], description: 'Furia + Potenciar Max', effectDescription: '+80 daño', isTeamCombo: false, bonusValue: 80 },
  { id: 'combo_dot', name: 'Maestro DoT', requiredCards: ['veneno', 'fuego', 'sangria'], description: '3 DoTs', effectDescription: '+100 daño', isTeamCombo: false, bonusValue: 100 },
  { id: 'combo_arcos', name: 'Lluvia de Arcos', requiredCards: ['arco_corto', 'arco_largo', 'arco_mongol'], description: '3 arcos', effectDescription: '+90 daño', isTeamCombo: false, bonusValue: 90 },
  { id: 'combo_ladron', name: 'Ladrón Profesional', requiredCards: ['ver_carta', 'robar_carta', 'intercambio'], description: 'Triple utilidad', effectDescription: 'Roba 3 cartas', isTeamCombo: false, bonusValue: 0 },
  { id: 'combo_guerrero', name: 'Furia del Guerrero', requiredCards: ['hachazo', 'mandoble'], description: '2 armas pesadas', effectDescription: '+70 daño', isTeamCombo: false, bonusValue: 70 },
];

// ─── Integrar cartas conceptuales y trampas ──────────────────
// cardConcepts.ts: ejemplos por concepto (referencia de modding)
// trapCards.ts:    trampas, robo selectivo y mecánicas de cementerio
import { conceptCards, conceptCombos } from './cardConcepts';
import { trapCards } from './trapCards';

// Todas las cartas base del juego = catálogo principal + conceptuales + trampas
export const allBaseCards: PlayableCard[] = [...playableCards, ...conceptCards, ...trapCards];

export function getAllCharacters(): CharacterCard[] { return characterCards; }
export function getAllCombos(): Combo[] { return [...combos, ...conceptCombos]; }
