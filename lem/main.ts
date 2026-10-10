export function print<T>(source: T) {
  /** Returns a pretty-print tree of the given Object `Obj`. */
  const treestring = <T extends object>(
    Obj: T,
    cbfn?: (node: unknown) => void,
  ) => {
    const prefix = (key: keyof T, last: boolean) => {
      let str = last ? "└" : "├";
      if (key) str += "─ ";
      else str += "──┐";
      return str;
    };
    const getKeys = (obj: T) => {
      const keys: (keyof T)[] = [];
      for (const branch in obj) {
        if (!obj.hasOwnProperty(branch) || typeof obj[branch] === "function") {
          continue;
        }
        keys.push(branch);
      }
      return keys;
    };
    const grow = (
      key: keyof T,
      root: unknown,
      last: boolean,
      prevstack: [T, boolean][],
      cb: (str: string) => unknown,
    ) => {
      if (cbfn) {
        cbfn(root);
      }
      let line = "";
      let index = 0;
      let lastKey = false;
      let circ = false;
      const stack = prevstack.slice(0);
      if (stack.push([root as T, last]) && stack.length > 0) {
        prevstack.forEach(function (lastState, idx) {
          if (idx > 0) line += (lastState[1] ? " " : "│") + "  ";
          if (!circ && lastState[0] === root) circ = true;
        });
        line += prefix(key, last) + key.toString();
        if (typeof root !== "object") line += ": " + root;
        if (circ) {
          line += " (circular ref.)";
        }
        cb(line);
      }
      if (!circ && typeof root === "object") {
        const keys = getKeys(root as T);
        keys.forEach((branch) => {
          lastKey = ++index === keys.length;
          grow(branch, (root as T)[branch], lastKey, stack, cb);
        });
      }
    };
    let output = "";
    const obj = Object.assign({}, Obj);
    grow(
      "." as keyof T,
      obj,
      false,
      [],
      (line: string) => (output += line + "\n"),
    );
    return output;
  };
  if (source instanceof Left) {
    source = source.unwrap();
  }
  if (source instanceof Right) {
    source = source.unwrap();
  }
  if (Array.isArray(source)) {
    source = treestring(source as object) as T;
    console.log(source);
    return source;
  }
  if (source instanceof Glitch) {
    const str = source.report();
    console.log(str);
    return str;
  }
  console.log(source);
  return source;
}

/* eslint-disable prefer-const */
enum TokenType {
  // Single-character tokens
  left_paren,
  right_paren,
  left_brace,
  right_brace,
  left_bracket,
  right_bracket,
  comma,
  dot,
  minus,
  plus,
  semicolon,
  slash,
  star,
  at,
  bang,
  pound,
  percent,
  caret,
  ampersand,
  equal,
  tick,
  eroteme,
  less,
  greater,
  colon,
  vbar,
  tilde,

  indent,
  dedent,

  bang_equal,
  equal_equal,
  less_equal,
  greater_equal,

  identifier,
  string,
  integer,
  float,
  complex,
  fraction,

  // logical operators
  not,
  and,
  nand,
  or,
  nor,
  xnor,
  imply,
  nimply,
  converse,
  nonconverse,
  iff,

  // booleans
  true,
  false,

  // literal null
  nil,

  // number-like literals
  nan,
  inf,

  // keywords
  class,
  if,
  else,
  return,
  super,
  this,
  var,
  const,
  let,
  fn,

  // special tokens
  eof,
  newline,
}

/** A Primitive object type. */
type Primitive = string | number | null | boolean;

/**
 * An object representing a token in LEM.
 */
class Token {
  _type: TokenType;
  _lexeme: string;
  _literal: Primitive;
  _line: number;
  _column: number;
  constructor(
    type: TokenType,
    lexeme: string,
    line: number,
    column: number,
    literal: Primitive = null,
  ) {
    this._type = type;
    this._lexeme = lexeme;
    this._line = line;
    this._column = column;
    this._literal = literal;
  }
  clone() {
    return new Token(
      this._type,
      this._lexeme,
      this._line,
      this._column,
      this._literal,
    );
  }
  static tokenTypeName(type: TokenType): string {
    switch (type) {
      case TokenType.left_paren:
        return "left_paren";
      case TokenType.right_paren:
        return "right_paren";
      case TokenType.left_brace:
        return "left_brace";
      case TokenType.right_brace:
        return "right_brace";
      case TokenType.left_bracket:
        return "left_bracket";
      case TokenType.right_bracket:
        return "right_bracket";
      case TokenType.comma:
        return "comma";
      case TokenType.dot:
        return "dot";
      case TokenType.minus:
        return "minus";
      case TokenType.plus:
        return "plus";
      case TokenType.semicolon:
        return "semicolon";
      case TokenType.slash:
        return "slash";
      case TokenType.star:
        return "star";
      case TokenType.at:
        return "at";
      case TokenType.bang:
        return "bang";
      case TokenType.pound:
        return "pound";
      case TokenType.percent:
        return "percent";
      case TokenType.caret:
        return "caret";
      case TokenType.ampersand:
        return "ampersand";
      case TokenType.equal:
        return "equal";
      case TokenType.tick:
        return "tick";
      case TokenType.eroteme:
        return "eroteme";
      case TokenType.less:
        return "less";
      case TokenType.greater:
        return "greater";
      case TokenType.colon:
        return "colon";
      case TokenType.vbar:
        return "vbar";
      case TokenType.tilde:
        return "tilde";
      case TokenType.indent:
        return "indent";
      case TokenType.dedent:
        return "dedent";
      case TokenType.bang_equal:
        return "bang_equal";
      case TokenType.equal_equal:
        return "equal_equal";
      case TokenType.less_equal:
        return "less_equal";
      case TokenType.greater_equal:
        return "greater_equal";
      case TokenType.identifier:
        return "identifier";
      case TokenType.string:
        return "string";
      case TokenType.integer:
        return "integer";
      case TokenType.float:
        return "float";
      case TokenType.complex:
        return "complex";
      case TokenType.fraction:
        return "fraction";
      case TokenType.not:
        return "not";
      case TokenType.and:
        return "and";
      case TokenType.nand:
        return "nand";
      case TokenType.or:
        return "or";
      case TokenType.nor:
        return "nor";
      case TokenType.xnor:
        return "xnor";
      case TokenType.imply:
        return "imply";
      case TokenType.nimply:
        return "nimply";
      case TokenType.converse:
        return "converse";
      case TokenType.nonconverse:
        return "nonconverse";
      case TokenType.iff:
        return "iff";
      case TokenType.true:
        return "true";
      case TokenType.false:
        return "false";
      case TokenType.nil:
        return "nil";
      case TokenType.nan:
        return "nan";
      case TokenType.inf:
        return "inf";
      case TokenType.class:
        return "class";
      case TokenType.if:
        return "if";
      case TokenType.else:
        return "else";
      case TokenType.return:
        return "return";
      case TokenType.super:
        return "super";
      case TokenType.this:
        return "this";
      case TokenType.var:
        return "var";
      case TokenType.const:
        return "const";
      case TokenType.let:
        return "let";
      case TokenType.fn:
        return "fn";
      case TokenType.eof:
        return "eof";
      case TokenType.newline:
        return "newline";
      default:
        return "unknown";
    }
  }
  static empty() {
    return new Token(TokenType.nil, "nil", 0, 0, null);
  }
  static tokenTypeString(type: TokenType): string {
    return Token.tokenTypeName(type);
  }
  toString() {
    const type = Token.tokenTypeString(this._type);
    return `[${type} ${this._lexeme} ${this._literal} ${this._line}:${this._column}]`;
  }
  type(t: TokenType) {
    return new Token(t, this._lexeme, this._line, this._column, this._literal);
  }
  line(l: number) {
    return new Token(this._type, this._lexeme, l, this._column, this._literal);
  }
  lit(p: Primitive) {
    return new Token(this._type, this._lexeme, this._line, this._column, p);
  }
  lex(l: string) {
    return new Token(this._type, l, this._line, this._column, this._literal);
  }
}

/**
 * A type of glitch.
 * * `lexical error`: An error that occurred during scanning.
 * * `syntax error`: An error that occurred during parsing.
 * * `type error`: An error that occurred during type-checking.
 * * `environment error`: An error that occurred during an environment lookup.
 * * `runtime error`: An error that occurred during execution.
 */
type GlitchType =
  | "lexical-error"
  | "syntax-error"
  | "type-error"
  | "environment-error"
  | "runtime-error";

/**
 * An object representing a programming error.
 */
class Glitch extends Error {
  _message: string;
  _type: GlitchType;
  _line: number;
  _column: number;
  constructor(message: string, type: GlitchType, line: number, column: number) {
    super(message);
    this._message = message;
    this._type = type;
    this._line = line;
    this._column = column;
  }

  /** Returns a report of this Glitch. */
  report() {
    return `On line ${this._line}, a ${this._type} occurred: ${this._message}`;
  }

  /** Returns a copy of this Glitch. */
  clone() {
    return new Glitch(this._message, this._type, this._line, this._column);
  }

  /** Returns a copy of this Glitch, with the line set to `l`. */
  line(l: number) {
    return new Glitch(this._message, this._type, l, this._column);
  }

  /** Returns a copy of this Glitch, with the type set to `t`. */
  type(t: GlitchType) {
    return new Glitch(this._message, t, this._line, this._column);
  }
}

/**
 * Factory function returning a new Glitch.
 * @param message The glitch's explanatory message.
 * @param type The glitch's type.
 * @param line The line this glitch was found on, defaulting to 0.
 * @returns a new `Glitch`.
 */
function glitch(
  message: string,
  type: GlitchType,
  line: number = 0,
  column: number = 0,
) {
  return new Glitch(message, type, line, column);
}

/**
 * Creates a new token.
 * @param type The `TokenType` for this token.
 * @param lexeme This token's lexeme.
 * @param line The line this token was scanned on.
 * @returns A new `Token`.
 */
function token(type: TokenType, lexeme: string, line: number, column: number) {
  return new Token(type, lexeme, line, column);
}

/** Returns true if the given character is an ASCII digit. */
function isASCIIDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

/** Returns true if the given character is a digit (including unicode digits). */
function isDigit(char: string) {
  return isASCIIDigit(char);
}

/** Returns true if the given character is the start of an identifier. */
function isIdentifierStart(char: string): boolean {
  return (
    (char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_"
  );
}
/** Returns true if the given character is part of an identifier. */
function isIdentifierPart(char: string): boolean {
  return isIdentifierStart(char) || isDigit(char);
}

/** Scans the given program and returns a list of tokens. */
function scan(program: string) {
  /** Record of all keywords in the language. */
  const keywords: Record<string, TokenType> = {
    not: TokenType.not,
    and: TokenType.and,
    nand: TokenType.nand,
    or: TokenType.or,
    nor: TokenType.nor,
    xnor: TokenType.xnor,
    imply: TokenType.imply,
    nimply: TokenType.nimply,
    converse: TokenType.converse,
    nonconverse: TokenType.nonconverse,
    iff: TokenType.iff,
    true: TokenType.true,
    false: TokenType.false,
    nil: TokenType.nil,
    nan: TokenType.nan,
    inf: TokenType.inf,
    class: TokenType.class,
    if: TokenType.if,
    else: TokenType.else,
    return: TokenType.return,
    super: TokenType.super,
    this: TokenType.this,
    var: TokenType.var,
    const: TokenType.const,
    let: TokenType.let,
    fn: TokenType.fn,
  };
  /** The list of tokens to return. */
  let tokens: Token[] = [];

  /** A stack keeping track of indent levels. */
  const indentStack: number[] = [0];

  /** Given a source code, returns the source code's lines as an array. */
  const programLines = (source: string): string[] =>
    source.replace(/\r\n?/g, "\n").split("\n");

  /**
   * Counts indents.
   */
  const countIndentation = (line: string, lineNumber: number) => {
    let tabs = 0;

    while (tabs < line.length && line[tabs] === "\t") {
      tabs++;
    }

    // A space before the first real token means
    // the writer tried to indent using spaces.
    // LEM does not allow using spaces to indent.
    if (tabs < line.length && line[tabs] === " ") {
      throw glitch(
        `Blocks must be indented with tabs, not spaces`,
        "lexical-error",
        lineNumber,
        tabs + 1,
      );
    }

    return tabs;
  };

  /** Tokenize indentation. */
  const scanIndents = (indentation: number, lineNumber: number) => {
    const currentIndent = indentStack[indentStack.length - 1];

    // add indent tokens
    if (indentation > currentIndent) {
      indentStack.push(indentation);
      tokens.push(token(TokenType.indent, "", lineNumber, 1));
      return;
    }

    // add dedent tokens
    if (indentation < currentIndent) {
      while (
        indentStack.length > 1 &&
        indentation < indentStack[indentStack.length - 1]
      ) {
        indentStack.pop();
        tokens.push(token(TokenType.dedent, "", lineNumber, 1));
      }
    }

    // verify new indent level matches at least previous indent level
    const expectedIndentLevel = indentStack[indentStack.length - 1];
    if (indentation !== expectedIndentLevel) {
      throw glitch(
        `Invalid dedent: Indentation level ${indentation} does not match an outer block.`,
        "lexical-error",
        lineNumber,
        1,
      );
    }
  };

  /** Scans a number. */
  const scanNumber = (
    line: string,
    start: number,
    lineNumber: number,
    type: TokenType,
  ) => {
    let current = start;
    while (current < line.length && isDigit(line[current])) {
      current++;
    }
    // decimal number
    if (
      current < line.length - 1 &&
      line[current] === "." &&
      isDigit(line[current + 1])
    ) {
      type = TokenType.float;
      current++;
      while (current < line.length && isDigit(line[current])) {
        current++;
      }
    }
    const lexeme = line.slice(start, current);
    tokens.push(token(type, lexeme, lineNumber, start + 1));
    return current;
  };

  /** Scans an identifier or keyword. */
  const scanIdentifier = (line: string, start: number, lineNumber: number) => {
    let current = start + 1;
    while (current < line.length && isIdentifierPart(line[current])) {
      current++;
    }
    const lexeme = line.slice(start, current);
    const type = keywords[lexeme] ?? TokenType.identifier;
    tokens.push(token(type, lexeme, lineNumber, start + 1));
    return current;
  };

  /** Scans an operator. */
  const scanOperator = (line: string, current: number, lineNumber: number) => {
    const char = line[current];
    // if (char === undefined) {
    // 	return current;
    // }
    const nextChar = line[current + 1];

    const add = (type: TokenType, length = 1): number => {
      tokens.push(
        token(
          type,
          line.slice(current, current + length),
          lineNumber,
          current + 1,
        ),
      );
      return current + length;
    };
    switch (char) {
      case "(":
        return add(TokenType.left_paren);
      case ")":
        return add(TokenType.right_paren);
      case "{":
        return add(TokenType.left_brace);
      case "}":
        return add(TokenType.right_brace);
      case "[":
        return add(TokenType.left_bracket);
      case "]":
        return add(TokenType.right_bracket);
      case ",":
        return add(TokenType.comma);
      case ".":
        return add(TokenType.dot);
      case "-":
        return add(TokenType.minus);
      case "+":
        return add(TokenType.plus);
      case ";":
        return add(TokenType.semicolon);
      case "/":
        return add(TokenType.slash);
      case "*":
        return add(TokenType.star);
      case "@":
        return add(TokenType.at);
      case "!":
        if (nextChar === "=") {
          return add(TokenType.bang_equal, 2);
        }
        return add(TokenType.bang);
      case "#":
        return add(TokenType.pound);
      case "%":
        return add(TokenType.percent);
      case "^":
        return add(TokenType.caret);
      case "&":
        return add(TokenType.ampersand);
      case "=":
        if (nextChar === "=") {
          return add(TokenType.equal_equal, 2);
        }
        return add(TokenType.equal);
      case "`":
        return add(TokenType.tick);
      case "?":
        return add(TokenType.eroteme);
      case "<":
        if (nextChar === "=") {
          return add(TokenType.less_equal, 2);
        }
        return add(TokenType.less);
      case ">":
        if (nextChar === "=") {
          return add(TokenType.greater_equal, 2);
        }
        return add(TokenType.greater);
      case ":":
        return add(TokenType.colon);
      case "|":
        return add(TokenType.vbar);
      case "~":
        return add(TokenType.tilde);
    }
    throw glitch(
      `Unexpected character: ${char}`,
      "lexical-error",
      lineNumber,
      current + 1,
    );
  };

  /**
   * Tokenizes a single line.
   */
  const tokenizeLine = (line: string, lineNumber: number): void => {
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      return;
    }

    const indent = countIndentation(line, lineNumber);

    scanIndents(indent, lineNumber);

    let current = indent;

    // handle whitespace
    while (current < line.length) {
      const char = line[current];
      const nextChar = line[current + 1];

      // skip whitespace
      if (char === " ") {
        current++;
        continue;
      }

      // tabs are not allowed in the middle of a line
      if (char === "\t") {
        throw glitch(
          `Unexpected tab`,
          "lexical-error",
          lineNumber,
          current + 1,
        );
      }

      // Comments: ignore the rest of the line
      if (char === "#") {
        break;
      }

      // scan numbers
      // scan regular numbers
      if (isDigit(char)) {
        current = scanNumber(line, current, lineNumber, TokenType.integer);
        continue;
      }

      // scan numbers that start with "."
      if (char === "." && isDigit(nextChar)) {
        current = scanNumber(line, current++, lineNumber, TokenType.float);
        continue;
      }

      // scan identifiers and keywords
      if (isIdentifierStart(char)) {
        current = scanIdentifier(line, current, lineNumber);
        continue;
      }

      // scan strings

      // scan operators
      current = scanOperator(line, current, lineNumber);
    }
    tokens.push(token(TokenType.newline, "", lineNumber, current + 1));
    tokens.push(token(TokenType.eof, "", lineNumber, current + 1));
  };

  const tokenize = () => {
    tokens = [];
    const lines = programLines(program);

    // tokenize each of the lines
    for (let i = 0; i < lines.length; i++) {
      tokenizeLine(lines[i], i + 1);
    }
    return tokens;
  };
  try {
    return tokenize();
  } catch (e) {
    return e as Glitch;
  }
}

/** An enumeration of node kinds. */
enum nodekind {
  class_statement,
  block_statement,
  expression_statement,
  negation_expression,
  positivization_expression,
  function_declaration,
  variable_declaration,
  if_statement,
  print_statement,
  return_statement,
  algebraic_binex,
  vector_binex,
  while_statement,
  algebra_string,
  tuple_expression,
  vector_expression,
  matrix_expression,
  factorial_expression,
  assignment_expression,
  parend_expression,
  string_concatenation,
  not_expression,
  native_call,
  call_expression,
  numeric_constant,
  symbol,
  logical_binex,
  let_expression,
  get_expression,
  set_expression,
  super_expression,
  this_expression,
  relation_expression,
  index_expression,
  string,
  bool,
  integer,
  big_integer,
  scientific_number,
  float,
  frac,
  nil,
  unary_plus,
}

interface Visitor<T> {
  handleInteger(node: Integer): T;
  handleNil(node: Nil): T;
  handleExpressionStatement(node: ExpressionStatement): T;
  handleNegation(node: Negation): T;
  handleUnaryPlus(node: UnaryPlus): T;
}

abstract class ASTNode {
  abstract accept<T>(visitor: Visitor<T>): T;
  abstract toString(): string;
  abstract isStatement(): this is Statement;
  abstract isExpression(): this is Expression;
  abstract kind(): nodekind;
}

abstract class Statement extends ASTNode {
  isStatement(): this is Statement {
    return true;
  }
  isExpression(): this is Expression {
    return false;
  }
}

class ExpressionStatement extends Statement {
  toString(): string {
    return "expression-statement";
  }
  kind(): nodekind {
    return nodekind.expression_statement;
  }
  expression: Expression;
  constructor(expression: Expression) {
    super();
    this.expression = expression;
  }
  accept<T>(visitor: Visitor<T>): T {
    return visitor.handleExpressionStatement(this);
  }
}

abstract class Expression extends ASTNode {
  isStatement(): this is Statement {
    return false;
  }
  isExpression(): this is Expression {
    return true;
  }
}

class Integer extends Expression {
  value: number;
  constructor(value: number) {
    super();
    this.value = value;
  }
  accept<T>(visitor: Visitor<T>): T {
    return visitor.handleInteger(this);
  }
  toString(): string {
    return this.value.toString();
  }
  kind(): nodekind {
    return nodekind.integer;
  }
}

class Nil extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.handleNil(this);
  }
  toString(): string {
    return "null";
  }
  value: null = null;
  constructor() {
    super();
  }
  kind(): nodekind {
    return nodekind.nil;
  }
}

class Negation extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.handleNegation(this);
  }
  kind(): nodekind {
    return nodekind.negation_expression;
  }
  toString(): string {
    return `-${this._arg.toString()}`;
  }
  _op: Token;
  _arg: Expression;
  constructor(op: Token, arg: Expression) {
    super();
    this._op = op;
    this._arg = arg;
  }
}

class UnaryPlus extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.handleUnaryPlus(this);
  }
  toString(): string {
    return `+${this._arg.toString()}`;
  }
  kind(): nodekind {
    return nodekind.unary_plus;
  }
  _op: Token;
  _arg: Expression;
  constructor(op: Token, arg: Expression) {
    super();
    this._op = op;
    this._arg = arg;
  }
}

const node = {
  int: (value: number) => new Integer(value),
  nil: () => new Nil(),
  negation: (op: Token, arg: Expression) => new Negation(op, arg),
  unaryPlus: (op: Token, arg: Expression) => new UnaryPlus(op, arg),
  stmt: {
    expression: (expression: Expression) => new ExpressionStatement(expression),
  },
};

type Either<A, B> = Left<A> | Right<B>;

/** An object corresponding to failure. */
class Left<T> {
  private value: T;
  constructor(value: T) {
    this.value = value;
  }
  map(): Either<T, never> {
    return this as unknown as Either<T, never>;
  }
  isLeft(): this is Left<T> {
    return true;
  }
  isRight(): this is never {
    return false;
  }
  unwrap() {
    return this.value;
  }
  chain(): Left<T> {
    return this;
  }
}

/** Returns a new Left with value `x` of type `T`. */
const left = <T>(x: T) => new Left(x);

/** An object corresponding to success. */
class Right<T> {
  private value: T;
  constructor(value: T) {
    this.value = value;
  }
  map<X>(f: (x: T) => X): Either<never, X> {
    return new Right(f(this.value));
  }
  isLeft(): this is never {
    return false;
  }
  isRight(): this is Right<T> {
    return true;
  }
  unwrap() {
    return this.value;
  }
  chain<N, X>(f: (x: T) => Either<N, X>): Either<never, X> {
    return f(this.value) as Either<never, X>;
  }
}

/** Returns a new Right with value `x` of type `T`. */
const right = <T>(x: T) => new Right(x);

/**
 * The binding power of a given operator.
 * Values of type `bp` are used the parsers
 * to determinate operator precedence.
 */
enum BP {
  nil,
  lowest,
  stringop,
  assign,
  atom,
  or,
  nor,
  and,
  nand,
  xor,
  xnor,
  not,
  eq,
  rel,
  sum,
  difference,
  product,
  quotient,
  imul,
  power,
  dot_product,
  postfix,
  call,
}

type Parslet<T> = (current: Token, lastNode: T) => Either<Glitch, T>;
type ParsletEntry<T> = [Parslet<T>, Parslet<T>, BP];
type BPTable<T> = Record<TokenType, ParsletEntry<T>>;

class ParsetateState {
  _error: Glitch | null;
  _tokens: Token[] = [];
  _cursor: number = -1;
  _prev: Token = Token.empty();
  _current: Token = Token.empty();
  _peek: Token = Token.empty();
  _lastExpression: Expression;
  _currentExpression: Expression;
  _lastStatement: nodekind = nodekind.nil;
  _currentStatement: nodekind = nodekind.nil;
  init(source: string) {
    const tokens = scan(source);
    if (tokens instanceof Glitch) {
      this._error = tokens;
    } else {
      this._tokens = tokens;
      this.next();
    }
    return this;
  }
  constructor(lastExpression: Expression, currentExpression: Expression) {
    this._error = null;
    this._lastExpression = lastExpression;
    this._currentExpression = currentExpression;
  }
  error(
    message: string,
    type: GlitchType,
    line: number,
    column: number,
  ): Left<Glitch> {
    const err = new Glitch(message, type, line, column);
    this._error = err;
    return left(err);
  }
  expression(expr: Expression) {
    const prev = this._currentExpression;
    this._currentExpression = expr;
    this._lastExpression = prev;
    return right(expr);
  }
  statement(stmt: Statement) {
    const prev = this._currentStatement;
    this._currentStatement = stmt.kind();
    this._lastStatement = prev;
    return right(stmt);
  }
  next() {
    this._cursor++;
    this._current = this._peek;
    const nextToken = this._tokens[this._cursor];
    if (nextToken !== undefined) {
      this._peek = nextToken;
      return this._current;
    } else {
      return Token.empty();
    }
  }
  atEnd() {
    return this._peek._type === TokenType.eof || this._error !== null;
  }
  check(type: TokenType) {
    if (this.atEnd()) {
      return false;
    }
    return this._peek._type === type;
  }
  nextIs(type: TokenType) {
    if (this._peek._type === type) {
      this.next();
      return true;
    }
    return false;
  }
}

function ast(source: string) {
  const state = new ParsetateState(node.nil(), node.nil()).init(source);
  const ___o = BP.nil;
  const ____: Parslet<Expression> = (token) => {
    if (state._error !== null) {
      return left(state._error);
    } else {
      return state.error(
        `Unexpected token: ${token.toString()}`,
        "syntax-error",
        token._line,
        token._column,
      );
    }
  };

  const parse = {
    prefix: (op: Token) => {
      const p = precof(op._type);
      const a = parseExpression(p);
      if (a.isLeft()) return a;
      const arg = a.unwrap();
      if (op._type === TokenType.minus) {
        return state.expression(node.negation(op, arg));
      } else if (op._type === TokenType.plus) {
        return state.expression(node.unaryPlus(op, arg));
      } else {
        return state.error(
          `Unknown prefix operator: ${op._lexeme}`,
          "syntax-error",
          op._line,
          op._column,
        );
      }
    },
    number: (t: Token) => {
      if (t._type === TokenType.integer) {
        const n = Number.parseInt(t._lexeme);
        const out = state.expression(node.int(n));
        return out;
      }
      if (t._type === TokenType.float) {
        const n = Number.parseFloat(t._lexeme);
      }
      return state.error(
        `Expected a number, but got "${t._lexeme}"`,
        "lexical-error",
        t._line,
        t._column,
      );
    },
  };

  const rules: BPTable<Expression> = {
    [TokenType.left_paren]: [____, ____, ___o],
    [TokenType.right_paren]: [____, ____, ___o],
    [TokenType.left_brace]: [____, ____, ___o],
    [TokenType.right_brace]: [____, ____, ___o],
    [TokenType.left_bracket]: [____, ____, ___o],
    [TokenType.right_bracket]: [____, ____, ___o],
    [TokenType.comma]: [____, ____, ___o],
    [TokenType.dot]: [____, ____, ___o],
    [TokenType.minus]: [parse.prefix, ____, ___o],
    [TokenType.plus]: [parse.prefix, ____, ___o],
    [TokenType.semicolon]: [____, ____, ___o],
    [TokenType.slash]: [____, ____, ___o],
    [TokenType.star]: [____, ____, ___o],
    [TokenType.at]: [____, ____, ___o],
    [TokenType.bang]: [____, ____, ___o],
    [TokenType.pound]: [____, ____, ___o],
    [TokenType.percent]: [____, ____, ___o],
    [TokenType.caret]: [____, ____, ___o],
    [TokenType.ampersand]: [____, ____, ___o],
    [TokenType.equal]: [____, ____, ___o],
    [TokenType.tick]: [____, ____, ___o],
    [TokenType.eroteme]: [____, ____, ___o],
    [TokenType.less]: [____, ____, ___o],
    [TokenType.greater]: [____, ____, ___o],
    [TokenType.colon]: [____, ____, ___o],
    [TokenType.vbar]: [____, ____, ___o],
    [TokenType.tilde]: [____, ____, ___o],
    [TokenType.indent]: [____, ____, ___o],
    [TokenType.dedent]: [____, ____, ___o],
    [TokenType.bang_equal]: [____, ____, ___o],
    [TokenType.equal_equal]: [____, ____, ___o],
    [TokenType.less_equal]: [____, ____, ___o],
    [TokenType.greater_equal]: [____, ____, ___o],
    [TokenType.identifier]: [____, ____, ___o],
    [TokenType.string]: [____, ____, ___o],
    [TokenType.integer]: [parse.number, ____, ___o],
    [TokenType.float]: [____, ____, ___o],
    [TokenType.complex]: [____, ____, ___o],
    [TokenType.fraction]: [____, ____, ___o],
    [TokenType.not]: [____, ____, ___o],
    [TokenType.and]: [____, ____, ___o],
    [TokenType.nand]: [____, ____, ___o],
    [TokenType.or]: [____, ____, ___o],
    [TokenType.nor]: [____, ____, ___o],
    [TokenType.xnor]: [____, ____, ___o],
    [TokenType.imply]: [____, ____, ___o],
    [TokenType.nimply]: [____, ____, ___o],
    [TokenType.converse]: [____, ____, ___o],
    [TokenType.nonconverse]: [____, ____, ___o],
    [TokenType.iff]: [____, ____, ___o],
    [TokenType.true]: [____, ____, ___o],
    [TokenType.false]: [____, ____, ___o],
    [TokenType.nil]: [____, ____, ___o],
    [TokenType.nan]: [____, ____, ___o],
    [TokenType.inf]: [____, ____, ___o],
    [TokenType.class]: [____, ____, ___o],
    [TokenType.if]: [____, ____, ___o],
    [TokenType.else]: [____, ____, ___o],
    [TokenType.return]: [____, ____, ___o],
    [TokenType.super]: [____, ____, ___o],
    [TokenType.this]: [____, ____, ___o],
    [TokenType.var]: [____, ____, ___o],
    [TokenType.const]: [____, ____, ___o],
    [TokenType.let]: [____, ____, ___o],
    [TokenType.fn]: [____, ____, ___o],
    [TokenType.eof]: [____, ____, ___o],
    [TokenType.newline]: [____, ____, ___o],
  };

  /** Returns the precedence of the given token type. */
  const precof = (t: TokenType) => rules[t][2];

  /** Returns the prefix parselet for the given token type. */
  const prefixRule = (t: TokenType) => rules[t][0];

  /** Returns the infix parselet for the given token type. */
  const infixRule = (t: TokenType) => rules[t][1];

  const parseExpression = (
    minbp: number = BP.lowest,
  ): Either<Glitch, Expression> => {
    let token = state.next();
    const pre = prefixRule(token._type);
    let lhs = pre(token, node.nil());
    if (lhs.isLeft()) {
      return lhs;
    }
    while (minbp < precof(state._peek._type)) {
      token = state.next();
      const r = infixRule(token._type);
      const rhs = r(token, lhs.unwrap());
      if (rhs.isLeft()) {
        return rhs;
      }
      lhs = rhs;
    }
    return lhs;
  };

  const parseExpressionStatement = () => {
    const out = parseExpression();
    if (out.isLeft()) {
      return out;
    }
    const e = out.unwrap();
    if (state.nextIs(TokenType.newline) || state.nextIs(TokenType.newline)) {
      return state.statement(node.stmt.expression(e));
    } else {
      return state.error(
        `Expected newline or ";" to end the statement`,
        "syntax-error",
        state._current._line,
        state._current._column,
      );
    }
  };

  const parseStatement = () => {
    return parseExpressionStatement();
  };

  // main body the parser
  if (state._error !== null) {
    return left(state._error);
  } else {
    const statements: Statement[] = [];
    while (!state.atEnd()) {
      const statement = parseStatement();
      if (statement.isLeft()) {
        return statement.unwrap();
      } else {
        statements.push(statement.unwrap());
      }
    }
    return right(statements);
  }
}

const result = ast(`
-5
`);
print(result);
