// ============================================================
// MOTOR DE FÓRMULAS MATEMÁTICAS
// ============================================================
// Permite que las cartas/mods definan efectos con fórmulas
// matemáticas seguras en lugar de valores fijos.
//
// OPERADORES SOPORTADOS:
//   +  suma
//   -  resta / negación
//   *  multiplicación
//   /  división (con protección /0)
//   ^  potencia
//   %  módulo
//
// FUNCIONES SOPORTADAS:
//   sqrt(x)   raíz cuadrada
//   abs(x)    valor absoluto
//   min(a,b)  mínimo
//   max(a,b)  máximo
//   floor(x)  redondeo hacia abajo
//   ceil(x)   redondeo hacia arriba
//   round(x)  redondeo
//   rand()    aleatorio 0-1
//
// VARIABLES DISPONIBLES:
//   attacker.hp, attacker.maxHp, attacker.def, attacker.dmg, attacker.lostHp, attacker.hpPct
//   target.hp, target.maxHp, target.def, target.dmg, target.lostHp, target.hpPct, target.dots
//   turn, cardsPlayed, random
//
// EJEMPLOS:
//   "target.hp * 0.2"              → 20% del HP del target
//   "sqrt(attacker.lostHp) * 10"   → √(HP perdido) × 10
//   "attacker.dmg ^ 1.5"           → daño elevado a 1.5
//   "min(target.hp, 500)"          → como mucho 500
//   "target.hpPct < 30 ? attacker.dmg * 3 : attacker.dmg"
// ============================================================

import { Player } from '../types/game';

// ─── Contexto de evaluación ───────────────────────────────
export interface FormulaContext {
  attacker?: Player;
  target?: Player;
  turn?: number;
  cardsPlayed?: number;
  random?: number;
}

// ─── Tokenizer ─────────────────────────────────────────────
type TokenType = 'number' | 'op' | 'paren' | 'var' | 'func' | 'comma' | 'ternary' | 'cmp';

interface Token {
  type: TokenType;
  value: string | number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = expr.replace(/\s+/g, '');

  while (i < src.length) {
    const c = src[i];

    // Número (con decimales)
    if (/[0-9.]/.test(c)) {
      let num = '';
      while (i < src.length && /[0-9.]/.test(src[i])) {
        num += src[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    // Operadores matemáticos
    if ('+-*/^%'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }

    // Comparaciones y ternario
    if (c === '<' || c === '>' || c === '!' || c === '=') {
      let op = c;
      i++;
      if (src[i] === '=') { op += '='; i++; }
      tokens.push({ type: 'cmp', value: op });
      continue;
    }

    if (c === '?') { tokens.push({ type: 'ternary', value: '?' }); i++; continue; }
    if (c === ':') { tokens.push({ type: 'ternary', value: ':' }); i++; continue; }

    // Paréntesis
    if (c === '(' || c === ')') {
      tokens.push({ type: 'paren', value: c });
      i++;
      continue;
    }

    // Coma
    if (c === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue; }

    // Identificador (variable o función)
    if (/[a-zA-Z_]/.test(c)) {
      let id = '';
      while (i < src.length && /[a-zA-Z_0-9.]/.test(src[i])) {
        id += src[i++];
      }
      // Ver si es función (le sigue un paréntesis)
      if (src[i] === '(') {
        tokens.push({ type: 'func', value: id });
      } else {
        tokens.push({ type: 'var', value: id });
      }
      continue;
    }

    throw new Error(`Carácter inválido: '${c}' en fórmula`);
  }

  return tokens;
}

// ─── Parser recursivo descendente ─────────────────────────
// Grammar (precedencia baja → alta):
//   expr       = ternary
//   ternary    = cmp ('?' cmp ':' cmp)?
//   cmp        = add (('<'|'>'|'<='|'>='|'=='|'!=') add)?
//   add        = mul (('+'|'-') mul)*
//   mul        = pow (('*'|'/'|'%') pow)*
//   pow        = unary ('^' unary)*     (right-associative)
//   unary      = ('-'|'+')? call
//   call       = func '(' args ')' | primary
//   primary    = number | var | '(' expr ')'

class Parser {
  private tokens: Token[];
  private pos = 0;
  private ctx: FormulaContext;

  constructor(tokens: Token[], ctx: FormulaContext) {
    this.tokens = tokens;
    this.ctx = ctx;
  }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private next(): Token { return this.tokens[this.pos++]; }
  private expect(type: TokenType, value?: string): Token {
    const t = this.next();
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(`Esperaba ${type}${value ? ` '${value}'` : ''}, encontré ${t?.value}`);
    }
    return t;
  }

  parse(): number {
    const result = this.parseTernary();
    if (this.pos < this.tokens.length) {
      throw new Error(`Tokens sobrantes al final: ${this.tokens.slice(this.pos).map(t => t.value).join(' ')}`);
    }
    return result;
  }

  private parseTernary(): number {
    const cond = this.parseCmp();
    if (this.peek()?.value === '?') {
      this.next(); // ?
      const yes = this.parseTernary();
      this.expect('ternary', ':');
      const no = this.parseTernary();
      return cond !== 0 ? yes : no;
    }
    return cond;
  }

  private parseCmp(): number {
    let left = this.parseAdd();
    while (this.peek()?.type === 'cmp') {
      const op = this.next().value as string;
      const right = this.parseAdd();
      switch (op) {
        case '<': left = left < right ? 1 : 0; break;
        case '>': left = left > right ? 1 : 0; break;
        case '<=': left = left <= right ? 1 : 0; break;
        case '>=': left = left >= right ? 1 : 0; break;
        case '==': left = left === right ? 1 : 0; break;
        case '!=': left = left !== right ? 1 : 0; break;
      }
    }
    return left;
  }

  private parseAdd(): number {
    let left = this.parseMul();
    while (this.peek()?.type === 'op' && (this.peek()?.value === '+' || this.peek()?.value === '-')) {
      const op = this.next().value;
      const right = this.parseMul();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseMul(): number {
    let left = this.parsePow();
    while (this.peek()?.type === 'op' && ('*/%'.includes(this.peek()!.value as string))) {
      const op = this.next().value;
      const right = this.parsePow();
      if (op === '*') left = left * right;
      else if (op === '/') left = right !== 0 ? left / right : 0;
      else left = right !== 0 ? left % right : 0;
    }
    return left;
  }

  private parsePow(): number {
    const base = this.parseUnary();
    if (this.peek()?.type === 'op' && this.peek()?.value === '^') {
      this.next();
      const exp = this.parsePow(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(): number {
    if (this.peek()?.type === 'op' && this.peek()?.value === '-') {
      this.next();
      return -this.parseCall();
    }
    if (this.peek()?.type === 'op' && this.peek()?.value === '+') {
      this.next();
    }
    return this.parseCall();
  }

  private parseCall(): number {
    if (this.peek()?.type === 'func') {
      const fn = this.next().value as string;
      this.expect('paren', '(');
      const args: number[] = [];
      if (this.peek()?.value !== ')') {
        args.push(this.parseTernary());
        while (this.peek()?.value === ',') {
          this.next();
          args.push(this.parseTernary());
        }
      }
      this.expect('paren', ')');
      return this.callFunction(fn, args);
    }
    return this.parsePrimary();
  }

  private callFunction(name: string, args: number[]): number {
    switch (name.toLowerCase()) {
      case 'sqrt': return Math.sqrt(args[0] ?? 0);
      case 'abs': return Math.abs(args[0] ?? 0);
      case 'min': return Math.min(...args);
      case 'max': return Math.max(...args);
      case 'floor': return Math.floor(args[0] ?? 0);
      case 'ceil': return Math.ceil(args[0] ?? 0);
      case 'round': return Math.round(args[0] ?? 0);
      case 'rand': case 'random': return Math.random();
      case 'pow': return Math.pow(args[0] ?? 0, args[1] ?? 0);
      default: throw new Error(`Función desconocida: ${name}`);
    }
  }

  private parsePrimary(): number {
    const t = this.next();
    if (!t) throw new Error('Expresión incompleta');

    if (t.type === 'number') return t.value as number;

    if (t.type === 'var') {
      return this.resolveVar(t.value as string);
    }

    if (t.type === 'paren' && t.value === '(') {
      const val = this.parseTernary();
      this.expect('paren', ')');
      return val;
    }

    throw new Error(`Token inesperado: ${t.value}`);
  }

  private resolveVar(name: string): number {
    const { attacker, target, turn = 1, cardsPlayed = 0 } = this.ctx;

    // Variables globales
    if (name === 'turn') return turn;
    if (name === 'cardsPlayed') return cardsPlayed;
    if (name === 'random' || name === 'rand') return Math.random();

    // Variables del atacante
    if (name.startsWith('attacker.') && attacker) {
      const prop = name.split('.')[1];
      switch (prop) {
        case 'hp': return attacker.currentHp;
        case 'maxHp': return attacker.maxHp;
        case 'def': return attacker.currentDefense;
        case 'dmg': return attacker.baseDamage;
        case 'lostHp': return Math.max(0, attacker.maxHp - attacker.currentHp);
        case 'hpPct': return (attacker.currentHp / attacker.maxHp) * 100;
      }
    }

    // Variables del objetivo
    if (name.startsWith('target.') && target) {
      const prop = name.split('.')[1];
      switch (prop) {
        case 'hp': return target.currentHp;
        case 'maxHp': return target.maxHp;
        case 'def': return target.currentDefense;
        case 'dmg': return target.baseDamage;
        case 'lostHp': return Math.max(0, target.maxHp - target.currentHp);
        case 'hpPct': return (target.currentHp / target.maxHp) * 100;
        case 'dots': return target.activeEffects.filter(e => e.timing === 'start_of_turn' || e.timing === 'end_of_turn').length;
      }
    }

    // Constantes comunes
    if (name === 'pi') return Math.PI;
    if (name === 'e') return Math.E;

    console.warn(`Variable desconocida en fórmula: ${name}`);
    return 0;
  }
}

// ─── API pública ───────────────────────────────────────────

/**
 * Evalúa una fórmula matemática de forma segura.
 * @param formula - Ej: "target.hp * 0.2" o "sqrt(attacker.lostHp) * 10"
 * @param ctx - Contexto (attacker, target, turn, cardsPlayed)
 * @returns Resultado numérico (redondeado a entero)
 */
export function evalFormula(formula: string, ctx: FormulaContext): number {
  try {
    const tokens = tokenize(formula);
    const parser = new Parser(tokens, ctx);
    const result = parser.parse();
    if (!isFinite(result)) return 0;
    return Math.round(result);
  } catch (err) {
    console.error(`Error evaluando fórmula "${formula}":`, err);
    return 0;
  }
}

/**
 * Valida que una fórmula sea sintácticamente correcta.
 * Devuelve null si es válida, o un string con el error.
 */
export function validateFormula(formula: string): string | null {
  try {
    const tokens = tokenize(formula);
    const parser = new Parser(tokens, { attacker: undefined, target: undefined });
    parser.parse();
    return null;
  } catch (err: any) {
    return err?.message || 'Error desconocido';
  }
}

/**
 * Devuelve una versión human-readable de la fórmula.
 * Útil para mostrar en tooltips.
 */
export function describeFormula(formula: string): string {
  return formula
    .replace(/attacker\.hp/g, 'tu HP')
    .replace(/target\.hp/g, 'HP enemigo')
    .replace(/attacker\.lostHp/g, 'HP perdido')
    .replace(/target\.lostHp/g, 'HP perdido enemigo')
    .replace(/attacker\.dmg/g, 'tu daño')
    .replace(/target\.def/g, 'defensa enemiga')
    .replace(/sqrt\(/g, '√(')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷');
}
