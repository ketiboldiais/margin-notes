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

// Now we'll write some common functional programming
// types for boxes. The following types, `None` and
// `Some`, correspond to functional option types.
// We will use these types extensively when implementing
// the linked list.

/** An object corresponding to nothing. */
class None {
  _tag = "None" as const;
  constructor() {}
  map(): None {
    return new None();
  }
}

/** An object corresponding to something. */
class Some<T> {
  readonly value: T;
  _tag = "Some" as const;
  constructor(value: T) {
    this.value = value;
  }
  /**
   * Applies the given function `f` to
   * the data held by this object.
   */
  map<S>(f: (a: T) => S): Some<S> {
    return new Some(f(this.value));
  }
}

/** Returns a new Some with value of type `T`. */
function some<T>(value: T) {
  return new Some<T>(value);
}

/** Returns a new None. */
function none() {
  return new None();
}

/** A union type of None or Some<T>. */
type Option<T> = None | Some<T>;

/** A data structure with two pointers, left and right. */
class Binode<T> {
  _data: T | null;
  private _R: Option<Binode<T>>;
  private _L: Option<Binode<T>>;
  constructor(data: T | null) {
    this._data = data;
    this._R = none();
    this._L = none();
  }

  /**
   * Returns a copy of this bnode.
   */
  copy() {
    const out = new Binode(this._data);
    const left = this._L;
    const right = this._R;
    out._L = left;
    out._R = right;
    return out;
  }

  /**
   * Flattens this bnode.
   */
  flatten(): Binode<T> | T {
    return this._data === null ? Binode.none<T>() : this._data;
  }

  /**
   * Applies the given callback to the data held
   * by this binode.
   */
  map<K>(callback: (data: T) => K) {
    if (this._data) {
      return Binode.some<K>(callback(this._data));
    } else return Binode.none<K>();
  }

  /**
   * Sets the value of this bnode.
   */
  set value(data: T) {
    this._data = data;
  }

  do<K>(f: (d: T) => K) {
    if (this._data !== null) {
      f(this._data);
    }
    return this;
  }

  isSomething() {
    return this._data !== null;
  }

  isNothing() {
    return this._data === null;
  }

  static none<T>() {
    return new Binode<T>(null);
  }

  static some<T>(data: T) {
    return new Binode(data);
  }

  get _prev() {
    if (this._L._tag === "None") {
      return new Binode<T>(null);
    } else {
      return this._L.value;
    }
  }

  set _prev(node: Binode<T>) {
    this._L = some(node);
  }

  get _next() {
    if (this._R._tag === "None") {
      return new Binode<T>(null);
    } else {
      return this._R.value;
    }
  }

  set _next(node: Binode<T>) {
    this._R = some(node);
  }

  get _left() {
    return this._prev;
  }

  set _left(node: Binode<T>) {
    this._prev = node;
  }

  get _right() {
    return this._next;
  }

  set _right(node: Binode<T>) {
    this._next = node;
  }
}

/** Returns a new binode. */
function binode<T>(data: T | null = null) {
  return new Binode(data);
}

/**
 * A data structure implementing
 * a linked list with elements
 * of type T.
 */
class LinkedList<T> {
  /**
   * @internal Pointer to the first
   * element of the linked list.
   */
  private head: Binode<T>;
  /**
   * @internal Pointer to the last
   * element of the linked list.
   */
  private tail: Binode<T>;
  /**
   * @internal counter for keeping
   * track of how many elements are
   * in this linked list.
   */
  private count: number;
  /**
   * Returns a copy of this list
   * without the first element.
   * @example
   * ~~~ts
   * const x = linkedList([1,2,3,4]) // x = (1,2,3,4)
   * const y = x.cdr() // y = (2,3,4)
   * ~~~
   */
  cdr() {
    const list = this.clone();
    if (list.isEmpty) return list;
    const previousHead = list.head;
    if (list.count === 1) {
      list.head = binode();
      list.tail = binode();
    } else {
      list.head = previousHead._right!;
      list.head._left = binode();
      previousHead._right = binode();
    }
    list.count--;
    return list;
  }
  car() {
    if (this.isEmpty) return this;
    const head = this.head._data!;
    return new LinkedList<T>().push(head);
  }
  /**
   * Removes all elements in this list.
   */
  clear() {
    this.head = binode();
  }
  get length() {
    return this.count;
  }
  get isEmpty() {
    return this.count === 0 || this.head.isNothing();
  }
  constructor() {
    this.count = 0;
    this.head = binode();
    this.tail = binode();
  }
  *[Symbol.iterator](): IterableIterator<T> {
    let node = this.head;
    while (node._data !== null) {
      yield node._data;
      node = node._right;
    }
  }
  /**
   * Returns this linked list as an array.
   */
  toArray(): T[] {
    return [...this];
  }
  /**
   * Returns true if the index passed
   * is within the bounds of this list.
   */
  safeIdx(i: number) {
    return 0 <= i && i < this.count;
  }
  /**
   * Sets the given element at the
   * given index within this list.
   */
  set(element: T, index: number) {
    const node = this.at(index);
    node._data = element;
    return this;
  }

  private at(index: number) {
    if (!this.safeIdx(index)) {
      return binode<T>();
    } else {
      let count = 0;
      let current = this.head;
      while (count !== index) {
        const k = current._right;
        if (k.isNothing()) break;
        current = k;
        count++;
      }
      return current;
    }
  }

  map<K>(f: (data: T, index: number, list: LinkedList<T>) => K) {
    const list = new LinkedList<K>();
    this.forEach((d, i, l) => list.push(f(d, i, l)));
    return list;
  }

  forEach(f: (data: T, index: number, list: LinkedList<T>) => void) {
    if (this.isEmpty) return this;
    let node = this.head;
    let i = 0;
    while (i < this.count) {
      node.do((d) => f(d, i, this));
      node = node._right;
      i++;
    }
  }

  /**
   * Returns a copy of this linked list.
   */
  clone() {
    const list = new LinkedList<T>();
    this.forEach((d) => list.push(d));
    return list;
  }

  #reduce<X>(
    from: 0 | 1,
    reducer: (
      accumulator: X,
      currentValue: T,
      index: number,
      list: LinkedList<T>,
    ) => X,
    initialValue: X,
  ) {
    let i = 0;
    const fn = (list: LinkedList<T>, init: X): X => {
      if (list.isEmpty) return init;
      else {
        const popped = list[from === 0 ? "shift" : "pop"]();
        if (popped._tag === "None") return init;
        const updatedValue = reducer(init, popped.value, i++, list);
        return fn(list, updatedValue);
      }
    };
    return fn(this.clone(), initialValue);
  }

  reduceRight<X>(
    reducer: (
      accumulator: X,
      currentValue: T,
      index: number,
      list: LinkedList<T>,
    ) => X,
    initialValue: X,
  ): X {
    return this.#reduce(1, reducer, initialValue);
  }

  reduce<X>(
    reducer: (
      accumulator: X,
      currentValue: T,
      index: number,
      list: LinkedList<T>,
    ) => X,
    initialValue: X,
  ): X {
    return this.#reduce(0, reducer, initialValue);
  }

  /** Returns the string representation of this list, with each element jointed by the given separator (defaults to the empty string). */
  join(separator: string = "") {
    return [...this].join(separator);
  }

  /** Returns th string representation of this list. */
  toString(f?: (x: T, index: number) => string) {
    const out = this.clone();
    const g = f ? f : (x: T) => x;
    return "(" + out.map((d, i) => g(d, i)).join(",") + ")";
  }

  /** Returns a new list whose elements satisfy the given predicate. */
  filter(predicate: (value: T, index: number, list: LinkedList<T>) => boolean) {
    const out = new LinkedList<T>();
    this.forEach((n, i, list) => predicate(n, i, list) && out.push(n));
    return out;
  }

  /** Reverses this list. */
  reverse() {
    let current = this.head;
    let i = 0;
    while (current.isSomething() && i < this.count) {
      const right = current._right;
      current._right = current._left;
      current._left = right;
      const k = current._left;
      if (k.isNothing() || i > this.count) break;
      current = k;
      i++;
    }
    const tail = this.tail;
    this.tail = this.head;
    this.head = tail;
    return this;
  }

  /** Returns the element at the given index. */
  item(index: number) {
    return this.at(index)._data;
  }

  zip<K>(list: LinkedList<K>) {
    const out = new LinkedList<[T, K]>();
    this.forEach((d, i) => {
      const x = list.item(i);
      if (x !== null) {
        const element: [T, K] = [d, x] as [T, K];
        out.push(element);
      }
    });
    return out;
  }

  /** Removes the last element of this list. */
  pop(): Option<T> {
    if (this.isEmpty) return none();
    const popped = this.tail;
    if (this.length === 1) {
      this.head = binode();
      this.tail = binode();
    } else {
      this.tail = popped._left;
      this.tail._right = binode();
      popped._left = binode();
    }
    this.count--;
    return popped._data === null ? none() : some(popped._data);
  }

  /** Inserts the given element at the head of this list.*/
  unshift(element: T) {
    const node = binode(element);
    if (this.isEmpty) {
      this.head = node;
      this.tail = node;
    } else {
      this.head._prev = node;
      node._next = this.head;
      this.head = node;
    }
    this.count++;
    return this;
  }

  /** Removes the first element of this list. */
  shift() {
    if (this.isEmpty) return none();
    const previousHead = this.head;
    if (this.length === 1) {
      this.head = binode();
      this.tail = binode();
    } else {
      this.head = previousHead._next;
      this.head._prev = binode();
      previousHead._prev = binode();
    }
    this.count--;
    return previousHead._data === null ? none() : some(previousHead._data);
  }

  /** Inserts the given element to this list. */
  push(element: T) {
    const node = binode(element);
    if (this.head.isNothing()) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail._next = node;
      node._prev = this.tail;
      this.tail = node;
    }
    this.count++;
    return this;
  }

  /** Inserts the given elements to this list. */
  append(...elements: T[]) {
    elements.forEach((e) => this.push(e));
    return this;
  }
}

function linkedList<T>(...elements: T[]) {
  return new LinkedList<T>().append(...elements);
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

/** Returns the sign of a given number. */
function signum(x: number): -1 | 1 | 0 {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}

/** Returns the greatest common divisor of two numbers, `a` and `b`. */
function gcd(a: number, b: number): number {
  let t;
  while (b !== 0) {
    t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Reduces the given fraction `numerator/denominator` to its simplest form.
 * The return is a pair [reduced numerator, reduced denominator].
 */
function simplestFraction(
  numerator: number,
  denominator: number,
): [number, number] {
  const sgn = Math.sign(numerator) * Math.sign(denominator);
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const f = gcd(n, d);
  return [(sgn * n) / f, d / f] as [number, number];
}

/** Returns `true` if the fractions `a` and `b` are equal. */
function fracEqual(a: [number, number], b: [number, number]) {
  const n = simplestFraction(a[0], a[1]);
  const m = simplestFraction(b[0], b[1]);
  return n[0] === m[0] && n[1] === m[1];
}

/** Returns the product of a * b, where a and b are fractions. */
function fracTimes(a: [number, number], b: [number, number]): [number, number] {
  return simplestFraction(a[0] * b[0], a[1] * b[1]);
}

/** Returns the quotient of a/b, where a and b are fractions. */
function fracDiv(a: [number, number], b: [number, number]): [number, number] {
  return simplestFraction(a[0] * b[1], a[1] * b[0]);
}

/** Returns the sum of a + b, where a and b are fractions. */
function fracSum(a: [number, number], b: [number, number]): [number, number] {
  const a_numerator = a[0];
  const a_denominator = a[1];
  const b_numerator = b[0];
  const b_denominator = b[1];
  return simplestFraction(
    a_numerator * b_denominator + b_numerator * a_denominator,
    a_denominator * b_denominator,
  );
}

/** Returns the difference a - b, where a and b are fractions. */
function fracMinus(a: [number, number], b: [number, number]): [number, number] {
  const a_numerator = a[0];
  const a_denominator = a[1];
  const b_numerator = b[0];
  const b_denominator = b[1];
  return simplestFraction(
    a_numerator * b_denominator - b_numerator * a_denominator,
    a_denominator * b_denominator,
  );
}

/** Returns the sign of the given bigint. */
function bigSign(x: bigint): -1n | 0n | 1n {
  return x < 0n ? -1n : x > 0n ? 1n : 0n;
}

/** Returns the absolute value of the given bigint. */
function bigAbs(x: bigint): bigint {
  return x < 0n ? -x : x;
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
  symstring, // Handler: scanSymbolic

  /** String concatenation */
  concat,

  /* ---------------------------- Native Functions ---------------------------- */

  /** Binary operator; Lexeme: `mod` */
  mod, // Handler: scanIdentifier, in keywords record

  /** Binary operator; Lexeme: `rem` */
  rem, // Handler: scanIdentifier, in keywords record

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

  // Vector Operators

  /** Binary vector operator; Lexeme: `@` */
  at, // Handler: scanOperator

  /** Binary vector operator; Lexeme: `.+` */
  dot_plus, // Handler: scanOperator

  /** Binary vector operator; Lexeme: `.-` */
  dot_minus, // Handler: scanOperator

  /** Binary vector operator; Lexeme: `.*` */
  dot_star, // Handler: scanOperator

  /** Binary vector operator; Lexeme: `.\/` */
  dot_slash, // Handler: scanOperator

  // Block delimiters
  indent, // Handler: tokenizeLine
  dedent, // Handler: tokenizeLine

  // Literals
  string, // Handler: scanString
  integer, // Handler: scanNumber
  float, // Handler: scanNumber
  fraction, // Handler: scanNumber
  imaginary,
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
  let, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `const` */
  const, // Handler: scanIdentifier: in keywords record
  /** Lexeme: `fn` */
  fn, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `while` */
  while, // Handler: scanIdentifier, in keywords record
  /** Lexeme: `print` */
  print,

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
  | TokenName.caret
  | TokenName.mod
  | TokenName.rem;

type BinaryVectorOperator =
  | TokenName.at
  | TokenName.dot_plus
  | TokenName.dot_minus
  | TokenName.dot_star
  | TokenName.dot_slash;

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
  isNamed<K extends T>(name: K): this is Token<K> {
    return this._name === name;
  }
  /** Returns the string-form of the given TokenName.  */
  static tokenTypeName(name: TokenName): string {
    // prettier-ignore
    const names: Record<TokenName, string> = {
			[TokenName.left_paren]: "left_paren",
			[TokenName.right_paren]: "right_paren",
			[TokenName.left_brace]: "left_brace",
			[TokenName.right_brace]: "right_brace",
			[TokenName.left_bracket]: "left_bracket",
			[TokenName.right_bracket]: "right_bracket",
			[TokenName.comma]: "comma",
			[TokenName.colon]: "colon",
			[TokenName.dot]: "dot",
			[TokenName.minus]: "minus",
			[TokenName.plus]: "plus",
			[TokenName.slash]: "slash",
			[TokenName.semicolon]: "semicolon",
			[TokenName.star]: "star",
			[TokenName.bang]: "bang",
			[TokenName.pound]: "pound",
			[TokenName.percent]: "percent",
			[TokenName.caret]: "caret",
			[TokenName.equal]: "equal",
			[TokenName.symstring]: "symstring",
			[TokenName.concat]: "concat",
			[TokenName.mod]: "mod",
			[TokenName.rem]: "rem",
			[TokenName.eroteme]: "eroteme",
			[TokenName.less]: "less",
			[TokenName.greater]: "greater",
			[TokenName.vbar]: "vbar",
			[TokenName.tilde]: "tilde",
			[TokenName.bang_equal]: "bang_equal",
			[TokenName.equal_equal]: "equal_equal",
			[TokenName.less_equal]: "less_equal",
			[TokenName.greater_equal]: "greater_equal",
			[TokenName.native_fn]: "native_fn",
			[TokenName.at]: "at",
			[TokenName.dot_plus]: "dot_plus",
			[TokenName.dot_minus]: "dot_minus",
			[TokenName.dot_star]: "dot_star",
			[TokenName.dot_slash]: "dot_slash",
			[TokenName.indent]: "indent",
			[TokenName.dedent]: "dedent",
			[TokenName.string]: "string",
			[TokenName.integer]: "integer",
			[TokenName.float]: "float",
			[TokenName.fraction]: "fraction",
			[TokenName.imaginary]: "imaginary",
			[TokenName.nil]: "nil",
			[TokenName.bool]: "bool",
			[TokenName.nan]: "nan",
			[TokenName.inf]: "inf",
			[TokenName.symbol]: "symbol",
			[TokenName.constant]: "constant",
			[TokenName.not]: "not",
			[TokenName.and]: "and",
			[TokenName.nand]: "nand",
			[TokenName.or]: "or",
			[TokenName.nor]: "nor",
			[TokenName.xnor]: "xnor",
			[TokenName.imply]: "imply",
			[TokenName.nimply]: "nimply",
			[TokenName.converse]: "converse",
			[TokenName.nonconverse]: "nonconverse",
			[TokenName.iff]: "iff",
			[TokenName.class]: "class",
			[TokenName.if]: "if",
			[TokenName.else]: "else",
			[TokenName.return]: "return",
			[TokenName.super]: "super",
			[TokenName.this]: "this",
			[TokenName.let]: "let",
			[TokenName.const]: "const",
			[TokenName.fn]: "fn",
			[TokenName.while]: "while",
			[TokenName.print]: "print",
			[TokenName.eof]: "eof",
			[TokenName.newline]: "newline"
		}
    return names[name];
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
    i: TokenName.imaginary,
    class: TokenName.class,
    if: TokenName.if,
    else: TokenName.else,
    return: TokenName.return,
    super: TokenName.super,
    this: TokenName.this,
    let: TokenName.let,
    const: TokenName.const,
    while: TokenName.while,
    print: TokenName.print,
    fn: TokenName.fn,
    mod: TokenName.mod,
    rem: TokenName.rem,
  };
  /** The list of tokens to return. */
  let tokens: Token[] = [];

  /** A stack keeping track of indent levels. */
  const indentStack: number[] = [0];

  /** A stack keeping track of delimiters. */
  const delimiterStack: string[] = [];

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
          token(TokenName.symstring, lexeme, lineNumber, start + 1).lit(lexeme),
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
    switch (char) {
      case "(": {
        delimiterStack.push("(");
        return add(TokenName.left_paren);
      }
      case ")": {
        if (
          delimiterStack.length &&
          delimiterStack[delimiterStack.length - 1] === "("
        ) {
          delimiterStack.pop();
          return add(TokenName.right_paren);
        } else {
          throw glitch(
            `Mismatched ")"`,
            "lexical-error",
            lineNumber,
            current + 1,
          );
        }
      }
      case "{": {
        delimiterStack.push("{");
        return add(TokenName.left_brace);
      }
      case "}": {
        if (
          delimiterStack.length &&
          delimiterStack[delimiterStack.length - 1] === "{"
        ) {
          delimiterStack.pop();
          return add(TokenName.right_brace);
        } else {
          throw glitch(
            `Mismatched "}"`,
            "lexical-error",
            lineNumber,
            current + 1,
          );
        }
      }
      case "[": {
        delimiterStack.push("[");
        return add(TokenName.left_bracket);
      }
      case "]": {
        if (
          delimiterStack.length &&
          delimiterStack[delimiterStack.length - 1] === "["
        ) {
          delimiterStack.pop();
          return add(TokenName.right_bracket);
        } else {
          throw glitch(
            `Mismatched "]"`,
            "lexical-error",
            lineNumber,
            current + 1,
          );
        }
      }
      case ",":
        return add(TokenName.comma);
      case ".": {
        if (nextChar === "+") {
          return add(TokenName.dot_plus, 2);
        }
        if (nextChar === "-") {
          return add(TokenName.dot_minus, 2);
        }
        if (nextChar === "*") {
          return add(TokenName.dot_star, 2);
        }
        if (nextChar === "/") {
          return add(TokenName.dot_slash, 2);
        }
        return add(TokenName.dot);
      }
      case "-": {
        if (nextChar === ">") {
          return add(TokenName.imply, 2);
        }
        return add(TokenName.minus);
      }
      case "+":
        return add(TokenName.plus);
      case ";":
        return add(TokenName.semicolon);
      case "/":
        return add(TokenName.slash);
      case "?":
        return add(TokenName.eroteme);
      case "*": {
        return add(TokenName.star);
      }
      case "@":
        return add(TokenName.at);
      case "&":
        return add(TokenName.concat);
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
      case "#":
        return add(TokenName.pound);
      case "%":
        return add(TokenName.percent);
      case "^":
        return add(TokenName.caret);
      case "=":
        if (nextChar === "=") {
          return add(TokenName.equal_equal, 2);
        }
        return add(TokenName.equal);
      case "?":
        return add(TokenName.eroteme);
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
      case ":":
        return add(TokenName.colon);
      case "|":
        return add(TokenName.vbar);
      case "~":
        return add(TokenName.tilde);
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

    if (delimiterStack.length === 0) {
      scanIndents(indent, lineNumber);
    }

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
    if (delimiterStack.length === 0) {
      tokens.push(token(TokenName.newline, "", lineNumber, current + 1));
    }
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

type ExprKind =
  | "int"
  | "float"
  | "imaginary"
  | "complex"
  | "nil"
  | "string"
  | "bool"
  | "indefinite"
  | "difference"
  | "sum"
  | "quotient"
  | "product"
  | "power"
  | "symbol"
  | "negate"
  | "unknown"
  | "fraction";

abstract class EXPRESSION {
  abstract toString(): string;
  kind: ExprKind;
  constructor(kind: ExprKind) {
    this.kind = kind;
  }
}

abstract class REAL extends EXPRESSION {
  kind: "int" | "float" | "fraction";
  constructor(kind: "int" | "float" | "fraction") {
    super(kind);
    this.kind = kind;
  }
  abstract get numeric(): number;
  abstract get sign(): -1 | 0 | 1;
  abstract negate(): REAL;
  get imaginary(): INT {
    return int(0);
  }
  abstract isZero(): boolean;
}

/**
 * Returns `true` if the given `expr` is a `REAL`
 * number (a `FLOAT` or an `INT`).
 */
function isReal(expr: EXPRESSION): expr is REAL {
  return expr instanceof REAL;
}

class INT extends REAL {
  value: number;
  constructor(value: number) {
    super("int");
    this.value = value;
  }
  negate() {
    return int(-this.value);
  }
  get sign() {
    return signum(this.value);
  }
  get numeric() {
    return this.value;
  }
  isZero() {
    return this.value === 0;
  }
  toString(): string {
    return `${this.value}`;
  }
}

const int = (value: number) => new INT(value);
const isInt = (x: EXPRESSION): x is INT => x.kind === "int";

class FLOAT extends REAL {
  value: number;
  constructor(value: number) {
    super("float");
    this.value = value;
  }
  negate() {
    return float(-this.value);
  }
  get sign() {
    return signum(this.value);
  }
  get numeric() {
    return this.value;
  }
  isZero() {
    return this.value === 0;
  }
  toString(): string {
    return `${this.value}`;
  }
}

const float = (value: number) => new FLOAT(value);
const isFloat = (x: EXPRESSION): x is FLOAT => x.kind === "float";

class FRAC extends REAL {
  num: number;
  den: number;
  constructor(n: number, d: number) {
    super("fraction");
    this.num = n;
    this.den = d;
  }
  negate() {
    return frac(-this.num, Math.abs(this.den));
  }
  get sign() {
    return signum(this.numeric);
  }
  get numeric() {
    return this.num / this.den;
  }
  isZero() {
    return this.num === 0;
  }
  pair() {
    return [this.num, this.den] as [number, number];
  }
  toString() {
    return `${this.num}/${this.den}`;
  }
}

const frac = (n: number, d: number) => new FRAC(n, d);
const isFrac = (x: EXPRESSION): x is FRAC => x.kind === "fraction";

type NUMERIC = REAL | IMAGINARY | COMPLEX;

/**
 * Returns true if the given expression is
 * real, imaginary, or complex (a numeric type).
 */
function isNumeric(expr: EXPRESSION): expr is NUMERIC {
  return isReal(expr) || isImaginary(expr) || isComplex(expr);
}

/** Adds two real numbers. */
function addR2(left: REAL, right: REAL): REAL {
  // case: int + int
  if (isInt(left) && isInt(right)) {
    return int(left.value + right.value);
  }
  // case: float + float
  if (isFloat(left) && isFloat(right)) {
    return float(left.value + right.value);
  }
  // case: int + float
  if (isInt(left) && isFloat(right)) {
    return float(left.value + right.value);
  }
  // case: float + int
  if (isFloat(left) && isInt(right)) {
    return float(left.value + right.value);
  }
  // case: frac + frac
  if (isFrac(left) && isFrac(right)) {
    const result = fracSum(left.pair(), right.pair());
    return frac(result[0], result[1]);
  }
  // case: frac + int
  if (isFrac(left) && isInt(right)) {
    const result = fracSum([left.num, left.den], [right.value, 1]);
    return frac(result[0], result[1]);
  }
  // case: int + frac
  if (isInt(left) && isFrac(right)) {
    const result = fracSum([right.num, right.den], [left.value, 1]);
    return frac(result[0], result[1]);
  }
  // case: frac + float
  if (isFrac(left) && isFloat(right)) {
    const l = left.numeric;
    const r = right.value;
    return float(l + r);
  }
  // case: float + frac
  if (isFloat(left) && isFrac(right)) {
    const l = left.value;
    const r = right.numeric;
    return float(l + r);
  }
  // unreachable
  throw glitch(
    `Unhandled addR2 arguments: ${left.kind} + ${right.kind}`,
    "runtime-error",
  );
}

function add2(left: NUMERIC, right: NUMERIC) {
  // case: int + int
  if (isInt(left) && isInt(right)) {
    return int(left.value + right.value);
  }
  // case: float + float
  if (isFloat(left) && isFloat(right)) {
    return float(left.value + right.value);
  }
  // case: int + float
  if (isInt(left) && isFloat(right)) {
    return float(left.value + right.value);
  }
  // case: float + int
  if (isFloat(left) && isInt(right)) {
    return float(left.value + right.value);
  }
  // case: frac + frac
  if (isFrac(left) && isFrac(right)) {
    const result = fracSum(left.pair(), right.pair());
    return frac(result[0], result[1]);
  }
  // case: frac + int
  if (isFrac(left) && isInt(right)) {
    const result = fracSum([left.num, left.den], [right.value, 1]);
    return frac(result[0], result[1]);
  }
  // case: int + frac
  if (isInt(left) && isFrac(right)) {
    const result = fracSum([right.num, right.den], [left.value, 1]);
    return frac(result[0], result[1]);
  }
  // case: frac + float
  if (isFrac(left) && isFloat(right)) {
    const l = left.numeric;
    const r = right.value;
    return float(l + r);
  }
  // case: float + frac
  if (isFloat(left) && isFrac(right)) {
    const l = left.value;
    const r = right.numeric;
    return float(l + r);
  }
  // case: imaginary + int
  if (isImaginary(left) && isInt(right)) {
    return complex(right, left);
  }
  // case: int + imaginary
  if (isInt(left) && isImaginary(right)) {
    return complex(left, right);
  }
  // case: float + imaginary
  if (isFloat(left) && isImaginary(right)) {
    return complex(left, right);
  }
  // case: imaginary + float
  if (isImaginary(left) && isFloat(right)) {
    return complex(right, left);
  }
  // case: frac + imaginary
  if (isFrac(left) && isImaginary(right)) {
    return complex(left, right);
  }
  // case: imaginary + frac
  if (isImaginary(left) && isFrac(right)) {
    return complex(right, left);
  }
  // case: imaginary + imaginary
  if (isImaginary(left) && isImaginary(right)) {
    return im(addR2(left.value, right.value));
  }
  // case: complex + int
  if (isComplex(left) && isInt(right)) {
    return complex(addR2(left.real, right), left.imaginary);
  }
  // case: complex + float
  if (isComplex(left) && isFloat(right)) {
    return complex(addR2(left.real, right), left.imaginary);
  }
  // case: complex + frac
  if (isComplex(left) && isFrac(right)) {
    return complex(addR2(left.real, right), left.imaginary);
  }
  // complex + imaginary
  if (isComplex(left) && isImaginary(right)) {
    return complex(left.real, im(addR2(left.imaginary.value, right.value)));
  }
  // int + complex
  if (isInt(left) && isComplex(right)) {
    return complex(addR2(left, right.real), right.imaginary);
  }
  // float + complex
  if (isFloat(left) && isComplex(right)) {
    return complex(addR2(left, right.real), right.imaginary);
  }
  // frac + complex
  if (isFrac(left) && isComplex(right)) {
    return complex(addR2(left, right.real), right.imaginary);
  }
  // imaginary + complex
  if (isImaginary(left) && isComplex(right)) {
    return complex(right.real, im(addR2(right.imaginary.value, left.value)));
  }
  // complex + complex
  if (isComplex(left) && isComplex(right)) {
    return complex(
      addR2(left.real, right.real),
      im(addR2(left.imaginary.value, right.imaginary.value)),
    );
  }
  throw glitch(
    `Unhandled add2 case: ${left.kind} + ${right.kind}`,
    "runtime-error",
  );
}

/**
 * Given two real numbers, `left` and `right`, returns
 * `left - right`.
 */
function subR2(left: REAL, right: REAL): REAL {
  // case int - int
  if (isInt(left) && isInt(right)) {
    return int(left.value - right.value);
  }
  // case float - int
  if (isFloat(left) && isInt(right)) {
    return float(left.value - right.value);
  }
  // case frac - int
  if (isFrac(left) && isInt(right)) {
    const result = fracMinus([left.num, left.den], [right.value, 1]);
    return frac(result[0], result[1]);
  }
  // case: int - float
  if (isInt(left) && isFloat(right)) {
    return float(left.value - right.value);
  }
  // case: float - float
  if (isFloat(left) && isFloat(right)) {
    return float(left.value - right.value);
  }
  // case: frac - float
  if (isFrac(left) && isFloat(right)) {
    return float(left.numeric - right.numeric);
  }
  // case: int - frac
  if (isInt(left) && isFrac(right)) {
    const result = fracMinus([left.value, 1], [right.num, right.den]);
    return frac(result[0], result[1]);
  }
  // case: float - frac
  if (isFloat(left) && isFrac(right)) {
    return float(left.numeric - right.numeric);
  }
  // case: frac - frac
  if (isFrac(left) && isFrac(right)) {
    const result = fracMinus(left.pair(), right.pair());
    return frac(result[0], result[1]);
  }
  throw glitch(
    `Unhandled case in subR2: ${left.kind} - ${right.kind}`,
    "runtime-error",
  );
}

/**
 * Given two `NUMERIC` values, `left` and `right`,
 * returns `left - right`.
 */
function sub2(left: NUMERIC, right: NUMERIC) {
  // case real - real
  if (isReal(left) && isReal(right)) {
    return subR2(left, right);
  }
  // case: int - imaginary
  if (isInt(left) && isImaginary(right)) {
    return complex(left, im(right.value.negate()));
  }
  // case: float - imaginary
  if (isFloat(left) && isImaginary(right)) {
    return complex(left, im(right.value.negate()));
  }
  // case: frac - imaginary
  if (isFrac(left) && isImaginary(right)) {
    return complex(left, im(right.value.negate()));
  }
  // case: imaginary - int
  // example: 3i - 4
  // this is just -4 + 3i
  if (isImaginary(left) && isInt(right)) {
    return complex(right.negate(), left);
  }
  // case: imaginary - float
  if (isImaginary(left) && isFloat(right)) {
    return complex(right.negate(), left);
  }
  // case: imaginary - frac
  if (isImaginary(left) && isFrac(right)) {
    return complex(right.negate(), left);
  }
  // case: imaginary - imaginary
  if (isImaginary(left) && isImaginary(right)) {
    return im(subR2(left.value, right.value));
  }
  // case: complex - int
  if (isComplex(left) && isInt(right)) {
    return complex(subR2(left.real, right), left.imaginary);
  }
  // case: complex - float
  if (isComplex(left) && isFloat(right)) {
    return complex(subR2(left.real, right), left.imaginary);
  }
  // case: complex - frac
  if (isComplex(left) && isFrac(right)) {
    return complex(subR2(left.real, right), left.imaginary);
  }
  // case: complex - imaginary
  if (isComplex(left) && isImaginary(right)) {
    return complex(left.real, im(subR2(left.imaginary.value, right.value)));
  }
  // case: int - complex
  if (isInt(left) && isComplex(right)) {
    return complex(subR2(left, right.real), right.imaginary.negate());
  }
  // case: float - complex
  if (isFloat(left) && isComplex(right)) {
    return complex(subR2(left, right.real), right.imaginary.negate());
  }
  // case: frac - complex
  if (isFrac(left) && isComplex(right)) {
    return complex(subR2(left, right.real), right.imaginary.negate());
  }
  // case: imaginary - complex
  if (isImaginary(left) && isComplex(right)) {
    return complex(
      right.real.negate(),
      im(subR2(left.value, right.imaginary.value)),
    );
  }
  // case: complex - complex
  if (isComplex(left) && isComplex(right)) {
    return complex(
      subR2(left.real, right.real),
      im(subR2(left.imaginary.value, right.imaginary.value)),
    );
  }
  throw glitch(
    `Unhandled subtraction case: ${left.kind} - ${right.kind}`,
    "runtime-error",
  );
}

class IMAGINARY extends EXPRESSION {
  value: REAL;
  sign: -1 | 1 | 0;
  constructor(value: REAL) {
    super("imaginary");
    this.value = value;
    this.sign = this.value.sign;
  }
  negate() {
    return im(this.value.negate());
  }
  toString(): string {
    return `${this.value}i`;
  }
}
const im = (value: REAL) => new IMAGINARY(value);

const isImaginary = (expr: EXPRESSION): expr is IMAGINARY =>
  expr.kind === "imaginary";

class COMPLEX extends EXPRESSION {
  real: REAL;
  imaginary: IMAGINARY;
  constructor(real: REAL, imaginary: IMAGINARY) {
    super("complex");
    this.real = real;
    this.imaginary = imaginary;
  }
  toString(): string {
    const r = this.real.toString();
    const op = this.imaginary.sign === -1 ? "-" : "+";
    return `${r} ${op} ${Math.abs(this.imaginary.value.numeric)}i`;
  }
}

const complex = (real: REAL, imaginary: IMAGINARY) =>
  new COMPLEX(real, imaginary);

const isComplex = (expr: EXPRESSION): expr is COMPLEX =>
  expr.kind === "complex";

class NIL extends EXPRESSION {
  value = "nil" as const;
  constructor() {
    super("nil");
  }
  toString(): string {
    return `nil`;
  }
}

const nil = () => new NIL();
const isNil = (x: EXPRESSION): x is NIL => x.kind === "nil";

class STRING extends EXPRESSION {
  value: string;
  constructor(value: string) {
    super("string");
    this.value = value;
  }
  toString(): string {
    return this.value;
  }
}

const str = (value: string) => new STRING(value);
const isStr = (x: EXPRESSION): x is STRING => x.kind === "string";

class INDEFINITE extends EXPRESSION {
  value = "indefinite" as const;
  constructor() {
    super("indefinite");
  }
  toString(): string {
    return `indefinite`;
  }
}

class UNKNOWN extends EXPRESSION {
  value = "unknown" as const;
  constructor() {
    super("unknown");
  }
  toString(): string {
    return this.value;
  }
}

const unknown = () => new UNKNOWN();
const isUnknown = (expr: EXPRESSION): expr is UNKNOWN =>
  expr.kind === "unknown";

class DIFF extends EXPRESSION {
  args: [EXPRESSION, EXPRESSION];
  constructor(left: EXPRESSION, right: EXPRESSION) {
    super("difference");
    this.args = [left, right];
  }
  get left() {
    return this.args[0];
  }
  get right() {
    return this.args[1];
  }
  toString(): string {
    return `${this.left.toString()} - ${this.right.toString()}`;
  }
}

const diff = (left: EXPRESSION, right: EXPRESSION) => new DIFF(left, right);
const isDiff = (x: EXPRESSION): x is DIFF => x.kind === "difference";

class SUM extends EXPRESSION {
  args: EXPRESSION[];
  constructor(args: EXPRESSION[]) {
    super("sum");
    this.args = args;
  }
  toString(): string {
    const args = this.args.map((x) => x.toString());
    return args.join(" + ");
  }
}

const sum = (args: EXPRESSION[]) => new SUM(args);
const isSum = (x: EXPRESSION): x is SUM => x.kind === "sum";

class QUOT extends EXPRESSION {
  args: [EXPRESSION, EXPRESSION];
  constructor(left: EXPRESSION, right: EXPRESSION) {
    super("quotient");
    this.args = [left, right];
  }
  get left() {
    return this.args[0];
  }
  get right() {
    return this.args[1];
  }
  toString(): string {
    return `${this.left.toString()} / ${this.right.toString()}`;
  }
}

class PRODUCT extends EXPRESSION {
  args: EXPRESSION[];
  constructor(args: EXPRESSION[]) {
    super("product");
    this.args = args;
  }
  toString(): string {
    const args = this.args.map((x) => x.toString());
    return args.join(" * ");
  }
}

const prod = (args: EXPRESSION[]) => new PRODUCT(args);
const isProd = (x: EXPRESSION): x is PRODUCT => x.kind === "product";

class POWER extends EXPRESSION {
  args: [EXPRESSION, EXPRESSION];
  constructor(base: EXPRESSION, exponent: EXPRESSION) {
    super("power");
    this.args = [base, exponent];
  }
  get base() {
    return this.args[0];
  }
  get exponent() {
    return this.args[1];
  }
  toString(): string {
    return `${this.base.toString()}^${this.exponent.toString()}`;
  }
}

const power = (base: EXPRESSION, exponent: EXPRESSION) =>
  new POWER(base, exponent);
const isPower = (x: EXPRESSION): x is POWER => x.kind === "power";

class SYMBOL extends EXPRESSION {
  sym: string;
  value: EXPRESSION;
  constructor(sym: string, value: EXPRESSION = unknown()) {
    super("symbol");
    this.sym = sym;
    this.value = value;
  }
  val(x: EXPRESSION) {
    this.value = x;
    return this;
  }
  toString(): string {
    return this.sym;
  }
}

const sym = (s: string) => new SYMBOL(s);
const isSym = (x: EXPRESSION): x is SYMBOL => x.kind === "symbol";

class NEG extends EXPRESSION {
  arg: EXPRESSION;
  constructor(arg: EXPRESSION) {
    super("negate");
    this.arg = arg;
  }
  toString(): string {
    return `-${this.arg.toString()}`;
  }
}

const neg = (arg: EXPRESSION) => new NEG(arg);
const isNeg = (expr: EXPRESSION): expr is NEG => expr.kind === "negate";

class BOOL extends EXPRESSION {
  value: boolean;
  constructor(value: boolean) {
    super("bool");
    this.value = value;
  }
  toString(): string {
    return `${this.value}`;
  }
}

const bool = (value: boolean) => new BOOL(value);
const isBool = (x: EXPRESSION): x is BOOL => x.kind === "bool";

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
  imaginary(node: ImaginaryExpression): T;
  nil(node: Nil): T;
  str(node: Str): T;
  bool(node: Bool): T;
  indefinite(node: Indefinite): T;
  constant(node: ConstExpression): T;
  algebraicBinex(node: AlgebraicBinex): T;
  logicalBinex(node: LogicalBinex): T;
  relation(node: RelationExpr): T;
  sym(node: SymExpression): T;
  nan(node: NaNLiteral): T;
  inf(node: InfLiteral): T;
  negate(node: Negation): T;
  parend(node: ParenthesizedExpression): T;
  conditional(node: Conditional): T;
  concatenation(node: Concatenation): T;
  vectorBinex(node: VectorBinex): T;
  assignment(node: Assignment): T;
  vector(node: VectorLiteral): T;
  matrix(node: MatrixLiteral): T;
  set(node: SetLiteral): T;
  tuple(node: TupleLiteral): T;
  functionCall(node: FunctionCall): T;
  index(node: IndexingExpression): T;
  factorial(node: FactorialExpression): T;
  exprStmt(node: ExpressionStatement): T;
  varDeclaration(node: VarDeclaration): T;
  block(node: BlockStatement): T;
  functionStatement(node: FunctionStatement): T;
  ifStatement(node: IfStatement): T;
  returnStatement(node: ReturnStatement): T;
  whileStatement(node: WhileStatement): T;
  printStatement(node: PrintStatement): T;
}

/** An enum corresponding to a nodes kind. */
enum Nodekind {
  // expression nodekinds
  integer,
  float,
  nil,
  str,
  frac,
  imaginary,
  algebraic_binex,
  logical_binex,
  relation,
  sym,
  bool,
  indefinite,
  parend,
  nan,
  inf,
  concatenation,
  negation,
  conditional,
  vector_binex,
  assignment,
  vector,
  matrix,
  set,
  tuple_literal,
  factorial,
  function_call,
  indexing_expression,

  // statement nodekinds
  expression_statement,
  variable_declaration,
  block_statement,
  function_statement,
  if_statement,
  return_statement,
  while_statement,
  print_statement,
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

/** An ASTNode corresponding to a negation expression. */
class Negation extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.negate(this);
  }
  kind(): Nodekind {
    return Nodekind.negation;
  }
  toString(): string {
    return `-${this._arg.toString()}`;
  }
  _op: Token<TokenName.minus>;
  _arg: Expression;
  constructor(op: Token<TokenName.minus>, arg: Expression) {
    super();
    this._op = op;
    this._arg = arg;
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

/** An object representing a constant expression. */
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

/** An expression representing a concatentation expression. */
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

/** An object corresponding to a conditional expression node. */
class Conditional extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.conditional(this);
  }
  kind(): Nodekind {
    return Nodekind.conditional;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _op: Token<TokenName.eroteme>;
  _if: Expression;
  _then: Expression;
  _else: Expression;
  constructor(
    op: Token<TokenName.eroteme>,
    _if: Expression,
    _then: Expression,
    _else: Expression,
  ) {
    super();
    this._op = op;
    this._if = _if;
    this._then = _then;
    this._else = _else;
  }
}

/** An object corresponding to a vector binary expression ASTNode. */
class VectorBinex extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.vectorBinex(this);
  }
  kind(): Nodekind {
    return Nodekind.vector_binex;
  }
  toString(): string {
    const L = this._left.toString();
    const R = this._right.toString();
    const op = this._op._lexeme;
    return `${L} ${op} ${R}`;
  }
  _op: Token<BinaryVectorOperator>;
  _left: Expression;
  _right: Expression;
  constructor(
    left: Expression,
    op: Token<BinaryVectorOperator>,
    right: Expression,
  ) {
    super();
    this._op = op;
    this._left = left;
    this._right = right;
  }
}

/** An object representing a factorial expression AST node. */
class FactorialExpression extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.factorial(this);
  }
  kind(): Nodekind {
    return Nodekind.factorial;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _op: Token;
  _arg: Expression;
  constructor(op: Token, arg: Expression) {
    super();
    this._op = op;
    this._arg = arg;
  }
}

class Indefinite extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.indefinite(this);
  }
  kind(): Nodekind {
    return Nodekind.indefinite;
  }
  toString(): string {
    return `indefinite`;
  }
  _value = "indefinite" as const;
  constructor() {
    super();
  }
}

const indefinite = () => new INDEFINITE();
const isIndefinite = (expr: EXPRESSION): expr is INDEFINITE =>
  expr.kind === "indefinite";

/** An object representing an assignment expression. */
class Assignment extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.assignment(this);
  }
  kind(): Nodekind {
    return Nodekind.assignment;
  }
  toString(): string {
    const sym = this._sym.toString();
    const value = this._value.toString();
    return `${sym} = ${value}`;
  }
  _sym: SymExpression;
  _value: Expression;
  constructor(sym: SymExpression, value: Expression) {
    super();
    this._sym = sym;
    this._value = value;
  }
}

class TupleLiteral extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.tuple(this);
  }
  kind(): Nodekind {
    return Nodekind.tuple_literal;
  }
  toString(): string {
    return this._tuple.map((e) => e.toString()).join(", ");
  }
  _tuple: LinkedList<Expression>;
  constructor(tuple: LinkedList<Expression>) {
    super();
    this._tuple = tuple;
  }
}

class SetLiteral extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.set(this);
  }
  kind(): Nodekind {
    return Nodekind.set;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _op: Token;
  _elements: Expression[];
  constructor(op: Token, elements: Expression[]) {
    super();
    this._op = op;
    this._elements = elements;
  }
}

/** An objecting representing a vector expression. */
class VectorLiteral extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.vector(this);
  }
  kind(): Nodekind {
    return Nodekind.vector;
  }
  toString(): string {
    const elements = this._elements.map((c) => c.toString()).join(",");
    return `[${elements}]`;
  }
  _op: Token;
  _elements: Expression[];
  constructor(op: Token, elements: Expression[]) {
    super();
    this._op = op;
    this._elements = elements;
  }
}

class MatrixLiteral extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.matrix(this);
  }
  kind(): Nodekind {
    return Nodekind.matrix;
  }
  toString(): string {
    const vectors = this._vectors.map((v) => v.toString()).join("\n");
    return `[\n${vectors}\n]`;
  }
  _op: Token;
  _vectors: VectorLiteral[];
  _rowCount: number;
  _colCount: number;
  constructor(
    op: Token,
    vectors: VectorLiteral[],
    rowcount: number,
    colcount: number,
  ) {
    super();
    this._op = op;
    this._vectors = vectors;
    this._rowCount = rowcount;
    this._colCount = colcount;
  }
}

/** An object representing a function call AST node. */
class FunctionCall extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.functionCall(this);
  }
  kind(): Nodekind {
    return Nodekind.function_call;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _callee: Expression;
  _paren: Token;
  _args: Expression[];
  constructor(callee: Expression, paren: Token, args: Expression[]) {
    super();
    this._callee = callee;
    this._paren = paren;
    this._args = args;
  }
}

/** An object corresponding to an indexing expression AST node. */
class IndexingExpression extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.index(this);
  }
  kind(): Nodekind {
    return Nodekind.indexing_expression;
  }
  toString(): string {
    const L = this._list.toString();
    const i = this._index.toString();
    return `${L}[${i}]`;
  }
  _op: Token;
  _list: Expression;
  _index: Expression;
  constructor(op: Token, list: Expression, index: Expression) {
    super();
    this._op = op;
    this._list = list;
    this._index = index;
  }
}

class ImaginaryExpression extends Expression {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.imaginary(this);
  }
  kind(): Nodekind {
    return Nodekind.imaginary;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _constant: Integer | Float | Frac;
  _im: Token<TokenName.imaginary>;
  constructor(
    constant: Integer | Float | Frac,
    im: Token<TokenName.imaginary>,
  ) {
    super();
    this._constant = constant;
    this._im = im;
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

/** An object representing an expression statement. */
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

/** An object representing a variable declaration statement. */
class VarDeclaration extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.varDeclaration(this);
  }
  kind(): Nodekind {
    return Nodekind.variable_declaration;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _symbol: Token<TokenName.symbol>;
  _value: Expression;
  constructor(sym: Token<TokenName.symbol>, value: Expression) {
    super();
    this._symbol = sym;
    this._value = value;
  }
}

/** An ASTNode corresponding to a block statement. */
class BlockStatement extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.block(this);
  }
  kind(): Nodekind {
    return Nodekind.block_statement;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _statements: Statement[];
  constructor(statements: Statement[]) {
    super();
    this._statements = statements;
  }
}

/** An ASTNode corresponding to a function declaration statement. */
class FunctionStatement extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.functionStatement(this);
  }
  kind(): Nodekind {
    return Nodekind.function_statement;
  }
  toString(): string {
    throw new Error("Method not implemented.");
  }
  _name: Token<TokenName.symbol>;
  _params: SymExpression[];
  _body: Statement[];
  _inline: boolean;
  constructor(
    name: Token<TokenName.symbol>,
    params: SymExpression[],
    body: Statement[],
    inline: boolean,
  ) {
    super();
    this._name = name;
    this._params = params;
    this._body = body;
    this._inline = inline;
  }
}

/** An ASTNode corresponding to a conditional statement. */
class IfStatement extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.ifStatement(this);
  }
  kind(): Nodekind {
    return Nodekind.if_statement;
  }
  toString(): string {
    return `if-statement`;
  }
  _keyword: Token;
  _condition: Expression;
  _then: Statement;
  _else: Statement;
  constructor(
    keyword: Token,
    condition: Expression,
    then: Statement,
    _else: Statement,
  ) {
    super();
    this._keyword = keyword;
    this._condition = condition;
    this._then = then;
    this._else = _else;
  }
}

/** An object corresponding to a Return Statement ASTNode. */
class ReturnStatement extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.returnStatement(this);
  }
  kind(): Nodekind {
    return Nodekind.return_statement;
  }
  toString(): string {
    return `return-statement`;
  }
  _keyword: Token;
  _value: Expression;
  constructor(keyword: Token, value: Expression) {
    super();
    this._keyword = keyword;
    this._value = value;
  }
}

/** An object corresponding to a while statement ASTNode. */
class WhileStatement extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.whileStatement(this);
  }
  kind(): Nodekind {
    return Nodekind.while_statement;
  }
  toString(): string {
    return `while-statement`;
  }
  _keyword: Token;
  _condition: Expression;
  _body: Statement;
  constructor(keyword: Token, condition: Expression, body: Statement) {
    super();
    this._keyword = keyword;
    this._condition = condition;
    this._body = body;
  }
}

class PrintStatement extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.printStatement(this);
  }
  kind(): Nodekind {
    return Nodekind.print_statement;
  }
  toString(): string {
    return "print-statement";
  }
  _target: Expression;
  constructor(target: Expression) {
    super();
    this._target = target;
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
  imaginary: (
    constant: Integer | Frac | Float,
    im: Token<TokenName.imaginary>,
  ) => new ImaginaryExpression(constant, im),
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
  vectorBinex: (
    left: Expression,
    op: Token<BinaryVectorOperator>,
    right: Expression,
  ) => new VectorBinex(left, op, right),
  constant: (c: Token<TokenName.constant>) => new ConstExpression(c),
  bool: (c: Token) => new Bool(c._lexeme === "true"),
  nan: () => new NaNLiteral(),
  inf: () => new InfLiteral(),
  parend: (e: Expression) => new ParenthesizedExpression(e),
  concatenation: (left: Expression, op: Token, right: Expression) =>
    new Concatenation(left, op, right),
  negation: (op: Token<TokenName.minus>, arg: Expression) =>
    new Negation(op, arg),
  conditional: (
    op: Token<TokenName.eroteme>,
    _if: Expression,
    _then: Expression,
    _else: Expression,
  ) => new Conditional(op, _if, _then, _else),
  assignment: (sym: SymExpression, value: Expression) =>
    new Assignment(sym, value),
  vector: (op: Token, elements: Expression[]) =>
    new VectorLiteral(op, elements),
  set: (op: Token, elements: Expression[]) => new SetLiteral(op, elements),
  tuple: (tuple: LinkedList<Expression>) => new TupleLiteral(tuple),
  matrix: (
    op: Token,
    vectors: VectorLiteral[],
    rowcount: number,
    colcount: number,
  ) => new MatrixLiteral(op, vectors, rowcount, colcount),
  factorial: (op: Token, arg: Expression) => new FactorialExpression(op, arg),
  functionCall: (paren: Token, callee: Expression, args: Expression[]) =>
    new FunctionCall(callee, paren, args),
  index: (op: Token, list: Expression, index: Expression) =>
    new IndexingExpression(op, list, index),
  statement: {
    expression: (e: Expression) => new ExpressionStatement(e),
    varDeclaration: (sym: Token<TokenName.symbol>, value: Expression) =>
      new VarDeclaration(sym, value),
    block: (statements: Statement[]) => new BlockStatement(statements),
    functionDeclaration: (
      name: Token<TokenName.symbol>,
      params: SymExpression[],
      body: Statement[],
      inline: boolean,
    ) => new FunctionStatement(name, params, body, inline),
    if: (
      keyword: Token,
      condition: Expression,
      then: Statement,
      _else: Statement,
    ) => new IfStatement(keyword, condition, then, _else),
    return: (keyword: Token, value: Expression) =>
      new ReturnStatement(keyword, value),
    while: (keyword: Token, condition: Expression, body: Statement) =>
      new WhileStatement(keyword, condition, body),
    print: (target: Expression) => new PrintStatement(target),
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
  get _currentLine() {
    return this._peek._line;
  }
  get _currentColumn() {
    return this._peek._column;
  }
  get _prevLine() {
    return this._prev._line;
  }
  get _prevColumn() {
    return this._prev._column;
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
  vector,
  set,
  conditional,
  abs,
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
  factorial,
  dot_product,
  dot_sum,
  dot_difference,
  dot_mul,
  dot_div,
  postfix,
  function_call,
}

/** @internal A Pratt parsing function. */
type Parslet<T> = (current: Token, lastNode: T) => Either<Glitch, T>;

/** @internal An entry within parser’s BP table. The first element is a prefix parslet, the second element is an infix parslet, and the last element is the binding power of the operator. */
type ParsletEntry<T> = [Parslet<T>, Parslet<T>, BP];

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
        `Unexpected lexeme: ${token.toString()}`,
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
  const vectorInfix = (op: Token, lhs: Expression) => {
    const p = precof(op._name);
    return expression(p).chain((rhs) =>
      state.expression(
        astnode.vectorBinex(lhs, op as Token<BinaryVectorOperator>, rhs),
      ),
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

  /** Parses a conditional. */
  const conditional = (op: Token, c: Expression) => {
    if (!op.isNamed(TokenName.eroteme)) {
      return state.error(
        `Expected a "?" but got "${op._lexeme}"`,
        op._line,
        op._column,
      );
    }
    const p = precof(op._name);
    const _then = expression(p);
    if (_then.isLeft()) return _then;
    const r1 = _then.unwrap();
    if (!state.nextIs(TokenName.colon)) {
      return state.error(
        `Expected a ":" after the first consequent`,
        op._line,
        op._column,
      );
    }
    const _else = expression(p);
    if (_else.isLeft()) return _else;
    const r2 = _else.unwrap();
    return state.expression(astnode.conditional(op, c, r1, r2));
  };

  const assignment = (op: Token, node: Expression) => {
    if (node instanceof SymExpression) {
      return expression().chain((value) =>
        state.expression(astnode.assignment(node, value)),
      );
    } else {
      return state.error(
        `Expected a valid assignment target, but got ${node.toString()}`,
        op._line,
        op._column,
      );
    }
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
      // @ts-expect-error The logic is sound; too much work to work with the typechecker.
      const out: Right<Integer | Float> = t.isNamed(TokenName.integer)
        ? state.expression(astnode.int(t._literal as number))
        : state.expression(astnode.float(t._literal as number));
      // Handle implicit multiplication
      if (state.nextIs(TokenName.imaginary)) {
        return state.expression(
          astnode.imaginary(
            out.unwrap(),
            token(TokenName.imaginary, "i", state._prevLine, state._prevColumn),
          ),
        );
      }
      const peek = state._peek;
      if (
        peek.isNamed(TokenName.left_paren) ||
        peek.isNamed(TokenName.vbar) ||
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
    if (state.nextIs(TokenName.imaginary)) {
      return state.expression(
        astnode.imaginary(
          astnode.frac(numerator, denominator),
          token(TokenName.imaginary, "i", state._prevLine, state._prevColumn),
        ),
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

  /** Parses a set literal. */
  const set = (prev: Token) => {
    const elements: Expression[] = [];
    if (!state.check(TokenName.right_brace)) {
      do {
        const elem = expression();
        if (elem.isLeft()) return elem;
        const e = elem.unwrap();
        elements.push(e);
      } while (state.nextIs(TokenName.comma) && !state.atEnd());
    }
    if (!state.nextIs(TokenName.right_brace)) {
      return state.error(
        `Expected a closing "}".`,
        state._prevLine,
        state._prevColumn,
      );
    }
    return state.expression(astnode.set(prev, elements));
  };

  /** Parses a vector literal. */
  const vector = (prev: Token) => {
    const elements: Expression[] = [];
    const vectors: VectorLiteral[] = [];
    let rows = 0;
    let columns = 0;
    let columnCount = 0;
    if (!state.check(TokenName.right_bracket)) {
      do {
        const elem = expression();
        if (elem.isLeft()) return elem;
        const element = elem.unwrap();
        if (element instanceof VectorLiteral) {
          rows++;
          if (vectors.length) {
            columnCount = vectors[0]._elements.length;
          }
          columns = element._elements.length;
          if (columnCount !== columns && columnCount !== 0) {
            return state.error(
              `Jagged matrix encountered`,
              state._peek._line,
              state._peek._column,
            );
          }
          vectors.push(element);
        } else {
          elements.push(element);
        }
        // check for trailing commas.
        if (
          state.check(TokenName.comma) &&
          state._peekNext.isNamed(TokenName.right_bracket)
        ) {
          state.next(); // eat the comma
          break; // get out of this loop
        }
      } while (state.nextIs(TokenName.comma) && !state.atEnd());
    }
    if (!state.nextIs(TokenName.right_bracket)) {
      return state.error(
        `Expected a right bracket "]"`,
        state._peek._line,
        state._peek._column,
      );
    }
    if (vectors.length !== 0) {
      // if (vectors.length !== columns) {
      //   return state.error(
      //     `Encountered a jagged matrix.`,
      //     state._peek._line,
      //     state._peek._column,
      //   );
      // }
      return state.expression(astnode.matrix(prev, vectors, rows, columns));
    }
    return state.expression(astnode.vector(prev, elements));
  };

  /** Parses a percent operation. */
  const parsePercent = (op: Token, lhs: Expression) => {
    const p = precof(op._name);
    const _rhs = expression(p);
    if (_rhs.isLeft()) return _rhs;
    const rhs = _rhs.unwrap();
    const e = astnode.algBinex(
      astnode.parend(
        astnode.algBinex(
          lhs,
          token(TokenName.slash, "/", op._line, op._column),
          rhs,
        ),
      ),
      token(TokenName.star, "*", op._line, op._column),
      astnode.int(100),
    );
    return state.expression(e);
  };

  /** Parses a comma separated list. */
  const commaSepList = <E extends Expression>(
    filter: (e: Expression) => e is E,
    errorMessage: string,
  ) => {
    const elements: E[] = [];
    do {
      const e = expression();
      if (e.isLeft()) return e;
      const element = e.unwrap();
      if (!filter(element)) {
        return state.error(
          errorMessage,
          state._currentLine,
          state._currentColumn,
        );
      }
      elements.push(element);
    } while (state.nextIs(TokenName.comma));
    return right(elements);
  };

  /** Parses a function call. */
  const functionCall = (op: Token, callee: Expression) => {
    let args: Expression[] = [];
    if (!state.check(TokenName.right_paren)) {
      const arglist = commaSepList(
        (node): node is Expression => node instanceof Expression,
        `Expected an expression`,
      );
      if (arglist.isLeft()) return arglist;
      args = arglist.unwrap();
    }
    const paren = state.next();
    if (!paren.isNamed(TokenName.right_paren)) {
      return state.error(`Expected a closing ")"`, paren._line, paren._column);
    }
    return state.expression(astnode.functionCall(paren, callee, args));
  };

  const indexingExpression = (op: Token, list: Expression) => {
    const index = expression();
    if (index.isLeft()) return index;
    const rbracket = state.next();
    if (!rbracket.isNamed(TokenName.right_bracket)) {
      return state.error(
        `Expected a closing "]"`,
        rbracket._line,
        rbracket._column,
      );
    }
    return state.expression(astnode.index(op, list, index.unwrap()));
  };

  /** Parses a parenthesized expression. */
  const parenthesized = (t: Token) => {
    const innerExpression = expression();
    if (innerExpression.isLeft()) {
      return innerExpression;
    }
    // if the next expression is a comma, then this is a tuple,
    // and we should parse it as such.
    if (state.nextIs(TokenName.comma)) {
      const elements = [innerExpression.unwrap()];
      do {
        const e = expression();
        if (e.isLeft()) return e;
        const element = e.unwrap();
        elements.push(element);
      } while (state.nextIs(TokenName.comma) && !state.atEnd());
      const list = linkedList(...elements);
      if (!state.nextIs(TokenName.right_paren)) {
        return state.error(
          `Expected a ")" to close the tuple.`,
          t._line,
          t._column,
        );
      }
      return state.expression(astnode.tuple(list));
    }
    // Otherwise, we should parse it as a parenthesized expression.
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

  /** Parses a factorial expression. */
  const factorial = (op: Token, arg: Expression) => {
    if (!op.isNamed(TokenName.bang)) {
      return state.error(
        `Expected a "!" but got "${op._lexeme}"`,
        op._line,
        op._column,
      );
    }
    return state.expression(astnode.factorial(op, arg));
  };

  /** Parses an algebraic prefix expression. */
  const algPrefix = (op: Token) => {
    const p = precof(op._name);
    const a = expression(p);
    if (a.isLeft()) return a;
    const arg = a.unwrap();
    if (op.isNamed(TokenName.minus)) {
      return state.expression(astnode.negation(op, arg));
    }
    return state.error(
      `Expected a "-" but got ${op._lexeme}`,
      op._line,
      op._column,
    );
  };

  const imaginary = (op: Token) => {
    return state.expression(
      astnode.imaginary(
        astnode.int(1),
        token(TokenName.imaginary, "i", op._line, op._column),
      ),
    );
  };

  const rules: BPTable<Expression> = {
    [TokenName.left_paren]: [parenthesized, functionCall, BP.function_call],
    [TokenName.right_paren]: [___, ___, ___o],
    [TokenName.left_brace]: [set, ___, BP.set],
    [TokenName.right_brace]: [___, ___, ___o],
    [TokenName.left_bracket]: [vector, indexingExpression, BP.function_call],
    [TokenName.right_bracket]: [___, ___, ___o],
    [TokenName.comma]: [___, ___, ___o],
    [TokenName.colon]: [___, ___, ___o],
    [TokenName.dot]: [___, ___, ___o],

    [TokenName.native_fn]: [___, ___, ___o],

    // Algebraic Binary Operators
    [TokenName.plus]: [___, algInfix, BP.sum],
    [TokenName.minus]: [algPrefix, algInfix, BP.difference],
    [TokenName.star]: [___, algInfix, BP.product],
    [TokenName.slash]: [___, algInfix, BP.quotient],
    [TokenName.caret]: [___, algInfix, BP.power],

    [TokenName.semicolon]: [___, ___, ___o],

    // Vector Binary Operators
    [TokenName.at]: [___, vectorInfix, BP.dot_product],
    [TokenName.dot_plus]: [___, vectorInfix, BP.dot_sum],
    [TokenName.dot_minus]: [___, vectorInfix, BP.dot_difference],
    [TokenName.dot_star]: [___, vectorInfix, BP.dot_mul],
    [TokenName.dot_slash]: [___, vectorInfix, BP.dot_div],

    [TokenName.bang]: [___, factorial, BP.factorial],
    [TokenName.pound]: [___, ___, ___o],
    [TokenName.percent]: [___, parsePercent, BP.quotient],
    [TokenName.equal]: [___, assignment, BP.assignment],
    [TokenName.mod]: [___, algInfix, BP.quotient],
    [TokenName.rem]: [___, algInfix, BP.quotient],
    [TokenName.symstring]: [___, ___, ___o],
    [TokenName.eroteme]: [___, conditional, BP.conditional],
    [TokenName.vbar]: [___, ___, BP.abs],

    // comparisons
    [TokenName.bang_equal]: [___, relation, BP.compare],
    [TokenName.equal_equal]: [___, relation, BP.compare],
    [TokenName.less_equal]: [___, relation, BP.compare],
    [TokenName.greater_equal]: [___, relation, BP.compare],
    [TokenName.less]: [___, relation, BP.compare],
    [TokenName.greater]: [___, relation, BP.compare],
    [TokenName.tilde]: [___, relation, BP.compare],

    // string concatenation
    [TokenName.concat]: [___, concat, BP.string_operation],

    // blocks
    [TokenName.indent]: [___, ___, ___o],
    [TokenName.dedent]: [___, ___, ___o],

    // literals
    [TokenName.string]: [str, ___, BP.atom],
    [TokenName.integer]: [number, ___, BP.atom],
    [TokenName.float]: [number, ___, BP.atom],
    [TokenName.fraction]: [frac, ___, BP.atom],
    [TokenName.imaginary]: [imaginary, ___, BP.atom],
    [TokenName.nil]: [nil, ___, BP.atom],
    [TokenName.bool]: [bool, ___, BP.atom],
    [TokenName.nan]: [nan, ___, BP.atom],
    [TokenName.inf]: [inf, ___, BP.atom],
    [TokenName.symbol]: [sym, ___, BP.atom],
    [TokenName.constant]: [constant, ___, BP.atom],

    // logical operations
    [TokenName.not]: [___, ___, ___o],
    [TokenName.and]: [___, logInfix, BP.and],
    [TokenName.nand]: [___, logInfix, BP.nand],
    [TokenName.or]: [___, logInfix, BP.or],
    [TokenName.nor]: [___, logInfix, BP.nor],
    [TokenName.xnor]: [___, logInfix, BP.xnor],
    [TokenName.imply]: [___, logInfix, BP.imply],
    [TokenName.nimply]: [___, logInfix, BP.nimply],
    [TokenName.converse]: [___, logInfix, BP.converse],
    [TokenName.nonconverse]: [___, logInfix, BP.nonconverse],
    [TokenName.iff]: [___, logInfix, BP.iff],

    // keywords
    [TokenName.class]: [___, ___, ___o],
    [TokenName.if]: [___, ___, ___o],
    [TokenName.else]: [___, ___, ___o],
    [TokenName.return]: [___, ___, ___o],
    [TokenName.super]: [___, ___, ___o],
    [TokenName.this]: [___, ___, ___o],
    [TokenName.let]: [___, ___, ___o],
    [TokenName.const]: [___, ___, ___o],
    [TokenName.fn]: [___, ___, ___o],
    [TokenName.while]: [___, ___, ___o],
    [TokenName.print]: [___, ___, ___o],
    [TokenName.eof]: [___, ___, ___o],
    [TokenName.newline]: [___, ___, ___o],
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
   * Returns the {@link bp|precedence} of the given token type.
   */
  const precof = (t: TokenName): BP => rules[t][2];

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
      const r = infixRule(token._name);
      const rhs = r(token, lhs.unwrap());
      if (rhs.isLeft()) return rhs;
      lhs = rhs;
    }
    return lhs;
  };

  /** Parses a function declaration. */
  // There are two ways to write functions in LEM.
  // 1. Single-line declaration: fn f(x) = x^2
  // 2. Multi-line declaration:
  //   fn f(x):
  //       if x < 0: -x
  //       else: x
  const FUNCTION_DECLARATION = () => {
    const name = state.next();
    // The statement parser brancher already ate the "fn" keyword, so the next
    // token must be a valid identifier.
    if (!name.isNamed(TokenName.symbol)) {
      return state.error(
        `Expected a valid identifier for the function's name, but got "${name._lexeme}".`,
        name._line,
        name._column,
      );
    }
    // Following the identifier must be a left parenthesis.
    if (!state.nextIs(TokenName.left_paren)) {
      return state.error(
        `Expected a "(" to begin the parameter list`,
        state._currentLine,
        state._currentColumn,
      );
    }
    // Now gather the parameters.
    const params: Token<TokenName.symbol>[] = [];
    if (!state._peek.isNamed(TokenName.right_paren)) {
      do {
        const expression = state.next();
        if (!expression.isNamed(TokenName.symbol)) {
          return state.error(
            `Expected a valid identifier as a parameter, but got "${expression._lexeme}"`,
            expression._line,
            expression._column,
          );
        }
        params.push(expression);
      } while (state.nextIs(TokenName.comma));
    }
    if (!state.nextIs(TokenName.right_paren)) {
      return state.error(
        `Expected a ")" to close the parameter list.`,
        state._currentLine,
        state._currentColumn,
      );
    }
    if (state.nextIs(TokenName.equal)) {
      const body = EXPRESSION();
      return body.chain((b) =>
        state.statement(
          astnode.statement.functionDeclaration(
            name,
            params.map((s) => astnode.sym(s)),
            [b],
            true,
          ),
        ),
      );
    }
    if (!state.nextIs(TokenName.colon)) {
      return state.error(
        `Expected a colon to begin the function's body`,
        state._currentLine,
        state._currentColumn,
      );
    }
    state.nextIs(TokenName.newline);
    if (!state.nextIs(TokenName.indent)) {
      return state.error(
        `Expected an indent to open the function's body`,
        state._currentLine,
        state._currentColumn,
      );
    }
    const body = BLOCK();
    return body.chain((b) =>
      state.statement(
        astnode.statement.functionDeclaration(
          name,
          params.map((p) => astnode.sym(p)),
          b._statements,
          false,
        ),
      ),
    );
  };

  /** Parses a variable declaration. */
  const VAR_DECLARATION = () => {
    const name = state.next();
    if (!name.isNamed(TokenName.symbol)) {
      return state.error(
        `Expected a valid identifier`,
        name._line,
        name._column,
      );
    }
    if (!state.nextIs(TokenName.equal)) {
      return state.error(
        `Expected an assignment operator "=" after identifier`,
        state._currentLine,
        state._currentColumn,
      );
    }
    const init = EXPRESSION();
    if (init.isLeft()) return init;
    const value = init.unwrap()._expression;
    return state.statement(astnode.statement.varDeclaration(name, value));
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

  const BLOCK = (): Either<Glitch, BlockStatement> => {
    const statements: Statement[] = [];
    while (!state.atEnd() && !state.check(TokenName.dedent)) {
      const stmt = STATEMENT();
      if (stmt.isLeft()) return stmt;
      statements.push(stmt.unwrap());
    }
    if (
      state.nextIs(TokenName.dedent) ||
      state.nextIs(TokenName.newline) ||
      state._peek.isNamed(TokenName.eof)
    ) {
      return state.statement(astnode.statement.block(statements));
    } else {
      return state.error(
        `Expected a dedentation to close the block`,
        state._currentLine,
        state._currentColumn,
      );
    }
  };

  /** Parses a return statement. */
  const RETURN = () => {
    const c = state._peek.clone();
    const out = EXPRESSION();
    return out.chain((e) => state.statement(astnode.statement.return(c, e)));
  };

  /** Parses an if statement. */
  const IF = () => {
    const keyword = state._peek.clone();
    const c = expression();
    if (c.isLeft()) return c;
    const condition = c.unwrap();
    if (!state.nextIs(TokenName.colon)) {
      return state.error(
        `Expected a ":" to begin the consequent block`,
        state._currentLine,
        state._currentColumn,
      );
    }
    state.nextIs(TokenName.newline);
    const consequent = STATEMENT();
    if (consequent.isLeft()) return consequent;
    const thenBranch = consequent.unwrap();
    let elseBranch: Statement = astnode.statement.return(
      token(
        TokenName.return,
        "return",
        state._currentLine,
        state._currentColumn,
      ),
      astnode.nil(),
    );
    if (state.nextIs(TokenName.else)) {
      if (!state.nextIs(TokenName.colon)) {
        return state.error(
          `Expected a ":" to begin the else block`,
          state._currentLine,
          state._currentColumn,
        );
      }
      state.nextIs(TokenName.newline);
      const alternate = STATEMENT();
      if (alternate.isLeft()) return alternate;
      elseBranch = alternate.unwrap();
    }
    return state.statement(
      astnode.statement.if(keyword, condition, thenBranch, elseBranch),
    );
  };

  const WHILE = () => {
    const current = state._peek.clone();
    const loopCondition = expression();
    if (loopCondition.isLeft()) return loopCondition;
    const condition = loopCondition.unwrap();
    if (!state.nextIs(TokenName.colon)) {
      return state.error(
        `Expected a ":" to begin the while loop's body`,
        state._currentLine,
        state._currentColumn,
      );
    }
    state.nextIs(TokenName.newline);
    const body = STATEMENT();
    if (body.isLeft()) return body;
    return state.statement(
      astnode.statement.while(current, condition, body.unwrap()),
    );
  };

  const PRINT = () => {
    const target = expression();
    if (target.isLeft()) return target;
    if (state.nextIs(TokenName.semicolon) || state.nextIs(TokenName.newline)) {
      return state.statement(astnode.statement.print(target.unwrap()));
    }
    return state.error(
      `Expected a newline or semicolon to end the print statement`,
      state._currentLine,
      state._currentColumn,
    );
  };

  const STATEMENT = (): Either<Glitch, Statement> => {
    if (state.nextIs(TokenName.let)) {
      return VAR_DECLARATION();
    }
    if (state.nextIs(TokenName.while)) {
      return WHILE();
    }
    if (state.nextIs(TokenName.fn)) {
      return FUNCTION_DECLARATION();
    }
    if (state.nextIs(TokenName.return)) {
      return RETURN();
    }
    if (state.nextIs(TokenName.if)) {
      return IF();
    }
    if (state.nextIs(TokenName.indent)) {
      return BLOCK();
    }
    if (state.nextIs(TokenName.print)) {
      return PRINT();
    }
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

class Interpreter implements Visitor<EXPRESSION> {
  resolveConstants: boolean = true;
  interpret(program: Statement[]) {
    try {
      let result: EXPRESSION = nil();
      for (let i = 0; i < program.length; i++) {
        result = this.evalStatement(program[i]);
      }
      return result;
    } catch (error) {
      if (error instanceof Glitch) {
        return error.report();
      }
      return (error as Error).message;
    }
  }
  private evalStatement(node: Statement): EXPRESSION {
    return node.accept(this);
  }
  private evaluate(expression: Expression): EXPRESSION {
    return expression.accept(this);
  }
  integer(node: Integer): EXPRESSION {
    return int(node._value);
  }
  float(node: Float): EXPRESSION {
    return float(node._value);
  }
  frac(node: Frac): EXPRESSION {
    return frac(node._numerator, node._denominator);
  }
  nil(node: Nil): EXPRESSION {
    return nil();
  }
  imaginary(node: ImaginaryExpression): EXPRESSION {
    const result = this.evaluate(node._constant);
    if (isInt(result) || isFloat(result) || isFrac(result)) {
      if (result.isZero()) {
        return int(0);
      }
      return im(result);
    }
    throw glitch(
      `Expected a numeric constant for the imaginary number`,
      "runtime-error",
    );
  }
  str(node: Str): EXPRESSION {
    return str(node._value);
  }
  bool(node: Bool): EXPRESSION {
    return bool(node._value);
  }
  indefinite(node: Indefinite): EXPRESSION {
    return indefinite();
  }
  constant(node: ConstExpression): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  algebraicBinex(node: AlgebraicBinex): EXPRESSION {
    const left = this.evaluate(node._left);
    const right = this.evaluate(node._right);
		// handle addition
    if (node._op.isNamed(TokenName.plus)) {
      if (isNumeric(left) && isNumeric(right)) {
        return add2(left, right);
      }
      // unresolved symbol + something => sum
      if (isSym(left)) {
        return sum([left, right]);
      }
      // something + unresolved symbol
      if (isSym(right)) {
        return sum([right, left]);
      }
      throw glitch(
        `Invalid sum: ${left.kind} + ${right.kind}`,
        "runtime-error",
      );
    }
		// handle subtraction
    if (node._op.isNamed(TokenName.minus)) {
			if (isNumeric(left) && isNumeric(right)) {
				return sub2(left, right);
			}
      throw glitch(
        `Unhandled subtraction case: ${left.kind} - ${right.kind}`,
        "runtime-error",
      );
    }
    throw glitch(
      `Unsupported operation: ${node._op._lexeme}`,
      "runtime-error",
      node._op._line,
      node._op._column,
    );
  }
  logicalBinex(node: LogicalBinex): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  relation(node: RelationExpr): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  sym(node: SymExpression): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  nan(node: NaNLiteral): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  inf(node: InfLiteral): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  negate(node: Negation): EXPRESSION {
    const arg = this.evaluate(node._arg);
    if (isReal(arg)) {
      return arg.negate();
    }
    if (isImaginary(arg)) {
      return im(arg.value.negate());
    }
    if (isComplex(arg)) {
      return complex(arg.real.negate(), arg.imaginary.negate());
    }
    throw glitch(`Unhandled case: -${arg.kind}`, "runtime-error");
  }
  parend(node: ParenthesizedExpression): EXPRESSION {
    return this.evaluate(node._expression);
  }
  conditional(node: Conditional): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  concatenation(node: Concatenation): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  vectorBinex(node: VectorBinex): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  assignment(node: Assignment): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  vector(node: VectorLiteral): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  matrix(node: MatrixLiteral): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  set(node: SetLiteral): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  tuple(node: TupleLiteral): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  functionCall(node: FunctionCall): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  index(node: IndexingExpression): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  factorial(node: FactorialExpression): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  exprStmt(node: ExpressionStatement): EXPRESSION {
    return this.evaluate(node._expression);
  }
  varDeclaration(node: VarDeclaration): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  block(node: BlockStatement): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  functionStatement(node: FunctionStatement): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  ifStatement(node: IfStatement): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  returnStatement(node: ReturnStatement): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  whileStatement(node: WhileStatement): EXPRESSION {
    throw new Error("Method not implemented.");
  }
  printStatement(node: PrintStatement): EXPRESSION {
    const value = this.evaluate(node._target).toString();
    console.log(value);
    return str(value);
  }
}

function weaver(sourceCode: string) {
  const interpreter = new Interpreter();
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
    const ast = syntax();
    if (ast.isLeft()) return ast.unwrap().report();
    const result = interpreter.interpret(ast.unwrap());
    return result;
  };
  return {
    lexical,
    syntax,
    run,
  };
}

const r = weaver(`
(4 + 2i) - (3 - 2i)
`).run();
print(r.toString());
