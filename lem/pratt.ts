// Function-based Pratt parser with implicit multiplication.
export type TokenType =
  | "number"
  | "string"
  | "identifier"
  | "operator"
  | "punctuation"
  | "eof";
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}
export type Expr =
  | { type: "Number"; value: number }
  | { type: "String"; value: string }
  | { type: "Boolean"; value: boolean }
  | { type: "Null" }
  | { type: "Identifier"; name: string }
  | { type: "Prefix" | "Postfix"; operator: string; operand: Expr }
  | {
      type: "Binary";
      operator: string;
      left: Expr;
      right: Expr;
      implicit?: boolean;
    }
  | { type: "Conditional"; condition: Expr; consequent: Expr; alternate: Expr }
  | { type: "Call"; callee: Expr; arguments: Expr[] }
  | { type: "Index"; object: Expr; index: Expr }
  | { type: "Member"; object: Expr; property: string };

export interface ParserState {
  tokens: Token[];
  position: number;
  functions: ReadonlySet<string>;
}
const OPERATORS = [
  "===",
  "!==",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "<=",
  ">=",
  "==",
  "!=",
  "&&",
  "||",
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
  "!",
  "~",
  "<",
  ">",
  "=",
  "?",
  ":",
  ".",
];
const INFIX: Record<string, readonly [number, number]> = {
  "=": [10, 10],
  "+=": [10, 10],
  "-=": [10, 10],
  "*=": [10, 10],
  "/=": [10, 10],
  "||": [30, 31],
  "&&": [40, 41],
  "==": [50, 51],
  "!=": [50, 51],
  "===": [50, 51],
  "!==": [50, 51],
  "<": [60, 61],
  "<=": [60, 61],
  ">": [60, 61],
  ">=": [60, 61],
  "+": [70, 71],
  "-": [70, 71],
  "*": [80, 81],
  "/": [80, 81],
  "%": [80, 81],
  "^": [100, 100],
};
const PREFIX = new Set(["+", "-", "!", "~", "++", "--"]);
const POSTFIX = new Set(["!", "++", "--"]);
const IMPLICIT_BP: readonly [number, number] = [80, 81];
const PREFIX_BP = 90;
const POSTFIX_BP = 110;
const ACCESS_BP = 120;
const CONDITIONAL_BP = 20;

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const start = i;
    const char = source[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(char)) {
      while (i < source.length && /[0-9]/.test(source[i])) i++;
      if (source[i] === "." && /[0-9]/.test(source[i + 1] ?? "")) {
        i++;
        while (i < source.length && /[0-9]/.test(source[i])) i++;
      }
      tokens.push({
        type: "number",
        value: source.slice(start, i),
        position: start,
      });
      continue;
    }
    if (/[a-zA-Z_$]/.test(char)) {
      i++;
      while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) i++;
      tokens.push({
        type: "identifier",
        value: source.slice(start, i),
        position: start,
      });
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      i++;
      let value = "";
      let closed = false;
      while (i < source.length) {
        const c = source[i++];
        if (c === quote) {
          closed = true;
          break;
        }
        if (c === "\\") {
          if (i >= source.length)
            throw new SyntaxError(`Unterminated escape at ${start}`);
          const escaped = source[i++];
          const escapes: Record<string, string> = {
            n: "\n",
            r: "\r",
            t: "\t",
            "\\": "\\",
            '"': '"',
            "'": "'",
          };
          if (!(escaped in escapes))
            throw new SyntaxError(`Unsupported escape at ${i - 2}`);
          value += escapes[escaped];
        } else value += c;
      }
      if (!closed) throw new SyntaxError(`Unterminated string at ${start}`);
      tokens.push({ type: "string", value, position: start });
      continue;
    }
    if ("()[]{},;".includes(char)) {
      tokens.push({ type: "punctuation", value: char, position: i++ });
      continue;
    }
    const op = OPERATORS.find((x) => source.startsWith(x, i));
    if (op) {
      tokens.push({ type: "operator", value: op, position: i });
      i += op.length;
      continue;
    }
    throw new SyntaxError(`Unexpected character '${char}' at ${i}`);
  }
  tokens.push({ type: "eof", value: "<eof>", position: i });
  return tokens;
}

export function peek(state: ParserState): Token {
  return state.tokens[state.position] ?? state.tokens[state.tokens.length - 1];
}
export function consume(state: ParserState): Token {
  const token = peek(state);
  if (token.type !== "eof") state.position++;
  return token;
}
export function expect(state: ParserState, value: string): Token {
  const token = peek(state);
  if (token.value !== value)
    throw new SyntaxError(
      `Expected '${value}', got '${token.value}' at ${token.position}`,
    );
  return consume(state);
}
export function canStartImplicit(token: Token): boolean {
  return (
    token.type === "number" ||
    token.type === "identifier" ||
    token.value === "("
  );
}
export function isFunctionCall(left: Expr, state: ParserState): boolean {
  return left.type === "Identifier" && state.functions.has(left.name);
}
export function parseArguments(state: ParserState): Expr[] {
  const args: Expr[] = [];
  if (peek(state).value === ")") return args;
  while (true) {
    args.push(parseExpression(state, 0));
    if (peek(state).value !== ",") break;
    consume(state);
    if (peek(state).value === ")") break;
  }
  return args;
}
export function parsePrefix(state: ParserState): Expr {
  const token = consume(state);
  if (token.type === "number")
    return { type: "Number", value: Number(token.value) };
  if (token.type === "string") return { type: "String", value: token.value };
  if (token.type === "identifier") {
    if (token.value === "true" || token.value === "false")
      return { type: "Boolean", value: token.value === "true" };
    if (token.value === "null") return { type: "Null" };
    return { type: "Identifier", name: token.value };
  }
  if (token.value === "(") {
    const expr = parseExpression(state, 0);
    expect(state, ")");
    return expr;
  }
  if (PREFIX.has(token.value)) {
    return {
      type: "Prefix",
      operator: token.value,
      operand: parseExpression(state, PREFIX_BP),
    };
  }
  throw new SyntaxError(
    `Unexpected token '${token.value}' at ${token.position}`,
  );
}
export function parseExpression(state: ParserState, minBP = 0): Expr {
  let left = parsePrefix(state);
  while (true) {
    const token = peek(state);
    if (token.value === "(" && isFunctionCall(left, state)) {
      if (ACCESS_BP < minBP) break;
      consume(state);
      const args = parseArguments(state);
      expect(state, ")");
      left = { type: "Call", callee: left, arguments: args };
      continue;
    }
    if (token.value === "[") {
      if (ACCESS_BP < minBP) break;
      consume(state);
      const index = parseExpression(state, 0);
      expect(state, "]");
      left = { type: "Index", object: left, index };
      continue;
    }
    if (token.value === ".") {
      if (ACCESS_BP < minBP) break;
      consume(state);
      const property = consume(state);
      if (property.type !== "identifier")
        throw new SyntaxError(`Expected property name at ${property.position}`);
      left = { type: "Member", object: left, property: property.value };
      continue;
    }
    if (POSTFIX.has(token.value)) {
      if (POSTFIX_BP < minBP) break;
      consume(state);
      left = { type: "Postfix", operator: token.value, operand: left };
      continue;
    }
    if (token.value === "?") {
      if (CONDITIONAL_BP < minBP) break;
      consume(state);
      const consequent = parseExpression(state, 0);
      expect(state, ":");
      const alternate = parseExpression(state, CONDITIONAL_BP);
      left = { type: "Conditional", condition: left, consequent, alternate };
      continue;
    }
    const bp = INFIX[token.value];
    if (bp) {
      if (bp[0] < minBP) break;
      consume(state);
      const right = parseExpression(state, bp[1]);
      left = { type: "Binary", operator: token.value, left, right };
      continue;
    }
    if (canStartImplicit(token)) {
      if (IMPLICIT_BP[0] < minBP) break;
      const right = parseExpression(state, IMPLICIT_BP[1]);
      left = { type: "Binary", operator: "*", left, right, implicit: true };
      continue;
    }
    break;
  }
  return left;
}
export function parse(
  source: string,
  functions: ReadonlySet<string> = new Set(),
): Expr {
  const state: ParserState = {
    tokens: tokenize(source),
    position: 0,
    functions,
  };
  const result = parseExpression(state);
  if (peek(state).type !== "eof")
    throw new SyntaxError(
      `Unexpected token '${peek(state).value}' at ${peek(state).position}`,
    );
  return result;
}
