// Copyright (C) 2026 Ketib Oldiais - All Rights Reserved.
// You may use, distribute, and modify this code under the
// terms of the MIT license (see the bottom of this file).

/* -------------------------------------------------------------------------- */
/*                                 § Utilities                                */
/* -------------------------------------------------------------------------- */
// This section implements various utility functions used throughout the code base.
/** Returns, and logs to the console, a string form of `source`. */
export function print<T>(source: T) {
  if (typeof source === "string") {
    console.log(source);
    return source;
  }
  /** Returns a pretty-print tree of the given Object `Obj`. */
  if (Array.isArray(source)) {
    let isAllTokens = true;
    source.forEach((e) => {
      if (!(e instanceof Token)) {
        isAllTokens = false;
      }
    });
    if (isAllTokens) {
      const out = source.map((t: Token) => t.toString()).join("\n");
      console.log(out);
      return out;
    }
  }
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
  if (Array.isArray(source)) {
    source = treestring(source as object) as T;
    console.log(source);
    return source;
  }
  source = treestring(source as object) as T;
  console.log(source);
  return source;
}

// Either Type
type Either<A, B> = Left<A> | Right<B>;

/** An object corresponding to failure. */
class Left<T> {
  private value: T;
  constructor(value: T) {
    this.value = value;
  }
  map(): Either<T, never> {
    return this;
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

abstract class Maybe<T> {
  static some<T>(value: T): Maybe<T> {
    return new Some(value);
  }

  static none<T>(): Maybe<T> {
    return new None<T>();
  }

  static fromNullable<T>(value: T | null | undefined): Maybe<NonNullable<T>> {
    return value == null
      ? Maybe.none<NonNullable<T>>()
      : Maybe.some(value as NonNullable<T>);
  }

  abstract isSome(): this is Some<T>;
  abstract isNone(): this is None<T>;

  abstract map<U>(fn: (value: T) => U): Maybe<U>;

  abstract flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U>;

  abstract getOrElse(defaultValue: T): T;

  abstract unwrap(): T;

  abstract match<U>(cases: { some: (value: T) => U; none: () => U }): U;
}

class Some<T> extends Maybe<T> {
  constructor(readonly value: T) {
    super();
  }

  isSome(): this is Some<T> {
    return true;
  }

  isNone(): this is None<T> {
    return false;
  }

  map<U>(fn: (value: T) => U): Maybe<U> {
    return Maybe.some(fn(this.value));
  }

  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    return fn(this.value);
  }

  getOrElse(_defaultValue: T): T {
    return this.value;
  }

  unwrap(): T {
    return this.value;
  }

  match<U>(cases: { some: (value: T) => U; none: () => U }): U {
    return cases.some(this.value);
  }
}

class None<T> extends Maybe<T> {
  isSome(): this is Some<T> {
    return false;
  }

  isNone(): this is None<T> {
    return true;
  }

  map<U>(_fn: (value: T) => U): Maybe<U> {
    return Maybe.none<U>();
  }

  flatMap<U>(_fn: (value: T) => Maybe<U>): Maybe<U> {
    return Maybe.none<U>();
  }

  getOrElse(defaultValue: T): T {
    return defaultValue;
  }

  unwrap(): T {
    throw new Error("Cannot unwrap None");
  }

  match<U>(cases: { some: (value: T) => U; none: () => U }): U {
    return cases.none();
  }
}

/** A Primitive object type. */
type Primitive = string | number | null | boolean;

/* -------------------------------------------------------------------------- */
/*                              § Error Handling                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                             § Lexical Analysis                             */
/* -------------------------------------------------------------------------- */
// This section implements the lexical analyzer.

/* eslint-disable prefer-const */
enum TokenName {
  // Delimiter tokens
  /** Lexeme: `(` */
  left_paren, // Handler: scanOperator

  /** Lexeme: `)` */
  right_paren, // Handler: scanOperator

  /** Lexeme: `{` */
  left_brace, // Handler: scanOperator

  /** Lexeme: `}` */
  right_brace, // Handler: scanOperator

  /** Lexeme: `[` */
  left_bracket, // Handler: scanOperator

  /** Lexeme: `]` */
  right_bracket, // Handler: scanOperator

  /** Lexeme: `,` */
  comma, // Handler: scanOperator

  /** Lexeme: `:` */
  colon, // Handler: scanOperator

  // Single-character Operators

  /** Lexeme: `.`  */
  dot, // Handler: scanOperator

  /** Unary-prefix/binary operator; Lexeme: `-` */
  minus, // Handler: scanOperator

  /** Unary-prefix/binary operator; Lexeme: `+` */
  plus, // Handler: scanOperator

  /** Binary operator; Lexeme: `/` */
  slash, // Handler: scanOperator

  /** Lexeme: `;` */
  semicolon, // Handler: scanOperator

  /** Binary operator; Lexeme: `*` */
  star, // Handler: scanOperator

  /** Unary operator; Lexeme: `!` */
  bang, // Handler: scanOperator

  /** Comment starter; Lexeme: `#` */
  pound, // Handler: scanOperator

  /** Binary operator; Lexeme: `%` */
  percent, // Handler: scanOperator

  /** Binary operator; Lexeme: `^` */
  caret, // Handler: scanOperator

  /** Lexeme: `=` */
  equal, // Handler: scanOperator

  /** Symbolic string */
  symbolic, // Handler: scanSymbolic

  /** String concatenation */
  concat,

  /* ---------------------------- Native Functions ---------------------------- */

  /** Native function; Lexeme: `mod` */
  mod, // Handler: scanIdentifier, in keywords record

  /** Native function; Lexeme: `rem` */
  rem, // Handler: scanIdentifier, in keywords record

  /** Native function; Lexeme: `div` */
  div, // Handler: scanIdentifier, in keywords record

  /** Ternary operator; Lexeme: `?` */
  eroteme, // Handler: scanOperator

  /** Relation Operator; Lexeme: `<` */
  less, // Handler: scanOperator

  /** Relation Operator; Lexeme: `>` */
  greater, // Handler: scanOperator

  /** Lexeme: `|` */
  vbar, // Handler: scanOperator

  /** Type-equivalence Operator; Lexeme: `~` */
  tilde, // Handler: scanOperator

  // Two-character Operators
  /** Relation operator; Lexeme: `!=` */
  bang_equal, // Handler: scanOperator

  /** Relation operator; Lexeme: `==` */
  equal_equal, // Handler: scanOperator

  /** Relation operator; Lexeme: `<=` */
  less_equal, // Handler: scanOperator

  /** Relation operator; Lexeme: `>=` */
  greater_equal, // Handler: scanOperator

  // Native Function
  native_fn,

  // Matrix Operators

  /** Binary vector operator; Lexeme: `@` */
  at, // Handler: scanOperator

  /** Binary vector operator; Lexeme: `*+` */
  star_plus, // Handler: scanOperator

  /** Binary vector operator; Lexeme: `*-` */
  star_minus, // Handler: scanOperator

  /** Binary vector operator; Lexeme: `**` */
  star_star, // Handler: scanOperator

  /** Binary vector operator; Lexeme: `*\/` */
  star_slash, // Handler: scanOperator

  // Block delimiters
  indent, // Handler: tokenizeLine
  dedent, // Handler: tokenizeLine

  // Literals
  string, // Handler: scanString
  integer, // Handler: scanNumber
  float, // Handler: scanNumber
  fraction, // Handler: scanNumber
  nil, // Handler: scanIdentifier, in keywords record
  bool, // Handler: scanIdentifier, in keywords record

  // number-like literals
  /** Lexeme: `nan` */
  nan, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `inf` */
  inf, // Handler: scanIdentifier, in keywords record

  // Identifiers
  symbol, // Handler: scanIndentifier

  // Universal Constants

  /**
   * A universal constant token. LEM recognizes the following
   * universal constants:
   * * `pi`
   * * `e`
   * * `phi`
   * * ln2
   * * ln10
   * * log10e
   * * log2e
   * * sqrt2
   * * i
   */
  constant,

  // logical operators
  /** Unary Logical Operator; Lexeme: `not` */
  not, // Handler: scanIdentifier, in keywords record

  /** Lexeme: `and` */
  and, // Handler: scanIdentifier, in keywords record

  /** Lexeme: `nand` */
  nand, // Handler: scanIdentifier, in keywords record

  /** Lexeme: `or` */
  or, // Handler: scanIdentifier, in keywords record

  /** Lexeme: `nor` */
  nor, // Handler: scanIdentifier, in keywords record

  /** Lexeme: `xnor` */
  xnor, // Handler: scanIdentifier, in keywords record

  // Three character operators
  /** Lexeme: `->` */
  imply, // Handler: scanOperator

  /** Lexeme: `!->` */
  nimply, // Handler: scanOperator

  /** Lexeme: `<-` */
  converse, // Handler: scanOperator

  /** Lexeme: `!<-` */
  nonconverse, // Handler: scanOperator

  /** Lexeme: `<->` */
  iff, // Handler: scanOperator

  // keywords
  /** Lexeme: `class` */
  class, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `if` */
  if, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `else` */
  else, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `return` */
  return, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `super` */
  super, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `this` */
  this, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `var` */
  var, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `const` */
  const, // Handler: scanIdentifier: in keywords record
  /** Lexeme: `fn` */
  fn, // Handler: scanIdentifier, in keywords record

  // special tokens
  eof,
  newline,
}

type BinaryAlgebraicOperator =
  | TokenName.minus
  | TokenName.plus
  | TokenName.slash
  | TokenName.star
  | TokenName.percent
  | TokenName.caret;

type NativeFn = TokenName.mod | TokenName.rem | TokenName.div;

type BinaryVectorOperator =
  | TokenName.at
  | TokenName.star_plus
  | TokenName.star_minus
  | TokenName.star_star
  | TokenName.star_slash;

type TypeEquivalenceOperator = TokenName.tilde;

type RelationOperator =
  | TokenName.less
  | TokenName.greater
  | TokenName.bang_equal
  | TokenName.equal_equal
  | TokenName.less_equal
  | TokenName.greater_equal
  | TokenName.tilde;

type UnaryOperator = TokenName.minus | TokenName.plus;

type TernaryOperator = TokenName.eroteme;

type FactorialOperator = TokenName.bang;

type LogicalUnaryOperator = TokenName.not;

type LogicalBinaryOperator =
  | TokenName.and
  | TokenName.nand
  | TokenName.or
  | TokenName.nor
  | TokenName.xnor
  | TokenName.imply
  | TokenName.nimply
  | TokenName.converse
  | TokenName.nonconverse
  | TokenName.iff;

/**
 * An object representing a token in LEM.
 */
class Token<T extends TokenName = TokenName> {
  _name: T;
  _lexeme: string;
  _literal: Primitive;
  _line: number;
  _column: number;
  constructor(
    type: T,
    lexeme: string,
    line: number,
    column: number,
    literal: Primitive = null,
  ) {
    this._name = type;
    this._lexeme = lexeme;
    this._line = line;
    this._column = column;
    this._literal = literal;
  }
  /** Returns a copy of this token. */
  clone() {
    return new Token(
      this._name,
      this._lexeme,
      this._line,
      this._column,
      this._literal,
    );
  }

  /** Returns true if this token is an integer, float, or fraction. */
  isRealNumber() {
    const n = this._name;
    return (
      n === TokenName.integer ||
      n === TokenName.float ||
      n === TokenName.fraction
    );
  }

  /** Returns true if this Token's name is the given name. */
  isNamed(name: TokenName) {
    return this._name === name;
  }
  /** Returns the string-form of the given TokenName.  */
  static tokenTypeName(name: TokenName): string {
    // prettier-ignore
    switch (name) {
      case TokenName.left_paren: return "left_paren";
      case TokenName.right_paren: return "right_paren";
      case TokenName.left_brace: return "left_brace";
      case TokenName.right_brace: return "right_brace";
      case TokenName.left_bracket: return "left_bracket";
      case TokenName.right_bracket: return "right_bracket";
      case TokenName.comma: return "comma";
      case TokenName.dot: return "dot";
      case TokenName.minus: return "minus";
      case TokenName.plus: return "plus";
      case TokenName.semicolon: return "semicolon";
      case TokenName.slash: return "slash";
      case TokenName.star: return "star";
      case TokenName.at: return "at";
      case TokenName.bang: return "bang";
      case TokenName.pound: return "pound";
      case TokenName.percent: return "percent";
      case TokenName.caret: return "caret";
      case TokenName.equal: return "equal";
      case TokenName.eroteme: return "eroteme";
			case TokenName.constant: return "constant";
      case TokenName.less: return "less";
      case TokenName.greater: return "greater";
      case TokenName.colon: return "colon";
      case TokenName.vbar: return "vbar";
      case TokenName.tilde: return "tilde";
      case TokenName.indent: return "indent";
      case TokenName.dedent: return "dedent";
      case TokenName.bang_equal: return "bang_equal";
      case TokenName.equal_equal: return "equal_equal";
      case TokenName.less_equal: return "less_equal";
      case TokenName.greater_equal: return "greater_equal";
      case TokenName.symbol: return "symbol";
      case TokenName.string: return "string";
      case TokenName.integer: return "integer";
      case TokenName.float: return "float";
      case TokenName.fraction: return "fraction";
      case TokenName.not: return "not";
      case TokenName.and: return "and";
      case TokenName.nand: return "nand";
      case TokenName.bool: return "bool";
      case TokenName.or: return "or";
      case TokenName.nor: return "nor";
      case TokenName.xnor: return "xnor";
      case TokenName.imply: return "imply";
      case TokenName.nimply: return "nimply";
      case TokenName.converse: return "converse";
      case TokenName.nonconverse: return "nonconverse";
      case TokenName.iff: return "iff";
      case TokenName.nil: return "nil";
      case TokenName.nan: return "nan";
      case TokenName.inf: return "inf";
      case TokenName.class: return "class";
      case TokenName.if: return "if";
      case TokenName.else: return "else";
      case TokenName.return: return "return";
      case TokenName.super: return "super";
      case TokenName.this: return "this";
      case TokenName.var: return "var";
      case TokenName.const: return "const";
      case TokenName.fn: return "fn";
      case TokenName.eof: return "eof";
      case TokenName.newline: return "newline";
      case TokenName.symbolic: return "symbolic";
      default: return "unknown";
    }
  }
  static empty() {
    return new Token(TokenName.nil, "nil", 0, 0, null);
  }
  /** Returns a pretty-print string of this token. */
  toString() {
    const type = Token.tokenTypeName(this._name);
    const lexeme = this._lexeme === "" ? `__` : `"${this._lexeme}"`;
    const literal = this._literal === null ? "__" : this._literal;
    return `[${type}, ${lexeme}, ${literal}]`;
  }
  type(t: TokenName) {
    return new Token(t, this._lexeme, this._line, this._column, this._literal);
  }
  line(l: number) {
    return new Token(this._name, this._lexeme, l, this._column, this._literal);
  }
  lit(p: Primitive) {
    return new Token(this._name, this._lexeme, this._line, this._column, p);
  }
  lex(l: string) {
    return new Token(this._name, l, this._line, this._column, this._literal);
  }
}

/**
 * Creates a new token.
 * @param type The `TokenName` for this token.
 * @param lexeme This token's lexeme.
 * @param line The line this token was scanned on.
 * @returns A new `Token`.
 */
function token<T extends TokenName>(
  type: T,
  lexeme: string,
  line: number,
  column: number,
) {
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

/** Returns true if the given character is the start of an symbol. */
function isIdentifierStart(char: string): boolean {
  return (
    (char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_"
  );
}
/** Returns true if the given character is part of an symbol. */
function isIdentifierPart(char: string): boolean {
  return isIdentifierStart(char) || isDigit(char);
}

/** Scans the given program and returns a list of tokens. */
function lex(program: string, constants: Record<string, Primitive> = {}) {
  const default_universalConstants = {
    pi: Math.PI,
    e: Math.E,
    phi: (1 + Math.sqrt(5)) / 2,
    ln2: Math.LN2,
    ln10: Math.LN10,
    log10e: Math.LOG10E,
    log2e: Math.LOG2E,
    sqrt2: Math.SQRT2,
    i: null,
  };
  const universalConstants: Record<string, Primitive> = {
    ...default_universalConstants,
    ...constants,
  };
  /** Record of all keywords in the language. */
  const keywords: Record<string, TokenName> = {
    not: TokenName.not,
    and: TokenName.and,
    nand: TokenName.nand,
    or: TokenName.or,
    nor: TokenName.nor,
    xnor: TokenName.xnor,
    true: TokenName.bool,
    false: TokenName.bool,
    nil: TokenName.nil,
    NaN: TokenName.nan,
    Inf: TokenName.inf,
    class: TokenName.class,
    if: TokenName.if,
    else: TokenName.else,
    return: TokenName.return,
    super: TokenName.super,
    this: TokenName.this,
    var: TokenName.var,
    const: TokenName.const,
    fn: TokenName.fn,
    mod: TokenName.mod,
    rem: TokenName.rem,
    div: TokenName.div,
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
      tokens.push(token(TokenName.indent, "", lineNumber, 1));
      return;
    }

    // add dedent tokens
    if (indentation < currentIndent) {
      while (
        indentStack.length > 1 &&
        indentation < indentStack[indentStack.length - 1]
      ) {
        indentStack.pop();
        tokens.push(token(TokenName.dedent, "", lineNumber, 1));
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
    type: TokenName,
  ) => {
    // by default, we assume this is an integer.
    let current = start;
    while (current < line.length && isDigit(line[current])) {
      current++;
    }
    // floating-point number
    if (
      current < line.length - 1 &&
      line[current] === "." &&
      isDigit(line[current + 1])
    ) {
      type = TokenName.float;
      current++;
      while (current < line.length && isDigit(line[current])) {
        current++;
      }
      const lexeme = line.slice(start, current);
      const literal = Number.parseFloat(lexeme);
      tokens.push(token(type, lexeme, lineNumber, start + 1).lit(literal));
      return current;
    }
    // fractions
    if (
      type === TokenName.integer &&
      current < line.length - 1 &&
      line[current] === "/" &&
      isDigit(line[current + 1])
    ) {
      type = TokenName.fraction;
      current++;
      while (current < line.length && isDigit(line[current])) {
        current++;
      }
      const lexeme = line.slice(start, current);
      tokens.push(token(type, lexeme, lineNumber, start + 1));
      return current;
    }
    // if we get here, then this is an integer
    const lexeme = line.slice(start, current);
    const literal = Number.parseInt(lexeme);
    tokens.push(token(type, lexeme, lineNumber, start + 1).lit(literal));
    return current;
  };

  /** Scans an symbol or keyword. */
  const scanIdentifier = (line: string, start: number, lineNumber: number) => {
    let current = start + 1;
    while (current < line.length && isIdentifierPart(line[current])) {
      current++;
    }
    const lexeme = line.slice(start, current);
    let type = TokenName.symbol;
    if (Object.hasOwn(keywords, lexeme)) {
      type = keywords[lexeme];
      if (type === TokenName.bool) {
        const literal = lexeme === "true";
        tokens.push(token(type, lexeme, lineNumber, start + 1).lit(literal));
        return current;
      }
    }
    if (Object.hasOwn(universalConstants, lexeme)) {
      type = TokenName.constant;
      const literal = universalConstants[lexeme];
      tokens.push(token(type, lexeme, lineNumber, start + 1).lit(literal));
      return current;
    }
    tokens.push(token(type, lexeme, lineNumber, start + 1));
    return current;
  };

  /** Scan a string. */
  const scanSymbolic = (line: string, start: number, lineNumber: number) => {
    const quote = line[start];
    let current = start + 1;
    while (current < line.length) {
      if (line[current] === "\\") {
        current += 2;
        continue;
      }
      if (line[current] === quote) {
        current++;
        const lexeme = line.slice(start, current);
        tokens.push(
          token(TokenName.symbolic, lexeme, lineNumber, start + 1).lit(lexeme),
        );
        return current;
      }
      current++;
    }
    throw glitch(`Unterminated string`, "lexical-error", lineNumber, start + 1);
  };

  /** Scan a string. */
  const scanString = (line: string, start: number, lineNumber: number) => {
    const quote = line[start];
    let current = start + 1;
    while (current < line.length) {
      if (line[current] === "\\") {
        current += 2;
        continue;
      }
      if (line[current] === quote) {
        current++;
        const lexeme = line.slice(start, current);
        tokens.push(
          token(TokenName.string, lexeme, lineNumber, start + 1).lit(lexeme),
        );
        return current;
      }
      current++;
    }
    throw glitch(`Unterminated string`, "lexical-error", lineNumber, start + 1);
  };

  /** Scans an operator. */
  const scanOperator = (line: string, current: number, lineNumber: number) => {
    const char = line[current];
    // if (char === undefined) {
    // 	return current;
    // }
    const nextChar = line[current + 1];
    const nextNextChar = line[current + 2];

    const add = (type: TokenName, length = 1): number => {
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
    // prettier-ignore
    switch (char) {
      case "(": return add(TokenName.left_paren);
      case ")": return add(TokenName.right_paren);
      case "{": return add(TokenName.left_brace);
      case "}": return add(TokenName.right_brace);
      case "[": return add(TokenName.left_bracket);
      case "]": return add(TokenName.right_bracket);
      case ",": return add(TokenName.comma);
      case ".": return add(TokenName.dot);
      case "-": {
        if (nextChar === ">") {
          return add(TokenName.imply, 2);
        }
        return add(TokenName.minus);
      }
      case "+": return add(TokenName.plus);
      case ";": return add(TokenName.semicolon);
      case "/": return add(TokenName.slash);
      case "?": return add(TokenName.eroteme);
      case "*": {
				if (nextChar === "+") {
					return add(TokenName.star_plus, 2); 
				}
				if (nextChar === "-") {
					return add(TokenName.star_minus, 2);
				}
				if (nextChar === "*") {
					return add(TokenName.star_star, 2);
				}
				if (nextChar === "/") {
					return add(TokenName.star_slash, 2);
				}
				return add(TokenName.star);
			}
      case "@": return add(TokenName.at);
      case "&": return add(TokenName.concat);
      case "!":
        if (nextChar === "=") {
          return add(TokenName.bang_equal, 2);
        }
        if (nextChar === "-" && nextNextChar === ">") {
          return add(TokenName.nimply, 3);
        }
        if (nextChar === "<" && nextNextChar === "-") {
          return add(TokenName.nonconverse, 3);
        }
        return add(TokenName.bang);
      case "#": return add(TokenName.pound);
      case "%": return add(TokenName.percent);
      case "^": return add(TokenName.caret);
      case "=":
        if (nextChar === "=") {
          return add(TokenName.equal_equal, 2);
        }
        return add(TokenName.equal);
      case "?": return add(TokenName.eroteme);
      case "<":
        if (nextChar === "=") {
          return add(TokenName.less_equal, 2);
        }
        if (nextChar === "-" && nextNextChar === ">") {
          return add(TokenName.iff, 3);
        }
        if (nextChar === "-") {
          return add(TokenName.converse, 2);
        }
        return add(TokenName.less);
      case ">":
        if (nextChar === "=") {
          return add(TokenName.greater_equal, 2);
        }
        return add(TokenName.greater);
      case ":": return add(TokenName.colon);
      case "|": {
        if (nextChar === "|") {
          return add(TokenName.or, 2);
        }
        return add(TokenName.vbar);
      }
      case "~": return add(TokenName.tilde);
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
        current = scanNumber(line, current, lineNumber, TokenName.integer);
        continue;
      }

      // scan numbers that start with "."
      if (char === "." && isDigit(nextChar)) {
        current = scanNumber(line, current++, lineNumber, TokenName.float);
        continue;
      }

      // scan identifiers and keywords
      if (isIdentifierStart(char)) {
        current = scanIdentifier(line, current, lineNumber);
        continue;
      }

      // scan strings
      if (char === `"`) {
        current = scanString(line, current, lineNumber);
        continue;
      }

      if (char === `'`) {
        current = scanSymbolic(line, current, lineNumber);
        continue;
      }

      // scan operators
      current = scanOperator(line, current, lineNumber);
    }
    tokens.push(token(TokenName.newline, "", lineNumber, current + 1));
  };

  const tokenize = () => {
    tokens = [];
    const lines = programLines(program);

    // tokenize each of the lines
    for (let i = 0; i < lines.length; i++) {
      tokenizeLine(lines[i], i + 1);
    }
    tokens.push(token(TokenName.eof, "", lines.length + 1, 0));
    return tokens;
  };
  try {
    return tokenize();
  } catch (e) {
    return e as Glitch;
  }
}

/* -------------------------------------------------------------------------- */
/*                               Syntax Analysis                              */
/* -------------------------------------------------------------------------- */
// We start by defining the AST node kinds.

/** An enum corresponding to a nodes kind. */
enum Nodekind {
  // expression nodekinds
  integer,
  float,
  nil,
  str,
  frac,
  algebraic_binex,
  logical_binex,
  relation,
  sym,
  bool,
  parend,
  nan,
  inf,
  concatenation,

  // statement nodekinds
  expression_statement,
}

type ExprKind =
  | "int"
  | "float"
  | "nil"
  | "string"
  | "difference"
  | "sum"
  | "quotient"
  | "product"
  | "power"
  | "symbol"
  | "negate"
  | "fraction";

abstract class EXPR {
  kind: ExprKind;
  constructor(kind: ExprKind) {
    this.kind = kind;
  }
}

class INT extends EXPR {
  value: number;
  constructor(value: number) {
    super("int");
    this.value = value;
  }
}

const int = (value: number) => new INT(value);

class FLOAT extends EXPR {
  value: number;
  constructor(value: number) {
    super("float");
    this.value = value;
  }
}

const float = (value: number) => new FLOAT(value);

class NIL extends EXPR {
  value: null = null;
  constructor() {
    super("nil");
  }
}

const nil = () => new NIL();

class STR extends EXPR {
  value: string;
  constructor(value: string) {
    super("string");
    this.value = value;
  }
}

const str = (value: string) => new STR(value);

class DIFF extends EXPR {
  args: [EXPR, EXPR];
  constructor(left: EXPR, right: EXPR) {
    super("difference");
    this.args = [left, right];
  }
}

const diff = (left: EXPR, right: EXPR) => new DIFF(left, right);

class SUM extends EXPR {
  args: EXPR[];
  constructor(args: EXPR[]) {
    super("sum");
    this.args = args;
  }
}

const sum = (args: EXPR[]) => new SUM(args);

class QUOT extends EXPR {
  args: [EXPR, EXPR];
  constructor(left: EXPR, right: EXPR) {
    super("quotient");
    this.args = [left, right];
  }
}

class PRODUCT extends EXPR {
  args: EXPR[];
  constructor(args: EXPR[]) {
    super("product");
    this.args = args;
  }
}

const prod = (args: EXPR[]) => new PRODUCT(args);

class POWER extends EXPR {
  args: [EXPR, EXPR];
  constructor(base: EXPR, exponent: EXPR) {
    super("power");
    this.args = [base, exponent];
  }
}

const power = (base: EXPR, exponent: EXPR) => new POWER(base, exponent);

class SYMBOL extends EXPR {
  sym: string;
  value: EXPR;
  constructor(sym: string, value: EXPR = nil()) {
    super("symbol");
    this.sym = sym;
    this.value = nil();
  }
  val(x: EXPR) {
    this.value = x;
    return this;
  }
}

const sym = (s: string) => new SYMBOL(s);

class NEG extends EXPR {
  arg: EXPR;
  constructor(arg: EXPR) {
    super("negate");
    this.arg = arg;
  }
}

class FRAC extends EXPR {
  num: number;
  den: number;
  constructor(n: number, d: number) {
    super("fraction");
    this.num = n;
    this.den = d;
  }
}

type NumericConstant =
  | "pi"
  | "e"
  | "phi"
  | "ln2"
  | "ln10"
  | "log10e"
  | "log2e"
  | "sqrt2"
  | "i";

interface Visitor<T> {
  integer(node: Integer): T;
  float(node: Float): T;
  frac(node: Frac): T;
  nil(node: Nil): T;
  str(node: Str): T;
  bool(node: Bool): T;
  constant(node: ConstExpression): T;
  algebraicBinex(node: AlgebraicBinex): T;
  logicalBinex(node: LogicalBinex): T;
  relation(node: RelationExpr): T;
  sym(node: SymExpression): T;
  nan(node: NaNLiteral): T;
  inf(node: InfLiteral): T;
  parend(node: ParenthesizedExpression): T;
  concatenation(node: Concatenation): T;
  exprStmt(node: ExpressionStatement): T;
}

/** An object representing an AST node. */
abstract class ASTNode {
  abstract accept<T>(visitor: Visitor<T>): T;
  abstract kind(): Nodekind;
  abstract toString(): string;
  abstract isStatement(): this is Statement;
  abstract isExpression(): this is Expression;
}

/** An object representing an expression. */
abstract class Expression extends ASTNode {
  isStatement(): this is Statement {
    return false;
  }
  isExpression(): this is Expression {
    return true;
  }
}

/** An ASTNode corresponding to an integer. */
class Integer extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.integer(this);
  }
  kind(): Nodekind {
    return Nodekind.integer;
  }
  toString(): string {
    return `${this._value}`;
  }
  _value: number;
  constructor(value: number) {
    super();
    this._value = value;
  }
}

/** An ASTNode corresponding to a floating point number. */
class Float extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.float(this);
  }
  kind(): Nodekind {
    return Nodekind.float;
  }
  toString(): string {
    return `${this._value}`;
  }
  _value: number;
  constructor(value: number) {
    super();
    this._value = value;
  }
}

/** An ASTNode corresponding to a fraction. */
class Frac extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.frac(this);
  }
  kind(): Nodekind {
    return Nodekind.frac;
  }
  toString(): string {
    const n = this._numerator;
    const d = this._denominator;
    return `${n}/${d}`;
  }
  get _numerator() {
    return this._value[0];
  }
  get _denominator() {
    return this._value[1];
  }
  _value: [number, number];
  constructor(n: number, d: number) {
    super();
    this._value = [n, d];
  }
}

/** An ASTNode corresponding to the value null. */
class Nil extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.nil(this);
  }
  kind(): Nodekind {
    return Nodekind.nil;
  }
  toString(): string {
    return "nil";
  }
  _value: null = null;
  constructor() {
    super();
  }
}

/** An ASTNode corresponding to a string. */
class Str extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.str(this);
  }
  kind(): Nodekind {
    return Nodekind.str;
  }
  toString(): string {
    return this._value;
  }
  _value: string;
  constructor(value: string) {
    super();
    this._value = value;
  }
}

/** An ASTNode corresponding to a Boolean value. */
class Bool extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.bool(this);
  }
  kind(): Nodekind {
    return Nodekind.bool;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _value: boolean;
  constructor(value: boolean) {
    super();
    this._value = value;
  }
}

/** An ASTNode corresponding to a literal NaN. */
class NaNLiteral extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.nan(this);
  }
  kind(): Nodekind {
    return Nodekind.nan;
  }
  toString(): string {
    return "NaN";
  }
  constructor() {
    super();
  }
}

class InfLiteral extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.inf(this);
  }
  kind(): Nodekind {
    return Nodekind.inf;
  }
  toString(): string {
    return "Inf";
  }
  _value = "Inf" as const;
  constructor() {
    super();
  }
}

/** An ASTNode corresponding to an algebraic binary expression. */
class AlgebraicBinex extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.algebraicBinex(this);
  }
  kind(): Nodekind {
    return Nodekind.algebraic_binex;
  }
  toString(): string {
    const left = this._left.toString();
    const right = this._right.toString();
    const op = this._op._lexeme;
    return `${left}${op}${right}`;
  }
  _op: Token<BinaryAlgebraicOperator>;
  _left: Expression;
  _right: Expression;
  constructor(
    left: Expression,
    op: Token<BinaryAlgebraicOperator>,
    right: Expression,
  ) {
    super();
    this._left = left;
    this._op = op;
    this._right = right;
  }
}

/** An ASTNode corresponding to a logical binary expression. */
class LogicalBinex extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.logicalBinex(this);
  }
  kind(): Nodekind {
    return Nodekind.logical_binex;
  }
  toString(): string {
    throw new Error("LogicalBinex.toString() method not implemented.");
  }
  _left: Expression;
  _op: Token<LogicalBinaryOperator>;
  _right: Expression;
  constructor(
    left: Expression,
    op: Token<LogicalBinaryOperator>,
    right: Expression,
  ) {
    super();
    this._left = left;
    this._op = op;
    this._right = right;
  }
}
/** An object corresponding to a relational expression node.  */
class RelationExpr extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.relation(this);
  }
  kind(): Nodekind {
    return Nodekind.relation;
  }
  toString(): string {
    const L = this._left.toString();
    const R = this._right.toString();
    const op = this._op._lexeme;
    return `${L} ${op} ${R}`;
  }
  _left: Expression;
  _op: Token<RelationOperator>;
  _right: Expression;
  constructor(
    left: Expression,
    op: Token<RelationOperator>,
    right: Expression,
  ) {
    super();
    this._left = left;
    this._op = op;
    this._right = right;
  }
}

/** An object representing a symbol/identifier expression. */
class SymExpression extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.sym(this);
  }
  kind(): Nodekind {
    return Nodekind.sym;
  }
  toString(): string {
    return this._symbol._lexeme;
  }
  _symbol: Token<TokenName.symbol>;
  constructor(sym: Token<TokenName.symbol>) {
    super();
    this._symbol = sym;
  }
}

class ConstExpression extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.constant(this);
  }
  kind(): Nodekind {
    throw new Error("Method not implemented.");
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _constant: Token<TokenName.constant>;
  constructor(c: Token<TokenName.constant>) {
    super();
    this._constant = c;
  }
}

/** An object representing a parenthesized expression. */
class ParenthesizedExpression extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.parend(this);
  }
  kind(): Nodekind {
    throw new Error("Method not implemented.");
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _expression: Expression;
  constructor(e: Expression) {
    super();
    this._expression = e;
  }
}

class Concatenation extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.concatenation(this);
  }
  kind(): Nodekind {
    return Nodekind.concatenation;
  }
  toString(): string {
    return `${left.toString()} & ${right.toString()}`;
  }
  _left: Expression;
  _op: Token;
  _right: Expression;
  constructor(left: Expression, op: Token, right: Expression) {
    super();
    this._left = left;
    this._op = op;
    this._right = right;
  }
}

/** An object representing a statement. */
abstract class Statement extends ASTNode {
  isStatement(): this is Statement {
    return true;
  }
  isExpression(): this is Expression {
    return false;
  }
}

class ExpressionStatement extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.exprStmt(this);
  }
  kind(): Nodekind {
    return Nodekind.expression_statement;
  }
  toString(): string {
    return `expression-statement`;
  }
  _expression: Expression;
  constructor(expression: Expression) {
    super();
    this._expression = expression;
  }
}

// This object contains all the ASTNode generators.

const astnode = {
  /** Given a number `n`, returns a new Integer. */
  int: (n: number) => new Integer(n),
  float: (x: number) => new Float(x),
  nil: () => new Nil(),
  str: (s: string) => new Str(s),
  frac: (n: number, d: number) => new Frac(n, d),
  algBinex: (
    left: Expression,
    op: Token<BinaryAlgebraicOperator>,
    right: Expression,
  ) => new AlgebraicBinex(left, op, right),
  logBinex: (
    left: Expression,
    op: Token<LogicalBinaryOperator>,
    right: Expression,
  ) => new LogicalBinex(left, op, right),
  relation: (
    left: Expression,
    op: Token<RelationOperator>,
    right: Expression,
  ) => new RelationExpr(left, op, right),
  sym: (s: Token<TokenName.symbol>) => new SymExpression(s),
  constant: (c: Token<TokenName.constant>) => new ConstExpression(c),
  bool: (c: Token) => new Bool(c._lexeme === "true"),
  nan: () => new NaNLiteral(),
  inf: () => new InfLiteral(),
  parend: (e: Expression) => new ParenthesizedExpression(e),
  concatenation: (left: Expression, op: Token, right: Expression) =>
    new Concatenation(left, op, right),
  statement: {
    expression: (e: Expression) => new ExpressionStatement(e),
  },
};

/** An object that corresponds to a state machine for the parser. */
class ParserState {
  _tokens: Token[];
  _current: number = 0;
  _prev: Token = Token.empty();
  _lastExpression: Expression = astnode.nil();
  _currentExpression: Expression = astnode.nil();
  _lastStatement: Nodekind = Nodekind.nil;
  _currentStatement: Nodekind = Nodekind.nil;
  _error: null | Glitch = null;
  constructor(tokens: Token[]) {
    this._tokens = tokens;
  }
  nextIs(name: TokenName) {
    if (this._peek.isNamed(name)) {
      this.next();
      return true;
    }
    return false;
  }
  check(tokenName: TokenName) {
    if (this.atEnd()) return false;
    return this._peek.isNamed(tokenName);
  }
  error(message: string, line: number, column: number) {
    const e = glitch(message, "syntax-error", line, column);
    this._error = e;
    return left(e);
  }
  atEnd() {
    return this._peek.isNamed(TokenName.eof) || this._error !== null;
  }
  expression<E extends Expression>(e: E) {
    const previousExpression = this._currentExpression;
    this._currentExpression = e;
    this._lastExpression = previousExpression;
    return right(e);
  }
  statement<S extends Statement>(s: S) {
    const previousStatement = this._currentStatement;
    this._currentStatement = s.kind();
    this._lastStatement = previousStatement;
    return right(s);
  }
  get _peekNext() {
    const out = this._tokens[this._current + 1];
    if (out) return out;
    return Token.empty();
  }
  get _peek() {
    return this._tokens[this._current];
  }
  next() {
    this._prev = this._tokens[this._current];
    return this._tokens[this._current++];
  }
  /** Returns a new ParserState with the given tokens. */
  static init(tokens: Token[]) {
    return new ParserState(tokens);
  }
}

/** An enumeration of the binding powers for operators. */
enum BP {
  nil,
  lowest,
  string_operation,
  assignment,
  atom,
  or,
  nor,
  and,
  nand,
  xor,
  xnor,
  not,
  imply,
  nimply,
  converse,
  nonconverse,
  iff,
  equals,
  compare,
  sum,
  difference,
  product,
  quotient,
  implicit_multiplication,
  power,
  dot_product,
  postfix,
  function_call,
}

/** @internal A Pratt parsing function. */
type Parslet<T> = (current: Token, lastNode: T) => Either<Glitch, T>;

/** @internal An entry within parser’s BP table. The first element is a prefix parslet, the second element is an infix parslet, and the last element is the binding power of the operator. */
type ParsletEntry<T> = [Parslet<T>, Parslet<T>, Parslet<T>, BP];

/** @internal A record of parslet entries, where each key is a token type (`tt`). */
type BPTable<T> = Record<TokenName, ParsletEntry<T>>;

function syn(tokens: Token[]) {
  const state = ParserState.init(tokens);

  /**
   * The “blank” parslet. This parslet is used as a placeholder.
   */
  const ___: Parslet<Expression> = (token) => {
    if (state._error !== null) {
      return left(state._error);
    } else {
      return state.error(
        `Unexpected lexeme: ${token._lexeme}`,
        token._line,
        token._column,
      );
    }
  };

  /**
   * The “blank” binding power. This particular binding power
   * is bound either (1) the {@link ___|blank parslet}
   * or (2) parlsets that should not trigger recursive calls.
   */
  const ___o = BP.nil;

  /** Parses an algebraic infix expression. */
  const algInfix = (op: Token, lhs: Expression) => {
    // Actual handling of infix expressions
    const p = precof(op._name);
    const rhs = expression(p);
    if (rhs.isLeft()) return rhs;
    return state.expression(
      astnode.algBinex(lhs, op as Token<BinaryAlgebraicOperator>, rhs.unwrap()),
    );
  };

  /** Parses a logical infix expression.  */
  const logInfix = (op: Token, lhs: Expression) => {
    const p = precof(op._name);
    return expression(p).chain((rhs) =>
      state.expression(
        astnode.logBinex(lhs, op as Token<LogicalBinaryOperator>, rhs),
      ),
    );
  };

  /** Parses a relation expression. */
  const relation = (op: Token, lhs: Expression) => {
    const p = precof(op._name);
    return expression(p).chain((rhs) => {
      return state.expression(
        astnode.relation(lhs, op as Token<RelationOperator>, rhs),
      );
    });
  };

  /** Parses a number. */
  const number = (t: Token): Either<Glitch, Expression> => {
    // Handle floating point numbers
    if (t.isNamed(TokenName.float) || t.isNamed(TokenName.integer)) {
      const out = t.isNamed(TokenName.integer)
        ? state.expression(astnode.int(t._literal as number))
        : state.expression(astnode.float(t._literal as number));
      // Handle implicit multiplication
      const peek = state._peek;
      if (
        peek.isNamed(TokenName.left_paren) ||
        peek.isNamed(TokenName.constant) ||
        peek.isNamed(TokenName.symbol)
      ) {
        const r = expression(BP.implicit_multiplication);
        if (r.isLeft()) return r;
        const right = r.unwrap();
        const star = token(TokenName.star, "*", t._line, t._column + 1);
        const left = out.unwrap();
        return state.expression(
          astnode.parend(astnode.algBinex(left, star, right)),
        );
      }
      return out;
    }
    return state.error(
      `Expected a number, but got "${t._lexeme}"`,
      t._line,
      t._column,
    );
  };

  /** Returns a literal Boolean. */
  const bool = (t: Token) => {
    if (t._lexeme === "false" || t._lexeme === "true") {
      return state.expression(astnode.bool(t));
    }
    return state.error(
      `Expected a Boolean value, but got "${t._lexeme}".`,
      t._line,
      t._column,
    );
  };

  /** Parses a literal NAN. */
  const nan = () => state.expression(astnode.nan());

  /** Parses a literal Infinity. */
  const inf = () => state.expression(astnode.inf());

  /** Returns a literal nil. */
  const nil = () => state.expression(astnode.nil());

  /** Parses a string. */
  const str = (t: Token) => state.expression(astnode.str(t._lexeme));

  /** Parses a constant. */
  const constant = (t: Token) => {
    if (t.isNamed(TokenName.constant)) {
      const out = astnode.constant(t as Token<TokenName.constant>);
      return state.expression(out);
    } else {
      return state.error(
        `Expected a constant, but got ${t._lexeme}`,
        t._line,
        t._column,
      );
    }
  };

  /** Parses an symbol. */
  const sym = (t: Token) => {
    if (t.isNamed(TokenName.symbol)) {
      const out = astnode.sym(t as Token<TokenName.symbol>);
      return state.expression(out);
    } else {
      return state.error(
        `Expected a symbol, but got ${t._lexeme}`,
        t._line,
        t._column,
      );
    }
  };

  /** Parses a fraction. */
  const frac = (t: Token) => {
    const lexeme = t._lexeme;
    const parts = lexeme.split("/");
    const numerator = Number.parseInt(parts[0]);
    const denominator = Number.parseInt(parts[1]);
    if (denominator === 0) {
      return state.error(
        `Encountered a 0 denominator in a fraction`,
        t._line,
        t._column,
      );
    }
    return state.expression(astnode.frac(numerator, denominator));
  };

  /** Parses a concatenation expression. */
  const concat = (op: Token, lhs: Expression) => {
    const p = precof(op._name);
    return expression(p).chain((rhs) =>
      state.expression(astnode.concatenation(lhs, op, rhs)),
    );
  };

  /** Parses a parenthesized expression. */
  const parenthesized = (t: Token) => {
    const innerExpression = expression();
    if (innerExpression.isLeft()) {
      return innerExpression;
    }
    if (!state.nextIs(TokenName.right_paren)) {
      return state.error(`Expected a closing ")".`, t._line, t._column);
    }
    if (
      state._peek.isNamed(TokenName.constant) ||
      state._peek.isNamed(TokenName.float) ||
      state._peek.isNamed(TokenName.integer) ||
      state._peek.isNamed(TokenName.fraction) ||
      state._peek.isNamed(TokenName.symbol)
    ) {
      const r = expression(BP.implicit_multiplication);
      if (r.isLeft()) return r;
      const lhs = innerExpression.unwrap();
      const rhs = r.unwrap();
      return state.expression(
        astnode.algBinex(
          lhs,
          token(TokenName.star, "*", t._line, t._column),
          rhs,
        ),
      );
    }
    return innerExpression.map((e) => astnode.parend(e));
  };

  const rules: BPTable<Expression> = {
    [TokenName.left_paren]: [parenthesized, ___, ___, BP.function_call],
    [TokenName.right_paren]: [___, ___, ___, ___o],
    [TokenName.left_brace]: [___, ___, ___, ___o],
    [TokenName.right_brace]: [___, ___, ___, ___o],
    [TokenName.left_bracket]: [___, ___, ___, ___o],
    [TokenName.right_bracket]: [___, ___, ___, ___o],
    [TokenName.comma]: [___, ___, ___, ___o],
    [TokenName.colon]: [___, ___, ___, ___o],
    [TokenName.dot]: [___, ___, ___, ___o],

    [TokenName.native_fn]: [___, ___, ___, ___o],

    // Algebraic Binary Operators
    [TokenName.plus]: [___, algInfix, ___, BP.sum],
    [TokenName.minus]: [___, algInfix, ___, BP.difference],
    [TokenName.star]: [___, algInfix, ___, BP.product],
    [TokenName.slash]: [___, algInfix, ___, BP.quotient],
    [TokenName.caret]: [___, algInfix, ___, BP.power],

    [TokenName.semicolon]: [___, ___, ___, ___o],
    [TokenName.at]: [___, ___, ___, ___o],
    [TokenName.star_plus]: [___, ___, ___, ___o],
    [TokenName.star_minus]: [___, ___, ___, ___o],
    [TokenName.star_star]: [___, ___, ___, ___o],
    [TokenName.star_slash]: [___, ___, ___, ___o],
    [TokenName.bang]: [___, ___, ___, ___o],
    [TokenName.pound]: [___, ___, ___, ___o],
    [TokenName.percent]: [___, ___, ___, ___o],
    [TokenName.equal]: [___, ___, ___, ___o],
    [TokenName.mod]: [___, ___, ___, ___o],
    [TokenName.rem]: [___, ___, ___, ___o],
    [TokenName.div]: [___, ___, ___, ___o],
    [TokenName.symbolic]: [___, ___, ___, ___o],
    [TokenName.eroteme]: [___, ___, ___, ___o],
    [TokenName.vbar]: [___, ___, ___, ___o],

    // comparisons
    [TokenName.bang_equal]: [___, relation, ___, BP.compare],
    [TokenName.equal_equal]: [___, relation, ___, BP.compare],
    [TokenName.less_equal]: [___, relation, ___, BP.compare],
    [TokenName.greater_equal]: [___, relation, ___, BP.compare],
    [TokenName.less]: [___, relation, ___, BP.compare],
    [TokenName.greater]: [___, relation, ___, BP.compare],
    [TokenName.tilde]: [___, relation, ___, BP.compare],

    // string concatenation
    [TokenName.concat]: [___, concat, ___, BP.string_operation],

    // blocks
    [TokenName.indent]: [___, ___, ___, ___o],
    [TokenName.dedent]: [___, ___, ___, ___o],

    // literals
    [TokenName.string]: [str, ___, ___, BP.atom],
    [TokenName.integer]: [number, ___, ___, BP.atom],
    [TokenName.float]: [number, ___, ___, BP.atom],
    [TokenName.fraction]: [frac, ___, ___, BP.atom],
    [TokenName.nil]: [nil, ___, ___, BP.atom],
    [TokenName.bool]: [bool, ___, ___, BP.atom],
    [TokenName.nan]: [nan, ___, ___, BP.atom],
    [TokenName.inf]: [inf, ___, ___, BP.atom],
    [TokenName.symbol]: [sym, ___, ___, BP.atom],
    [TokenName.constant]: [constant, ___, ___, BP.atom],

    // logical operations
    [TokenName.not]: [___, ___, ___, ___o],
    [TokenName.and]: [___, logInfix, ___, BP.and],
    [TokenName.nand]: [___, logInfix, ___, BP.nand],
    [TokenName.or]: [___, logInfix, ___, BP.or],
    [TokenName.nor]: [___, logInfix, ___, BP.nor],
    [TokenName.xnor]: [___, logInfix, ___, BP.xnor],
    [TokenName.imply]: [___, logInfix, ___, BP.imply],
    [TokenName.nimply]: [___, logInfix, ___, BP.nimply],
    [TokenName.converse]: [___, logInfix, ___, BP.converse],
    [TokenName.nonconverse]: [___, logInfix, ___, BP.nonconverse],
    [TokenName.iff]: [___, logInfix, ___, BP.iff],

    // keywords
    [TokenName.class]: [___, ___, ___, ___o],
    [TokenName.if]: [___, ___, ___, ___o],
    [TokenName.else]: [___, ___, ___, ___o],
    [TokenName.return]: [___, ___, ___, ___o],
    [TokenName.super]: [___, ___, ___, ___o],
    [TokenName.this]: [___, ___, ___, ___o],
    [TokenName.var]: [___, ___, ___, ___o],
    [TokenName.const]: [___, ___, ___, ___o],
    [TokenName.fn]: [___, ___, ___, ___o],
    [TokenName.eof]: [___, ___, ___, ___o],
    [TokenName.newline]: [___, ___, ___, ___o],
  };

  /**
   * Returns the prefix parsing rule mapped to by the given
   * token type.
   */
  const prefixRule = (t: TokenName): Parslet<Expression> => rules[t][0];

  /**
   * Returns the infix parsing rule mapped to by the given
   * token type.
   */
  const infixRule = (t: TokenName): Parslet<Expression> => rules[t][1];

  /**
   * Returns the postfix parsing rule mapped to by the given
   * token type.
   */
  const postfixRule = (t: TokenName): Parslet<Expression> => rules[t][1];

  /**
   * Returns the {@link bp|precedence} of the given token type.
   */
  const precof = (t: TokenName): BP => rules[t][3];

  /**
   * The rules table comprises mappings from every
   * token type to a triple `(Prefix, Infix, B)`,
   * where `Prefix` and `Infix` are parslets (small
   * parsers that handle a single grammar rule), and `B` is a
   * binding power.
   */
  const expression = (
    minbp: number = BP.lowest,
  ): Either<Glitch, Expression> => {
    let token = state.next();
    const pre = prefixRule(token._name);
    let lhs = pre(token, astnode.nil());
    if (lhs.isLeft()) return lhs;
    while (minbp < precof(state._peek._name)) {
      token = state.next();
			const p = postfixRule(token._name);
      const r = infixRule(token._name);
      const rhs = r(token, lhs.unwrap());
      if (rhs.isLeft()) return rhs;
      lhs = rhs;
    }
    return lhs;
  };

  const EXPRESSION = () => {
    const out = expression();
    if (out.isLeft()) return out;
    const e = out.unwrap();
    if (state.nextIs(TokenName.semicolon) || state.nextIs(TokenName.newline)) {
      return state.statement(astnode.statement.expression(e));
    }
    return state.error(
      `Expected a newline or a ";" to end the statement`,
      state._peek._line,
      state._peek._column,
    );
  };

  const STATEMENT = () => {
    return EXPRESSION();
  };

  const parse = () => {
    if (state._error !== null) {
      return left(state._error);
    }
    const statements: Statement[] = [];
    while (!state.atEnd()) {
      const statement = STATEMENT();
      if (statement.isLeft()) {
        return statement;
      }
      statements.push(statement.unwrap());
    }
    return right(statements);
  };

  return parse();
}

function weaver(sourceCode: string) {
  const lexical = () => {
    const tokens = lex(sourceCode);
    if (tokens instanceof Glitch) {
      return tokens;
    }
    return tokens;
  };
  const syntax = () => {
    const tokens = lexical();
    if (tokens instanceof Glitch) {
      return left(tokens);
    }
    const ast = syn(tokens);
    if (ast.isLeft()) {
      return ast;
    }
    return ast;
  };
  const run = () => {
    return syntax();
  };
  return {
    lexical,
    syntax,
    run,
  };
}

const r = weaver(`
unexpand '2x^2 + x + 1'
`).run();
print(r);
