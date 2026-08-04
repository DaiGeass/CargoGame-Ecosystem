// ============================================================
// MOTOR DE FÓRMULAS MATEMÁTICAS (real, alineado con CARGAS)
// ============================================================
import { Player } from '../types/game';

export interface FormulaContext {
  attacker?: Player;
  target?: Player;
  turn?: number;
  cardsPlayed?: number;
  random?: number;
}

type TokenType = 'number' | 'op' | 'paren' | 'var' | 'func' | 'comma' | 'ternary' | 'cmp';

interface Token { type: TokenType; value: string | number; }

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = expr.replace(/\s+/g, '');

  while (i < src.length) {
    const c = src[i];
    if (/[0-9.]/.test(c)) {
      let num = '';
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    if ('+-*/^%'.includes(c)) { tokens.push({ type: 'op', value: c }); i++; continue; }
    if (c === '<' || c === '>' || c === '!' || c === '=') {
      let op = c; i++;
      if (src[i] === '=') { op += '='; i++; }
      tokens.push({ type: 'cmp', value: op });
      continue;
    }
    if (c === '?') { tokens.push({ type: 'ternary', value: '?' }); i++; continue; }
    if (c === ':') { tokens.push({ type: 'ternary', value: ':' }); i++; continue; }
    if (c === '(' || c === ')') { tokens.push({ type: 'paren', value: c }); i++; continue; }
    if (c === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue; }
    if (/[a-zA-Z_]/.test(c)) {
      let id = '';
      while (i < src.length && /[a-zA-Z_0-9.]/.test(src[i])) id += src[i++];
      tokens.push({ type: src[i] === '(' ? 'func' : 'var', value: id });
      continue;
    }
    throw new Error(`Carácter inválido: '${c}' en fórmula`);
  }
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private ctx: FormulaContext;

  constructor(tokens: Token[], ctx: FormulaContext) { this.tokens = tokens; this.ctx = ctx; }

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
      this.next();
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
      const exp = this.parsePow();
      return Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(): number {
    if (this.peek()?.type === 'op' && this.peek()?.value === '-') { this.next(); return -this.parseCall(); }
    if (this.peek()?.type === 'op' && this.peek()?.value === '+') { this.next(); }
    return this.parseCall();
  }

  private parseCall(): number {
    if (this.peek()?.type === 'func') {
      const fn = this.next().value as string;
      this.expect('paren', '(');
      const args: number[] = [];
      if (this.peek()?.value !== ')') {
        args.push(this.parseTernary());
        while (this.peek()?.value === ',') { this.next(); args.push(this.parseTernary()); }
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
    if (t.type === 'var') return this.resolveVar(t.value as string);
    if (t.type === 'paren' && t.value === '(') {
      const val = this.parseTernary();
      this.expect('paren', ')');
      return val;
    }
    throw new Error(`Token inesperado: ${t.value}`);
  }

  private resolveVar(name: string): number {
    const { attacker, target, turn = 1, cardsPlayed = 0 } = this.ctx;
    if (name === 'turn') return turn;
    if (name === 'cardsPlayed') return cardsPlayed;
    if (name === 'random' || name === 'rand') return Math.random();
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
    if (name === 'pi') return Math.PI;
    if (name === 'e') return Math.E;
    console.warn(`Variable desconocida en fórmula: ${name}`);
    return 0;
  }
}

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
