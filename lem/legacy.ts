/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (C) 2025 Ketib Oldiais - All Rights Reserved.
// You may use, distribute, and modify this code under the
// terms of the MIT license (see the bottom of this file).

// Disabling TypeScript's no-explicity-any rule because we
// have to do some heavy recursion in the CAS modules;
// TypeScript goes insane with certain recursive types,
// and it's far too cumbersome to remedy the compiler
// with explicit types.

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */

// § Utility Functions

// Start off by writing a function for generating
// pretty-print strings of ASTs.
// We'll be using this for quickly verifying
// the parsers are behaving correctly.

/** Returns a pretty-print tree of the given Object `Obj`. */
export function treestring<T extends object>(
  Obj: T,
  cbfn?: (node: any) => void
) {
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
    root: any,
    last: boolean,
    prevstack: [T, boolean][],
    cb: (str: string) => any
  ) => {
    if (cbfn) {
      cbfn(root);
    }
    let line = "";
    let index = 0;
    let lastKey = false;
    let circ = false;
    const stack = prevstack.slice(0);
    if (stack.push([root, last]) && stack.length > 0) {
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
      const keys = getKeys(root);
      keys.forEach((branch) => {
        lastKey = ++index === keys.length;
        grow(branch, root[branch], lastKey, stack, cb);
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
    (line: string) => (output += line + "\n")
  );
  return output;
}

/** Typeguard : Returns true if `x` is Undefined or null. */
function isNothing(x: any): x is undefined | null {
  return x === undefined || x === null;
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

/** Returns a tuple. */
export function tuple<T extends any[]>(...data: T) {
  return data;
}

/** Given an array of type `T[]`, splits the array in two and returns the two halves as a pair. */
export function arraySplit<T>(array: T[]) {
  const L = array.length;
  const half = Math.ceil(L / 2);
  const left = array.slice(0, half);
  const right = array.slice(half);
  return [left, right] as [T[], T[]];
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
      list: LinkedList<T>
    ) => X,
    initialValue: X
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
      list: LinkedList<T>
    ) => X,
    initialValue: X
  ): X {
    return this.#reduce(1, reducer, initialValue);
  }

  reduce<X>(
    reducer: (
      accumulator: X,
      currentValue: T,
      index: number,
      list: LinkedList<T>
    ) => X,
    initialValue: X
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

type Either<A, B> = Left<A> | Right<B>;

/** An object corresponding to failure. */
class Left<T> {
  private value: T;
  constructor(value: T) {
    this.value = value;
  }
  map(): Either<T, never> {
    return this as any;
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

type NumberTokenType =
  | token_type.integer
  | token_type.float
  | token_type.big_integer
  | token_type.scientific
  | token_type.fraction;

type ErrorType =
  | "lexical-error"
  | "syntax-error"
  | "type-error"
  | "runtime-error"
  | "environment-error"
  | "algebra-error"
  | "resolver-error";

// § Error Handling
/** An object corresponding to an error in Winnow. */
class Err extends Error {
  /** This error's message. */
  message: string;
  /** This error's type. */
  $type: ErrorType;
  /** The line where this error occurred. */
  $line: number;
  constructor(message: string, type: ErrorType, line: number) {
    super(message);
    this.message = message;
    this.$type = type;
    this.$line = line;
  }
  toString() {
    const a = this.$type === "environment-error" ? "an" : "a";
    return `On line ${this.$line}, ${a} ${this.$type} occured: ${this.message}`;
  }
}

/** Generates error-making functions. */
const errorFactory = (type: ErrorType) => (message: string, line: number) =>
  new Err(message, type, line);

/** Returns a new lexical error. */
const lexicalError = errorFactory("lexical-error");

/** Returns a new syntax error. */
const syntaxError = errorFactory("syntax-error");

/** Returns a new runtime error. */
const runtimeError = errorFactory("runtime-error");

/** Returns a new resolver error. */
const resolverError = errorFactory("resolver-error");

/** Returns a new environment error. */
const envError = errorFactory("environment-error");

const algebraError = (message: string) => new Err(message, "algebra-error", 0);

/** Returns true if the given expression u is an Err object. */
export function isErr(u: any): u is Err {
  return u instanceof Err;
}

export const {
  floor,
  abs,
  min,
  max,
  PI,
  E,
  tan,
  sin,
  cos,
  cosh,
  sinh,
  tanh,
  log2: lg,
  log: ln,
  log10: log,
  acosh: arccosh,
  asinh: arcsinh,
  atan: arctan,
  sign,
  ceil,
  sqrt,
} = Math;

export const HALF_PI = PI / 2;
export const TWO_PI = 2 * PI;

export function minmax(numbers: number[]) {
  let min = numbers[0];
  let max = numbers[0];
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] < min) {
      min = numbers[i];
    }
    if (numbers[i] > max) {
      max = numbers[i];
    }
  }
  return { min, max };
}

/** Converts the provided number (assumed to be radians) to degrees. */
export function toDegrees(radians: number) {
  return radians * (180 / Math.PI);
}

/** Converts the provided number (assumed to be degrees) to radians. */
export function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

/** Returns the arccosine of x. */
function arccos(x: number) {
  return x > 1 ? 0 : x < -1 ? PI : Math.acos(x);
}

/** Returns the arcsine of x. */
function arcsin(x: number) {
  return x >= 1 ? HALF_PI : x <= -1 ? -HALF_PI : Math.asin(x);
}

/** Returns the integer quotient of a/b. If b = 0, returns NaN. */
function iquot(a: number, b: number) {
  return b === 0 ? NaN : Math.floor(a / b);
}

function rem(n: number, m: number) {
  return n % m;
}

/** Returns a % b. */
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

/** Returns the a% of b. */
function percent(a: number, b: number) {
  return (a / 100) * b;
}

/** Returns the greatest common denominator of a and b. */
function gcd(a: number, b: number) {
  let t: number;
  while (b !== 0) {
    t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = toRadians(angleInDegrees);
  return vector([
    centerX + radius * Math.cos(angleInRadians),
    centerY + radius * Math.sin(angleInRadians),
  ]);
}

/** Returns an array of numbers running from start to stop inclusive. */
export function range(start: number, stop: number, step = 1): number[] {
  const out = [];
  for (let i = start; i <= stop; i += step) {
    out.push(i);
  }
  return out;
}

export function zip<T extends unknown[][]>(
  ...args: T
): { [K in keyof T]: T[K] extends (infer V)[] ? V : never }[] {
  const minLength = Math.min(...args.map((arr) => arr.length));
  // @ts-expect-error This is too much for ts
  return [...Array(minLength).keys()].map((i) => args.map((arr) => arr[i]));
}

/** Computes the arithmetic mean of the given list of numbers. */
export function avg(...nums: number[]) {
  let sum = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
  }
  return sum / nums.length;
}

/** Returns the factorial of the given number. */
function factorialize(num: number) {
  if (num === 0 || num === 1) {
    return 1;
  }
  for (let i = num - 1; i >= 1; i--) {
    num *= i;
  }
  return num;
}

export function isEven(value: number) {
  return value % 2 === 0;
}
export function isOdd(value: number) {
  return !isEven(value);
}

/** Returns the clamping of the given input. I.e., if `input` is less than `min`, returns `min`. If `input` is greater than `max`, returns `max`. Otherwise, returns `input`. */
export function clamp(minimum: number, input: number, maximum: number) {
  return min(max(input, minimum), maximum);
}

/** Given the number pair `(x1,x2)` returns the value between `x1` and `x2` at `p` percent of the dsitance between `x1` and `x2`. Useful for computations like: “What x-coordinate is 35% between 46 and 182?” Note that the percentage `p` is assumed to be between `0` and `1`. */
export function lerp([x1, x2]: [number, number], p: number) {
  return x1 * (1 - p) + x2 * p;
}

/** Given the number pair `(x,y)`, returns the value at the given decimal point `a`. Used primarily for computations like: How far through this line has this point moved? */
export function inverseLerp([x, y]: [number, number], a: number) {
  return clamp(0, (a - x) / (y - x), 1);
}

/** Returns a linear interpolator. The `domain` is the interval of input values – a pair of numbers `(a,b)` where `a` is the smallest possible input and `b` is the largest. The `range` is the interval of scale values - a pair of numbers `(a,b)` where `a` is the smallest possible scaled value and `b` is the largest. */
export function interpolator(
  domain: [number, number],
  range: [number, number]
) {
  return (n: number) =>
    range[0] +
    ((range[1] - range[0]) / (domain[1] - domain[0])) * (n - domain[0]);
}

/** Interpolates the number `n` based on the specified domain and range. */
export function interpolate(
  n: number,
  domain: [number, number],
  range: [number, number]
) {
  return interpolator(domain, range)(n);
}

/** A utility method that generates a pseudorandom string. @param length - The max length of the resulting string. @param base - The base from which to draw characters. */
function uid(length: number = 4, base = 36) {
  return Math.random()
    .toString(base)
    .replace(/[^a-z]+/g, "")
    .substring(0, length + 1);
}

/** Rounds the given number value to the number of given decimal places. */
function round(num: number, places: number = 2) {
  const epsilon = Number.EPSILON;
  return Math.round(num * 10 ** places * (1 + epsilon)) / 10 ** places;
}

/** Transforms 1-based indices to 0-based indices. */
function i0(value: number) {
  return value === 0 ? 0 : value - 1;
}

/** Returns a random integer between the provided minimum and maximum (not including the maximum). */
export function randInt(min: number, max: number) {
  return floor(Math.random() * (max - min + 1)) + min;
}

/** Returns a random floating point number between the provided minimum and maximum (not including the maximum). */
export function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function cartesianToPolar(x: number, y: number) {
  const r = Math.sqrt(x * x + y * y);
  const theta = Math.atan2(y, x);
  return { r, theta };
}

/**
 * An object implementing an n-length Vector.
 */
export class Vector<T extends number[] = number[]> {
  _elements: T;

  /** Returns the length of this vector. */
  get length() {
    return this._elements.length;
  }

  constructor(elements: T) {
    this._elements = elements;
  }

  /** Returns a string representation of this vector. */
  toString() {
    return "[" + this._elements.toString() + "]";
  }

  /** Utility method for performing binary operations. */
  binop(
    operand: Vector | number[] | number,
    callback: (a: number, b: number) => number
  ) {
    const arg = isNumber(operand)
      ? homogenousVector(operand, this.length)
      : vector(operand);
    const [A, B] = equalen(this, arg);
    return vector(A._elements.map((c, i) => callback(c, B._elements[i])));
  }

  map(callback: (n: number, i: number) => number) {
    const out = [];
    for (let i = 0; i < this.length; i++) {
      const n = this._elements[i];
      out.push(callback(n, i));
    }
    return new Vector(out);
  }

  /**
   * Returns a new vector, resulting from
   * multiplying this vector by the given
   * matrix.
   */
  vxm(matrix: Matrix) {
    if (this.length !== matrix._colcount) return this;
    const vector = new Vector([] as number[]);
    for (let i = 1; i <= matrix._rowcount; i++) {
      const v = matrix.element(i);
      if (v === null) return this;
      const d = this.dot(v);
      vector._elements[i - 1] = d;
    }
    return vector;
  }

  /** Returns the smallest component of this vector. */
  min() {
    let min = Infinity;
    for (let i = 0; i < this._elements.length; i++) {
      const elem = this._elements[i];
      if (elem < min) {
        min = elem;
      }
    }
    return min;
  }

  /** Returns the largest component of this vector. */
  max() {
    let max = -Infinity;
    for (let i = 0; i < this._elements.length; i++) {
      const elem = this._elements[i];
      if (elem > max) {
        max = elem;
      }
    }
    return max;
  }

  /** Returns the magnitude of this vector.  An optional precision value may be passed roundingthe magnitude to a specified number of decimal places. */
  mag(precision?: number) {
    const out = sqrt(this._elements.reduce((p, c) => p + c ** 2, 0));
    return !isNothing(precision) ? round(out, floor(precision)) : out;
  }

  /** Returns the difference between this vector and the provided argument. If a number is passed, returns the scalar difference. */
  sub(other: Vector | number[] | number) {
    return this.binop(other, (a, b) => a - b);
  }

  /** Returns the product between this vector and the provided argument. If a number is passed, returns the scalar difference. */
  mul(other: Vector | number[] | number) {
    return this.binop(other, (a, b) => a * b);
  }

  /** Returns this pair-wise power of this vector to the provided argument. If a number is passed, returns the scalar difference. */
  pow(other: Vector | number[] | number) {
    return this.binop(other, (a, b) => a ** b);
  }

  /** Returns the sum of this vector and the provided argument. If a number is passed, returns the scalar difference. */
  add(other: Vector | number[] | number) {
    return this.binop(other, (a, b) => a + b);
  }

  /** Returns the component-wise division of this vector. */
  div(other: Vector | number[] | number, alt: number = 0.0001) {
    return this.binop(other, (a, b) => (b === 0 ? a / alt : a / b));
  }

  /** Magnifies this vector by the given magnitude. */
  magnify(magnitude: number) {
    const mag = this.mag();
    const ratio = magnitude / mag;
    return this.mul(ratio);
  }

  /** Returns this vector with each component squared. */
  square() {
    return this.mul(this);
  }

  /** Returns the negation of this vector. */
  neg() {
    return vector(this._elements.map((c) => -c));
  }

  /** Returns this vector with each component set to its absolute value. */
  abs() {
    return vector(this._elements.map((c) => Math.abs(c)));
  }

  /** Returns true if this vector equals the provided vector. */
  equals(that: Vector) {
    if (this.length !== that.length) return false;
    for (let i = 0; i < this.length; i++) {
      const e1 = this._elements[i];
      const e2 = that._elements[i];
      if (e1 !== e2) return false;
    }
    return true;
  }

  /** Returns true if every component of this vector is zero. */
  isZero() {
    for (let i = 0; i < this.length; i++) {
      if (this._elements[i] !== 0) return false;
    }
    return true;
  }

  /** Returns true if this vector comprises exactly two elements. */
  is2D(): this is Vector<[number, number]> {
    return this._elements.length === 2;
  }

  /** Returns true if this vector comprises exactly three elements. */
  is3D(): this is Vector<[number, number, number]> {
    return this._elements.length === 3;
  }

  /** Returns a copy of this vector. */
  copy() {
    const elements = [];
    for (let i = 0; i < this._elements.length; i++) {
      elements.push(this._elements[i]);
    }
    return new Vector(elements);
  }

  /** Appends the given value by the provided number of slots. */
  pad(slots: number, value: number) {
    if (slots < this.length) {
      const diff = this.length - slots;
      const elements = [...this._elements];
      for (let i = 0; i < diff; i++) {
        elements.push(value);
      }
      return new Vector(elements);
    }
    return this.copy();
  }

  /** Sets the element at the given position to the provided value. Indices start at 1. If the index is greater than the current size of this vector, the vector will insert additional zeros up to the given index to ensure its elements array is contiguous. */
  set(index: number, value: number) {
    index = i0(index);
    if (index > this.length) {
      const diff = index - this.length;
      const vector = this.pad(diff, 0);
      vector._elements[index] = value;
      return vector;
    }
    const copy = this.copy();
    copy._elements[index] = value;
    return copy;
  }

  /** Returns the dot product of this vector and the provided vector. */
  dot(vector: Vector | number[]) {
    const other = Vector.from(vector);
    const order = this.length;
    if (other.length !== order) return 0;
    let sum = 0;
    for (let i = 0; i < order; i++) {
      const a = this._elements[i];
      const b = other._elements[i];
      const p = a * b;
      sum += p;
    }
    return sum;
  }

  /** Returns the angle between the two provided vectors. */
  theta(other: Vector) {
    const ab = this.dot(other);
    const mag = this.mag();
    const factor = ab / mag;
    return Math.acos(factor);
  }

  /** Sets the first element of this vector to the provided value. */
  px(value: number) {
    return this.set(1, value);
  }

  /** Returns the first element of this vector. */
  get _x() {
    return isNothing(this._elements[0]) ? 0 : this._elements[0];
  }
  set _x(n: number) {
    this._elements[0] = n;
  }

  /** Sets the second element of this vector to the provided value. */
  py(value: number) {
    return this.set(2, value);
  }

  /** Returns the second element of this vector. */
  get _y() {
    return isNothing(this._elements[1]) ? 0 : this._elements[1];
  }
  set _y(n: number) {
    this._elements[1] = n;
  }

  /** Sets the third element of this vector to the provided value. */
  pz(value: number) {
    return this.set(3, value);
  }

  /** Returns the third element of this vector. */
  get $z() {
    return isNothing(this._elements[2]) ? 0 : this._elements[2];
  }
  set $z(z: number) {
    this._elements[2] = z;
  }

  /** Sets the fourt element of this vector to the provided value. */
  pw(value: number) {
    return this.set(4, value);
  }

  /** Returns the fourth element of this vector. */
  get $w() {
    return isNothing(this._elements[3]) ? 0 : this._elements[3];
  }
  set $w(w: number) {
    this._elements[3] = w;
  }

  /** Returns the angle between (a) the difference vector of this vector and the provided vector, and (b) the x-axis. */
  gamma(other: Vector) {
    const dx = this._x - other._x;
    const dy = this._y - other._y;
    const gamma = Math.atan2(dy, dx);
    return gamma;
  }

  /** Returns the element at the given index (indices start at 1). */
  element(index: number) {
    const out = this._elements[index - 1];
    return out !== undefined ? out : null;
  }

  /** Returns this vector as a number array. */
  toArray() {
    return this._elements.map((e) => e);
  }

  /** Returns the unit vector point from this vector 𝑢 to the provided 𝑣. */
  normalTo(v: Vector) {
    const d = this.sub(v);
    return d.normalize();
  }

  /** Returns this vector’s normal. */
  normalize() {
    if (this.isZero()) return this;
    return this.div(this.mag());
  }

  /** Returns the 2D vector normal of this vector. */
  normal2D() {
    return vector([-this._y, this._x]);
  }

  /** Returns the cross product of this vector in-place. The cross product is used primarily to compute the vector perpendicular to two vectors. */
  cross(other: Vector) {
    const ax = this._x;
    const ay = this._y;
    const az = this.$z;
    const bx = other._x;
    const by = other._y;
    const bz = other.$z;
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    return vector([cx, cy, cz]);
  }

  /** Returns the 2D distance between this vector and the provided vector. */
  distance2D(other: Vector) {
    const dx = other._x - this._x;
    const dy = other._y - this._y;
    const dsum = dx ** 2 + dy ** 2;
    return Math.sqrt(dsum);
  }

  /** Returns the 3D distance between this vector and the provided vector. */
  distance3D(other: Vector) {
    const x = other._x - this._x;
    const y = other._y - this._y;
    const z = other.$z - this.$z;
    const xyz = x * x + y * y + z * z;
    return Math.sqrt(xyz);
  }

  /** Returns the projection of this vector (𝑏) onto the provided vector (𝑎) (projₐ𝑏). That is, the projection of 𝑏 onto 𝑎. */
  project(a: Vector): Vector {
    const b = this.copy();
    const prod = a.dot(b);
    const mag = a.mag();
    const mag2 = mag * mag;
    const factor = prod / mag2;
    const res = a.mul(factor);
    return res;
  }

  /** Returns a random 2D vector. The `min` argument is the lower bound of the sampling interval. The `max` argument is The upper bound of the sampling interval. The `restrict` argument takes string values `Z` or `R`. If `Z` is passed, random values are restricted to integers. If `R` is passed, random values are either integers or floats. */
  static random2D(min: number, max: number, restrict: "Z" | "R" = "R") {
    const rfn = restrict === "Z" ? randInt : randFloat;
    const x = rfn(min, max);
    const y = rfn(min, max);
    return new Vector([x, y]);
  }

  /** Returns a random 3D vector. The `min` argument sets the lower bound of the sampling interval. The `max` argument sets the upper bound of the sampling interval. The `restrict` argument takes `Z` or `R`. If `Z` is passed, random values are restricted to integers. If `R` is passed, random values are either integers or floats. */
  static random3D(min: number, max: number, restrict: "Z" | "R" = "R") {
    const v = Vector.random2D(min, max, restrict);
    const x = v._x;
    const y = v._y;
    const z = restrict === "Z" ? randInt(min, max) : randFloat(min, max);
    return new Vector([x, y, z]);
  }

  /** Returns a new vector from the given array of numbers or `Vector`. If a `Vector` is passed, returns a copy of that vector. */
  static from(value: number[] | Vector): Vector {
    if (Array.isArray(value)) {
      return new Vector(value);
    } else {
      return value.copy();
    }
  }
}

/** Returns a new vector. If a vector is passed, returns the vector (an identity function). */
export function vector(elements: number[] | Vector) {
  if (Array.isArray(elements)) {
    return new Vector(elements);
  } else {
    return elements;
  }
}

/** Returns a new vector of size `length`, where each element is the given `value`.*/
function homogenousVector(value: number, length: number) {
  const elements = [];
  for (let i = 0; i < length; i++) {
    elements.push(value);
  }
  return new Vector(elements);
}

/** Returns a new 2D vector. */
export function v2D(x: number, y: number) {
  return new Vector([x, y]);
}

/** Given `vectorA` and `vectorB`, ensures that `vectorA` and `vectorB` have the same sizes (number of elements). If one is smaller than the other, the shorter is padded with additional zeros to ensure the lengths are the same. */
function equalen(vectorA: Vector, vectorB: Vector): [Vector, Vector] {
  const A = [];
  const B = [];
  if (vectorA.length > vectorB.length) {
    let i = 0;
    for (i = 0; i < vectorA.length; i++) {
      A.push(vectorA._elements[i]);
      B.push(isNothing(vectorB._elements[i]) ? 0 : vectorB._elements[i]);
    }
    const n = vectorB.length - i;
    for (let j = 0; j < n; j++) {
      B.push(0);
    }
    return [vector(A), vector(B)];
  } else if (vectorA.length < vectorB.length) {
    let i = 0;
    for (i = 0; i < vectorB.length; i++) {
      A.push(isNothing(vectorA._elements[i]) ? 0 : vectorA._elements[i]);
      B.push(vectorB._elements[i]);
    }
    const n = vectorB.length - i;
    for (let j = 0; j < n; j++) {
      A.push(0);
    }
    return [vector(A), vector(B)];
  } else {
    return [vectorA, vectorB];
  }
}

/** Returns true if the given value is a vector, false otherwise. */
const isVector = (value: any): value is Vector => value instanceof Vector;

/**
 * Returns true if the given value
 * is a JavaScript number.
 */
function isNumber(u: any): u is number {
  return typeof u === "number";
}

export function isSafeNumber(x: any): x is number {
  return (
    typeof x === "number" &&
    !Number.isNaN(x) &&
    Number.isFinite(x) &&
    x < Number.MAX_SAFE_INTEGER &&
    x > Number.MIN_SAFE_INTEGER
  );
}

/**
 * Returns true if the given value is a
 * JavaScript string.
 */
function isString(u: any): u is string {
  return typeof u === "string";
}

/** Returns the distance between two points `p1` and `p2`. */
export function dist2D(
  p1: [number, number] | Vector,
  p2: [number, number] | Vector
) {
  p1 = Array.isArray(p1) ? vector(p1) : p1;
  p2 = Array.isArray(p2) ? vector(p2) : p2;
  const x1 = p1._x,
    y1 = p1._y,
    x2 = p2._x,
    y2 = p2._y;
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

/**
 * Returns the direction of a line based on the line's start and end points.
 * @param startPoint The line's starting point.
 * @param endPoint The line's ending point.
 */
export function dir2D(
  startPoint: [number, number] | Vector,
  endPoint: [number, number] | Vector
) {
  startPoint = Array.isArray(startPoint) ? vector(startPoint) : startPoint;
  endPoint = Array.isArray(endPoint) ? vector(endPoint) : endPoint;
  const x = startPoint._x,
    y = startPoint._y,
    xx = endPoint._x,
    yy = endPoint._y;
  let angV = Math.acos(
    (xx - x) / Math.sqrt(Math.pow(x - xx, 2) + Math.pow(y - yy, 2))
  );
  if (y - yy > 0) angV = -angV;
  return (angV + Math.PI * 2) % (Math.PI * 2);
}

/**
 * An object implementing a matrix.
 */
class Matrix {
  /** The vectors comprising this matrix. */
  _vectors: Vector[];

  /** The number of rows comprising this matrix. */
  readonly _rowcount: number;

  /** The number of columns comprising this matrix. */
  readonly _colcount: number;

  constructor(vectors: Vector[], rowcount: number, colcount: number) {
    this._vectors = vectors;
    this._rowcount = rowcount;
    this._colcount = colcount;
  }

  /** Returns true if this matrix is a square matrix. */
  isSquare() {
    return this._colcount === this._rowcount;
  }

  /** Returns a copy of this matrix. */
  copy() {
    const vs = this._vectors.map((v) => v.copy());
    return new Matrix(vs, this._rowcount, this._colcount);
  }

  /** Returns the vector element at the given index (indices start at 1). */
  element(index: number) {
    const out = this._vectors[index - 1];
    return out !== undefined ? out : null;
  }

  /** Returns a column vector comprising all the vector elements at the given column. */
  column(index: number) {
    if (index > this._colcount) {
      const out: number[] = [];
      for (let i = 0; i < this._colcount; i++) {
        out.push(0);
      }
      return vector(out);
    }
    const out: number[] = [];
    this._vectors.forEach((vector) => {
      vector._elements.forEach((n, i) => {
        if (i === index) out.push(n);
      });
    });
    return vector(out);
  }

  /** Returns the nth element at the given row index and column index. An optional fallback value (defaulting to 0) may be provided in the event the indices are out of bounds. */
  n(rowIndex: number, columnIndex: number, fallback: number = 0) {
    const out = this.element(rowIndex);
    if (out === null) return fallback;
    const n = out.element(columnIndex);
    return isNumber(n) ? n : fallback;
  }

  /** Returns the string form of matrix. */
  toString() {
    const out = this._vectors.map((v) => v.toString()).join(",");
    return `[${out}]`;
  }

  /** Sets the element at the given row index and column index. The row and column indices are expected to begin at 1. If no element exists at the provided indices, no change is done. */
  set(row: number, column: number, value: number) {
    if (this._vectors[row - 1] === undefined) return this;
    if (this._vectors[row - 1]._elements[column - 1] === undefined) return this;
    const copy = this.copy();
    copy._vectors[row - 1]._elements[column - 1] = value;
    return copy;
  }

  /** Executes the given callback over each element of this matrix. The row and column index provided in the callback begin at 1. */
  forEach(
    callback: (element: number, rowIndex: number, columnIndex: number) => void
  ) {
    for (let i = 1; i <= this._rowcount; i++) {
      for (let j = 1; j <= this._colcount; j++) {
        callback(this.n(i, j), i, j);
      }
    }
    return this;
  }

  /** Returns true if this matrix and the the provided matrix have the same number of rows and the same number of columns. False otherwise. */
  congruent(matrix: Matrix) {
    return (
      this._rowcount === matrix._rowcount && this._colcount === matrix._colcount
    );
  }

  /** @internal - Utility method for binary operations on matrices. */
  private binop(
    arg: number | number[][] | Matrix,
    op: (a: number, b: number) => number
  ) {
    const other = isNumber(arg)
      ? Matrix.fill(this._rowcount, this._colcount, arg)
      : Array.isArray(arg)
      ? Matrix.from(arg)
      : arg;
    if (
      this._rowcount !== other._rowcount ||
      this._colcount !== other._colcount
    )
      return this;
    const vectors: Vector[] = [];
    for (let i = 0; i < this._rowcount; i++) {
      const nums: number[] = [];
      const row = this._vectors[i]._elements;
      for (let j = 0; j < row.length; j++) {
        const a = row[j];
        const b = other._vectors[i]._elements[j];
        nums.push(op(a, b));
      }
      vectors.push(vector(nums));
    }
    return matrix(vectors);
  }

  /** Returns this matrix minus the provided matrix. */
  sub(matrix: Matrix | number | number[][]) {
    return this.binop(matrix, (a, b) => a - b);
  }

  /** Returns this matrix component-wise-multiplied with provided matrix. */
  times(matrix: Matrix | number | number[][]) {
    return this.binop(matrix, (a, b) => a * b);
  }

  /** Returns this matrix plus the provided matrix. */
  add(matrix: Matrix | number | number[][]) {
    return this.binop(matrix, (a, b) => a + b);
  }

  /** Returns the negation of this matrix.  */
  neg() {
    return this.times(-1);
  }

  /** Returns the transpose of this matrix. */
  transpose() {
    const copy: number[][] = [];
    for (let i = 0; i < this._rowcount; ++i) {
      const vector = this._vectors[i];
      for (let j = 0; j < this._colcount; ++j) {
        const element = vector._elements[j];
        if (isNothing(element)) continue;
        if (isNothing(copy[j])) {
          copy[j] = [];
        }
        copy[j][i] = element;
      }
    }
    return matrix(copy.map((c) => vector(c)));
  }

  /** Returns the cofactor of this matrix. */
  cofactor() {
    let det = 0;
    for (let r = 0; r < this._rowcount; r++) {
      const a = (-1) ** r;
      const b = this._vectors[0]._elements[r];
      const c = a * b;
      const mMinor = this.minor(1, r + 1);
      const minorDeterminant = mMinor.det();
      det += c * minorDeterminant;
    }
    return det;
  }

  /**
   * Returns the minor of the element at [row, col].
   */
  minor(row: number, col: number) {
    const out: number[][] = [];
    for (let i = 0; i < this._rowcount; i++) {
      if (i === row - 1) {
        continue;
      }
      const minorRow = [];
      for (let j = 0; j < this._colcount; j++) {
        if (j === col - 1) {
          continue;
        }
        minorRow.push(this._vectors[i]._elements[j]);
      }
      out.push(minorRow);
    }
    return matrix(out);
  }

  /**
   * Returns the determinant of this matrix.
   * Note that to have a determinant, the matrix
   * must be suare.
   */
  det(): number {
    if (this._rowcount === 2 && this._colcount === 2) {
      const p1 = this._vectors[0]._elements[0] * this._vectors[1]._elements[1];
      const p2 = this._vectors[0]._elements[1] * this._vectors[1]._elements[0];
      return p1 - p2;
    }
    return this.cofactor();
  }

  /**
   * Returns the inverse of this matrix.
   * Note that not all matrices have an inverse.
   * To have an inverse, the matrix must be square
   * (same number of rows and columns) and must
   * be non-singular (its determinant is not zero).
   */
  inverse() {}

  /** Returns the matrix product of this matrix and the provided matrix. */
  mul(arg: number | Matrix | number[][]) {
    const Ar = this._rowcount;
    const Ac = this._colcount;
    if (arg instanceof Matrix && Ac !== arg._rowcount) {
      return this;
    }
    const B = Matrix.of(Ar, Ac, arg);
    const Bc = B._colcount;
    const result: number[][] = [];
    for (let i = 0; i < Ar; i++) {
      result[i] = [];
      for (let j = 0; j < Bc; j++) {
        let sum = 0;
        for (let k = 0; k < Ac; k++) {
          const a = this._vectors[i]._elements[k];
          const b = B._vectors[k]._elements[j];
          sum += a * b;
        }
        result[i][j] = sum;
      }
    }
    return matrix(result.map((r) => vector(r)));
  }

  /** Returns true if this matrix and the provided matrix are equal. */
  equals(matrix: Matrix) {
    if (!this.congruent(matrix)) return false;
    let out = true;
    this.forEach((n, r, c) => {
      const m = matrix.n(r, c);
      if (m !== n) out = false;
    });
    return out;
  }

  flat() {
    const out = [];
    for (let i = 0; i < this._rowcount; i++) {
      for (let j = 0; j < this._colcount; j++) {
        const e = this._vectors[i]._elements[j];
        out.push(e);
      }
    }
    return out;
  }

  static fill(rows: number, columns: number, arg: number) {
    const vectors: Vector[] = [];
    for (let i = 0; i < rows; i++) {
      const nums: number[] = [];
      for (let j = 0; j < columns; j++) {
        nums.push(arg);
      }
      vectors.push(vector(nums));
    }
    return matrix(vectors);
  }

  static from(nums: number[][]) {
    const out = nums.map((ns) => vector(ns));
    return matrix(out);
  }

  static of(rows: number, columns: number, arg: number | number[][] | Matrix) {
    return isNumber(arg)
      ? Matrix.fill(rows, columns, arg)
      : Array.isArray(arg)
      ? Matrix.from(arg)
      : arg;
  }
}

/** Returns a new matrix. */
export function matrix(rows: Vector[] | number[][], cols?: number) {
  const vectors = rows.map((v) => (isVector(v) ? v : Vector.from(v)));
  return new Matrix(
    vectors,
    vectors.length,
    cols !== undefined ? cols : vectors[0].length
  );
}

/** Returns true if the given value is a matrix. */
function isMatrix(value: any): value is Matrix {
  return value instanceof Matrix;
}

export function convexHull(points: Vector[]) {
  const isLeftTurn = (p: Vector, q: Vector, r: Vector) => {
    return (q._x - p._x) * (r._y - p._y) - (r._x - p._x) * (q._y - p._y) > 0;
  };
  if (points.length < 3) {
    return { hull: points, leftmost: points[0] };
  }
  let leftmost = points[0];
  for (let i = 1; i < points.length; i++) {
    if (points[i]._x < leftmost._x) {
      leftmost = points[i];
    }
  }
  const hull: Vector[] = [];
  let current = leftmost;
  do {
    hull.push(current);
    let next = points[0];
    for (let i = 1; i < points.length; i++) {
      if (current.equals(next) || isLeftTurn(current, next, points[i])) {
        next = points[i];
      }
    }
    current = next;
  } while (!current.equals(leftmost));
  return { hull, leftmost };
}

/** An object corresponding to a number of the form `m x 10^n`. */
class Exponential {
  /** The mantissa in `m x 10^n`. */
  $m: number;
  /** The exponent (an integer) in `m x 10^n` */
  $n: number;
  constructor(m: number, n: number) {
    this.$m = m;
    this.$n = Math.floor(n);
  }
  toString() {
    return `${this.$m}E{${this.$n}}`;
  }
  copy() {
    return new Exponential(this.$m, this.$n);
  }
  negate() {
    return new Exponential(-this.$m, this.$n);
  }
}

/**
 * Returns a new instance of a Scientific_Number.
 * @param m The mantissa in `m x 10^n`.
 * @param n The exponent (an integer) in `m x 10^n`.
 * @returns A new scientific number (m x 10^n).
 */
function expo(m: number, n: number) {
  return new Exponential(m, Math.floor(n));
}

/** Returns true, and asserts, if the given expression u is an exponential. */
function isExponential(u: any): u is Exponential {
  return u instanceof Exponential;
}

/**
 * An object corresponding to an SVG element, or some
 * other element that can be rendered.
 */
export abstract class Renderable {
  abstract render(
    fx: (x: number) => number,
    fy: (y: number) => number,
    fz: (y: number) => number
  ): this;
  _id: string | number;
  _origin: Vector;
  constructor(origin: [number, number]) {
    this._id = uid(5);
    this._origin = vector(origin);
  }
  id(value: string | number) {
    this._id = value;
    return this;
  }
  _transformation: string = "";
}

export type SVGContext = {
  domain: [number, number];
  zDomain?: [number, number];
  range: [number, number];
  width: number;
  height: number;
};

export class SVG {
  margins: [top: number, right: number, bottom: number, left: number] = [
    10, 10, 10, 10,
  ];
  get _marginTop() {
    return this.margins[0];
  }
  get _marginRight() {
    return this.margins[1];
  }
  get _marginBottom() {
    return this.margins[2];
  }
  get _marginLeft() {
    return this.margins[3];
  }
  get _adjustedWidth() {
    const w = this._width - (this._marginLeft + this._marginRight);
    return w;
  }
  get _adjustedHeight() {
    const h = this._height - (this._marginTop + this._marginBottom);
    return h;
  }
  _translate: [number, number] = [this._marginTop, this._marginBottom];
  translate(x: number, y: number) {
    this._translate = tuple(x, y);
    return this;
  }
  translateX(value: number) {
    this._translate[0] = value;
    return this;
  }
  translateY(value: number) {
    this._translate[1] = value;
    return this;
  }

  /**
   * This SVG's Renderable child elements.
   */
  _children: Renderable[] = [];

  /**
   * An array of Renderables corresponding
   * to SVG <def> elements.
   */
  _defs: ArrowHead[] = [];

  /**
   * The interval of all possible x-coordinates.
   * where `_xDomain[0]` corresponds to the least
   * x-coordinate, and `_xDomain[1]` corresponds
   * to the greatest.
   */
  _xDomain: [number, number];

  /**
   * The interval of all possible y-coordinates.
   * where `_yDomain[0]` corresponds to the least
   * y-coordinate, and `_yDomain[1]` corresponds
   * to the greatest.
   */
  _yDomain: [number, number];

  /**
   * The interval of all possible y-coordinates.
   * where `_zDomain[0]` corresponds to the least
   * z-coordinate, and `_zDomain[1]` corresponds
   * to the greatest.
   */
  _zDomain: [number, number];

  /** The width of this svg. */
  _width: number;

  /** The height of this svg. */
  _height: number;

  /** Linear interpolation function for x-coordinates. */
  _fx: (x: number) => number;

  /** Linear interpolation function for y-coordinates. */
  _fy: (y: number) => number;

  /** Linear interpolation function for z-coordinates. */
  _fz: (y: number) => number;

  constructor(context: SVGContext) {
    this._xDomain = context.domain;
    this._zDomain = context.zDomain ? context.zDomain : context.domain;
    this._yDomain = context.range;
    this._width = context.width;
    this._height = context.height;
    this._fx = interpolator(this._xDomain, [0, this._adjustedWidth]);
    this._fy = interpolator(this._yDomain, [this._adjustedHeight, 0]);
    this._fz = interpolator(this._zDomain, [0, this._adjustedWidth]);
  }

  /**
   * Includes the given Renderable to this SVG.
   */
  child(obj: Renderable) {
    obj._origin = vector([this._fx(obj._origin._x), this._fy(obj._origin._y)]);
    if (obj instanceof Transformation) {
      const d = obj.render(this._fx, this._fy, this._fz);
      d._target = d._target.render(this._fx, this._fy, this._fz);
      d._target._transformation = d._transformData;
      this._children.push(d._target);
    } else {
      this._children.push(obj.render(this._fx, this._fy, this._fz));
    }
    if (obj instanceof Path || obj instanceof LineObj) {
      obj._arrowEnd && this._defs.push(obj._arrowEnd);
      obj._arrowStart && this._defs.push(obj._arrowStart);
    }
    return this;
  }

  /**
   * The child elements of this SVG. Child elements should be
   * of type Renderable (e.g., Path, Circle, Group, Polygon,
   * Polyline, etc.) or a callback function that returns a
   * Renderable or primitive JavaScript type. If a callback function
   * is provided and the function, on execution, returns a Renderable,
   * the resulting Renderable will be included in the SVG. Otherwise,
   * no Renderable is included.
   */
  children(
    objects: (
      | Renderable
      | Renderable[]
      | (() => Renderable | boolean | null | void)
    )[]
  ) {
    const objs = objects.flat();
    const finalObjs: Renderable[] = [];
    for (let i = 0; i < objs.length; i++) {
      const child = objs[i];
      if (typeof child === "function") {
        const x = child();
        if (x && x instanceof Renderable) {
          finalObjs.push(x);
        }
      } else {
        finalObjs.push(child);
      }
    }
    finalObjs.forEach((obj) => {
      this.child(obj);
    });
    return this;
  }
}

export const svg = (context: SVGContext) => new SVG(context);

/**
 * A tuple corresponding to an SVG Path command.
 */
export type PCommand =
  | MCommand
  | LCommand
  | CCommand
  | QCommand
  | ARCTOCommand
  | ARCCommand
  | ACommand
  | ZCommand;

/**
 * A tuple corresponding to an SVG path
 * `moveto` command.
 */
type MCommand = [command: "M", endPointX: number, endPointY: number];

/** Returns a new SVG `moveto` command. */
export const M = (x: number, y: number): MCommand => ["M", x, y];

/**
 * A tuple corresponding to an SVG path
 * `arc` command.
 */
type ACommand = [
  command: "A",
  rx: number,
  ry: number,
  rotation: number,
  largeArcFlag: 0 | 1,
  sweepFlag: 0 | 1,
  endPointX: number,
  endPointY: number
];

/** Returns a new SVG `arc` command. */
export const A = (
  rx: number,
  ry: number,
  rotation: number,
  largeArcFlag: 0 | 1,
  sweepFlag: 0 | 1,
  endPointX: number,
  endPointY: number
): ACommand => [
  "A",
  rx,
  ry,
  rotation,
  largeArcFlag,
  sweepFlag,
  endPointX,
  endPointY,
];

type LCommand = ["L", number, number];

export const L = (x: number, y: number): LCommand => ["L", x, y];

type CCommand = ["C", number, number, number, number, number, number];

const C = (
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  ex: number,
  ey: number
): CCommand => ["C", c1x, c1y, c2x, c2y, ex, ey];

type QCommand = ["Q", number, number, number, number];

export const Q = (cx: number, cy: number, ex: number, ey: number): QCommand => [
  "Q",
  cx,
  cy,
  ex,
  ey,
];

type ARCTOCommand = ["ARCTO", number, number, number, number, number];

export const ARCTO = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number
): ARCTOCommand => ["ARCTO", x1, y1, x2, y2, r];

type ARCCommand = ["ARC", number, number, number, number, number, 0 | 1];

export const ARC = (
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
  ccw: 0 | 1
): ARCCommand => ["ARC", x, y, r, a0, a1, ccw];

type ZCommand = ["Z"];

export const Z = (): ZCommand => ["Z"];

const pi = Math.PI,
  tau = 2 * pi,
  epsilon = 1e-6,
  tauEpsilon = tau - epsilon;

function processPathCommands(
  commandList: PCommand[],
  fx: (x: number) => number,
  fy: (y: number) => number
) {
  const output: string[] = [];
  let _x0: number | null = null;
  let _y0: number | null = _x0;
  let _x1: number | null = _y0;
  let _y1: number | null = _x1;
  commandList.forEach((command) => {
    const type = command[0];
    switch (type) {
      case "M": {
        const x = fx(command[1]);
        const y = fy(command[2]);
        output.push(`M${(_x0 = _x1 = +x)},${(_y0 = _y1 = +y)}`);
        break;
      }
      case "Z": {
        output.push("Z");
        break;
      }
      case "L": {
        const x = fx(command[1]);
        const y = fy(command[2]);
        output.push(`L${(_x1 = +x)},${(_y1 = +y)}`);
        break;
      }
      case "Q": {
        const cx = fx(command[1]);
        const cy = fy(command[2]);
        const ex = fx(command[3]);
        const ey = fy(command[4]);
        output.push(`Q${+cx},${+cy},${(_x1 = +ex)},${(_y1 = +ey)}`);
        break;
      }
      case "C": {
        const c1x = fx(command[1]);
        const c1y = fy(command[2]);
        const c2x = fx(command[3]);
        const c2y = fy(command[4]);
        const ex = fx(command[5]);
        const ey = fy(command[6]);
        output.push(
          `C${+c1x},${+c1y},${+c2x},${+c2y},${(_x1 = +ex)},${(_y1 = +ey)}`
        );
        break;
      }
      case "ARCTO": {
        const ax1 = fx(command[1]);
        const ay1 = fy(command[2]);
        const ax2 = fx(command[3]);
        const ay2 = fy(command[4]);
        let r = command[5];
        if (r < 0) {
          r = Math.abs(r);
        }
        const x0 = _x1,
          y0 = _y1,
          x21 = ax2 - ax1,
          y21 = ay2 - ay1,
          x01 = (x0 ?? 0) - ax1,
          y01 = (y0 ?? 0) - ay1,
          l01_2 = x01 * x01 + y01 * y01;

        // Is this path empty? Move to (x1,y1).
        if (_x1 === null) {
          output.push(`M${(_x1 = ax1)},${(_y1 = ay1)}`);
        }

        // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
        else if (!(l01_2 > epsilon)) {
          // break;
        }

        // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
        // Equivalently, is (x1,y1) coincident with (x2,y2)?
        // Or, is the radius zero? Line to (x1,y1).
        else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
          output.push(`L${(_x1 = ax1)},${(_y1 = ay1)}`);
        }

        // Otherwise, draw an arc!
        else {
          const x20 = ax2 - (x0 ?? 0),
            y20 = ay2 - (y0 ?? 0),
            l21_2 = x21 * x21 + y21 * y21,
            l20_2 = x20 * x20 + y20 * y20,
            l21 = Math.sqrt(l21_2),
            l01 = Math.sqrt(l01_2),
            l =
              r *
              Math.tan(
                (pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2
              ),
            t01 = l / l01,
            t21 = l / l21;

          // If the start tangent is not coincident with (x0,y0), line to.
          if (Math.abs(t01 - 1) > epsilon) {
            output.push(`L${ax1 + t01 * x01},${(ay1 as number) + t01 * y01}`);
          }

          output.push(
            `A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${(_x1 =
              ax1 + t21 * x21)},${(_y1 = ay1 + t21 * y21)}`
          );
        }
        break;
      }
      case "ARC": {
        const x = fx(command[1]);
        const y = fy(command[2]);
        const r = command[3];
        const a0 = command[4];
        const a1 = command[5];
        // x = +x, y = +y, r = +r, ccw = !!ccw;
        const ccw = command[6];

        // Is the radius negative? Error.
        if (r < 0) throw new Error(`negative radius: ${r}`);

        const dx = r * Math.cos(a0),
          dy = r * Math.sin(a0),
          x0 = x + dx,
          y0 = y + dy,
          cw = 1 ^ ccw;
        let da = ccw ? a0 - a1 : a1 - a0;

        // Is this path empty? Move to (x0,y0).
        if (_x1 === null) {
          output.push(`M${x0},${y0}`);
        }

        // Or, is (x0,y0) not coincident with the previous point?
        else if (
          Math.abs(_x1 - x0) > epsilon ||
          Math.abs((_y1 ?? 0) - y0) > epsilon
        ) {
          output.push(`L${x0},${y0}`);
          // output.push(`M${x0},${y0}`);
        }

        // Is this arc empty? We’re done.
        if (!r) break;

        // Does the angle go the wrong way? Flip the direction.
        if (da < 0) da = (da % tau) + tau;

        // Is this a complete circle? Draw two arcs to complete the circle.
        if (da > tauEpsilon) {
          output.push(
            `A${r},${r},0,1,${cw},${x - dx},${
              y - dy
            }A${r},${r},0,1,${cw},${(_x1 = x0)},${(_y1 = y0)}`
          );
        }

        // Is this arc non-empty? Draw an arc!
        else if (da > epsilon) {
          output.push(
            `A${r},${r},0,${+(da >= pi)},${cw},${(_x1 =
              x + r * Math.cos(a1))},${(_y1 = y + r * Math.sin(a1))}`
          );
        }
        break;
      }
      case "A": {
        const rx = command[1];
        const ry = command[2];
        const rotation = command[3];
        const largeArcFlag = command[4];
        const sweepFlag = command[5];
        const endX = fx(command[6]);
        const endY = fy(command[7]);
        output.push(
          `A${rx},${ry},${rotation},${largeArcFlag},${sweepFlag},${endX},${endY}`
        );
        break;
      }
    }
  });
  return output;
}

export class ArrowHead extends Renderable {
  render(): this {
    return this;
  }
  _type: "start" | "end" = "end";
  type(value: "start" | "end") {
    this._type = value;
    return this;
  }
  _refX: number = 10;
  refX(value: number) {
    this._refX = value;
    return this;
  }
  _refY: number = 0;
  refY(value: number) {
    this._refY = value;
    return this;
  }
  get _d() {
    if (this._type === "end") {
      return `M0,-5L10,0L0,5`;
    } else {
      return `M0,0L10,-5L10,5Z`;
    }
  }
  _orient: "auto" | "auto-start-reverse" = "auto";
  orient(value: "auto" | "auto-start-reverse") {
    this._orient = value;
    return this;
  }
  _markerWidth: number = 10;
  markerWidth(value: number) {
    this._markerWidth = value;
    return this;
  }
  _markerHeight: number = 10;
  markerHeight(value: number) {
    this._markerHeight = value;
    return this;
  }
  _stroke: string = "black";
  stroke(value: string) {
    this._stroke = value;
    return this;
  }
  _fill: string = "black";
  fill(value: string) {
    this._fill = value;
    return this;
  }
  _strokeOpacity: string | number = 1;
  strokeOpacity(value: string | number) {
    this._fillOpacity = value;
    return this;
  }
  _fillOpacity: string | number = 1;
  fillOpacity(value: string | number) {
    this._fillOpacity = value;
    return this;
  }
  constructor(id: string | number) {
    super([0, 0]);
    this._id = id;
  }
}

/** Returns a new arrowhead. */
export function arrowhead(id: string | number) {
  return new ArrowHead(id);
}

export function isArrowhead(u: any) {
  return u instanceof ArrowHead;
}

export class Polygon extends Renderable {
  _points: [number, number][];
  constructor(points: [number, number][]) {
    super(points[0]);
    this._points = points;
  }
  render(fx: (x: number) => number, fy: (y: number) => number): this {
    this._points = this._points.map(([x, y]) => tuple(fx(x), fy(y)));
    return this;
  }
  points() {
    return this._points.map(([x, y]) => `${x},${y}`).join(" ");
  }
}

export function polygon(points: [number, number][]) {
  return new Polygon(points);
}

export function isPolygon(u: any): u is Polygon {
  return typeof u === "object" && u instanceof Polygon;
}

export class Polyline extends Renderable {
  _points: [number, number][];
  constructor(points: [number, number][]) {
    super(points[0]);
    this._points = points;
  }
  render(fx: (x: number) => number, fy: (y: number) => number): this {
    this._points = this._points.map(([x, y]) => tuple(fx(x), fy(y)));
    return this;
  }
  points() {
    return this._points.map(([x, y]) => `${x},${y}`).join(" ");
  }
}

export function polyline(points: [number, number][]) {
  return new Polyline(points);
}

export function isPolyline(u: any): u is Polyline {
  return typeof u === "object" && u instanceof Polyline;
}

export class Path extends Renderable {
  _commands: PCommand[];

  _commandList: string[] = [];

  _arrowEnd: null | ArrowHead = null;

  _arrowStart: null | ArrowHead = null;

  _stroke: string = "black";

  stroke(value: string) {
    this._stroke = value;
    return this;
  }

  _fill: string = "none";

  fill(value: string) {
    this._fill = value;
    return this;
  }

  _strokeOpacity: string | number = 1;

  strokeOpacity(value: string | number) {
    this._fillOpacity = value;
    return this;
  }

  _fillOpacity: string | number = 1;

  fillOpacity(value: string | number) {
    this._fillOpacity = value;
    return this;
  }

  _id: string | number;

  _strokeDashArray: string | number = 0;

  strokeDashArray(value: string | number) {
    this._strokeDashArray = value;
    return this;
  }

  _strokeWidth: string | number = 1;

  strokeWidth(value: string | number) {
    this._strokeWidth = value;
    return this;
  }

  arrowed(arrowStart?: ArrowHead, arrowEnd?: ArrowHead) {
    this.arrowStart(arrowStart);
    this.arrowEnd(arrowEnd);
    return this;
  }

  arrowStart(arrow?: ArrowHead) {
    if (arrow) {
      this._arrowStart = arrow
        .type("start")
        .fillOpacity(this._strokeOpacity)
        .fill(this._stroke)
        .stroke("none");
    } else {
      this._arrowStart = arrowhead(this._id)
        .type("start")
        .fill(this._stroke)
        .fillOpacity(this._strokeOpacity)
        .stroke("none");
    }
    return this;
  }

  arrowEnd(arrow?: ArrowHead) {
    if (arrow) {
      this._arrowEnd = arrow
        .type("end")
        .fillOpacity(this._strokeOpacity)
        .fill(this._stroke)
        .stroke("none");
    } else {
      this._arrowEnd = arrowhead(this._id)
        .fillOpacity(this._strokeOpacity)
        .fill(this._stroke)
        .stroke("none");
    }
    return this;
  }

  constructor() {
    super([0, 0]);
    this._id = uid(5);
    this._commands = [];
  }

  render(fx: (x: number) => number, fy: (y: number) => number) {
    this._commandList = processPathCommands(this._commands, fx, fy);
    return this;
  }
  push(command: PCommand) {
    this._commands.push(command);
  }
  get _endpoint() {
    const x1 = this._x1 ?? 0;
    const y1 = this._y1 ?? 0;
    return vector([x1, y1]);
  }
  private _x1: number | null = null;
  private _y1: number | null = null;
  moveTo(x: number, y: number) {
    this.push(M(x, y));
    this._x1 = x;
    this._y1 = y;
    return this;
  }
  closePath() {
    this.push(Z());
    return this;
  }
  lineTo(x: number, y: number) {
    this.push(L(x, y));
    this._x1 = x;
    this._y1 = y;
    return this;
  }
  quadraticCurveTo(x1: number, y1: number, x: number, y: number) {
    this.push(Q(x1, y1, x, y));
    this._x1 = x;
    this._y1 = y;
    return this;
  }
  bezierCurveTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number
  ) {
    this.push(C(x1, y1, x2, y2, x, y));
    this._x1 = x;
    this._y1 = y;
    return this;
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number) {
    this.push(ARCTO(x1, y1, x2, y2, r));

    // begin updating the endpoint of this path.
    (x1 = +x1), (y1 = +y1), (x2 = +x2), (y2 = +y2), (r = +r);
    const x0 = this._x1;
    const y0 = this._y1;
    const x21 = x2 - x1;
    const y21 = y2 - y1;
    const x01 = (x0 ?? 0) - x1;
    const y01 = (y0 ?? 0) - y1;
    const l01_2 = x01 * x01 + y01 * y01;

    // Is this path empty? Update endpoint to (x1,y1).
    if (this._x1 === null) {
      this._x1 = x1;
      this._y1 = y1;
    }

    // Is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon)) {
    }

    // Are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Update endpoint to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._x1 = x1;
      this._y1 = y1;
    }

    // Otherwise, update the path's endpoint to arc's endpoint.
    else {
      const x20 = x2 - (x0 ?? 0);
      const y20 = y2 - (y0 ?? 0);
      const l21_2 = x21 * x21 + y21 * y21;
      const l20_2 = x20 * x20 + y20 * y20;
      const l21 = Math.sqrt(l21_2);
      const l01 = Math.sqrt(l01_2);
      const l =
        r *
        Math.tan(
          (pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2
        );
      const t21 = l / l21;
      this._x1 = x1 + t21 * x21;
      this._y1 = y1 + t21 * y21;
    }
    return this;
  }
  arc(
    x: number,
    y: number,
    r: number,
    a0: number,
    a1: number,
    counterClockwise: boolean
  ) {
    const ccw = counterClockwise ? 1 : 0;
    this.push(ARC(x, y, r, a0, a1, ccw));
    // update the endpoint of this path
    (x = +x), (y = +y), (r = +r);

    const dx = r * Math.cos(a0);
    const dy = r * Math.sin(a0);
    const x0 = x + dx;
    const y0 = y + dy;
    let da = ccw ? a0 - a1 : a1 - a0;

    // Is this arc empty? We’re done.
    if (!r) return this;

    // Does the angle go the wrong way? Flip the direction.
    if (da < 0) da = (da % tau) + tau;

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon) {
      this._x1 = x0;
      this._y1 = y0;
    }

    // Is this arc non-empty? Draw an arc!
    else if (da > epsilon) {
      this._x1 = x + r * Math.cos(a1);
      this._y1 = y + r * Math.sin(a1);
    }
    return this;
  }
  toString() {
    return this._commandList.join(",");
  }
}

/** Returns a new path. */
export function path() {
  return new Path();
}

export function isPath(u: any) {
  return u instanceof Path;
}

export function quad(at: [number, number], width: number, height: number) {
  const x = at[0];
  const y = at[1];
  const w = width;
  const h = height;
  return path()
    .moveTo(x, y)
    .lineTo(x + w, y)
    .lineTo(x + w, y - h)
    .lineTo(x, y - h)
    .lineTo(x, y)
    .closePath();
}

/**
 * Given the array of points or vectors, draws a line
 * through the points/vectors.
 */
export function curveLinear(points: (Vector | [number, number])[]) {
  const pts: [number, number][] = [];
  points.forEach((p) => {
    if (Array.isArray(p)) {
      pts.push(p);
    } else {
      pts.push([p._x, p._y]);
    }
  });
  const p = path();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    p.lineTo(x, y);
  }
  return p;
}

/**
 * Given the array of points or vectors `points`,
 * draws a Catmull-Rom curve through the points.
 * An optional `alpha` value (defaulting to 0.5)
 * may be passed to set the curve's tension.
 */
export function curveCatmullRom(
  points: ([number, number] | Vector)[],
  alpha: number = 0.5
) {
  const p = path();
  const data = points.map((p) => {
    if (Array.isArray(p)) return vector(p);
    else return p;
  });
  const calcPoints = () => {
    const result = [];
    let lastStartPoint = data[0];
    const length = data.length;
    const alpha2 = alpha * 2;
    for (let i = 0; i < length - 1; i++) {
      const p0 = i === 0 ? data[0] : data[i - 1];
      const p1 = data[i];
      const p2 = data[i + 1];
      const p3 = i + 2 < length ? data[i + 2] : p2;

      const d1 = Math.sqrt((p0._x - p1._x) ** 2 + (p0._y - p1._y) ** 2);
      const d2 = Math.sqrt((p1._x - p2._x) ** 2 + (p1._y - p2._y) ** 2);
      const d3 = Math.sqrt((p2._x - p3._x) ** 2 + (p2._y - p3._y) ** 2);

      // Apply parametrization
      const d3powA = Math.pow(d3, alpha);
      const d3pow2A = Math.pow(d3, alpha2);
      const d2powA = Math.pow(d2, alpha);
      const d2pow2A = Math.pow(d2, alpha2);
      const d1powA = Math.pow(d1, alpha);
      const d1pow2A = Math.pow(d1, alpha2);

      const A = 2 * d1pow2A + 3 * d1powA * d2powA + d2pow2A;
      const B = 2 * d3pow2A + 3 * d3powA * d2powA + d2pow2A;

      let N = 3 * d1powA * (d1powA + d2powA);
      if (N > 0) {
        N = 1 / N;
      }

      let M = 3 * d3powA * (d3powA + d2powA);
      if (M > 0) {
        M = 1 / M;
      }

      let bp1 = vector([
        (-d2pow2A * p0._x + A * p1._x + d1pow2A * p2._x) * N,
        (-d2pow2A * p0._y + A * p1._y + d1pow2A * p2._y) * N,
      ]);

      let bp2 = vector([
        (d3pow2A * p1._x + B * p2._x - d2pow2A * p3._x) * M,
        (d3pow2A * p1._y + B * p2._y - d2pow2A * p3._y) * M,
      ]);

      if (bp1._x === 0 && bp1._y === 0) {
        bp1 = p1;
      }

      if (bp2._x === 0 && bp2._y === 0) {
        bp2 = p2;
      }

      result.push({ lastStartPoint, bp1, bp2, p2 });
      lastStartPoint = p2;
    }
    return result;
  };
  const pts = calcPoints();
  p.moveTo(pts[0].lastStartPoint._x, pts[0].lastStartPoint._y);
  for (let i = 0; i < pts.length; i++) {
    const point = pts[i];
    p.bezierCurveTo(
      point.bp1._x,
      point.bp1._y,
      point.bp2._x,
      point.bp2._y,
      point.p2._x,
      point.p2._y
    );
  }
  return p;
}

/**
 * Given the array of `pathPoints`, draws
 * a cardinal spline through the points. The
 * optional values of `tension`, `numOfSeg`,
 * and `close` may be passed.
 */
export function curveCardinal(
  pathPoints: ([number, number] | Vector)[],
  tension: number = 0.5,
  numOfSeg: number = 25,
  close: boolean = false
) {
  const points = pathPoints
    .map((p) => {
      if (Array.isArray(p)) return p;
      return [p._x, p._y];
    })
    .flat();
  const pts = points.slice(0);
  let l = points.length;
  let rPos = 0;
  const rLen = (l - 2) * numOfSeg + 2 + (close ? 2 * numOfSeg : 0);
  const res = new Float32Array(rLen);
  const cache = new Float32Array((numOfSeg + 2) * 4);
  let cachePtr = 4;
  if (close) {
    pts.unshift(points[l - 1]);
    pts.unshift(points[l - 2]);
    pts.push(points[0], points[1]);
  } else {
    pts.unshift(points[1]);
    pts.unshift(points[0]);
    pts.push(points[l - 2], points[l - 1]);
  }
  cache[0] = 1;
  let i = 1;
  for (; i < numOfSeg; i++) {
    const st = i / numOfSeg;
    const st2 = st * st;
    const st3 = st2 * st;
    const st23 = st3 * 2;
    const st32 = st2 * 3;
    cache[cachePtr++] = st23 - st32 + 1;
    cache[cachePtr++] = st32 - st23;
    cache[cachePtr++] = st3 - 2 * st2 + st;
    cache[cachePtr++] = st3 - st2;
  }
  cache[++cachePtr] = 1;
  parse(pts, cache, l);

  function parse(pts: number[], cache: Float32Array, l: number) {
    for (let i = 2, t; i < l; i += 2) {
      const pt1 = pts[i];
      const pt2 = pts[i + 1];
      const pt3 = pts[i + 2];
      const pt4 = pts[i + 3];
      const t1x = (pt3 - pts[i - 2]) * tension;
      const t1y = (pt4 - pts[i - 1]) * tension;
      const t2x = (pts[i + 4] - pt1) * tension;
      const t2y = (pts[i + 5] - pt2) * tension;
      for (t = 0; t < numOfSeg; t++) {
        const c = t << 2;
        const c1 = cache[c];
        const c2 = cache[c + 1];
        const c3 = cache[c + 2];
        const c4 = cache[c + 3];
        res[rPos++] = c1 * pt1 + c2 * pt3 + c3 * t1x + c4 * t2x;
        res[rPos++] = c1 * pt2 + c2 * pt4 + c3 * t1y + c4 * t2y;
      }
    }
  }

  // add last point
  l = close ? 0 : points.length - 2;
  res[rPos++] = points[l];
  res[rPos] = points[l + 1];

  const p = path();
  p.moveTo(points[0], points[1]);
  for (i = 0, l = res.length; i < l; i += 2) {
    p.lineTo(res[i], res[i + 1]);
  }
  return p;
}

export function curveCubicBezier(points: [number, number][], tension: number) {
  const dista = (arr: number[], i: number, j: number) => {
    return Math.sqrt(
      Math.pow(arr[2 * i] - arr[2 * j], 2) +
        Math.pow(arr[2 * i + 1] - arr[2 * j + 1], 2)
    );
  };
  const va = (arr: number[], i: number, j: number) => {
    return [arr[2 * j] - arr[2 * i], arr[2 * j + 1] - arr[2 * i + 1]];
  };

  const ctlpts = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) => {
    const t = tension;
    const v = va([x1, y1, x2, y2, x3, y3], 0, 2);
    const d01 = dista([x1, y1, x2, y2, x3, y3], 0, 1);
    const d12 = dista([x1, y1, x2, y2, x3, y3], 1, 2);
    const d012 = d01 + d12;
    return [
      x2 - (v[0] * t * d01) / d012,
      y2 - (v[1] * t * d01) / d012,
      x2 + (v[0] * t * d12) / d012,
      y2 + (v[1] * t * d12) / d012,
    ];
  };

  const drawCurvedPath = (cps: number[], pts: number[]) => {
    const p = path();
    p.moveTo(pts[0], pts[1]);
    const len = pts.length / 2;
    if (len < 2) return p;
    if (len == 2) {
      p.moveTo(pts[0], pts[1]);
      p.lineTo(pts[2], pts[3]);
      return p;
    } else {
      p.quadraticCurveTo(cps[0], cps[1], pts[2], pts[3]);
      let i = 2;
      for (; i < len - 1; i++) {
        const ctrl1 = tuple(
          cps[(2 * (i - 1) - 1) * 2],
          cps[(2 * (i - 1) - 1) * 2 + 1]
        );
        const ctrl2 = tuple(cps[2 * (i - 1) * 2], cps[2 * (i - 1) * 2 + 1]);
        const end = tuple(pts[i * 2], pts[i * 2 + 1]);
        p.bezierCurveTo(ctrl1[0], ctrl1[1], ctrl2[0], ctrl2[1], end[0], end[1]);
      }
      p.quadraticCurveTo(
        cps[(2 * (i - 1) - 1) * 2],
        cps[(2 * (i - 1) - 1) * 2 + 1],
        pts[i * 2],
        pts[i * 2 + 1]
      );
      return p;
    }
  };
  const draw = () => {
    const pts = points.flat();
    let cps: number[] = [];
    for (let i = 0; i < pts.length - 2; i++) {
      cps = cps.concat(
        ctlpts(
          pts[2 * i],
          pts[2 * i + 1],
          pts[2 * i + 2],
          pts[2 * i + 3],
          pts[2 * i + 4],
          pts[2 * i + 5]
        )
      );
    }
    return drawCurvedPath(cps, pts);
  };
  return draw();
}

export function plotPoints(points: [number, number][], pointSize: number = 2) {
  return points.map(([x, y]) => circle(pointSize, [x, y]));
}

/**
 * Given the set of points, draws a smooth path through each of the points,
 * closed.
 */
export function curveBlob(points: [number, number][], smoothing: number = 0.2) {
  const getCurvePathData = (points: Vector[], closed = true) => {
    if (closed) {
      points = points.concat(points.slice(0, 2));
    }
    const line = (pointA: Vector, pointB: Vector) => {
      const lengthX = pointB._x - pointA._x;
      const lengthY = pointB._y - pointA._y;
      return {
        length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
        angle: Math.atan2(lengthY, lengthX),
      };
    };

    const controlPoint = (
      current: Vector,
      previous: Vector,
      next: Vector,
      reverse: boolean
    ) => {
      const p = previous || current;
      const n = next || current;
      const o = line(p, n);
      const angle = o.angle + (reverse ? Math.PI : 0);
      const length = o.length * smoothing;
      const x = current._x + Math.cos(angle) * length;
      const y = current._y + Math.sin(angle) * length;
      return vector([x, y]);
    };

    const p = path();
    p.moveTo(points[0]._x, points[0]._y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const cp1 = controlPoint(points[i - 1], points[i - 2], point, false);
      const cp2 = controlPoint(point, points[i - 1], points[i + 1], true);
      p.bezierCurveTo(cp1._x, cp1._y, cp2._x, cp2._y, point._x, point._y);
    }
    if (closed) {
      const comLast = p._commands[p._commands.length - 1] as CCommand;
      const cp1 = tuple(comLast[1], comLast[2]);
      const valuesFirstC = p._commands[1] as CCommand;
      const end_valuesFirstC = tuple(valuesFirstC[5], valuesFirstC[6]);
      const ctrl2_valuesFirstC = tuple(valuesFirstC[3], valuesFirstC[4]);
      p._commands[1] = C(
        cp1[0],
        cp1[1],
        ctrl2_valuesFirstC[0],
        ctrl2_valuesFirstC[1],
        end_valuesFirstC[0],
        end_valuesFirstC[1]
      );
      p._commands = p._commands.slice(0, p._commands.length - 1);
    }
    return p;
  };
  return getCurvePathData(points.map(([x, y]) => vector([x, y])));
}

export class Ellipse extends Renderable {
  render(fx: (x: number) => number, fy: (y: number) => number): this {
    this._position = vector([fx(this._position._x), fy(this._position._y)]);
    // this._rx = fx(this._rx);
    // this._ry = fy(this._ry);
    return this;
  }

  _fillOpacity: number | `${number}%` = 1;

  fillOpacity(value: number | `${number}%`) {
    this._fillOpacity = value;
    return this;
  }

  _rx: number;

  rx(value: number) {
    this._rx = value;
    return this;
  }

  _ry: number;

  ry(value: number) {
    this._ry = value;
    return this;
  }

  constructor(position: [number, number], rx: number, ry: number) {
    super(position);
    this._position = vector(position);
    this._rx = rx;
    this._ry = ry;
  }

  _fill: string = "black";

  fill(value: string) {
    this._fill = value;
    this._stroke = this._fill;
    return this;
  }

  _stroke: string = this._fill;

  stroke(value: string) {
    this._stroke = value;
    return this;
  }

  _strokeWidth: string | number = 1;

  strokeWidth(value: string | number) {
    this._strokeWidth = value;
    return this;
  }

  _position: Vector = vector([0, 0]);

  get _cx() {
    return this._position._x;
  }

  get _cy() {
    return this._position._y;
  }

  position(x: number, y: number) {
    this._position = vector([x, y]);
    return this;
  }

  _strokeDashArray: number = 0;

  strokeDashArray(value: number) {
    this._strokeDashArray = value;
    return this;
  }
}

export function ellipse(position: [number, number], rx: number, ry: number) {
  return new Ellipse(position, rx, ry);
}

export function isEllipse(u: any): u is Ellipse {
  return u && u instanceof Ellipse;
}

export class Circle extends Renderable {
  render(fx: (x: number) => number, fy: (y: number) => number): this {
    this._position = vector([fx(this._position._x), fy(this._position._y)]);
    return this;
  }
  _fillOpacity: number | `${number}%` = 1;

  fillOpacity(value: number | `${number}%`) {
    this._fillOpacity = value;
    return this;
  }

  _radius: number;
  constructor(radius: number, position: [number, number]) {
    super(position);
    this._radius = radius;
    this._position = vector(position);
  }

  _fill: string = "black";

  fill(value: string) {
    this._fill = value;
    this._stroke = this._fill;
    return this;
  }

  _stroke: string = this._fill;

  stroke(value: string) {
    this._stroke = value;
    return this;
  }

  _strokeWidth: string | number = 1;

  strokeWidth(value: string | number) {
    this._strokeWidth = value;
    return this;
  }

  radius(value: number) {
    this._radius = value;
    return this;
  }

  _position: Vector = vector([0, 0]);
  get _cx() {
    return this._position._x;
  }
  get _cy() {
    return this._position._y;
  }

  position(x: number, y: number) {
    this._position = vector([x, y]);
    return this;
  }

  _strokeDashArray: number = 0;
  strokeDashArray(value: number) {
    this._strokeDashArray = value;
    return this;
  }
}

export function circle(radius: number, position: [number, number]) {
  return new Circle(radius, position);
}

export function isCircle(u: any) {
  return u instanceof Circle;
}

export class TextObj extends Renderable {
  _latex: null | "block" | "inline" = null;
  _width: number | string = 50;
  width(value: number | string) {
    this._width = value;
    return this;
  }
  _height: number | string = 50;
  height(value: number | string) {
    this._height = value;
    return this;
  }
  latex(value: "block" | "inline") {
    this._latex = value;
    return this;
  }

  render(fx: (x: number) => number, fy: (y: number) => number): this {
    this._position = vector([fx(this._position._x), fy(this._position._y)]);
    return this;
  }

  _content: string | number;
  _position: Vector = vector([0, 0]);
  position(x: number, y: number) {
    this._position = vector([x, y]);
    this._origin = vector([x, y]);
    return this;
  }
  _dy: number = 0;
  dy(value: number) {
    this._dy = value;
    return this;
  }
  _dx: number = 0;
  dx(value: number) {
    this._dx = value;
    return this;
  }
  _textAnchor: "start" | "middle" | "end" = "middle";
  textAnchor(value: "start" | "middle" | "end") {
    this._textAnchor = value;
    return this;
  }
  _fontStyle?: string;
  fontStyle(value: string) {
    this._fontStyle = value;
    return this;
  }
  _fontFamily?: string;
  fontFamily(value: string) {
    this._fontFamily = value;
    return this;
  }
  _fontSize?: string | number;
  fontSize(value: string | number) {
    this._fontSize = value;
    return this;
  }
  _fill?: string;
  fill(color: string) {
    this._fill = color;
    return this;
  }
  constructor(content: string | number) {
    super([0, 0]);
    this._content = content;
  }
}

export function text(content: string | number) {
  return new TextObj(content);
}

export function isText(u: any) {
  return u instanceof TextObj;
}

export class Group extends Renderable {
  render(
    fx: (x: number) => number,
    fy: (y: number) => number,
    fz: (x: number) => number
  ): this {
    this.$children.forEach((child) => {
      child.render(fx, fy, fz);
    });
    return this;
  }

  $children: Renderable[] = [];

  $domain: [number, number] = [-5, 5];

  get $xMin() {
    return this.$domain[0];
  }

  get $xMax() {
    return this.$domain[1];
  }

  domain(domain: [number, number]) {
    this.$domain = domain;
    return this;
  }

  $range: [number, number] = [-5, 5];

  get $yMin() {
    return this.$range[0];
  }

  get $yMax() {
    return this.$range[1];
  }

  range(range: [number, number]) {
    this.$range = range;
    return this;
  }

  constructor(children: Renderable[]) {
    super([0, 0]);
    this.$children = children;
  }
}

export function isGroup(u: any) {
  return u instanceof Group;
}

/** Returns a new SVG group object. */
export function group(children: Renderable[]) {
  return new Group(children);
}

export class Transformation extends Renderable {
  render(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fx: (x: number) => number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fy: (y: number) => number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fz: (y: number) => number
  ): this {
    // this._rotateX && (this._rotateX = fx(this._rotateX));
    // this._rotateY && (this._rotateY = fy(this._rotateY));
    // this._rotateZ && (this._rotateZ = fz(this._rotateZ));
    // this._translateX && (this._translateX = fx(this._translateX));
    // this._translateY && (this._translateY = fx(this._translateY));
    // this._scaleX && (this._scaleX = fx(this._scaleX));
    // this._scaleY && (this._scaleY = fy(this._scaleY));
    // this._skewX && (this._skewX = fx(this._skewX));
    return this;
  }
  get _transformData() {
    // if this has any translation
    const out = [];
    if (this._translateX || this._translateY) {
      const translation = [];
      this._translateX
        ? translation.push(this._translateX)
        : translation.push(0);
      this._translateY
        ? translation.push(this._translateY)
        : translation.push(0);
      out.push(`translate(${translation.join(",")})`);
    }
    // if this has any rotation
    if (this._rotate) {
      out.push(`rotate(${this._rotate},${this._origin._x},${this._origin._y})`);
    }
    // if this has any skew
    if (this._skewX) {
      out.push(`skewX(${this._skewX})`);
    }
    // if this has any scaling
    if (this._scaleX || this._scaleY) {
      const scaling = [];
      this._scaleX ? scaling.push(this._scaleX) : scaling.push(1);
      this._scaleY ? scaling.push(this._scaleY) : scaling.push(1);
      out.push(`scale(${scaling.join(",")})`);
    }
    return out.join(" ");
  }
  _translateX: number = 0;
  translateX(value: number) {
    this._translateX = value;
    return this;
  }
  _translateY: number = 0;
  translateY(value: number) {
    this._translateY = value;
    return this;
  }
  _rotate: number = 0;
  rotate(value: number) {
    this._rotate = value;
    return this;
  }
  _skewX: number = 0;
  skewX(value: number) {
    this._skewX = value;
    return this;
  }
  _scaleX: number = 0;
  scaleX(value: number) {
    this._scaleX = value;
    return this;
  }
  _scaleY: number = 0;
  scaleY(value: number) {
    this._scaleY = value;
    return this;
  }
  _target: Renderable;
  constructor(target: Renderable) {
    super([target._origin._x, target._origin._y]);
    this._target = target;
  }
}

export function transform(target: Renderable) {
  return new Transformation(target);
}

export function isTransformation(u: any): u is Transformation {
  return u && u instanceof Transformation;
}

// function to draw a triangle with angle marks
// pass it the 3 points at the corners of the triangle.
// will handle any triangle
// function drawTriangle(x1,y1,x2,y2,x3,y3)
export function triangle(
  pt1: [number, number],
  pt2: [number, number],
  pt3: [number, number]
) {
  const [x1, y1] = pt1;
  const [x2, y2] = pt2;
  const [x3, y3] = pt3;
  const ctx = path();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  return ctx;
}

export class LineObj extends Renderable {
  $strokeDashArray: string | number = 0;
  strokeDashArray(value: string | number) {
    this.$strokeDashArray = value;
    return this;
  }
  $strokeOpacity: number | string = 1;
  strokeOpacity(value: number | string) {
    this.$strokeOpacity = value;
    return this;
  }
  _arrowEnd: null | ArrowHead = null;

  _arrowStart: null | ArrowHead = null;

  arrowed() {
    return this.arrowEnd().arrowStart();
  }

  arrowStart(arrow?: ArrowHead) {
    if (arrow) {
      this._arrowStart = arrow.type("start");
    } else {
      this._arrowStart = arrowhead(this._id)
        .type("start")
        .fill(this.$stroke)
        .fillOpacity(this.$strokeOpacity)
        .stroke("none");
    }
    return this;
  }

  arrowEnd(arrow?: ArrowHead) {
    if (arrow) {
      this._arrowEnd = arrow.type("end");
    } else {
      this._arrowEnd = arrowhead(this._id)
        .fillOpacity(this.$strokeOpacity)
        .fill(this.$stroke)
        .stroke("none");
    }
    return this;
  }

  render(fx: (x: number) => number, fy: (y: number) => number): this {
    this.$start = vector([fx(this.$start._x), fy(this.$start._y)]);
    this.$end = vector([fx(this.$end._x), fy(this.$end._y)]);
    return this;
  }

  $start: Vector;
  $end: Vector;
  constructor(start: [number, number], end: [number, number]) {
    super(start);
    this.$start = vector(start);
    this.$end = vector(end);
  }
  $stroke: string = "black";
  stroke(value: string) {
    this.$stroke = value;
    return this;
  }
  $strokeWidth: string | number = 1;
  strokeWidth(value: string | number) {
    this.$strokeWidth = value;
    return this;
  }
}

export function line(start: [number, number], end: [number, number]) {
  return new LineObj(start, end);
}

export function isLine(u: any) {
  return u instanceof LineObj;
}

export function ytick(y: number, length: number = 0.05) {
  return line([-length, y], [length, y]);
}
export function xtick(x: number, length: number = 0.05) {
  return line([x, -length], [x, length]);
}

export function angleMarker(
  p3: [number, number] | Vector,
  p2: [number, number] | Vector,
  p1: [number, number] | Vector,
  radius: number = 20,
  angleReverse: boolean = true
) {
  const pt3 = Array.isArray(p3) ? vector(p3) : p3;
  const pt2 = Array.isArray(p2) ? vector(p2) : p2;
  const pt1 = Array.isArray(p1) ? vector(p1) : p1;

  const dx1 = pt1._x - pt2._x;
  const dy1 = pt1._y - pt2._y;
  const dx2 = pt3._x - pt2._x;
  const dy2 = pt3._y - pt2._y;
  let a1 = Math.atan2(dy1, dx1);
  let a2 = Math.atan2(dy2, dx2);
  const p = path();
  p.moveTo(pt2._x, pt2._y);
  if (angleReverse) {
    a1 = Math.PI * 2 - a1;
    a2 = Math.PI * 2 - a2;
  }
  p.arc(pt2._x, pt2._y, radius, a1, a2, false);
  p.closePath();
  p.fill("none");
  return p;
}

export function arcFromPoints(
  p3: [number, number] | Vector,
  p2: [number, number] | Vector,
  p1: [number, number] | Vector,
  radius: number = 20,
  angleReverse: boolean = true
) {
  const pt3 = Array.isArray(p3) ? vector(p3) : p3;
  const pt2 = Array.isArray(p2) ? vector(p2) : p2;
  const pt1 = Array.isArray(p1) ? vector(p1) : p1;

  const dx1 = pt1._x - pt2._x;
  const dy1 = pt1._y - pt2._y;
  const dx2 = pt3._x - pt2._x;
  const dy2 = pt3._y - pt2._y;
  let a1 = Math.atan2(dy1, dx1);
  let a2 = Math.atan2(dy2, dx2);
  const p = path();
  // p.moveTo(pt2._x, pt2._y);
  if (angleReverse) {
    a1 = Math.PI * 2 - a1;
    a2 = Math.PI * 2 - a2;
  }
  p.arc(pt2._x, pt2._y, radius, a1, a2, false);
  // p.closePath();
  p.fill("none");
  return p;
}

export type Tick = { tick: LineObj; label: TextObj };

function ticklines2D(
  tickLength: number,
  start: number,
  stop: number,
  step: number,
  orientation: "x" | "y"
): Tick[] {
  const numbers = range(start, stop, step);
  const output: Tick[] = [];
  if (orientation === "x") {
    numbers.forEach((n) => {
      const tick = line([n, -tickLength], [n, tickLength]);
      const label = text(n).position(tick.$start._x, tick.$start._y);
      output.push({ tick, label });
    });
  } else {
    numbers.forEach((n) => {
      const tick = line([-tickLength, n], [tickLength, n]);
      const label = text(n).position(tick.$start._x, tick.$start._y);
      output.push({ tick, label });
    });
  }
  return output;
}

abstract class Axis extends Group {
  $stroke: string = "black";
  stroke(value: string) {
    this.$stroke = value;
    return this;
  }
  $tickLength: number = 0.1;
  tickLength(value: number) {
    this.$tickLength = value;
    return this;
  }
  $interval: [number, number];
  $step: number;
  constructor(interval: [number, number], step: number) {
    super([]);
    this.$interval = interval;
    this.$step = step;
  }
}

class VerticalAxis extends Axis {
  ticks(tickFn?: (t: Tick) => Tick) {
    ticklines2D(
      this.$tickLength,
      this.$interval[0],
      this.$interval[1],
      this.$step,
      "y"
    ).forEach((t) => {
      t.label.fill(this.$stroke);
      t.tick.stroke(this.$stroke);
      if (tickFn) {
        t = tickFn(t);
      }
      this.$children.push(t.label, t.tick);
    });
    return this;
  }
  constructor(interval: [number, number], step: number) {
    super(interval, step);
  }
  done() {
    const ymin = this.$interval[0];
    const ymax = this.$interval[1];
    const yline = line([0, ymin], [0, ymax]).stroke(this.$stroke);
    this.$children.push(yline);
    return this;
  }
}

export function vaxis(interval: [number, number], step: number) {
  return new VerticalAxis(interval, step);
}

class HorizontalAxis extends Axis {
  ticks(tickFn?: (t: Tick) => Tick) {
    ticklines2D(
      this.$tickLength,
      this.$interval[0],
      this.$interval[1],
      this.$step,
      "x"
    ).forEach((t) => {
      t.label.fill(this.$stroke);
      t.tick.stroke(this.$stroke);
      if (tickFn) {
        t = tickFn(t);
      }
      this.$children.push(t.label, t.tick);
    });
    return this;
  }
  constructor(interval: [number, number], step: number) {
    super(interval, step);
  }
  done() {
    const xmin = this.$interval[0];
    const xmax = this.$interval[1];
    const xline = line([xmin, 0], [xmax, 0]).stroke(this.$stroke);
    this.$children.push(xline);
    return this;
  }
}

export function haxis(interval: [number, number], step: number) {
  return new HorizontalAxis(interval, step);
}


export type AxisSpec = {
  on: "x" | "y";
  domain: [number, number];
  range: [number, number];
  hideTicks?: boolean;
  color?: string,
};

export const axis = (spec: AxisSpec) => {
  const out = spec.on === "x" ? haxis(spec.domain, 1) : vaxis(spec.range, 1);
  if (!spec.hideTicks) {
    if (spec.on === "x") {
      out.ticks((t) => {
        t.label.dy(15);
        spec.color && t.label.fill(spec.color);
        spec.color && t.tick.stroke(spec.color);
        return t;
      });
    } else {
      out.ticks((t) => {
        t.label.dy(5).dx(15);
        spec.color && t.label.fill(spec.color);
        spec.color && t.tick.stroke(spec.color);
        return t;
      });
    }
  }
  spec.color && out.stroke(spec.color);
  out.done();
  return out;
};

class Grid extends Group {
  done() {
    const xmin = this.$xDomain[0];
    const xmax = this.$xDomain[1];
    const ymin = this.$yRange[0];
    const ymax = this.$yRange[1];
    for (let i = xmin + this.$step; i < xmax; i++) {
      this.$children.push(
        line([i, ymin], [i, ymax])
          .stroke(this.$stroke)
          .strokeWidth(this.$strokeWidth)
      );
    }
    for (let i = ymin + this.$step; i < ymax; i++) {
      this.$children.push(
        line([xmax, i], [xmin, i])
          .stroke(this.$stroke)
          .strokeWidth(this.$strokeWidth)
      );
    }
    return this;
  }
  $stroke: string = "rgb(214, 225, 217)";
  stroke(color: string) {
    this.$stroke = color;
    return this;
  }
  $strokeWidth: string | number = 1;
  strokeWidth(value: string | number) {
    this.$strokeWidth = value;
    return this;
  }
  $step: number = 1;
  step(value: number) {
    this.$step = value;
    return this;
  }
  $xDomain: [number, number];
  $yRange: [number, number];
  constructor(xDomain: [number, number], yRange: [number, number]) {
    super([]);
    this.$xDomain = xDomain;
    this.$yRange = yRange;
  }
}

/**
 * Returns a new 2D grid.
 * @param xDomain A pair `[xMin,xMax]` where `xMin` and `xMax`
 * are numbers: `xMin` corresponding to the smallest x-coordinate
 * and `xMax` corresponding to the largest.
 * @param yRange A pair `[yMin,yMax]` where `yMin` and `yMax`
 * are numbers: `yMin` corresponding to the smallest y-coordinate
 * and `yMax` corresponding to the largest.
 * @returns A new Grid.
 */
export function grid(xDomain: [number, number], yRange: [number, number]) {
  return new Grid(xDomain, yRange);
}

class CartesianPlot extends Group {
  $fn: string;
  $xPlotDomain: [number, number];
  $yPlotRange: [number, number];
  constructor(
    fn: string,
    xPlotDomain: [number, number],
    $yPlotRange: [number, number]
  ) {
    super([]);
    this.$fn = fn;
    this.$xPlotDomain = xPlotDomain;
    this.$yPlotRange = $yPlotRange;
  }

  $samples: number = 200;

  samples(value: number) {
    this.$samples = value;
    return this;
  }

  $compiledFunction: Fn | null = null;
  $engine = engine();

  _axisX: boolean = true;
  _axisY: boolean = true;

  done() {
    const out: (LCommand | MCommand)[] = [];
    const xmin = this.$xPlotDomain[0];
    const xmax = this.$xPlotDomain[1];
    const ymin = this.$yPlotRange[0];
    const ymax = this.$yPlotRange[1];
    // const e = engine();
    const fn = this.$engine.compile(this.$fn);
    if (!(fn instanceof Fn)) {
      console.error(strof(fn));
      return this;
    }
    this.$compiledFunction = fn;
    const dataset: [number, number][] = [];
    for (let i = -this.$samples; i < this.$samples; i++) {
      const x = (i / this.$samples) * xmax;
      const _y = fn.call(this.$engine.compiler, [x]);
      if (typeof _y !== "number") continue;
      const y = _y;
      const point: [number, number] = [x, y];
      if (Number.isNaN(y) || y < ymin || ymax < y) point[1] = NaN;
      if (x < xmin || xmax < x) continue;
      else dataset.push(point);
    }
    // TODO implement integration
    let moved = false;
    for (let i = 0; i < dataset.length; i++) {
      const datum = dataset[i];
      if (!Number.isNaN(datum[1])) {
        if (!moved) {
          out.push(M(datum[0], datum[1]));
          moved = true;
        } else {
          out.push(L(datum[0], datum[1]));
        }
      } else {
        const next = dataset[i + 1];
        if (next !== undefined && !Number.isNaN(next[1])) {
          out.push(M(next[0], next[1]));
        }
      }
    }
    const p = path();
    p.moveTo(out[0][1], out[0][2]);
    for (let i = 1; i < out.length; i++) {
      p._commands.push(out[i]);
    }
    p.stroke(this.$stroke);
    p.strokeWidth(this.$strokeWidth);
    this.$children.push(p);
    return this;
  }

  $strokeWidth: string | number = 1;

  strokeWidth(value: string | number) {
    this.$strokeWidth = value;
    return this;
  }

  $stroke: string = "black";

  stroke(value: string) {
    this.$stroke = value;
    return this;
  }
}

class AxisLinear extends Group {
  _dataset: [number, number][] = [];
  _color: string = "black";
  _direction: "x" | "y";
  _tickLength: number = 0.01;
  _labelInterval: number = 5;
  _includeFirstLabel: boolean = true;
  _includeLastLabel: boolean = true;
  _x_min: number;
  _x_max: number;
  _y_min: number;
  _y_max: number;
  constructor(direction: "x" | "y", dataset: [number, number][]) {
    super([]);
    this._direction = direction;
    this._dataset = dataset;
    const { min: xMin, max: xMax } = minmax(dataset.map((p) => p[0]));
    this._x_min = xMin;
    this._x_max = xMax;
    const { min: yMin, max: yMax } = minmax(dataset.map((p) => p[1]));
    this._y_min = yMin;
    this._y_max = yMax;
  }
  done() {
    const ticks: LineObj[] = [];
    const tickLabels: TextObj[] = [];
    if (this._direction === "y") {
      const scale = interpolator(
        [0, this._dataset.length],
        [this._y_min, this._y_max]
      );
      // const mid = (this._x_max + this._x_min)/2;
      const axisLine = line(
        [this._x_min, this._y_min],
        [this._x_min, this._y_max]
      ).stroke(this._color);
      this.$children.push(axisLine);
      this._dataset.forEach((point, index) => {
        if (index % this._labelInterval === 0) {
          const n = point[1];
          const t = xtick(index, this._tickLength);
          t.stroke(this._color);
          ticks.push(t);
          const num = scale(n);
          tickLabels.push(
            text(num).position(0, t.$end._y).dy(5).dx(-20).fill(this._color)
          );
        }
      });
    }
    // ticks.forEach((t) => this.$children.push(t));
    // tickLabels.forEach((t) => this.$children.push(t));
    return this;
  }
}

export function axisLinear(direction: "x" | "y", dataset: [number, number][]) {
  return new AxisLinear(direction, dataset);
}

type Fn3DSpec = {
  fn: string;
  /** The z-axis rotation. */
  a: number;
  /** The y-axis rotation. */
  b: number;
  /** The x-axis rotation. */
  c: number;
  /** The number of segments. */
  n: number;
  /** The scaling factor. */
  s: number;
  /** The number of samples. */
  samples?: number;
};

export class SequencePlot extends Group {
  $fn: string;
  $indexDomain: [number, number];
  $memberRange: [number, number];
  constructor(fn: string, maxIndex: number, range: [number, number]) {
    super([]);
    this.$fn = fn;
    this.$indexDomain = tuple(0, maxIndex);
    this.$memberRange = range;
  }
  $compiledFunction: Fn | null = null;
  $engine = engine();
  $pointMarker: ((point: [number, number]) => Renderable) | null = null;
  pointMarker(fn: (point: [number, number]) => Renderable) {
    this.$pointMarker = fn;
    return this;
  }
  $axisColor: string = "black";
  axisColor(color: string) {
    this.$axisColor = color;
    return this;
  }
  done() {
    const indexMin = this.$indexDomain[0];
    const indexMax = this.$indexDomain[1];
    const yMin = this.$memberRange[0];
    const yMax = this.$memberRange[1];
    const dataset: [number, number][] = [];
    const fn = this.$engine.compile(this.$fn);
    if (!(fn instanceof Fn)) {
      console.error(strof(fn));
      return this;
    }
    this.$compiledFunction = fn;
    for (let i = indexMin; i < indexMax; i++) {
      const x = i;
      const _y = fn.call(this.$engine.compiler, [x]);
      if (typeof _y !== "number") continue;
      const y = _y;
      const point = tuple(x, y);
      if (Number.isNaN(y) || y < yMin || yMax < y) {
        point[1] = NaN;
      }
      if (x < indexMin || indexMax < x) {
        continue;
      } else dataset.push(point);
    }
    const pointMarkers: Renderable[] = [];
    for (let i = 0; i < dataset.length; i++) {
      const datum = dataset[i];
      if (!Number.isNaN(datum[1])) {
        if (this.$pointMarker) {
          pointMarkers.push(this.$pointMarker(datum));
        } else {
          pointMarkers.push(circle(1, datum));
        }
      }
    }
    pointMarkers.forEach((c) => this.$children.push(c));
    const xaxis = line([indexMin, 0], [indexMax, 0]).stroke(this.$axisColor);
    this.$children.push(xaxis);
    const yaxis = line([indexMin, yMin], [indexMin, yMax]).stroke(
      this.$axisColor
    );
    this.$children.push(yaxis);
    const ticks: LineObj[] = [];
    const tickLabels: TextObj[] = [];
    dataset.forEach((p, i) => {
      if (!Number.isNaN(p[1])) {
        // x-axis ticks
        const t = xtick(i, 0.01);
        ticks.push(t.stroke(this.$axisColor));
        if (
          tickLabels.length === 0 ||
          i % 5 === 0 ||
          i === dataset.length - 1
        ) {
          tickLabels.push(
            text(i).position(t.$end._x, 0).dy(15).fill(this.$axisColor)
          );
        }
      }
    });
    const r = range(0, dataset.length, 1);
    const ip = interpolator([0, dataset.length], [yMin, yMax]);
    r.forEach((n, i) => {
      if (i % 10 === 0) {
        const t = ytick(ip(n), 0.3);
        ticks.push(t.stroke(this.$axisColor));
        let num = ip(n).toPrecision(2);
        if (Number.isInteger(+num)) {
          num = `${Number.parseInt(num)}`;
        }
        tickLabels.push(
          text(num).position(0, t.$end._y).dy(5).dx(-20).fill(this.$axisColor)
        );
      }
    });
    ticks.forEach((t) => this.$children.push(t));
    tickLabels.forEach((t) => this.$children.push(t));
    return this;
  }
}

export function plotSeq(fn: string, maxIndex: number, range: [number, number]) {
  return new SequencePlot(fn, maxIndex, range);
}

export function fplot3D({ fn, a, b, c, n, s, samples }: Fn3DSpec) {
  const l = 0.94;
  const a_l = 7.89;
  samples = samples ? 1 / samples : 0.0001;
  const e = engine();
  const f = e.compile(fn);
  if (!(f instanceof Fn)) {
    throw algebraError(`Could not compile: ${fn}`);
  }
  const x_x = cos(c) * cos(a) - sin(c) * sin(a) * sin(b);
  const x_y = cos(c) * sin(a) * sin(b) + sin(c) * cos(a);
  const y_x = -cos(c) * sin(a) - sin(c) * cos(a) * sin(b);
  const y_y = cos(c) * cos(a) * sin(b) - sin(c) * sin(a);
  const z_x = -sin(c) * cos(b);
  const z_y = cos(c) * cos(b);
  const pi5_6 = (5 * Math.PI) / 6;
  const lplus1_over2 = (l + 1) / 2;

  const x_arr = (t: number, x_s: number, y_s: number) => {
    if (0 < t && t < l) {
      return x_s * t;
    }
    if (l < t && t < lplus1_over2) {
      return l * x_s + cos(pi5_6) * x_s * (t - l) - sin(pi5_6) * y_s * (t - l);
    }
    if (lplus1_over2 < t && t < 1) {
      return (
        l * x_s +
        sin(pi5_6) * y_s * (t - lplus1_over2) +
        cos(pi5_6) * x_s * (t - lplus1_over2)
      );
    }
    return t;
  };

  const y_arr = (t: number, x_s: number, y_s: number) => {
    if (0 < t && t < l) {
      return y_s * t;
    }
    if (l < t && t < lplus1_over2) {
      return l * y_s + cos(pi5_6) * y_s * (t - l) + sin(pi5_6) * x_s * (t - l);
    }
    if (lplus1_over2 < t && t < 1) {
      return (
        l * y_s -
        sin(pi5_6) * x_s * (t - lplus1_over2) +
        cos(pi5_6) * y_s * (t - lplus1_over2)
      );
    }
    return t;
  };
  const p = path();
  for (let t = 0; t <= 1; t += 0.01) {
    const x = x_arr(t, a_l * x_x, a_l * x_y);
    const y = y_arr(t, a_l * x_x, a_l * x_y);
    if (t === 0) {
      p.moveTo(x, y);
    } else {
      p.lineTo(x, y);
    }
  }

  for (let t = 0; t <= 1; t += 0.01) {
    const x = x_arr(t, a_l * y_x, a_l * y_y);
    const y = y_arr(t, a_l * y_x, a_l * y_y);
    if (t === 0) {
      p.moveTo(x, y);
    } else {
      p.lineTo(x, y);
    }
  }
  for (let t = 0; t <= 1; t += 0.01) {
    const x = x_arr(t, a_l * z_x, a_l * z_y);
    const y = y_arr(t, a_l * z_x, a_l * z_y);

    if (t === 0) {
      p.moveTo(x, y);
    } else {
      p.lineTo(x, y);
    }
  }
  const g = (x: number) => {
    return 2 * s * (floor(x * (n + 1)) / n - 0.5);
  };
  const h = (x: number) => {
    return 2 * s * (mod(x * (n + 1), 1) - 0.5);
  };

  const dataset1: [number, number][] = [];
  for (let t = 0; t <= 1; t += samples) {
    const fxy = f.call(e.compiler, [g(t), h(t)]);
    if (typeof fxy !== "number") {
      continue;
    }
    const x = x_x * g(t) + y_x * h(t) + z_x * fxy;
    const y = x_y * g(t) + y_y * h(t) + z_y * fxy;
    dataset1.push(tuple(x, y));
  }
  const cp = path();
  for (let i = 0; i < dataset1.length; i++) {
    const p1 = dataset1[i];
    const p2 = dataset1[i + 1];
    if (i === 0) {
      cp.moveTo(p1[0], p1[1]);
    }
    if (p2 && dist2D(p1, p2) >= 1) {
      cp.moveTo(p2[0], p2[1]);
      continue;
    }
    cp.lineTo(p1[0], p1[1]);
  }

  const dataset2: [number, number][] = [];
  for (let t = 0; t <= 1; t += samples) {
    const fxy = f.call(e.compiler, [h(t), g(t)]);
    if (typeof fxy !== "number") {
      continue;
    }
    const x = x_x * h(t) + y_x * g(t) + z_x * fxy;
    const y = x_y * h(t) + y_y * g(t) + z_y * fxy;
    dataset2.push(tuple(x, y));
  }
  for (let i = 0; i < dataset2.length; i++) {
    const p1 = dataset2[i];
    const p2 = dataset2[i + 1];
    if (i === 0) {
      cp.moveTo(p1[0], p1[1]);
    }
    if (p2 && dist2D(p1, p2) >= 1) {
      cp.moveTo(p2[0], p2[1]);
      continue;
    }
    cp.lineTo(p1[0], p1[1]);
  }
  return [p, cp];
}

/**
 * Returns a new Cartesian plot.
 */
export function cplot(
  fn: string,
  domain: [number, number],
  range: [number, number]
) {
  return new CartesianPlot(fn, domain, range);
}

export function midpointOf(point1: [number, number], point2: [number, number]) {
  const [x1, x2] = point1;
  const [y1, y2] = point2;
  return tuple((x1 + x2) / 2, (y1 + y2) / 2);
}

export function linearSlope(
  point1: [number, number],
  point2: [number, number]
) {
  const [x1, y1] = point1;
  const [x2, y2] = point2;
  const rise = y2 - y1;
  const run = x2 - x1;
  return rise / run;
}

class Disc extends Path {
  $radius: number;
  _position: [number, number];
  constructor(radius: number, position: [number, number]) {
    super();
    this._position = position;
    this.$radius = radius;
    this._commands.push(
      M(this._position[0], this._position[1] + radius),
      A(1, 1, 0, 0, 1, this._position[0], this._position[1] - radius),
      A(1, 1, 0, 0, 1, this._position[0], this._position[1] + radius)
    );
  }

  get _cx() {
    return this._position[0];
  }
  get _cy() {
    return this._position[1];
  }

  radius(R: number) {
    this.$radius = R;
    return this;
  }

  position(x: number, y: number) {
    const radius = this.$radius;
    const r = radius / 2;
    this._commands = [
      M(x + r, y + r),
      A(1, 1, 0, 0, 1, x - r, y - r),
      A(1, 1, 0, 0, 1, x + r, y + r),
    ];
    return this;
  }
}

export function disc(radius: number, position: [number, number]) {
  return new Disc(radius, position);
}

export class PolarPlot2D extends Group {
  $f: string;
  $domain: [number, number];
  $range: [number, number];
  constructor(f: string) {
    super([]);
    this.$f = f;
    this.$domain = [-10, 10];
    this.$range = [-10, 10];
  }
  $cycles: number = 2 * Math.PI;
  cycles(n: number) {
    this.$cycles = n;
    return this;
  }
  radius(r: number) {
    if (r > 0) {
      this.$domain = [-r, r];
      this.$range = [-r, r];
    } else {
      console.warn("Invalid radius passed to PolarPlot2D; defaults applied.");
    }
    return this;
  }
  $axisColor: string = "initial";
  axisColor(color: string) {
    this.$axisColor = color;
    return this;
  }
  $compiledFunction: Fn | null = null;

  done() {
    const out: (MCommand | LCommand)[] = [];
    const e = engine();
    const fn = e.compile(this.$f);
    if (!(fn instanceof Fn)) {
      console.error(strof(fn));
      return this;
    }
    this.$compiledFunction = fn;
    const dataset: [number, number][] = [];
    for (let i = 0; i < this.$cycles; i += 0.01) {
      const r = this.$compiledFunction.call(e.compiler, [i]);
      if (typeof r !== "number") {
        continue;
      }
      const x = r * Math.cos(i);
      const y = r * Math.sin(i);
      dataset.push([x, y]);
    }
    let moved = false;
    for (let i = 0; i < dataset.length; i++) {
      const [x, y] = dataset[i];
      if (!Number.isNaN(y)) {
        if (!moved) {
          out.push(M(x, y));
          moved = true;
        } else {
          out.push(L(x, y));
        }
      } else {
        const next = dataset[i + 1];
        if (next !== undefined) {
          out.push(M(x, y));
        }
      }
    }

    const p = path();
    p.moveTo(out[0][1], out[0][2])
      .stroke(this.$stroke)
      .strokeWidth(this.$strokeWidth);

    for (let i = 1; i < out.length; i++) {
      p._commands.push(out[i]);
    }

    this.$children.push(p);

    return this;
  }

  $tickCount: number = 2.6;

  $stroke: string = "tomato";

  stroke(value: string) {
    this.$stroke = value;
    return this;
  }

  $strokeWidth: number = 1;

  strokeWidth(value: number) {
    this.$strokeWidth = value;
    return this;
  }
}

export function plotPolar(fn: string) {
  return new PolarPlot2D(fn);
}

export class PolarAxes extends Group {
  $domain: [number, number];
  constructor(domain: [number, number]) {
    super([]);
    this.$domain = domain;
  }
  $tickCount: number = 6;
  $axisColor: string = "grey";
  axisColor(value: string) {
    this.$axisColor = value;
    return this;
  }
  $axisOpacity: `${number}%` | number = 1;
  done() {
    const lineLabels: TextObj[] = [];
    for (let i = 1; i < this.$domain[1] * this.$tickCount; i++) {
      const c = disc(i, [0, 0])
        .fill("none")
        .stroke(this.$axisColor)
        .fillOpacity(this.$axisOpacity);
      const t = text(i)
        .position(0, i)
        .fill(this.$axisColor)
        .textAnchor("middle")
        .dy(-0.15);
      lineLabels.push(t);
      this.$children.push(c);
    }
    const lineCoords = range(0, 360, 45);
    const axes: LineObj[] = [];
    const k = this.$domain[1] + lineCoords.length - (this.$tickCount - 1);
    lineCoords.forEach((n) => {
      const x = Math.cos(toRadians(n)) * k;
      const y = Math.sin(toRadians(n)) * k;
      const L = line([0, 0], [x, y])
        .stroke(this.$axisColor)
        .strokeOpacity(this.$axisOpacity);
      axes.push(L);
    });
    axes.forEach((l) => this.$children.push(l));
    lineLabels.forEach((t) => this.$children.push(t));
    return this;
  }
}

export function polarAxes(domain: [number, number]) {
  return new PolarAxes(domain);
}

export type Triplet<T> = [T, T, T];

export type Fn3D = (x: number, y: number) => Triplet<number>;

export class Function3D {
  $zFn: string;

  $xDomain: [number, number];

  xDomain(interval: [number, number]) {
    this.$xDomain = interval;
    return this;
  }

  $yDomain: [number, number];

  yDomain(interval: [number, number]) {
    this.$yDomain = interval;
    return this;
  }

  get $xMin() {
    return this.$xDomain[0];
  }

  get $xMax() {
    return this.$xDomain[1];
  }

  get $yMin() {
    return this.$yDomain[0];
  }

  get $yMax() {
    return this.$yDomain[1];
  }

  get $xRange() {
    return this.$xMax - this.$xMin;
  }

  get $yRange() {
    return this.$yMax - this.$yMin;
  }

  constructor(
    zFn: string,
    xDomain: [number, number],
    yDomain: [number, number]
  ) {
    this.$zFn = zFn;
    this.$xDomain = xDomain;
    this.$yDomain = yDomain;
  }
  $compiledFunction: Fn3D = (a, b) => [a, b, 0];
  fn() {
    const e = engine();
    const f = e.compile(this.$zFn);
    if (!(f instanceof Fn)) {
      throw algebraError("f is not an instance of Fn");
    }
    this.$compiledFunction = (x: number, y: number) => {
      x = this.$xRange * x + this.$xMin;
      y = this.$yRange * y + this.$yMin;
      let z = f.call(e.compiler, [x, y]);
      if (typeof z !== "number") {
        z = NaN;
      }
      return tuple(x, y, z);
    };
    return this;
  }
}

/**
 * Returns a new Function3D.
 * @param fn - A string corresponding to the function.
 * E.g., `fn z(x,y) = x^2 + y^2`. The function must
 * be binary (taking two number arguments) and return a
 * single number.
 * @param xDomain - The domain of possible x-values. The
 * domain must be specified as a pair `[a,b]`, where `a`
 * is the smallest possible x-input and `b` is the largest.
 * @param yDomain - The domain of possible y-values. The domain
 * must be specified as a pair `[a,b]` where `a` is the smallest
 * possible y-input, and `b` is the largest.
 */
export function f3D(
  fn: string,
  xDomain: [number, number] = [-10, 10],
  yDomain: [number, number] = [-10, 10]
) {
  return new Function3D(fn, xDomain, yDomain);
}

/**
 * An object corresponding to a Plot3D specification.
 * This object is designed under the assumption that
 * ThreeJS will be used.
 */
export class Plot3D {
  $id: string | number = uid(10);

  id(value: string | number) {
    this.$id = value;
    return this;
  }

  $functions: (string | Function3D)[];

  constructor(fn: (string | Function3D)[]) {
    this.$functions = fn;
  }

  $segments: number = 40;

  segments(value: number) {
    this.$segments = value;
  }

  $fov: number = 50;

  fov(value: number) {
    this.$fov = value;
    return this;
  }

  $far: number = 30;

  far(value: number) {
    this.$far = value;
    return this;
  }

  $xDomain: [number, number] = [-10, 10];

  xDomain(interval: [number, number]) {
    this.$xDomain = interval;
    return this;
  }

  $yDomain: [number, number] = [-10, 10];

  yDomain(interval: [number, number]) {
    this.$yDomain = interval;
    return this;
  }

  /** The smallest possible x-value this plot can take. */
  get $xMin() {
    return this.$xDomain[0];
  }

  /** The largest possible x-value this plot can take. */
  get $xMax() {
    return this.$xDomain[1];
  }

  /** The smallest possible y-value this plot can take. */
  get $yMin() {
    return this.$yDomain[0];
  }

  /** The largest possible y-value this plot can take. */
  get $yMax() {
    return this.$yDomain[1];
  }

  /** The width of the x-domain ($xMax - $xMin). */
  get $xRange() {
    return this.$xMax - this.$xMin;
  }

  /** The width of the y-domain ($yMax - $yMin). */
  get $yRange() {
    return this.$yMax - this.$yMin;
  }

  $scale: number = 0.5;

  scale(value: number) {
    this.$scale = value;
    return this;
  }

  $gridColor: string = "lightgrey";

  gridColor(value: string) {
    this.$gridColor = value;
    return this;
  }

  _width: number = 200;

  width(value: number) {
    this._width = value;
    return this;
  }

  _height: number = 200;

  height(value: number) {
    this._height = value;
    return this;
  }

  $cameraPosition: Triplet<number> = [12, 12, 12];

  cameraPosition(value: Triplet<number>) {
    this.$cameraPosition = value;
    return this;
  }

  $near: number = 0.1;

  near(value: number) {
    this.$near = value;
    return this;
  }

  $compiledFunctions: Function3D[] = [];

  done() {
    for (let i = 0; i < this.$functions.length; i++) {
      const zfn = this.$functions[i];
      if (typeof zfn === "string") {
        const z = f3D(zfn, this.$xDomain, this.$yDomain).fn();
        this.$compiledFunctions.push(z);
      } else {
        this.$compiledFunctions.push(zfn.fn());
      }
    }
    return this;
  }
}

export function plot3D(zfn: string | string[]) {
  if (typeof zfn === "string") {
    return new Plot3D([zfn]);
  } else {
    return new Plot3D(zfn);
  }
}

class TNode {
  $thread: TreeChild | null = null;
  $parent: Fork | null = null;
  $children: TreeChild[] = [];
  $index: number = 0;
  $change: number = 0;
  $shift: number = 0;
  $leftMostSibling: TreeChild | null = null;
  $name: string | number;
  _dx: number = 0;
  _dy: number = 0;
  $id: string | number = uid(10);
  $commands: (MCommand | LCommand)[] = [];
  _labelDx: number = 0;
  labelDx(value: number) {
    this._labelDx = value;
    return this;
  }
  _labelDy: number = 0;
  labelDy(value: number) {
    this._labelDy = value;
    return this;
  }
  get _x() {
    return this.$commands[0][1];
  }
  get _y() {
    return this.$commands[0][2];
  }
  set _x(x: number) {
    this.$commands = [M(x, this._y)];
  }
  set _y(y: number) {
    this.$commands = [M(this._x, y)];
  }
  set $z(z: number) {
    this.$commands = [M(this._x, this._y)];
  }
  constructor(name: string | number, parent?: Fork) {
    this.$name = name;
    this.$parent = parent !== undefined ? parent : null;
    this.$commands = [M(0, 0)];
  }
  sketch(depth: number = 0) {
    this._x = -1;
    this._y = depth;
    this._dx = 0;
    this.$change = 0;
    this.$shift = 0;
    this.$thread = null;
    this.$leftMostSibling = null;
  }
  left(): TreeChild | null {
    if (this.$thread) {
      return this.$thread;
    } else if (this.$children.length) {
      return this.$children[0];
    } else {
      return null;
    }
  }
  right(): TreeChild | null {
    if (this.$thread) {
      return this.$thread;
    } else if (this.$children.length) {
      return this.$children[this.$children.length - 1];
    } else {
      return null;
    }
  }
  get $degree() {
    return this.$children.length;
  }
  get $hasNoChildren() {
    return this.$degree === 0;
  }
  get $hasChildren() {
    return !this.$hasNoChildren;
  }
  hasChild(id: string | number) {
    if (this.$hasNoChildren) return false;
    for (let i = 0; i < this.$degree; i++) {
      const child = this.$children[i];
      if (child.$id === id) {
        return true;
      }
    }
    return false;
  }
}

class Leaf extends TNode {
  $ancestor: TreeChild;
  constructor(name: string | number, parent?: Fork) {
    super(name, parent);
    this._x = -1;
    this.$ancestor = this;
  }
  get _height() {
    return 1;
  }
  onLastChild() {
    return this;
  }
  onFirstChild() {
    return this;
  }
  nodes() {
    return this;
  }
  child() {
    return this;
  }
  inorder() {
    return this;
  }
  preorder() {
    return this;
  }
  postorder() {
    return this;
  }
  bfs() {
    return this;
  }

  childOf(parent: Fork) {
    this.$parent = parent;
    this.$ancestor = parent.$ancestor;
    return this;
  }
}

export function leaf(name: string | number) {
  return new Leaf(name);
}

class Fork extends TNode {
  $ancestor: TreeChild;
  childOf(parent: Fork) {
    this.$parent = parent;
    this.$ancestor = parent.$ancestor;
    return this;
  }
  get _height() {
    let height = -Infinity;
    this.$children.forEach((c) => {
      const h = c._height;
      if (h > height) height = h;
    });
    return height + 1;
  }
  nodes(nodes: TreeChild[]) {
    nodes.forEach((node) => {
      node.$index = this.$degree;
      this.$children.push(node.childOf(this));
    });
    return this;
  }
  onLastChild(callback: (node: TreeChild) => void) {
    const c = this.$children[this.$children.length - 1];
    if (c) callback(c);
    return this;
  }
  onFirstChild(callback: (node: TreeChild) => void) {
    const c = this.$children[0];
    if (c) callback(c);
    return this;
  }
  child(child: TreeChild) {
    this.$children.push(child.childOf(this));
    return this;
  }
  inorder(f: (node: TreeChild, index: number) => void) {
    let i = 0;
    const t = (tree: TreeChild) => {
      const [left, right] = arraySplit(tree.$children);
      if (left.length) {
        left.forEach((c) => t(c));
      }
      f(tree, i++);
      if (right.length) {
        right.forEach((c) => t(c));
      }
    };
    t(this);
    return this;
  }
  preorder(f: (node: TreeChild, index: number) => void) {
    let i = 0;
    const t = (tree: TreeChild) => {
      const [left, right] = arraySplit(tree.$children);
      f(tree, i++);
      if (left.length) {
        left.forEach((c) => t(c));
      }
      if (right.length) {
        right.forEach((c) => t(c));
      }
    };
    t(this);
    return this;
  }
  postorder(f: (node: TreeChild, index: number) => void) {
    let i = 0;
    const t = (tree: TreeChild) => {
      const [left, right] = arraySplit(tree.$children);
      if (left.length) {
        left.forEach((c) => t(c));
      }
      if (right.length) {
        right.forEach((c) => t(c));
      }
      f(tree, i++);
    };
    t(this);
    return this;
  }
  bfs(f: (node: TreeChild, level: number) => void) {
    const queue = linkedList<TreeChild>(this);
    let count = queue.length;
    let level = 0;
    while (queue.length > 0) {
      const tree = queue.shift();
      count--;
      if (tree._tag === "None") continue;
      f(tree.value, level);
      tree.value.$children.forEach((c) => queue.push(c));
      if (count === 0) {
        level++;
        count = queue.length;
      }
    }
    queue.clear();
    return this;
  }
  constructor(name: string | number) {
    super(name);
    this.$ancestor = this;
  }
}

function isLeaf(x: unknown): x is Leaf {
  return x instanceof Leaf;
}

export function subtree(name: string | number) {
  return new Fork(name);
}

type TreeChild = Leaf | Fork;

type TreeLayout =
  | "knuth"
  | "wetherell-shannon"
  | "buccheim-unger-leipert"
  | "hv"
  | "reingold-tilford";

type Traversal = "preorder" | "inorder" | "postorder" | "bfs";

type LinkFunction = (line: LineObj, source: TNode, target: TNode) => LineObj;

class TreeObj extends Group {
  $tree: Fork;
  private lay() {
    // deno-fmt-ignore
    switch (this.$layout) {
      case "buccheim-unger-leipert":
        return this.buccheim();
      case "hv":
        return this.HV();
      case "knuth":
        return this.knuth();
      case "reingold-tilford":
        return this.reingoldTilford();
      case "wetherell-shannon":
        return this.wetherellShannon();
    }
  }
  $nodeRadius: number = 10;
  nodeRadius(value: number) {
    this.$nodeRadius = value;
    return this;
  }
  $nodeFill: string = "white";
  nodeFill(color: string) {
    this.$nodeFill = color;
    return this;
  }
  $nodeFn: ((node: TreeChild) => Renderable) | null = null;
  nodeFn(callback: (node: TreeChild) => Renderable) {
    this.$nodeFn = callback;
    return this;
  }
  $labelFn: ((node: TreeChild) => TextObj) | null = null;
  labelFn(callback: (node: TreeChild) => TextObj) {
    this.$labelFn = callback;
    return this;
  }
  $edgeColor: string = "black";
  edgeColor(color: string) {
    this.$edgeColor = color;
    return this;
  }
  $textColor: string = this.$edgeColor;
  textColor(color: string) {
    this.$textColor = color;
    return this;
  }
  done() {
    this.lay();
    this.$tree.bfs((node) => {
      const p = node.$parent;
      if (p) {
        const l = line([p._x, p._y], [node._x, node._y]);
        l.stroke(this.$edgeColor);
        this.$children.push(l);
      }
    });
    const nodes: Renderable[] = [];
    const labels: TextObj[] = [];
    this.$tree.bfs((node) => {
      if (this.$nodeFn) {
        nodes.push(this.$nodeFn(node));
      } else if (this.$nodeRadius) {
        const c = circle(this.$nodeRadius, [node._x, node._y])
          .fill(this.$nodeFill)
          .stroke(this.$edgeColor);
        nodes.push(c);
      }
      if (this.$labelFn) {
        labels.push(this.$labelFn(node));
      } else {
        const t = text(node.$name)
          .position(node._x, node._y)
          .textAnchor("middle")
          .fill(this.$textColor)
          .dx(node._labelDx)
          .dy(node._labelDy);
        labels.push(t);
      }
    });
    nodes.forEach((c) => this.$children.push(c));
    labels.forEach((t) => this.$children.push(t));
    return this;
  }
  constructor(tree: Fork) {
    super([]);
    this.$tree = tree;
  }
  $layout: TreeLayout = "knuth";
  layout(option: TreeLayout) {
    this.$layout = option;
    return this;
  }
  private $edgenotes: Partial<Record<Traversal, LinkFunction>> = {};
  edges(of: Traversal, callback: LinkFunction) {
    this.$edgenotes[of] = callback;
    return this;
  }
  nodes(nodes: TreeChild[]) {
    nodes.forEach((n) => this.$tree.child(n));
    return this;
  }
  private HV() {
    const largerToRight = (parent: TreeChild) => {
      const left = parent.left();
      const right = parent.right();
      if (left === null || right === null) return;
      const sh = 2;
      if (isLeaf(left) && isLeaf(right)) {
        right._x = parent._x + 1;
        right._y = parent._y;
        left._x = parent._x;
        left._y = parent._y - sh;
        parent._dx = 1;
      } else {
        const L = left.$degree;
        const R = right.$degree;
        if (L >= R) {
          left._x = parent._x + R + 1;
          left._y = parent._y;
          right._x = parent._x;
          right._y = parent._y - 2;
          parent._dx += left._x;
        } else if (L < R) {
          right._x = parent._x + L + 1;
          right._y = parent._y;
          left._x = parent._x;
          left._y = parent._y - sh;
          parent._dx += right._x;
        }
      }
      parent.$children.forEach((c) => largerToRight(c));
    };
    const xmin = this.$xMin;
    const ymax = this.$yMax;
    this.$tree._x = xmin;
    this.$tree._y = ymax;
    largerToRight(this.$tree);
    return this;
  }
  private buccheim() {
    const leftBrother = (self: TreeChild) => {
      let n = null;
      if (self.$parent) {
        for (const node of self.$parent.$children) {
          if (node.$id === self.$id) return n;
          else n = node;
        }
      }
      return n;
    };
    const get_lmost_sibling = (self: TreeChild) => {
      if (
        !self.$leftMostSibling &&
        self.$parent &&
        self.$id !== self.$parent.$children[0].$id
      ) {
        self.$leftMostSibling = self.$parent.$children[0];
        return self.$parent.$children[0];
      }
      return self.$leftMostSibling;
    };
    const movesubtree = (wl: TreeChild, wr: TreeChild, shift: number) => {
      const st = wr.$index - wl.$index;
      wr.$change -= shift / st;
      wr.$shift += shift;
      wl.$change += shift / st;
      wr._x += shift;
      wr._dx += shift;
    };
    const ancestor = (
      vil: TreeChild,
      v: TreeChild,
      default_ancestor: TreeChild
    ) => {
      if (v.$parent && v.$parent.hasChild(vil.$id)) {
        return vil.$ancestor;
      }
      return default_ancestor;
    };
    const apportion = (
      v: TreeChild,
      default_ancestor: TreeChild,
      distance: number
    ) => {
      const w = leftBrother(v);
      let vol = get_lmost_sibling(v);
      if (w !== null && vol !== null) {
        let vir = v;
        let vor = v;
        let vil = w;
        let sir = v._dx;
        let sor = v._dx;
        let sil = vil._dx;
        let sol = vol._dx;
        let VIL: TreeChild | null = vil;
        let VIR: TreeChild | null = vir;
        let VOL: TreeChild | null = vol;
        let VOR: TreeChild | null = vor;
        while (VIL?.right() && VIR?.left()) {
          VIL = vil.right();
          if (VIL) vil = VIL;
          VIR = vir.left();
          if (VIR) vir = VIR;
          VOL = vol.left();
          if (VOL) vol = VOL;
          VOR = vor.right();
          if (VOR) {
            vor = VOR;
            vor.$ancestor = v;
          }
          const shift = vil._x + sil - (vir._x + sir) + distance;
          if (shift > 0) {
            const a = ancestor(vil, v, default_ancestor);
            movesubtree(a, v, shift);
            sir = sir + shift;
            sor = sor + shift;
          }
          sil += vil._dx;
          sir += vir._dx;
          sol += vol._dx;
          sor += vor._dx;
        }
        if (vil.right() && !vor.right()) {
          vor.$thread = vil.right();
          vor._dx += sil - sor;
        } else {
          if (vir.left() && !vol.left()) {
            vol.$thread = vir.left();
            vol._dx += sir - sol;
          }
          default_ancestor = v;
        }
      }
      return default_ancestor;
    };
    const execShifts = (v: TreeChild) => {
      let shift = 0;
      let change = 0;
      for (const w of v.$children) {
        w._x += shift;
        w._dx += shift;
        change += w.$change;
        shift += w.$shift + change;
      }
    };
    const firstwalk = (v: TreeChild, distance: number = 1) => {
      if (v.$children.length === 0) {
        if (v.$leftMostSibling) {
          const lb = leftBrother(v);
          if (lb) v._x = lb._x + distance;
        } else v._x = 0;
      } else {
        let default_ancestor = v.$children[0];
        for (const w of v.$children) {
          firstwalk(w);
          default_ancestor = apportion(w, default_ancestor, distance);
        }
        execShifts(v);
        const L = v.$children[0];
        const R = v.$children[v.$children.length - 1];
        const midpoint = (L._x + R._x) / 2;
        const w = leftBrother(v);
        if (w) {
          v._x = w._x + distance;
          v._dx = v._x - midpoint;
        } else {
          v._x = midpoint;
        }
      }
      return v;
    };
    const secondwalk = (
      v: TreeChild,
      m: number = 0,
      depth: number = 0,
      min: number | null = null
    ): number => {
      v._x += m;
      v._y = -depth;
      if (min === null || v._x < min) {
        min = v._x;
      }
      for (const w of v.$children) {
        min = secondwalk(w, m + v._dx, depth + 1, min);
      }
      return min;
    };
    const thirdwalk = (tree: TreeChild, n: number) => {
      tree._x += n;
      for (const w of tree.$children) {
        thirdwalk(w, n);
      }
    };
    const buccheim = () => {
      this.$tree.sketch();
      firstwalk(this.$tree);
      const min = secondwalk(this.$tree);
      if (min < 0) {
        thirdwalk(this.$tree, -min);
      }
    };
    buccheim();
    buccheim();
    const x = this.$tree._x;
    const y = this.$tree._height / 2;
    this.$tree.bfs((n) => {
      n._x -= x;
      n._y += y;
    });
    return this;
  }
  private knuth() {
    this.$tree.bfs((node, level) => {
      const y = 0 - level;
      node._y = y;
    });
    this.$tree.inorder((node, index) => {
      node._x = index;
    });
    const x = this.$tree._x;
    this.$tree.bfs((node) => {
      node._x -= x;
    });
    return this;
  }
  private reingoldTilford() {
    const contour = (
      left: TreeChild,
      right: TreeChild,
      max_offset: number | null = null,
      left_offset: number = 0,
      right_offset: number = 0,
      left_outer: TreeChild | null = null,
      right_outer: TreeChild | null = null
    ): [
      TreeChild | null,
      TreeChild | null,
      number,
      number,
      number,
      TreeChild,
      TreeChild
    ] => {
      const delta = left._x + left_offset - (right._x + right_offset);
      if (max_offset === null || delta > max_offset) {
        max_offset = delta;
      }
      if (left_outer === null) left_outer = left;
      if (right_outer === null) right_outer = right;
      const lo = left_outer.left();
      const li = left.right();
      const ri = right.left();
      const ro = right_outer.right();
      if (li && ri) {
        left_offset += left._dx;
        right_offset += right._dx;
        return contour(li, ri, max_offset, left_offset, right_offset, lo, ro);
      }
      const out = tuple(
        li,
        ri,
        max_offset,
        left_offset,
        right_offset,
        left_outer,
        right_outer
      );
      return out;
    };
    const fixSubtrees = (left: TreeChild, right: TreeChild) => {
      // eslint-disable-next-line prefer-const
      let [li, ri, diff, loffset, roffset, lo, ro] = contour(left, right);
      diff += 1;
      diff += (right._x + diff + left._x) % 2;
      right._dx = diff;
      right._x += diff;
      if (right.$children.length) {
        roffset += diff;
      }
      if (ri && !li) {
        lo.$thread = ri;
        lo._dx = roffset - loffset;
      } else if (li && !ri) {
        ro.$thread = li;
        ro._dx = loffset - roffset;
      }
      const out = Math.floor((left._x + right._x) / 2);
      return out;
    };
    const addmods = (tree: TreeChild, mod: number = 0) => {
      tree._x += mod;
      tree.$children.forEach((c) => addmods(c, mod + tree._dx));
      return tree;
    };
    const setup = (tree: TreeChild, depth: number = 0) => {
      tree.sketch(-depth);
      if (tree.$children.length === 0) {
        tree._x = 0;
        return tree;
      }
      if (tree.$children.length === 1) {
        tree._x = setup(tree.$children[0], depth + 1)._x;
        return tree;
      }
      const left = setup(tree.$children[0], depth + 1);
      const right = setup(tree.$children[1], depth + 1);
      tree._x = fixSubtrees(left, right);
      return tree;
    };
    setup(this.$tree);
    addmods(this.$tree);
    const x = this.$tree._x;
    const y = this.$tree._height / 2;
    this.$tree.bfs((n) => {
      n._x -= x;
      n._y += y;
    });
    return this;
  }
  private wetherellShannon() {
    const lay = (
      tree: TreeChild,
      depth: number,
      nexts: number[] = [0],
      offsets: number[] = [0]
    ) => {
      tree.$children.forEach((c) => {
        lay(c, depth + 1, nexts, offsets);
      });
      tree._y = -depth;
      if (isNothing(nexts[depth])) {
        nexts[depth] = 0;
      }
      if (isNothing(offsets[depth])) {
        offsets[depth] = 0;
      }
      let x = nexts[depth];
      if (tree.$degree === 0) {
        x = nexts[depth];
      } else if (tree.$degree === 1) {
        x = tree.$children[0]._x + 1;
      } else {
        let lx = 0;
        tree.onFirstChild((n) => {
          lx = n._x;
        });
        let rx = 0;
        tree.onLastChild((n) => {
          rx = n._x;
        });
        const xpos = lx + rx;
        x = xpos / 2;
      }
      offsets[depth] = max(offsets[depth], nexts[depth] - x);
      if (tree.$degree === 0) {
        const d = x + offsets[depth];
        tree._x = d;
      } else {
        tree._x = x;
      }
      nexts[depth] += 2;
      tree._dx = offsets[depth];
    };
    const addDxs = (tree: TreeChild, sum: number = 0) => {
      tree._x = tree._x + sum;
      sum += tree._dx;
      tree.$children.forEach((c) => addDxs(c, sum));
    };
    lay(this.$tree, 0);
    addDxs(this.$tree);
    const x = this.$tree._x;
    this.$tree.bfs((n) => {
      n._x -= x;
    });
    return this;
  }
}

export function tree(t: Fork) {
  return new TreeObj(t);
}

type EdgeType = "--" | "-->";

class Vertex<T = any> {
  $id: string;
  $data: T | null;
  constructor(id: string | number, data: T | null = null) {
    this.$id = `${id}`;
    this.$data = data;
  }
  copy() {
    const out = new Vertex(this.$id, this.$data);
    return out;
  }
  data(data: T) {
    const out = this.copy();
    out.$data = data;
    return out;
  }
  id(value: string | number) {
    const out = this.copy();
    out.$id = `${value}`;
    return out;
  }
}

export function vertex<T>(id: string | number, data: T | null = null) {
  return new Vertex(id, data);
}

class Edge<T = any, K = any> {
  $source: Vertex<T>;
  $target: Vertex<T>;
  $direction: EdgeType;
  $id: string;
  $meta: K | null;
  constructor(
    source: Vertex<T>,
    target: Vertex<T>,
    direction: EdgeType,
    meta: K | null = null
  ) {
    this.$source = source;
    this.$target = target;
    this.$direction = direction;
    this.$id = `${source.$id}${direction}${target.$id}`;
    this.$meta = meta;
  }
  /**
   * Returns true if this edge is equivalent to the other
   * edge. Where:
   *
   * - 𝑆₁ is the source id of this edge,
   * - 𝑆₂ is the source id of the other edge,
   * - 𝑇₁ is the target id of this edge, and
   * - 𝑇₂ is the target id of the other edge,
   *
   * the equivalence relation is defined as follows:
   * 1. If the edges are of different directions (`--` and `->` or vice versa), the
   *    edges are not equivalent.
   * 2. If the edges are both directed (`--`), the edges are equivalent
   *    only if:
   *    ~~~
   *    (𝑆₁ = 𝑆₂) AND (𝑇₁ = 𝑇₂).
   *    ~~~
   * 3. If the edges are undirected, the edges are equivalent only if:
   *    ~~~
   *    ((𝑆₁ = 𝑆₂) AND (𝑇₁ = 𝑇₂))  OR  ((𝑆₁ = 𝑇₂) AND (𝑇₁ = 𝑆₂))
   *    ~~~
   * @example
   * ~~~
   * // a and b are equivalent since they’re undirected:
   * // 1--2 and 2--1
   * const a = edge(1,2)
   * const b = edge(2,1)
   *
   * // c and d are equivalent since 1->2 and 1->2.
   * // e is not equivalent to either since it’s the directed
   * // edge 2->1
   * const c = link(1,2)
   * const d = link(1,2)
   * const e = link(2,1)
   * ~~~
   */
  isEquivalent(other: Edge) {
    const s1 = this.$source.$id;
    const t1 = this.$target.$id;
    const s2 = other.$source.$id;
    const t2 = other.$target.$id;
    if (this.$direction === "-->" && other.$direction === "-->") {
      return s1 === s2 && t1 === t2;
    }
    if (this.$direction === "--" && other.$direction === "--") {
      return (s1 === s2 && t1 === t2) || (s1 === t2 && t1 === s2);
    }
    return false;
  }

  reverse() {
    const out = new Edge(this.$target, this.$source, this.$direction);
    out.$meta = this.$meta;
    out.$id = `${this.$target.$id}${this.$direction}${this.$source.$id}`;
    return out;
  }

  metamap<X>(callback: (metadata: K) => X) {
    const metadata = this.$meta;
    if (metadata === null) {
      return this as any as Edge<T, X>;
    }
    const m = callback(metadata);
    return new Edge(this.$source, this.$target, this.$direction, m);
  }

  get isUndirected() {
    return this.$direction === "--";
  }
  get isDirected() {
    return this.$direction === "-->";
  }
  get revid() {
    return `${this.$target.$id}${this.$direction}${this.$source.$id}`;
  }
  copy() {
    const out = new Edge(this.$source, this.$target, this.$direction);
    return out;
  }
  undirected() {
    if (!this.isDirected) return this;
    return new Edge(this.$source, this.$target, "--", this.$meta);
  }
  direct() {
    if (this.isDirected) return this;
    return new Edge(this.$source, this.$target, "-->", this.$meta);
  }
}

export function edge(
  source: string | number | Vertex,
  target: string | number | Vertex
) {
  return new Edge(
    typeof source === "string" || typeof source === "number"
      ? vertex(source)
      : source,
    typeof target === "string" || typeof target === "number"
      ? vertex(target)
      : target,
    "--"
  );
}

export function link(
  source: string | number | Vertex,
  target: string | number | Vertex
) {
  return new Edge(
    typeof source === "string" || typeof source === "number"
      ? vertex(source)
      : source,
    typeof target === "string" || typeof target === "number"
      ? vertex(target)
      : target,
    "-->"
  );
}

class Graph<T = any, K = any> {
  /** The adjacency list comprising this graph. */
  $adjacency: Map<string | number, Vertex<T>[]>;
  /**
   * A map of the vertices comprising this graph.
   * Each key is a vertex id, and its mapped-to value is
   * the vertex with that id.
   */
  $vertices: Map<string | number, Vertex<T>>;
  /**
   * A map of the edges comprising this graph.
   * Each key is an edge id, and its mapped-to value
   * is the edge with that id.
   */
  $edges: Map<string, Edge<T, K>>;
  constructor() {
    this.$adjacency = new Map();
    this.$vertices = new Map();
    this.$edges = new Map();
  }

  /** Returns all the neighbors of the given vertex. */
  neighbors(vertex: Vertex) {
    const out: Vertex[] = [];
    this.$edges.forEach((e) => {
      if (e.$source.$id === vertex.$id) out.push(e.$target);
      else if (e.$target.$id === vertex.$id) out.push(e.$source);
    });
    return out;
  }

  /**
   * Returns true if given source (referred to by id)
   * is adjacent to the given target (by id).
   * The edge type must be provided to ensure
   * a correct result.
   */
  adjacent(
    sourceId: string | number,
    direction: EdgeType,
    targetId: string | number
  ) {
    // st: "source to target"
    const st = `${sourceId}${direction}${targetId}`;
    // ts: target to source
    const ts = `${targetId}${direction}${sourceId}`;
    return this.$edges.has(st) || this.$edges.has(ts);
  }

  /** Returns the degree of the given vertex (referred to by id). */
  deg(id: string | number) {
    let degree = 0;
    this.$edges.forEach((e) => {
      const sourceId = e.$source.$id;
      if (sourceId === id) {
        degree++;
      }
    });
    return degree;
  }

  /** Returns all the edges of this graph as an array. */
  edgeList() {
    const out: Edge[] = [];
    this.$edges.forEach((e) => {
      out.push(e);
    });
    return out;
  }

  /** Returns all the vertices of this graph as an array. */
  vertexList() {
    const out: Vertex[] = [];
    this.$vertices.forEach((v) => {
      out.push(v);
    });
    return out;
  }

  /** Returns true if this graph contains the given vertex (referred to by id). Otherwise, returns false. */
  hasVertex(vertexID: string | number): boolean {
    return this.$adjacency.has(vertexID);
  }

  /** Appends the given vertex, alongside its data, to this graph. */
  vertex<T>(value: string | number | Vertex, data: T | null = null) {
    const v =
      typeof value === "string" || typeof value === "number"
        ? vertex(value, data)
        : value;
    if (!this.hasVertex(v.$id)) {
      this.$adjacency.set(v.$id, []);
    }
    this.$vertices.set(v.$id, v);
    return v;
  }

  /** Appends the given edge to this graph. */
  E(edge: Edge) {
    const source = this.vertex(edge.$source);
    const target = this.vertex(edge.$target);
    this.$adjacency.get(source.$id)!.push(this.$vertices.get(target.$id)!);
    this.$adjacency.get(target.$id)!.push(this.$vertices.get(source.$id)!);
    this.$edges.set(edge.$id, edge);
    const rev = edge.reverse();
    this.$edges.set(rev.$id, rev);
    return this;
  }

  /** Creates a new edge from the given `sourceID` and `targetID`, then appends the resulting edge to this graph. */
  edge(sourceID: string | number | Vertex, targetID: string | number | Vertex) {
    const E = edge(sourceID, targetID);
    this.E(E);
    return this;
  }
}

/** Returns a new graph. */
export function graph(adjacencyList?: Record<string, (string | number)[]>) {
  const G = new Graph();
  if (adjacencyList) {
    Object.keys(adjacencyList).forEach((source) => {
      const targets = adjacencyList[source];
      const src = vertex(source);
      targets.forEach((target) => {
        const tar = vertex(target);
        const e = edge(src, tar);
        G.E(e);
      });
    });
  }
  return G;
}

class Particle {
  /** The particle’s position vector. */
  $p: Vector;

  /** The particle’s velocity vector. */
  $v: Vector = v2D(0, 0);

  /** The particle’s force vector. */
  $f: Vector = v2D(0, 0);

  /** The particle’s unique identifier. */
  $id: string | number;

  /** The particle’s radius. */
  $r: number = 3;
  constructor(id: string | number, position: Vector) {
    this.$p = position;
    this.$id = id;
  }
}

/** Returns a new particle. */
function pt(id: string | number, position: Vector) {
  return new Particle(id, position);
}

class ForceGraph extends Group {
  private $particles: Map<string | number, Particle>;
  private $graph: Graph;
  $iterations: number = 100;
  iterations(x: number) {
    this.$iterations = x;
    return this;
  }
  $epsilon: number = 0.5;
  epsilon(e: number) {
    this.$epsilon = e;
    return this;
  }
  $stable: boolean = false;
  $repulsion: number = 35;
  repulsion(n: number) {
    this.$repulsion = n;
    return this;
  }
  $attraction: number = 0.1;
  attraction(n: number) {
    this.$attraction = n;
    return this;
  }
  $decay: number = 0.3;
  decay(n: number) {
    this.$decay = n;
    return this;
  }
  $children: Renderable[] = [];
  constructor(graph: Graph) {
    super([]);
    this.$graph = graph;
    this.$particles = new Map();
  }

  private forEachPt(callback: (particle: Particle) => void) {
    this.$particles.forEach((p) => callback(p));
  }

  $domain: [number, number] = [-10, 10];
  domain(interval: [number, number]) {
    this.$domain = interval;
    return this;
  }
  $range: [number, number] = [-10, 10];
  range(interval: [number, number]) {
    this.$range = interval;
    return this;
  }
  private layout() {
    const MIN_X = this.$domain[0];
    const MAX_X = this.$domain[1];
    const MIN_Y = this.$range[0];
    const MAX_Y = this.$range[1];
    for (let i = 0; i < this.$iterations; i++) {
      this.iterate(MIN_X, MAX_X, MIN_Y, MAX_Y);
      if (this.$stable) break;
    }
  }

  private iterate(MIN_X: number, MAX_X: number, MIN_Y: number, MAX_Y: number) {
    const rsq = (v: Vector, u: Vector) =>
      (v._x - u._x) ** 2 + (v._y - u._y) ** 2;
    this.forEachPt((v) => {
      v.$f = v2D(0, 0);
      this.forEachPt((u) => {
        if (v.$id !== u.$id) {
          let d2 = rsq(v.$p, u.$p);
          if (d2 === 0) d2 = 0.001;
          const c = this.$repulsion / d2;
          const f = v.$p.sub(u.$p).mul(c);
          v.$f = v.$f.add(f);
        }
      });
    });
    this.$graph.$edges.forEach((e) => {
      const u = this.$particles.get(e.$source.$id);
      const v = this.$particles.get(e.$target.$id);
      if (u && v) {
        const f = u.$p.sub(v.$p).mul(this.$attraction);
        v.$f = v.$f.add(f);
      }
    });
    let displacement = 0;
    this.forEachPt((v) => {
      v.$v = v.$v.add(v.$f).mul(this.$decay);
      displacement += Math.abs(v.$v._x) + Math.abs(v.$v._y);
      v.$p = v.$p.add(v.$v);
      v.$p._x = clamp(MIN_X, v.$p._x, MAX_X);
      v.$p._y = clamp(MIN_Y, v.$p._y, MAX_Y);
    });
    this.$stable = displacement < this.$epsilon;
  }

  /** Sets the initial position of all particles. By default, particles are initially placed randomly. */
  scatter() {
    this.$graph.$vertices.forEach((v) => {
      const x = randInt(-2, 2);
      const y = randInt(-2, 2);
      this.$particles.set(v.$id, pt(v.$id, v2D(x, y)));
    });
  }

  $styles: {
    $nodes: Partial<{
      fill: string;
      radius: number;
      fontColor: string;
      fontSize: number;
      fontFamily: string;
      fontStyle: string;
    }>;
    $edges: Partial<{ stroke: string }>;
  } = {
    $nodes: { fill: "white", radius: 5 },
    $edges: { stroke: "grey" },
  };

  get $nodeFontFamily() {
    return this.$styles.$nodes.fontFamily ?? "inherit";
  }
  nodeFontFamily(font: string) {
    this.$styles.$nodes.fontFamily = font;
    return this;
  }

  get $nodeFontStyle() {
    return this.$styles.$nodes.fontStyle ?? "italic";
  }

  nodeFontStyle(style: string) {
    this.$styles.$nodes.fontStyle = style;
    return this;
  }

  get $nodeFontSize() {
    return this.$styles.$nodes.fontSize ?? 12;
  }
  nodeFontSize(fontSize: number) {
    this.$styles.$nodes.fontSize = fontSize;
    return this;
  }

  get $nodeFontColor() {
    return this.$styles.$nodes.fontColor ?? "inherit";
  }

  nodeFontColor(color: string) {
    this.$styles.$nodes.fontColor = color;
    return this;
  }

  get $nodeRadius() {
    return this.$styles.$nodes.radius ? this.$styles.$nodes.radius : 5;
  }

  get $nodeColor() {
    return this.$styles.$nodes.fill ? this.$styles.$nodes.fill : "white";
  }

  get $edgeColor() {
    return this.$styles.$edges.stroke ?? "grey";
  }

  edgeColor(color: string) {
    this.$styles.$edges.stroke = color;
    return this;
  }

  /** Sets the radius for all nodes in this graph. */
  nodeRadius(r: number) {
    this.$styles.$nodes.radius = r;
    return this;
  }

  /** Sets the color for all nodes in this graph. */
  nodeColor(value: string) {
    this.$styles.$nodes.fill = value;
    return this;
  }

  /**
   * Begins drawing the force graph.
   */
  done() {
    this.scatter();
    this.layout();
    const ids = new Set<string>();
    this.$graph.$edges.forEach((e) => {
      const source = this.$particles.get(e.$source.$id);
      const target = this.$particles.get(e.$target.$id);
      if (source && target && !ids.has(e.$id)) {
        const x1 = source.$p._x;
        const y1 = source.$p._y;
        const x2 = target.$p._x;
        const y2 = target.$p._y;
        const l = line([x1, y1], [x2, y2]).stroke(this.$edgeColor);
        if (e.isDirected) {
          l.arrowEnd();
        }
        this.$children.push(l);
      }
      ids.add(e.$id);
      ids.add(e.revid);
    });
    this.$particles.forEach((p) => {
      const t = p.$id;
      const c = circle(this.$nodeRadius, [p.$p._x, p.$p._y]).fill(
        this.$nodeColor
      );
      this.$children.push(c);
      const label = text(t)
        .position(p.$p._x, p.$p._y + p.$r)
        .fontFamily(this.$nodeFontFamily)
        .fontStyle(this.$nodeFontStyle)
        .fontSize(this.$nodeFontSize)
        .fill(this.$nodeFontColor);
      this.$children.push(label);
    });
    return this;
  }
}

/** Returns a new force layout graph. */
export function forceGraph(graph: Graph) {
  return new ForceGraph(graph);
}

// Beginning of Cartography Module
export namespace GeoJSON {
  /**
   * The valid values for the "type" property of GeoJSON geometry objects.
   * https://tools.ietf.org/html/rfc7946#section-1.4
   */
  export type GeoJSONGeometryTypes = Geometry["type"];

  /**
   * The value values for the "type" property of GeoJSON Objects.
   * https://tools.ietf.org/html/rfc7946#section-1.4
   */
  export type GeoJSONTypes = GeoJSON["type"];

  /**
   * Bounding box
   * https://tools.ietf.org/html/rfc7946#section-5
   */
  export type BBox =
    | [number, number, number, number]
    | [number, number, number, number, number, number];

  /**
   * A Position is an array of coordinates.
   * https://tools.ietf.org/html/rfc7946#section-3.1.1
   * Array should contain between two and three elements.
   * The previous GeoJSON specification allowed more elements (e.g., which could be used to represent M values),
   * but the current specification only allows X, Y, and (optionally) Z to be defined.
   */
  export type Position = number[]; // [number, number] | [number, number, number];

  /**
   * The base GeoJSON object.
   * https://tools.ietf.org/html/rfc7946#section-3
   * The GeoJSON specification also allows foreign members
   * (https://tools.ietf.org/html/rfc7946#section-6.1)
   * Developers should use "&" type in TypeScript or extend the interface
   * to add these foreign members.
   */
  export interface GeoJSONObject {
    // Don't include foreign members directly into this type def.
    // in order to preserve type safety.
    // [key: string]: any;
    /**
     * Specifies the type of GeoJSON object.
     */
    type: GeoJSONTypes;
    /**
     * Bounding box of the coordinate range of the object's Geometries, Features, or Feature Collections.
     * The value of the bbox member is an array of length 2*n where n is the number of dimensions
     * represented in the contained geometries, with all axes of the most southwesterly point
     * followed by all axes of the more northeasterly point.
     * The axes order of a bbox follows the axes order of geometries.
     * https://tools.ietf.org/html/rfc7946#section-5
     */
    bbox?: BBox | undefined;
  }

  /**
   * Union of GeoJSON objects.
   */
  export type GeoJSON<
    G extends Geometry | null = Geometry,
    P = GeoJsonProperties
  > = G | Feature<G, P> | FeatureCollection<G, P>;

  /**
   * Geometry object.
   * https://tools.ietf.org/html/rfc7946#section-3
   */
  export type Geometry =
    | Point
    | MultiPoint
    | LineString
    | MultiLineString
    | Polygon
    | MultiPolygon
    | GeometryCollection;

  export type GeometryObject = Geometry;

  /**
   * Point geometry object.
   * https://tools.ietf.org/html/rfc7946#section-3.1.2
   */
  export interface Point extends GeoJSONObject {
    type: "Point";
    coordinates: Position;
  }

  /**
   * MultiPoint geometry object.
   *  https://tools.ietf.org/html/rfc7946#section-3.1.3
   */
  export interface MultiPoint extends GeoJSONObject {
    type: "MultiPoint";
    coordinates: Position[];
  }

  /**
   * LineString geometry object.
   * https://tools.ietf.org/html/rfc7946#section-3.1.4
   */
  export interface LineString extends GeoJSONObject {
    type: "LineString";
    coordinates: Position[];
  }

  /**
   * MultiLineString geometry object.
   * https://tools.ietf.org/html/rfc7946#section-3.1.5
   */
  export interface MultiLineString extends GeoJSONObject {
    type: "MultiLineString";
    coordinates: Position[][];
  }

  /**
   * Polygon geometry object.
   * https://tools.ietf.org/html/rfc7946#section-3.1.6
   */
  export interface Polygon extends GeoJSONObject {
    type: "Polygon";
    coordinates: Position[][];
  }

  /**
   * MultiPolygon geometry object.
   * https://tools.ietf.org/html/rfc7946#section-3.1.7
   */
  export interface MultiPolygon extends GeoJSONObject {
    type: "MultiPolygon";
    coordinates: Position[][][];
  }

  /**
   * Geometry Collection
   * https://tools.ietf.org/html/rfc7946#section-3.1.8
   */
  export interface GeometryCollection<G extends Geometry = Geometry>
    extends GeoJSONObject {
    type: "GeometryCollection";
    geometries: G[];
  }

  export type GeoJsonProperties = { [name: string]: any } | null;

  /**
   * A feature object which contains a geometry and associated properties.
   * https://tools.ietf.org/html/rfc7946#section-3.2
   */
  export interface Feature<
    G extends Geometry | null = Geometry,
    P = GeoJsonProperties
  > extends GeoJSONObject {
    type: "Feature";
    /**
     * The feature's geometry
     */
    geometry: G;
    /**
     * A value that uniquely identifies this feature in a
     * https://tools.ietf.org/html/rfc7946#section-3.2.
     */
    id?: string | number | undefined;
    /**
     * Properties associated with this feature.
     */
    properties: P;
  }

  /**
   * A collection of feature objects.
   *  https://tools.ietf.org/html/rfc7946#section-3.3
   */
  export interface FeatureCollection<
    G extends Geometry | null = Geometry,
    P = GeoJsonProperties
  > extends GeoJSONObject {
    type: "FeatureCollection";
    features: Array<Feature<G, P>>;
  }
}

export class QuadGrid extends Group {
  _rowCount: number;
  _columnCount: number;
  _startingCoordinate: [number, number];
  _quadWidth: number = 1;
  quadWidth(value: number) {
    this._quadWidth = value;
    return this;
  }
  _quadHeight: number = 1;
  quadHeight(value: number) {
    this._quadHeight = value;
    return this;
  }
  _quadFn:
    | ((quad: Path, rowIndex: number, columnIndex: number) => Path)
    | null = null;

  quadFn(
    callback: (quad: Path, rowIndex: number, columnIndex: number) => Path
  ) {
    this._quadFn = callback;
    return this;
  }

  _gridFn: ((rowIndex: number, colIndex: number) => Renderable) | null = null;
  gridFn(callback: (rowIndex: number, colIndex: number) => Renderable) {
    this._gridFn = callback;
    return this;
  }
  constructor(
    rowCount: number,
    columnCount: number,
    startingCoordinate: [number, number]
  ) {
    super([]);
    this._rowCount = rowCount;
    this._columnCount = columnCount;
    this._startingCoordinate = startingCoordinate;
  }
  done() {
    const out: Renderable[][] = [];
    const initX = this._startingCoordinate[0];
    let [x, y] = this._startingCoordinate;
    for (let row = 0; row < this._rowCount; row++) {
      out.push([]);
      for (let col = 0; col < this._columnCount; col++) {
        let q = quad([x, y], this._quadWidth, this._quadHeight);
        if (this._quadFn) {
          q = this._quadFn(q, row, col);
        }
        out[row].push(q);
        if (this._gridFn) {
          out[row].push(this._gridFn(row, col));
        }
        x += this._quadWidth;
      }
      x = initX;
      y -= this._quadHeight;
    }
    return out.flat();
  }
}

export function quadGrid(
  rowCount: number,
  columnCount: number,
  startingCoordinate: [number, number]
) {
  return new QuadGrid(rowCount, columnCount, startingCoordinate);
}

/** A value native to Winnow. */
type Primitive =
  | number
  | string
  | null
  | boolean
  | bigint
  | Exponential
  | MathObj
  | Fraction
  | Obj
  | Vector
  | Matrix
  | LinkedList<Primitive>
  | Primitive[]
  | Fn
  | Class
  | Err;

// § Token Types

enum token_type {
  // Utility tokens
  end,
  error,
  empty,
  // Paired Delimiters
  left_paren,
  right_paren,
  left_brace,
  right_brace,
  left_bracket,
  right_bracket,
  // Single Delimiters
  semicolon,
  colon,
  dot,
  comma,
  // Operator Delimiters
  plus,
  minus,
  star,
  slash,
  caret,
  percent,
  bang,
  ampersand,
  tilde,
  vbar,
  equal,
  less,
  greater,
  less_equal,
  greater_equal,
  bang_equal,
  equal_equal,
  plus_plus,
  minus_minus,
  star_star,
  // Vector Operators
  dot_add,
  dot_star,
  dot_minus,
  dot_caret,
  at,
  // Matrix Operators
  pound_plus, // '#+'
  pound_minus, // '#-
  pound_star, // '#*'
  // Literals
  integer,
  float,
  fraction,
  scientific,
  big_integer,
  symbol,
  string,
  boolean,
  nan,
  inf,
  nil,
  numeric_constant,
  // Keyword Tokens
  and,
  or,
  not,
  nand,
  xor,
  xnor,
  nor,
  if,
  else,
  fn,
  let,
  var,
  return,
  while,
  for,
  class,
  print,
  super,
  this,
  rem,
  mod,
  div,
  native,
  // algebra strings
  algebra_string,
  // structures
  list,
}

// § Token Object

/** An object corresponding to a token in Winnow. */
class Token<
  T extends token_type = token_type,
  L extends Primitive = Primitive
> {
  /** This token's type. */
  $type: T;

  /** This tokene's lexeme. */
  $lexeme: string;

  /** This token's literal value, if any (defaults to null). */
  $literal: L = null as any;

  /** The line where this token was first encountered. */
  $line: number;

  constructor(type: T, lexeme: string, line: number) {
    this.$type = type;
    this.$lexeme = lexeme;
    this.$line = line;
  }

  /** Returns a copy of this token. */
  copy() {
    return new Token(this.$type, this.$lexeme, this.$line);
  }

  /**
   * Returns a copy of this token with a new token type.
   * @param tokenType The new token type.
   * @returns A copy of this token with the given token type.
   */
  withType<X extends token_type>(tokenType: X) {
    const out = this.copy();
    out.$type = tokenType as any;
    return out as any as Token<X, L>;
  }

  /**
   * Returns a copy of this token with a new lexeme.
   * @param lexeme The new lexeme, a string value.
   * @returns A copy of this token with the given string as its lexeme.
   */
  withLexeme(lexeme: string) {
    const out = this.copy();
    out.$lexeme = lexeme;
    return out;
  }

  /**
   * Returns a copy of this token with a new literal value.
   * @param primitive The new literal value, a Primitive.
   * @returns A copy of this token with the given literal as its literal.
   */
  withLiteral<L2 extends Primitive>(primitive: L2) {
    const out = this.copy();
    out.$literal = primitive;
    return out as any as Token<T, L2>;
  }

  /**
   * Returns a copy of this token with a new line number.
   * @param line The new line number.
   * @returns A copy of this token with the given line as its line number.
   */
  withLine(line: number) {
    const out = this.copy();
    out.$line = line;
    return out;
  }

  /**
   * Returns true, and asserts, if this token
   * is of the given type `K`.
   */
  isType<K extends T>(type: K): this is Token<K> {
    return this.$type === type;
  }

  /**
   * Returns true if this token is an error token.
   * If this token is an error token, then there must
   * be an accompanying Err object in its $literal
   * field.
   */
  isErrorToken(): this is Token<token_type.error, Err> {
    return this.$type === token_type.error;
  }

  /**
   * Returns true if this token is a number token.
   * If this token is a number token, then there
   * must be an accompanying JavaScript literal number
   * (either a float or an int).
   */
  isNumber(): this is Token<T, number> {
    return typeof this.$literal === "number";
  }

  /** Returns true, and asserts, if this token is a number constant token. */
  isNumConst(): this is Token<T, number> {
    return (
      typeof this.$literal === "number" &&
      this.$type === token_type.numeric_constant
    );
  }

  /**
   * Returns true if and only if this token is a
   * right-delimiter token. That is, either a `)`,
   * `]`, or `}`.
   * @returns a boolean
   */
  isRightDelimiter() {
    return (
      this.$type === token_type.right_paren ||
      this.$type === token_type.right_brace ||
      this.$type === token_type.right_bracket
    );
  }

  /** The empty token, used as a placeholder. */
  static empty: Token<token_type, any> = new Token(token_type.empty, "", -1);

  /** The end token, marking the end of input. */
  static end: Token<token_type, any> = new Token(token_type.end, "END", -1);

  /** Returns a string form of this token. */
  toString() {
    return `{token: ${token_type[this.$type]}, lexeme: ${this.$lexeme}, line: ${
      this.$line
    }, literal: ${this.$literal}}`;
  }
}

/**
 * Returns a new Winnow token.
 * @param type The new token's type.
 * @param lexeme The new token's lexeme.
 * @param line The line where this token was first encountered.
 * @param column The column where this token was first encountered.
 * @returns A new instance of Token.
 */
function token<X extends token_type>(
  type: X,
  lexeme: string,
  line: number
): Token<X> {
  return new Token(type, lexeme, line);
}

// § Native Function Types
type NativeAlgebraicOp = "subexs" | "simplify";

type NativeUnary =
  | "ceil"
  | "floor"
  | "sin"
  | "cos"
  | "cosh"
  | "tan"
  | "lg"
  | "ln"
  | "log"
  | "arcsin"
  | "arccos"
  | "arcsinh"
  | "arctan"
  | "sinh"
  | "sqrt"
  | "tanh"
  | "gcd"
  | "avg"
  | "arccosh";

/** A native function that takes more than 1 argument. */
type NativePolyAry = "max" | "min";

type NativeFn = NativeUnary | NativePolyAry | NativeAlgebraicOp;

type NativeConstants =
  | "e"
  | "pi"
  | "ln2"
  | "ln10"
  | "log10e"
  | "log2e"
  | "sqrt2";

// § Lexical

export function lexical(code: string) {
  /**
   * A variable corresponding to the
   * current line the scanner's on.
   */
  let $line: number = 1;

  /**
   * A pointer to the first character
   * of the lexeme currently being
   * scanned.
   */
  let $start: number = 0;

  /**
   * A pointer to the character currently
   * being scanned.
   */
  let $current: number = 0;

  /**
   * Error indicator defaulting to null.
   * If initialized, then the scanning will cease.
   */
  let $error: null | Err = null;

  /**
   * Returns true if the scanner has reached the end
   * of code.
   */
  const atEnd = (): boolean => $current >= code.length || $error !== null;

  /**
   * Consumes and returns the next character
   * in the code.
   */
  const tick = (): string => code[$current++];

  /**
   * Returns the code substring from $start to $current.
   */
  const slice = (): string => code.slice($start, $current);

  /**
   * Returns a new token.
   * @param type The token type.
   * @param lexeme The token's lexeme.
   * @returns A new Token.
   */
  const tkn = (type: token_type, lexeme: string = ""): Token => {
    lexeme = lexeme ? lexeme : slice();
    return token(type, lexeme, $line);
  };

  /**
   * Returns an error token. If called, sets the
   * mutable $error variable, causing scanning to
   * cease.
   * @param message The error message to accompany
   * the Err object.
   * @returns A new Token of type token_type.ERROR.
   */
  const errorToken = (message: string): Token<token_type.error, Err> => {
    $error = lexicalError(message, $line);
    return token(token_type.error, "", $line).withLiteral($error);
  };

  /**
   * Returns the current character being scanned WITHOUT
   * moving the scanner forward.
   * @returns A 1-character string.
   */
  const peek = (): string => (atEnd() ? "" : code[$current]);

  /**
   * Returns the character just ahead of the current character
   * WITHOUT moving the scanner forward.
   * @returns A 1-character string.
   */
  const peekNext = (): string => (atEnd() ? "" : code[$current + 1]);

  /**
   * Returns the character `by` places
   * ahead of the current character
   * WITHOUT moving the scanner forward.
   * @param by The number of places to look ahead.
   * @returns A 1-character string.
   */
  const lookup = (by: number): string => (atEnd() ? "" : code[$current + by]);

  /**
   * If the provided expected string
   * matches, increments $current (moving
   * the scanner forward) and returns true.
   * Otherwise returns false without increment (
   * scanner doesn't move forward).
   * @param expectedChar A 1-character string corresponding
   * to the expected character.
   * @returns A boolean.
   */
  const match = (expectedChar: string): boolean => {
    if (atEnd()) return false;
    if (code[$current] !== expectedChar) return false;
    $current++;
    return true;
  };

  /**
   * Returns true if the current peek (the character
   * pointed at by `$current`) matches the provided
   * number. Otherwise, returns false.
   * @param char A 1-char string corresponding
   * to the expected character.
   * @returns A boolean.
   */
  const peekIs = (char: string): boolean => peek() === char;

  /**
   * Consumes all whitespace while moving
   * the scanner's `$current` pointer
   * forward.
   * @returns Nothing.
   */
  const skipWhitespace = (): void => {
    while (!atEnd()) {
      const char: string = peek();
      switch (char) {
        case " ":
        case "\r":
        case "\t":
          tick();
          break;
        case "\n":
          $line++;
          tick();
          break;
        default:
          return;
      }
    }
  };

  /**
   * Returns true if the given character is a Latin or
   * Greek character, false otherwise.
   * @param char A 1-character string.
   * @returns A boolean.
   */
  const isLatinGreekChar = (char: string): boolean =>
    /^[a-zA-Z_$\u00C0-\u02AF\u0370-\u03FF\u2100-\u214F]$/.test(char);

  /**
   * Returns true if the given character is a Unicode
   * math symbol, false otherwise.
   * @param char A 1-character string.
   * @returns A boolean.
   */
  const isMathSymbol = (char: string): boolean => /^[∀-⋿]/u.test(char);

  /**
   * Returns true if the given character is a valid
   * character to the start of a name, false
   * otherwise.
   * @param char A 1-char string.
   * @returns A boolean.
   */
  const isValidNameChar = (char: string) =>
    isLatinGreekChar(char) || isMathSymbol(char);

  /**
   * Returns true if the given `char` is a digit.
   * @param char A 1-char string.
   * @returns A boolean.
   */
  const isDigit = (char: string) => "0" <= char && char <= "9";

  /** Dictionary of keywords to tokens. */
  const dictionary: Record<string, () => Token> = {
    this: () => tkn(token_type.this),
    super: () => tkn(token_type.super),
    class: () => tkn(token_type.class),
    false: () => tkn(token_type.boolean).withLiteral(false),
    true: () => tkn(token_type.boolean).withLiteral(true),
    NaN: () => tkn(token_type.nan).withLiteral(NaN),
    Inf: () => tkn(token_type.inf).withLiteral(Infinity),
    return: () => tkn(token_type.return),
    while: () => tkn(token_type.while),
    for: () => tkn(token_type.for),
    let: () => tkn(token_type.let),
    var: () => tkn(token_type.var),
    fn: () => tkn(token_type.fn),
    if: () => tkn(token_type.if),
    else: () => tkn(token_type.else),
    print: () => tkn(token_type.print),
    rem: () => tkn(token_type.rem),
    mod: () => tkn(token_type.mod),
    div: () => tkn(token_type.div),
    nil: () => tkn(token_type.nil),
    and: () => tkn(token_type.and),
    or: () => tkn(token_type.or),
    nor: () => tkn(token_type.nor),
    xor: () => tkn(token_type.xor),
    xnor: () => tkn(token_type.xnor),
    not: () => tkn(token_type.not),
    nand: () => tkn(token_type.nand),
    list: () => tkn(token_type.list),
  };

  const numConsts: Record<NativeConstants, () => Token> = {
    e: () => tkn(token_type.numeric_constant).withLiteral(Math.E),
    pi: () => tkn(token_type.numeric_constant).withLiteral(Math.PI),
    ln10: () => tkn(token_type.numeric_constant).withLiteral(Math.LN10),
    ln2: () => tkn(token_type.numeric_constant).withLiteral(Math.LN2),
    log10e: () => tkn(token_type.numeric_constant).withLiteral(Math.LOG10E),
    log2e: () => tkn(token_type.numeric_constant).withLiteral(Math.LOG2E),
    sqrt2: () => tkn(token_type.numeric_constant).withLiteral(Math.SQRT2),
  };

  /**
   * Record of native functions. Each key corresponds
   * to the native function name. The number mapped to
   * by the key is the function’s arity (the number
   * of arguments the function takes).
   */
  const nativeFunctions: Record<NativeFn, number> = {
    simplify: 1,
    subexs: 1,
    avg: 1,
    gcd: 1,
    sqrt: 1,
    ceil: 1,
    tanh: 1,
    floor: 1,
    sinh: 1,
    cosh: 1,
    sin: 1,
    cos: 1,
    tan: 1,
    lg: 1,
    ln: 1,
    log: 1,
    arctan: 1,
    arccos: 1,
    arccosh: 1,
    arcsin: 1,
    arcsinh: 1,
    max: 1,
    min: 1,
  };

  /** Generates a word token. */
  const wordToken = () => {
    while ((isValidNameChar(peek()) || isDigit(peek())) && !atEnd()) {
      tick();
    }
    const word = slice();
    const native = nativeFunctions[word as NativeFn];
    if (native) {
      return tkn(token_type.native);
    } else if (dictionary[word]) {
      return dictionary[word]();
    } else if (numConsts[word as NativeConstants]) {
      return numConsts[word as NativeConstants]();
    } else {
      return tkn(token_type.symbol);
    }
  };

  const isHexDigit = (char: string) =>
    ("0" <= char && char <= "9") ||
    ("a" <= char && char <= "f") ||
    ("A" <= char && char <= "F");

  const isOctalDigit = (char: string) => "0" <= char && char <= "7";

  /**
   * Scans and returns a BIG_NUMBER token.
   * @returns A Token of type BIG_NUMBER.
   */
  const bigNumberToken = () => {
    while (isDigit(peek()) && !atEnd()) tick();
    const n = slice().replace("#", "");
    return tkn(token_type.big_integer).withLiteral(BigInt(n));
  };

  /**
   * Scans a binary number token.
   * @returns A Token of type INTEGER.
   */
  const binaryNumberToken = () => {
    if (!(peekIs("0") || peekIs("1"))) {
      return errorToken(`Expected binary digits after “0b”`);
    }
    while ((peekIs("0") || peekIs("1")) && !atEnd()) {
      tick();
    }
    const numberString = slice().replace("0b", "");
    const integerValue = Number.parseInt(numberString, 2);
    return tkn(token_type.integer).withLiteral(integerValue);
  };

  /**
   * Scans an octal number token.
   * @returns A Token of type INTEGER.
   */
  const octalNumberToken = () => {
    if (!isOctalDigit(peek())) {
      return errorToken("Expected octal digits after");
    }
    while (isOctalDigit(peek()) && !atEnd()) {
      tick();
    }
    const numberString = slice().replace("0o", "");
    const integerValue = Number.parseInt(numberString, 8);
    return tkn(token_type.integer).withLiteral(integerValue);
  };

  /**
   * Scans a hexadecimal number token.
   * @returns A Token of type INTEGER.
   */
  const hexNumberToken = () => {
    if (!isHexDigit(peek())) {
      return errorToken("Expected hexadecimals after 0x");
    }
    while (isHexDigit(peek()) && !atEnd()) {
      tick();
    }
    const numberString = slice().replace("0x", "");
    const integerValue = Number.parseInt(numberString, 16);
    return tkn(token_type.integer).withLiteral(integerValue);
  };

  /** Generates number token. */
  const numTkn = (
    numberString: string,
    type: NumberTokenType,
    hasSeparators: boolean
  ) => {
    const n = hasSeparators ? numberString.replaceAll("_", "") : numberString;
    switch (type) {
      // handle integers
      case token_type.integer: {
        const num = Number.parseInt(n);
        if (num > Number.MAX_SAFE_INTEGER) {
          return errorToken(
            `Encountered an integer overflow. Consider rewriting “${numberString}” as a bignumber: “#${numberString}”. If “${numberString}” is to be used symbolically, consider rewriting “${numberString}” as a scientific number.`
          );
        } else {
          return tkn(type).withLiteral(num);
        }
      }
      // handle floats
      case token_type.float: {
        const num = Number.parseFloat(n);
        if (num > Number.MAX_VALUE) {
          return errorToken(
            `Encountered a floating point overflow. Consider rewriting "${n}" as a fraction or bigfraction. If "${n}" is to be used symbolically, consider rewriting "${n}" as a scientific number.`
          );
        } else {
          return tkn(type).withLiteral(num);
        }
      }
      // handle fractions
      case token_type.fraction: {
        const [a, b] = n.split("|");
        const N = Number.parseInt(a);
        const D = Number.parseInt(b);
        return tkn(type).withLiteral(frac(N, D));
      }
      // handle scientific numbers
      case token_type.scientific: {
        const [a, b] = n.split("E");
        const base = Number.parseFloat(a);
        const exponent = Number.parseInt(b);
        return tkn(type).withLiteral(expo(base, exponent));
      }
    }
    return errorToken(`Unrecognized number: "${n}".`);
  };

  const numberToken = (initialType: NumberTokenType): Token => {
    let type = initialType;
    let hasSeparators = false;
    while (isDigit(peek()) && !atEnd()) {
      tick();
    }

    // handle number with separators
    if (peekIs("_") && isDigit(peekNext())) {
      tick(); // eat the '_'
      hasSeparators = true;
      let digits = 0;
      while (isDigit(peek()) && !atEnd()) {
        tick();
        digits++;
        if (peekIs("_") && isDigit(peekNext())) {
          if (digits === 3) {
            tick();
            digits = 0;
          } else {
            return errorToken(
              'Expected 3 ASCII digits after the separator "_"'
            );
          }
        }
      }
      // there must be 3 ASCII digits after the "_"
      if (digits !== 3) {
        return errorToken('Expected 3 ASCII digits after the separator "_"');
      }
    }

    // handle floating point numbers
    if (peekIs(".") && isDigit(peekNext())) {
      tick();
      type = token_type.float;
      while (isDigit(peek()) && !atEnd()) {
        tick();
      }
    }

    // handle fractions
    if (peekIs("|")) {
      if (type !== token_type.integer) {
        return errorToken('Expected an integer before "|"');
      }
      type = token_type.fraction;
      tick();
      while (isDigit(peek()) && !atEnd()) {
        tick();
      }
      return numTkn(slice(), type, hasSeparators);
    }

    if (peekIs("E")) {
      if (isDigit(peekNext())) {
        type = token_type.scientific;
        tick();
        while (isDigit(peek())) tick();
      } else if (
        (peekNext() === "+" || peekNext() === "-") &&
        isDigit(lookup(2))
      ) {
        type = token_type.scientific;
        tick();
        tick();
        while (isDigit(peek())) tick();
      }
    }
    return numTkn(slice(), type, hasSeparators);
  };

  /**
   * Scans for a string token.
   * @returns A Token.
   */
  const stringToken = () => {
    while (peek() !== '"' && !atEnd()) {
      if (peek() === "\n") {
        $line++;
      }
      tick();
    }
    if (atEnd()) return errorToken("Unterminated string");
    tick();
    const lex = slice().slice(1, -1);
    return tkn(token_type.string, lex);
  };

  const algebraStringToken = () => {
    while (peek() !== `'` && !atEnd()) {
      if (peek() === `\n`) {
        $line++;
      }
      tick();
    }
    if (atEnd()) {
      return errorToken(`Unterminated algebraic string`);
    }
    tick(); // eat the ':'
    const s = slice().replaceAll(`'`, "");
    return tkn(token_type.algebra_string).withLiteral(s);
  };

  const scan = (): Token => {
    // Start by skipping whitespace.
    skipWhitespace();

    // Set the $start and $current pointers
    // to the same characters.
    $start = $current;

    // If we've reached the end of the source code,
    // immediately return an END token.
    if (atEnd()) return tkn(token_type.end, "END");

    // Now get the current character and move the
    // scanner forward.
    const char = tick();

    // If the character is a valid name starter (a Latin
    // or Greek character, a unicode math symbol,
    // an underscore, or a `$`), returns a word token.
    if (isValidNameChar(char)) return wordToken();

    // If the character is '#' then we have either
    // a BIG_NUMBER token, or a matrix operator.
    if (char === "#") {
      if (isDigit(peek())) {
        return bigNumberToken();
      } else if (match("+")) {
        return tkn(token_type.pound_plus);
      } else if (match("-")) {
        return tkn(token_type.pound_minus);
      } else if (match("*")) {
        return tkn(token_type.pound_star);
      } else {
        return errorToken('Expected digits after "#".');
      }
    }
    // If the character is a digit, then we have
    // a number token.
    if (isDigit(char)) {
      if (char === "0" && match("b")) {
        return binaryNumberToken();
      } else if (char === "0" && match("o")) {
        return octalNumberToken();
      } else if (char === "0" && match("x")) {
        return hexNumberToken();
      } else {
        return numberToken(token_type.integer);
      }
    }
    switch (char) {
      case "@":
        return tkn(token_type.at);
      case ":":
        return tkn(token_type.colon);
      case "&":
        return tkn(token_type.ampersand);
      case "~":
        return tkn(token_type.tilde);
      case "|":
        return tkn(token_type.vbar);
      case "(":
        return tkn(token_type.left_paren);
      case ")":
        return tkn(token_type.right_paren);
      case "[":
        return tkn(token_type.left_bracket);
      case "]":
        return tkn(token_type.right_bracket);
      case "{":
        return tkn(token_type.left_brace);
      case "}":
        return tkn(token_type.right_brace);
      case ",":
        return tkn(token_type.comma);
      case "*":
        return tkn(token_type.star);
      case ";":
        return tkn(token_type.semicolon);
      case "%":
        return tkn(token_type.percent);
      case "/":
        return tkn(token_type.slash);
      case "^":
        return tkn(token_type.caret);
      case "!":
        return tkn(match("=") ? token_type.bang_equal : token_type.bang);
      case "<":
        return tkn(match("=") ? token_type.less_equal : token_type.less);
      case ">":
        return tkn(match("=") ? token_type.greater_equal : token_type.greater);
      case '"':
        return stringToken();
      case "+":
        return tkn(match("+") ? token_type.plus_plus : token_type.plus);
      case "'":
        return algebraStringToken();
      // Special handling of dot for vector operators.
      case ".": {
        if (match("+")) {
          return tkn(token_type.dot_add);
        } else if (match("-")) {
          return tkn(token_type.dot_minus);
        } else if (match("*")) {
          return tkn(token_type.dot_star);
        } else if (match("^")) {
          return tkn(token_type.dot_caret);
        } else {
          return tkn(token_type.dot);
        }
      }

      // Special handling of dash for inline comments.
      case "-": {
        if (peek() === "-" && peekNext() === "-") {
          while (peek() !== "\n" && !atEnd()) {
            tick();
          }
          return Token.empty;
        } else {
          return tkn(match("-") ? token_type.minus_minus : token_type.minus);
        }
      }

      // special handling of '=' for block comments.
      case "=": {
        if (peek() === "=" && peekNext() === "=") {
          while (peek() === "=") tick();
          while (!atEnd()) {
            tick();
            if (peek() === "=" && peekNext() === "=" && lookup(2) === "=") {
              break;
            }
          }
          if (atEnd()) {
            return errorToken("Unterminated block comment");
          }
          while (peek() === "=") tick();
          return Token.empty;
        } else {
          return tkn(match("=") ? token_type.equal_equal : token_type.equal);
        }
      }
    }
    return errorToken(`Unknown token: ${char}`);
  };

  const stream = () => {
    const out: Token[] = [];
    let prev = Token.empty;
    let now = scan();
    if (!now.isType(token_type.empty)) {
      out.push(now);
    } else if ($error !== null) {
      return left($error);
    }
    let peek = scan();
    if ($error !== null) {
      return left($error);
    }
    while (!atEnd()) {
      prev = now;
      now = peek;
      const k = scan();
      if ($error !== null) {
        return left($error);
      }
      if (k.isType(token_type.empty)) {
        continue;
      } else {
        peek = k;
      }
      // remove trailing commas
      if (
        prev.isRightDelimiter() &&
        now.isType(token_type.comma) &&
        peek.isRightDelimiter()
      ) {
        continue;
      }
      out.push(now);
    }
    out.push(peek);
    return right(out);
  };

  return { stream, scan, atEnd };
}

// § Array Operators

// The following functions are used to
// handle arrays. These functions are
// used extensively in the CAS modules,
// so any changes to them should be
// handled with care.

/**
 * Given the array of elements `list` and an element
 * `x`, returns a copy of `list` with `x` as the
 * first element.
 */
function cons<T>(list: T[], x: T) {
  return [x, ...list];
}

/**
 * Given the array of elements, returns a copy
 * of the array without the first element.
 */
function cdr<T>(array: T[]) {
  if (array.length === 0) {
    return [];
  } else {
    return array.slice(1);
  }
}

/**
 * Given the array of elements, returns a copy
 * of the array with the elements reversed.
 */
function reverse<T>(list: T[]) {
  return [...list].reverse();
}

/**
 * An enum of flags corresponding to expression
 * types for MathObjs. This enum is used to
 * check whether a given MathObj is of a
 * particular type.
 */
enum expression_type {
  complex,
  relation,
  list,
  int,
  float64,
  fraction,
  boolean,
  symbol,
  sum,
  difference,
  product,
  quotient,
  power,
  function,
  call,
  undefined,
  infinity,
  equation,
}

/**
 * The binding power of a given operator.
 * Values of type `bp` are used the parsers
 * to determinate operator precedence.
 */
enum bp {
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

/**
 * An object corresponding to a
 * mathematical expression.
 */
abstract class MathObj {
  isSimplified: boolean = false;
  abstract precedence(): bp;
  abstract operands(): MathObj[];
  abstract operandAt(i: number): MathObj;
  markSimplified() {
    this.isSimplified = true;
    return this;
  }
  parenLevel: number = 0;
  parend() {
    this.parenLevel++;
    return this;
  }
  abstract copy(): MathObj;
  abstract kind(): expression_type;
  abstract equals(other: MathObj): boolean;
  abstract toString(): string;
  abstract strung(): string;
  abstract map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): MathObj;
}

/**
 * Returns true, and asserts, if a given
 * object `u` is a MathObj.
 */
function isMathObj(u: any): u is MathObj {
  return u instanceof MathObj;
}

/**
 * An object corresponding to the
 * global symbol Undefined.
 */
class Undefined extends MathObj {
  precedence(): bp {
    return bp.atom;
  }
  copy(): Undefined {
    return UNDEFINED();
  }
  strung(): string {
    return this.toString();
  }
  operandAt(): MathObj {
    return UNDEFINED();
  }
  operands(): MathObj[] {
    return [];
  }
  kind(): expression_type {
    return expression_type.undefined;
  }
  equals(other: MathObj): boolean {
    return isUndefined(other);
  }
  toString(): string {
    return this.sym;
  }
  map(): this {
    return this;
  }
  sym: "UNDEFINED";
  error: string = "";
  setError(value: string) {
    this.error = value;
    return this;
  }
  constructor() {
    super();
    this.sym = "UNDEFINED";
  }
}

/**
 * Returns a new Undefined
 * symbol.
 */
function UNDEFINED() {
  return new Undefined();
}

/**
 * Returns true, and type-asserts, if the given
 * MathObj `u` is the global symbol `Undefined`.
 */
function isUndefined(u: MathObj): u is Undefined {
  return u.kind() === expression_type.undefined;
}

/**
 * The operators recognized as relation operators
 * in symbolic strings. Note that the `=` sign in
 * a symbolic string is seen as a relation operator
 * rather than assignment, since assignment is handled
 * by the Praxis interpreter.
 */
type RelationOperator = "=" | "<" | ">" | "<=" | ">=" | "!=";

/**
 * Given two lists of MathObjs `a` and `b`, returns
 * true if `a` and `b` are equal to one another.
 */
function argsEqual(a: MathObj[], b: MathObj[]) {
  if (a.length !== b.length) return false;
  if (a.length === 1 && b.length === 1) return a[0].equals(b[0]);
  if (a.length === 0 && b.length === 0) return true;
  if (a.length === 0) return false;
  if (b.length === 0) return false;
  if (a[0].equals(b[0])) return argsEqual(cdr(a), cdr(b));
  return false;
}

/** An object corresponding to a list of MathObjs. */
class ListX extends MathObj {
  $args: MathObj[];
  constructor(args: MathObj[]) {
    super();
    this.$args = args;
  }
  precedence(): bp {
    return bp.atom;
  }
  copy(): ListX {
    return listx(this.$args.map((x) => x.copy()));
  }
  operands(): MathObj[] {
    return this.$args;
  }
  operandAt(i: number): MathObj {
    const out = this.$args[i];
    if (out !== undefined) {
      return out;
    }
    return UNDEFINED();
  }
  kind(): expression_type {
    return expression_type.list;
  }
  equals(other: MathObj): boolean {
    if (other instanceof ListX) {
      if (other.$args.length !== this.$args.length) {
        return false;
      }
      for (let i = 0; i < this.$args.length; i++) {
        const a = this.$args[i];
        const b = other.$args[i];
        if (!a.equals(b)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
  toString(): string {
    const args = this.$args.map((a) => a.toString()).join(", ");
    return `[${args}]`;
  }
  strung(): string {
    return this.toString();
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): ListX {
    return new ListX(this.$args.map(callbackfn));
  }
  cdr() {
    const newargs = cdr(this.$args);
    return new ListX(newargs);
  }
  cons(element: MathObj) {
    const newargs = [element, ...this.$args];
    return new ListX(newargs);
  }
  reverse() {
    const newargs = this.$args.slice().reverse();
    return new ListX(newargs);
  }
  has(element: MathObj) {
    for (let i = 0; i < this.$args.length; i++) {
      const x = this.$args[i];
      if (x.equals(element)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Returns a new list of MathObjs.
 */
function listx(expressions: MathObj[]) {
  return new ListX(expressions);
}

/**
 * An object corresponding to a relation
 * expression.
 */
class Relation extends MathObj {
  precedence(): bp {
    return bp.rel;
  }
  copy(): Relation {
    const argscopy = this.args.map((x) => x.copy());
    return relate(this.op, argscopy);
  }
  operandAt(i: number): MathObj {
    const out = this.args[i];
    if (out === undefined) {
      return UNDEFINED();
    }
    return out;
  }
  operands(): MathObj[] {
    return this.args;
  }
  kind(): expression_type {
    return expression_type.relation;
  }
  toString(): string {
    const out = this.args.map((arg) => arg.toString()).join(` ${this.op} `);
    return this.parenLevel ? `(${out})` : out;
  }
  strung(): string {
    return `(${this.toString()})`;
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): this {
    this.args = this.args.map(callbackfn);
    return this;
  }
  op: RelationOperator;
  args: MathObj[];
  equals(other: MathObj): boolean {
    if (!isRelation(other)) {
      return false;
    } else {
      return argsEqual(this.args, other.args);
    }
  }
  constructor(op: RelationOperator, args: MathObj[]) {
    super();
    this.op = op;
    this.args = args;
  }
}

/**
 * Returns a new MathObj relation expression.
 */
function relate(op: RelationOperator, args: MathObj[]) {
  return new Relation(op, args);
}

/**
 * Returns true, and type-asserts, if the given
 * MathObj `u` is a Relation expression.
 */
function isRelation(u: MathObj): u is Relation {
  return u.kind() === expression_type.relation;
}

class Equation extends MathObj {
  precedence(): bp {
    return bp.eq;
  }
  operands(): MathObj[] {
    return this.args.map((x) => x.copy());
  }
  operandAt(i: number): MathObj {
    const out = this.args[i];
    if (out === undefined) {
      return UNDEFINED();
    }
    return out;
  }
  copy(): MathObj {
    const [a, b] = this.args.map((x) => x.copy());
    return equation(a, b);
  }
  kind(): expression_type {
    return expression_type.equation;
  }
  equals(other: MathObj): boolean {
    if (!isEquation(other)) {
      return false;
    } else {
      return argsEqual(this.args, other.args);
    }
  }
  toString(): string {
    return `${this.left.toString()} = ${this.right.toString()}`;
  }
  strung(): string {
    return `${this.left.toString()} = ${this.right.toString()}`;
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): MathObj {
    this.args = this.args.map(callbackfn) as any as [MathObj, MathObj];
    return this;
  }
  args: [MathObj, MathObj];
  op: "=";
  constructor(left: MathObj, right: MathObj) {
    super();
    this.args = [left, right];
    this.op = "=";
  }
  get left() {
    return this.args[0];
  }
  get right() {
    return this.args[1];
  }
}

export function equation(left: MathObj, right: MathObj) {
  return new Equation(left, right);
}

export function isEquation(u: MathObj): u is Equation {
  return u.kind() === expression_type.equation;
}

class Boolean extends MathObj {
  precedence(): bp {
    return bp.atom;
  }
  copy(): Boolean {
    return bool(this.bool);
  }
  strung(): string {
    return this.toString();
  }
  operandAt(): MathObj {
    return UNDEFINED();
  }
  operands(): MathObj[] {
    return [];
  }
  kind(): expression_type {
    return expression_type.boolean;
  }
  equals(other: MathObj): boolean {
    if (!isBool(other)) {
      return false;
    } else {
      return other.bool === this.bool;
    }
  }
  toString(): string {
    return `${this.bool}`;
  }
  map(): this {
    return this;
  }
  bool: boolean;
  constructor(value: boolean) {
    super();
    this.bool = value;
  }
}

function bool(value: boolean) {
  return new Boolean(value);
}

function isBool(u: MathObj): u is Boolean {
  return u.kind() === expression_type.boolean;
}

abstract class Numeric extends MathObj {
  abstract negate(): Numeric;
  abstract abs(): Numeric;
}

abstract class Real extends Numeric {
  abstract value(): number;
  isZero() {
    return this.value() === 0;
  }
}

class Int extends Real {
  toFrac() {
    const n = int(this.int);
    const d = int(1);
    return frac(n, d);
  }
  precedence(): bp {
    return bp.atom;
  }
  copy(): Int {
    return int(this.int);
  }
  abs() {
    return int(Math.abs(this.value()));
  }
  strung(): string {
    return this.toString();
  }
  operandAt(): MathObj {
    return UNDEFINED();
  }
  negate(): Int {
    return int(-this.int);
  }
  operands(): MathObj[] {
    return [];
  }
  value(): number {
    return this.int;
  }
  kind(): expression_type {
    return expression_type.int;
  }
  rational() {
    return frac(this, int(1));
  }
  equals(other: MathObj): boolean {
    if (!isInt(other)) {
      return false;
    } else {
      return this.int === other.int;
    }
  }
  toString(): string {
    return `${this.int}`;
  }
  map(): this {
    return this;
  }
  int: number;
  constructor(int: number) {
    super();
    this.int = int;
  }
  get denominator() {
    return int(1);
  }
  get numerator() {
    return int(this.int);
  }
}

function int(value: number) {
  return new Int(value);
}

function isInt(u: MathObj): u is Int {
  return u.kind() === expression_type.int;
}

class Float64 extends Real {
  precedence(): bp {
    return bp.atom;
  }
  copy(): Float64 {
    return float64(this.float);
  }
  abs(): Real {
    return float64(Math.abs(this.float));
  }
  strung(): string {
    return this.toString();
  }
  operandAt(): MathObj {
    return UNDEFINED();
  }
  negate(): Real {
    return float64(-this.float);
  }
  operands(): MathObj[] {
    return [];
  }
  value(): number {
    return this.float;
  }
  kind(): expression_type {
    return expression_type.float64;
  }
  equals(other: MathObj): boolean {
    if (!isFloat64(other)) {
      return false;
    } else {
      return this.float === other.float;
    }
  }
  toString(): string {
    return `${this.float}`;
  }
  map(): this {
    return this;
  }
  float: number;
  constructor(value: number) {
    super();
    this.float = value;
  }
}

function float64(value: number) {
  return new Float64(value);
}

function isFloat64(u: MathObj): u is Float64 {
  return u.kind() === expression_type.float64;
}

class Fraction extends Real {
  precedence(): bp {
    return bp.atom;
  }
  copy(): Fraction {
    const n = this.numerator.copy();
    const d = this.denominator.copy();
    return frac(n, d);
  }
  /** Returns the given number as a fraction. */
  static from(value: number | Fraction) {
    // We use the method of continued fractions here.
    if (value instanceof Fraction) {
      return value;
    } else if (Number.isInteger(value)) {
      return new Fraction(int(value), int(1));
    } else {
      const [h, k] = fracOf(value);
      return new Fraction(int(h), int(k));
    }
  }
  abs() {
    return frac(this.numerator.abs(), this.denominator.abs());
  }
  strung(): string {
    return this.toString();
  }
  operandAt(): MathObj {
    return UNDEFINED();
  }
  operands(): MathObj[] {
    return [];
  }
  /** Simplifies the given fraction. */
  static simplify(frac: Fraction) {
    const numerator = frac.numerator.int;
    const denominator = frac.denominator.int;
    const sgn = Math.sign(numerator) * Math.sign(denominator);
    const n = Math.abs(numerator);
    const d = Math.abs(denominator);
    const f = gcd(n, d);
    return new Fraction(int((sgn * n) / f), int(d / f));
  }

  value() {
    return this.numerator.int / this.denominator.int;
  }

  kind(): expression_type {
    return expression_type.fraction;
  }

  negate() {
    return frac(int(-this.numerator.int), this.denominator);
  }

  times(other: Fraction) {
    return Fraction.simplify(
      frac(
        int(other.numerator.int * this.numerator.int),
        int(other.denominator.int * this.denominator.int)
      )
    );
  }

  divide(other: Fraction) {
    return Fraction.simplify(
      frac(
        int(other.numerator.int * this.denominator.int),
        int(this.numerator.int * other.denominator.int)
      )
    );
  }

  plus(other: Fraction) {
    return Fraction.simplify(
      frac(
        int(
          this.numerator.int * other.denominator.int +
            other.numerator.int * this.denominator.int
        ),
        int(this.denominator.int * other.denominator.int)
      )
    );
  }

  minus(other: Fraction) {
    return Fraction.simplify(
      frac(
        int(
          this.numerator.int * other.denominator.int -
            other.numerator.int * this.denominator.int
        ),
        int(this.denominator.int * other.denominator.int)
      )
    );
  }

  lte(other: Fraction) {
    const thisN = this.numerator.int;
    const thisD = this.denominator.int;
    const otherN = other.numerator.int;
    const otherD = other.denominator.int;
    return thisN * otherD <= otherN * thisD;
  }

  lt(other: Fraction) {
    return this.lte(other) && !this.equals(other);
  }

  gt(other: Fraction) {
    return !this.lte(other);
  }

  gte(other: Fraction) {
    return this.gt(other) || this.equals(other);
  }

  equals(other: MathObj): boolean {
    if (!isFrac(other)) {
      return false;
    } else {
      const a = Fraction.simplify(this);
      const b = Fraction.simplify(other);
      return (
        a.numerator.int === b.numerator.int &&
        a.denominator.int === b.denominator.int
      );
    }
  }
  toString(): string {
    return `${this.numerator.int}|${this.denominator.int}`;
  }
  map(): this {
    return this;
  }
  float64() {
    return float64(this.numerator.int / this.denominator.int);
  }
  public readonly numerator: Int;
  public readonly denominator: Int;
  constructor(numerator: Int, denominator: Int) {
    super();
    this.numerator = numerator;
    this.denominator = denominator;
  }
  rational() {
    return this;
  }
}

/**
 * Given the number value, returns a pair [h,k] where
 * h corresponds to the numerator of a fraction and k
 * corresponds to the denominator. An optional epsilon
 * may be passed to set how exact the fraction should
 * be. A small epsilon will result in more exact fractions,
 * but at the cost of computation speed.
 */
export function fracOf(value: number, epsilon: number = 1.0e-15) {
  let x = value;
  let a = Math.floor(x);
  let h1 = 1;
  let h2: number;
  let k1 = 0;
  let k2: number;
  let h = a;
  let k = 1;

  while (x - a > epsilon * k * k) {
    x = 1 / (x - a);
    a = Math.floor(x);
    h2 = h1;
    h1 = h;
    k2 = k1;
    k1 = k;
    h = h2 + a * h1;
    k = k2 + a * k1;
  }
  return tuple(h, k);
}

function frac(n: Int | number, d: Int | number) {
  n = typeof n === "number" ? int(n) : n;
  d = typeof d === "number" ? int(d) : d;
  const N = Math.floor(n.int);
  const D = Math.abs(Math.floor(d.int));
  if (n.int < 0 && d.int < 0) {
    return new Fraction(int(Math.abs(N)), int(Math.abs(D)));
  } else if (n.int < 0 && d.int > 0) {
    return new Fraction(int(N), int(D));
  } else if (n.int > 0 && d.int < 0) {
    return new Fraction(int(-N), int(D));
  } else if (d.int === 0) {
    return new Fraction(int(NaN), int(NaN));
  } else {
    return new Fraction(int(Math.floor(n.int)), int(Math.floor(d.int)));
  }
}

function isFrac(u: MathObj): u is Fraction {
  return u instanceof MathObj && u.kind() === expression_type.fraction;
}

class Complex extends Numeric {
  negate(): Complex {
    throw algebraError("complex negation unimplemented");
  }
  abs(): Complex {
    throw algebraError("complex absolute value unimplemented");
  }
  precedence(): bp {
    return bp.atom;
  }
  operands(): MathObj[] {
    return [];
  }
  operandAt(): MathObj {
    return UNDEFINED();
  }
  copy(): Complex {
    const r = this.re.copy() as Real;
    const i = this.re.copy() as Real;
    return new Complex(r, i);
  }
  kind(): expression_type {
    return expression_type.complex;
  }
  equals(other: MathObj): boolean {
    if (!(other instanceof Complex)) {
      return false;
    } else {
      return this.re.equals(other.re);
    }
  }
  toString(): string {
    return `${this.re.toString()}i`;
  }
  strung(): string {
    return this.toString();
  }
  map(): MathObj {
    return this;
  }
  re: Real;
  im: Real;
  constructor(real: Real, imaginary: Real) {
    super();
    this.re = real;
    this.im = imaginary;
  }
}

export function complex(real: Real | number, imaginary: Real | number = 1) {
  const r = isSafeNumber(real)
    ? Number.isInteger(real)
      ? int(real)
      : float64(real)
    : real;
  const i = isSafeNumber(imaginary)
    ? Number.isInteger(imaginary)
      ? int(imaginary)
      : float64(imaginary)
    : imaginary;
  return new Complex(r, i);
}

export function isComplex(u: any) {
  return u instanceof Complex;
}

class Inf extends Numeric {
  negate(): Numeric {
    return this.sign === "-" ? inf("+") : inf("-");
  }
  abs(): Numeric {
    return inf("+");
  }
  precedence(): bp {
    return bp.atom;
  }
  operands(): MathObj[] {
    return [];
  }
  operandAt(): MathObj {
    return UNDEFINED();
  }
  copy(): MathObj {
    return inf(this.sign);
  }
  kind(): expression_type {
    return expression_type.infinity;
  }
  equals(other: MathObj): boolean {
    if (!isInf(other)) {
      return false;
    } else {
      return other.sign === this.sign;
    }
  }
  toString(): string {
    return `${this.sign}Inf`;
  }
  strung(): string {
    return this.toString();
  }
  map(): MathObj {
    return this;
  }
  sign: "+" | "-";
  constructor(sign: "+" | "-") {
    super();
    this.sign = sign;
  }
}

function inf(sign: "+" | "-" = "+") {
  return new Inf(sign);
}

function isInf(u: any) {
  return u instanceof Inf;
}

class Sym extends MathObj {
  precedence(): bp {
    return bp.atom;
  }
  copy(): Sym {
    return sym(this.sym);
  }
  strung(): string {
    return this.toString();
  }
  operandAt(): MathObj {
    return UNDEFINED();
  }
  operands(): MathObj[] {
    return [];
  }
  kind(): expression_type {
    return expression_type.symbol;
  }
  equals(other: MathObj): boolean {
    if (!isSym(other)) {
      return false;
    } else {
      return this.sym === other.sym;
    }
  }
  toString(): string {
    return this.sym;
  }
  map(): this {
    return this;
  }
  sym: string;
  constructor(sym: string) {
    super();
    this.sym = sym;
  }
}

function sym(str: string) {
  return new Sym(str);
}

function isSym(u: MathObj): u is Sym {
  return u.kind() === expression_type.symbol;
}

class Sum extends MathObj {
  precedence(): bp {
    return bp.sum;
  }
  copy(): Sum {
    const argscopy = this.args.map((x) => x.copy());
    return sum(...argscopy);
  }
  strung(): string {
    const out = this.args
      .map((arg) => {
        let argstring = arg.strung();
        if (
          arg.precedence() < this.precedence() &&
          arg.precedence() !== bp.atom
        ) {
          argstring = `(${argstring})`;
        }
        return argstring;
      })
      .join(" + ");
    return `${out}`;
  }
  operandAt(i: number): MathObj {
    const out = this.args[i];
    if (out === undefined) return UNDEFINED();
    return out;
  }
  operands(): MathObj[] {
    return this.args;
  }
  kind(): expression_type {
    return expression_type.sum;
  }
  equals(other: MathObj): boolean {
    if (!isSum(other)) {
      return false;
    } else {
      return argsEqual(this.args, other.args);
    }
  }
  toString(): string {
    let out = this.args.map((arg) => arg.toString()).join(" + ");
    if (
      this.args.length === 2 &&
      isReal(this.args[1]) &&
      this.args[1].value() < 0
    ) {
      const left = this.args[0].toString();
      const right = this.args[1].negate().toString();
      out = `${left} - ${right}`;
    }
    return this.parenLevel ? `(${out})` : out;
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): this {
    this.args = this.args.map(callbackfn);
    return this;
  }
  op = "+" as const;
  args: MathObj[];
  constructor(args: MathObj[]) {
    super();
    this.args = args;
  }
}

function sum(...args: MathObj[]) {
  return new Sum(args);
}

function isSum(u: MathObj): u is Sum {
  return u.kind() === expression_type.sum;
}

class Difference extends MathObj {
  precedence(): bp {
    return bp.difference;
  }
  copy(): Difference {
    const argscopy = this.args.map((x) => x.copy());
    return diff(...argscopy);
  }
  strung(): string {
    const out = this.args.map((arg) => arg.strung()).join(" - ");
    return `(${out})`;
  }
  operandAt(i: number): MathObj {
    const out = this.args[i];
    if (out === undefined) return UNDEFINED();
    return out;
  }
  operands(): MathObj[] {
    return this.args;
  }
  kind(): expression_type {
    return expression_type.difference;
  }
  equals(other: MathObj): boolean {
    if (!isDiff(other)) {
      return false;
    } else {
      return argsEqual(this.args, other.args);
    }
  }
  toString(): string {
    const out = this.args.map((arg) => arg.toString()).join(" - ");
    return this.parenLevel ? `(${out})` : out;
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): this {
    this.args = this.args.map(callbackfn);
    return this;
  }
  op = "-" as const;
  args: MathObj[];
  constructor(args: MathObj[]) {
    super();
    this.args = args;
  }
}

function diff(...args: MathObj[]) {
  return new Difference(args);
}

function isDiff(u: MathObj): u is Difference {
  return u.kind() === expression_type.difference;
}

class Product extends MathObj {
  precedence(): bp {
    return bp.product;
  }
  copy(): Product {
    const argscopy = this.args.map((x) => x.copy());
    return prod(...argscopy);
  }
  strung(): string {
    const out = this.args
      .map((arg) => {
        let argstring = arg.strung();
        if (
          arg.precedence() < this.precedence() &&
          arg.precedence() !== bp.atom
        ) {
          argstring = `(${argstring})`;
        }
        return argstring;
      })
      .join(" * ");
    return `${out}`;
  }
  operandAt(i: number): MathObj {
    const out = this.args[i];
    if (out === undefined) return UNDEFINED();
    return out;
  }
  operands(): MathObj[] {
    return this.args;
  }
  kind(): expression_type {
    return expression_type.product;
  }
  equals(other: MathObj): boolean {
    if (!isProduct(other)) {
      return false;
    } else {
      return argsEqual(this.args, other.args);
    }
  }
  toString(): string {
    const out = this.args.map((arg) => arg.toString()).join(" * ");
    return this.parenLevel ? `(${out})` : out;
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): this {
    this.args = this.args.map(callbackfn);
    return this;
  }
  op = "*" as const;
  args: MathObj[];
  constructor(args: MathObj[]) {
    super();
    this.args = args;
  }
}

function prod(...args: MathObj[]) {
  return new Product(args);
}

function isProduct(u: MathObj): u is Product {
  return typeof u === "object" && u.kind() === expression_type.product;
}

class Quotient extends MathObj {
  precedence(): bp {
    return bp.quotient;
  }
  copy(): Quotient {
    const argscopy = this.args.map((x) => x.copy());
    return quot(...argscopy);
  }
  strung(): string {
    const out = this.args.map((arg) => arg.strung()).join(" / ");
    return `(${out})`;
  }
  operandAt(i: number): MathObj {
    const out = this.args[i];
    if (out === undefined) return UNDEFINED();
    return out;
  }
  operands(): MathObj[] {
    return this.args;
  }
  kind(): expression_type {
    return expression_type.quotient;
  }
  equals(other: MathObj): boolean {
    if (!isQuotient(other)) {
      return false;
    } else {
      return argsEqual(this.args, other.args);
    }
  }
  toString(): string {
    const out = this.args.map((arg) => arg.toString()).join(" / ");
    return this.parenLevel ? `(${out})` : out;
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): this {
    this.args = this.args.map(callbackfn);
    return this;
  }
  op = "/" as const;
  args: MathObj[];
  constructor(args: MathObj[]) {
    super();
    this.args = args;
  }
}

function quot(...args: MathObj[]) {
  return new Quotient(args);
}

function isQuotient(u: MathObj): u is Quotient {
  return u.kind() === expression_type.quotient;
}

class Power extends MathObj {
  precedence(): bp {
    return bp.power;
  }
  copy(): Power {
    const base = this.base.copy();
    const exponent = this.base.copy();
    return pow(base, exponent);
  }
  strung(): string {
    const left = this.base.strung();
    let right = this.exponent.strung();
    if (isReal(this.exponent) && this.exponent.value() < 0) {
      right = `(${right})`;
    }
    const out = `${left}^${right}`;
    return `${out}`;
  }
  operandAt(i: number): MathObj {
    const out = this.args[i];
    if (out === undefined) return UNDEFINED();
    return out;
  }
  operands(): MathObj[] {
    return this.args;
  }
  kind(): expression_type {
    return expression_type.power;
  }
  equals(other: MathObj): boolean {
    if (!isPower(other)) {
      return false;
    } else {
      return argsEqual(this.args, other.args);
    }
  }
  toString(): string {
    const left = this.base.toString();
    let right = this.exponent.toString();
    if (!isAtom(this.exponent)) {
      right = `(${right})`;
    }
    if (isReal(this.exponent) && this.exponent.value() < 0) {
      right = `(${right})`;
    }
    const out = `${left}^${right}`;
    return this.parenLevel ? `(${out})` : out;
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): this {
    this.args = this.args.map(callbackfn);
    return this;
  }
  op = "^" as const;
  args: MathObj[];
  constructor(base: MathObj, exponent: MathObj) {
    super();
    this.args = [base, exponent];
  }
  get base() {
    return this.args[0];
  }
  get exponent() {
    return this.args[1];
  }
  simplify() {
    const v = this.base;
    const w = this.exponent;
    if (isInt(v)) {
      if (v.int === 0) return int(0);
      if (v.int === 1) return int(1);
    }
    if (isInt(w)) {
      if (w.int === 0) return int(1);
      if (w.int === 1) return v;
    }
  }
}

/** Returns a new power expression in the form `xⁿ`. */
function pow(x: MathObj, n: MathObj) {
  return new Power(x, n);
}

/** Returns true, and asserts, if `u` is a power expression. */
function isPower(u: MathObj): u is Power {
  return u.kind() === expression_type.power;
}

class Func extends MathObj {
  precedence(): bp {
    return bp.call;
  }
  copy(): Func {
    const argscopy = this.args.map((x) => x.copy());
    return fn(this.op, argscopy);
  }
  strung(): string {
    const f = this.op;
    const args = this.args.map((arg) => arg.strung()).join(",");
    return `(${f}(${args}))`;
  }
  operandAt(i: number): MathObj {
    const out = this.args[i];
    if (out === undefined) return UNDEFINED();
    return out;
  }
  operands(): MathObj[] {
    return this.args;
  }
  kind(): expression_type {
    return expression_type.call;
  }
  equals(other: MathObj): boolean {
    if (!isFunc(other)) {
      return false;
    } else if (other.op !== this.op) {
      return false;
    } else {
      return argsEqual(this.args, other.args);
    }
  }
  toString(): string {
    const f = this.op;
    const args = this.args.map((arg) => arg.toString()).join(",");
    return `${f}(${args})`;
  }
  map<T extends MathObj>(
    callbackfn: (value: MathObj, index: number, array: MathObj[]) => T
  ): this {
    this.args = this.args.map(callbackfn);
    return this;
  }
  op: string;
  args: MathObj[];
  constructor(op: string, args: MathObj[]) {
    super();
    this.op = op;
    this.args = args;
  }
}

function fn(fname: string, args: MathObj[]) {
  return new Func(fname, args);
}

function isFunc(u: MathObj): u is Func {
  return u.kind() === expression_type.call;
}

function isAtom(u: MathObj): u is Real | Sym {
  return isReal(u) || isSym(u);
}

function simplifyRationalNumber(u: MathObj) {
  if (isInt(u)) return u;
  if (isFrac(u)) {
    const n = u.numerator;
    const d = u.denominator;
    if (mod(n.int, d.int) === 0) return int(iquot(n.int, d.int));
    const g = gcd(n.int, d.int);
    if (d.int > 0) return frac(int(iquot(n.int, g)), int(iquot(d.int, g)));
    if (d.int < 0) return frac(int(iquot(-n.int, g)), int(iquot(-d.int, g)));
  }
  throw algebraError(
    `simplifyRationalNumber called with nonrational argument.`
  );
}

type Rational = Int | Fraction;

function isRational(v: MathObj): v is Rational {
  return isInt(v) || isFrac(v);
}

function isReal(v: MathObj): v is Real {
  return isRational(v) || isFloat64(v);
}

function evalQuotient(v: MathObj, w: MathObj) {
  if (isRational(v) && isRational(w)) {
    if (w.numerator.int === 0) return UNDEFINED();
    return frac(
      int(v.numerator.int * w.denominator.int),
      int(w.numerator.int * v.denominator.int)
    );
  }
  throw algebraError(`expected rational in call to evalQuotient`);
}

function evalSum(v: MathObj, w: MathObj) {
  if (isRational(v) && isRational(w)) {
    return frac(
      int(
        v.numerator.int * w.denominator.int +
          w.numerator.int * v.denominator.int
      ),
      int(v.denominator.int * w.denominator.int)
    );
  }
  throw algebraError(`expected rational in call to evalSum`);
}

function evalDiff(v: MathObj, w: MathObj) {
  if (isRational(v) && isRational(w)) {
    return frac(
      int(
        v.numerator.int * w.denominator.int -
          w.numerator.int * v.denominator.int
      ),
      int(v.denominator.int * w.denominator.int)
    );
  }
  throw algebraError(`expected rational in call to evalDiff`);
}

function evalProduct(v: MathObj, w: MathObj) {
  if (isRational(v) && isRational(w)) {
    return frac(
      int(v.numerator.int * w.numerator.int),
      int(v.denominator.int * w.denominator.int)
    );
  }
  throw algebraError(`expected rational in call to evalProduct`);
}

function evalPower(v: MathObj, n: MathObj): Rational | Undefined {
  if (isRational(v) && isInt(n)) {
    if (v.numerator.int !== 0) {
      if (n.int > 0) return evalProduct(evalPower(v, int(n.int - 1)), v);
      if (n.int === 0) return int(1);
      if (n.int === -1) return frac(v.denominator, v.numerator);
      if (n.int < -1) {
        const s = frac(v.denominator, v.numerator);
        return evalPower(s, int(-n.int));
      }
    }
    if (n.int >= 1) return int(0);
    if (n.int <= 0) return UNDEFINED();
  }
  throw algebraError(
    `expected rational base and integer exponent in call to evalPower`
  );
}

function simplifyRNERec(u: MathObj): MathObj {
  if (isInt(u)) return u;
  if (isFrac(u)) {
    if (u.denominator.int === 0) return UNDEFINED();
    else return u;
  }
  if (isSum(u) && u.args.length === 1) {
    return simplifyRNERec(u.args[0]);
  }
  if (isDiff(u) && u.args.length === 1) {
    const v = simplifyRNERec(u.args[0]);
    if (isUndefined(v)) return v;
    return evalProduct(int(-1), v);
  }
  if (isSum(u) && u.args.length === 2) {
    const v = simplifyRNERec(u.args[0]);
    const w = simplifyRNERec(u.args[1]);
    if (isUndefined(v) || isUndefined(w)) {
      return UNDEFINED();
    }
    return evalSum(v, w);
  }
  if (isProduct(u) && u.args.length === 2) {
    const v = simplifyRNERec(u.args[0]);
    const w = simplifyRNERec(u.args[1]);
    if (isUndefined(v) || isUndefined(w)) {
      return UNDEFINED();
    }
    return evalProduct(v, w);
  }
  if (isDiff(u) && u.args.length === 2) {
    const v = simplifyRNERec(u.args[0]);
    const w = simplifyRNERec(u.args[1]);
    if (isUndefined(v) || isUndefined(w)) {
      return UNDEFINED();
    }
    return evalDiff(v, w);
  }
  if (isFrac(u)) {
    const v = simplifyRNERec(u.numerator);
    const w = simplifyRNERec(u.denominator);
    if (isUndefined(v) || isUndefined(w)) {
      return UNDEFINED();
    }
    return evalQuotient(v, w);
  }
  if (isPower(u)) {
    const v = simplifyRNERec(u.base);
    if (isUndefined(v)) return v;
    return evalPower(v, u.exponent);
  }
  return UNDEFINED();
}

function simplifyRNE(u: MathObj) {
  const v = simplifyRNERec(u);
  if (isUndefined(v)) return UNDEFINED();
  return simplifyRationalNumber(v);
}

/**
 * @internal Used by the order relation, implements
 * rule O3 from Cohen.
 */
function O3(uElts: MathObj[], vElts: MathObj[]): boolean {
  if (uElts.length === 0) return true;
  if (vElts.length === 0) return false;
  const u = uElts[0];
  const v = vElts[0];
  return !u.equals(v) ? order(u, v) : O3(cdr(uElts), cdr(vElts));
}

/**
 * Given expressions `𝑢` and `𝑣`, returns true if `𝑢 < 𝑣`
 * according to Algebron's order relation rules.
 */
export function order(𝑢: MathObj | string, 𝑣: MathObj | string): boolean {
  const u = typeof 𝑢 === "string" ? exp(𝑢).obj() : 𝑢;
  const v = typeof 𝑣 === "string" ? exp(𝑣).obj() : 𝑣;
  // O-1
  if (isRational(u) && isRational(v)) {
    return u.rational().lt(v.rational());
  }
  if (isFloat64(u) && isInt(v)) {
    return u.float < v.int;
  }
  if (isFloat64(u) && isFrac(v)) {
    return u.float < v.numerator.int / v.denominator.int;
  }
  if (isInt(u) && isFloat64(v)) {
    return u.int < v.float;
  }
  if (isFrac(u) && isFloat64(v)) {
    return u.numerator.int / u.denominator.int < v.float;
  }
  if (isReal(u) && isReal(v)) {
    return u.value() < v.value();
  }
  // O-2
  if (isSym(u) && isSym(v)) {
    return u.sym < v.sym;
  }
  if (isProduct(u) && isProduct(v)) {
    return O3(reverse(u.args), reverse(v.args));
  }
  if (isSum(u) && isSum(v)) {
    return O3(reverse(u.args), reverse(v.args));
  }
  if (isPower(u) && isPower(v)) {
    return u.base.equals(v.base)
      ? order(u.exponent, v.exponent)
      : order(u.base, v.base);
  }
  if (isFunc(u) && isFunc(v)) {
    return u.op === v.op ? O3(u.args, v.args) : u.op < v.op;
  }
  if (isReal(u) && !isReal(v)) {
    return true;
  }
  if (isProduct(u) && (isPower(v) || isSum(v) || isFunc(v) || isSym(v))) {
    return order(u, prod(v));
  }
  if (isPower(u) && (isSum(v) || isFunc(v) || isSym(v))) {
    return order(u, pow(v, int(1)));
  }
  if (isSum(u) && (isFunc(v) || isSym(v))) {
    return order(u, sum(v));
  }
  if (isFunc(u) && isSym(v)) {
    return u.op === v.sym ? false : order(sym(u.op), v);
  }
  return !order(v, u);
}

/**
 * Given the array of expressions (where each expression
 * is either a string or object), returns an array of
 * expressions sorted according to Algebron's order relation.
 */
export function sortex(expressions: (MathObj | string)[]) {
  const exprs = expressions.map((e) =>
    typeof e === "string" ? exp(e).obj() : e
  );
  return exprs.sort((a, b) => (order(a, b) ? -1 : 1));
}

/** Returns the base of the given math object. */
function base(u: MathObj) {
  return isPower(u) ? u.base : u;
}

/** Returns the exponent of the given math object. */
function exponent(u: MathObj) {
  return isPower(u) ? u.exponent : int(1);
}

/** Returns the term of the given math object. */
function term(u: MathObj) {
  if (isProduct(u) && isReal(u.args[0])) {
    return prod(...cdr(u.args));
  }
  if (isProduct(u)) return u;
  return prod(u);
}

/** Returns the constant of the given math object. */
function constant(u: MathObj) {
  return isProduct(u) && isReal(u.args[0]) ? u.args[0] : int(1);
}

/**
 * Given two lists `pElts` and `qElts` corresponding to the
 * operands of two sums `p` and `q`, returns a new list
 * with `pElts` and `qElts` merged.
 *
 * @param pElts The operands of the first sum.
 * @param qElts The operands of the second sum.
 * @returns A new array with the operands merged.
 */
function mergeSums(pElts: MathObj[], qElts: MathObj[]): MathObj[] {
  if (qElts.length === 0) return pElts;
  if (pElts.length === 0) return qElts;
  const p = pElts[0];
  const ps = cdr(pElts);
  const q = qElts[0];
  const qs = cdr(qElts);
  const res = simplifySumRec([p, q]);
  if (res.length === 0) return mergeSums(ps, qs);
  if (res.length === 1) return cons(mergeSums(ps, qs), res[0]);
  if (argsEqual(res, [p, q])) return cons(mergeSums(ps, qElts), p);
  if (argsEqual(res, [q, p])) return cons(mergeSums(pElts, qs), q);
  throw algebraError("mergeSums failed");
}

function simplifySumRec(elts: MathObj[]): MathObj[] {
  if (elts.length === 2) {
    if (isSum(elts[0]) && isSum(elts[1])) {
      return mergeSums(elts[0].args, elts[1].args);
    }
    if (isSum(elts[0])) {
      return mergeSums(elts[0].args, [elts[1]]);
    }
    if (isSum(elts[1])) {
      return mergeSums([elts[0]], elts[1].args);
    }

    if (
      (isInt(elts[0]) || isFrac(elts[0])) &&
      (isInt(elts[1]) || isFrac(elts[1]))
    ) {
      const P = simplifyRNE(sum(elts[0], elts[1]));
      if (isReal(P) && P.value() === 0) return [];
      return [P];
    }

    if (isReal(elts[0]) && elts[0].value() === 0) {
      return [elts[1]];
    }

    if (isReal(elts[1]) && elts[1].value() === 0) {
      return [elts[0]];
    }

    const p = elts[0];
    const q = elts[1];

    // special handling of trig identity
    if (isPower(p) && isPower(q)) {
      if (
        isFunc(p.base) &&
        isFunc(q.base) &&
        p.base.op === "sin" &&
        q.base.op === "cos" &&
        isInt(p.exponent) &&
        p.exponent.int === 2 &&
        isInt(q.exponent) &&
        q.exponent.int === 2
      ) {
        return [int(1)];
      }
    }

    if (term(p).equals(term(q))) {
      const S = simplifySum(sum(constant(p), constant(q)));
      const res = simplifyProduct(prod(term(p), S));
      if (isReal(res) && res.value() === 0) return [];
      return [res];
    }
    if (order(q, p)) return [q, p];
    return [p, q];
  }
  if (isSum(elts[0])) {
    return mergeSums(elts[0].args, simplifySumRec(cdr(elts)));
  }
  return mergeSums([elts[0]], simplifySumRec(cdr(elts)));
}

function simplifySum(u: Sum) {
  const elts = u.args;
  if (elts.length === 1) return elts[0];
  const res = simplifySumRec(elts);
  if (res.length === 0) return int(0);
  if (res.length === 1) return res[0];
  return sum(...res);
}

/** Where p and q are lists of factors of products, merges the two lists. */
function mergeProducts(pElts: MathObj[], qElts: MathObj[]): MathObj[] {
  if (pElts.length === 0) return qElts;
  if (qElts.length === 0) return pElts;
  const p = pElts[0];
  const ps = cdr(pElts);

  const q = qElts[0];
  const qs = cdr(qElts);

  const res = simplifyProductRec([p, q]);
  if (res.length === 0) return mergeProducts(ps, qs);
  if (res.length === 1) return cons(mergeProducts(ps, qs), res[0]);

  if (argsEqual(res, [p, q])) {
    return cons(mergeProducts(ps, qElts), p);
  }

  if (argsEqual(res, [q, p])) {
    return cons(mergeProducts(pElts, qs), q);
  }

  throw algebraError("mergeProducts failed");
}

/** Simplifies a product recursively. */
function simplifyProductRec(elts: MathObj[]): MathObj[] {
  if (elts.length === 2) {
    if (isProduct(elts[0]) && isProduct(elts[1])) {
      return mergeProducts(elts[0].args, elts[1].args);
    }
    if (isProduct(elts[0])) {
      return mergeProducts(elts[0].args, [elts[1]]);
    }
    if (isProduct(elts[1])) {
      return mergeProducts([elts[0]], elts[1].args);
    }
    if (
      (isInt(elts[0]) || isFrac(elts[0])) &&
      (isInt(elts[1]) || isFrac(elts[1]))
    ) {
      const P = simplifyRNE(prod(elts[0], elts[1]));
      if (isReal(P) && P.value() === 1) {
        return [];
      }
      return [P];
    }

    // left side is 1; 1 * u = u
    if (isReal(elts[0]) && elts[0].value() === 1) return [elts[1]];

    // right side is 1; u * 1 = u
    if (isReal(elts[1]) && elts[1].value() === 1) return [elts[0]];

    // float * float
    if (isFloat64(elts[0]) && isFloat64(elts[1])) {
      return [float64(elts[0].value() * elts[1].value())];
    }
    // float * int
    if (isFloat64(elts[0]) && isInt(elts[1])) {
      return [float64(elts[0].value() * elts[1].value())];
    }
    // int * float
    if (isInt(elts[0]) && isFloat64(elts[1])) {
      return [float64(elts[0].value() * elts[1].value())];
    }
    // float * fraction
    if (isFloat64(elts[0]) && isFrac(elts[1])) {
      return [float64(elts[0].value() * elts[1].value())];
    }
    // fraction * float
    if (isFrac(elts[0]) && isFloat64(elts[1])) {
      return [float64(elts[0].value() * elts[1].value())];
    }

    const p = elts[0];
    const q = elts[1];

    if (base(p).equals(base(q))) {
      const S = simplifySum(sum(exponent(p), exponent(q)));
      const res = simplifyPower(pow(base(p), S));
      if (isReal(res) && res.value() === 1) return [];
      return [res];
    }
    if (order(q, p)) return [q, p];
    return [p, q];
  }
  if (isProduct(elts[0])) {
    return mergeProducts(elts[0].args, simplifyProductRec(cdr(elts)));
  }
  return mergeProducts([elts[0]], simplifyProductRec(cdr(elts)));
}

function simplifyProduct(u: Product): MathObj {
  const L = u.args;
  for (let i = 0; i < L.length; i++) {
    const arg = L[i];
    // SPRD-1
    if (isUndefined(arg)) {
      return UNDEFINED();
    }
    // SPRD-2
    if (isReal(arg) && arg.isZero()) {
      return int(0);
    }
  }
  const res = simplifyProductRec(u.args);
  if (res.length === 0) return int(1);
  if (res.length === 1) return res[0];
  return prod(...res);
}

/** Simplifies a power expression. */
function simplifyPower(u: Power): MathObj {
  const v = u.base;
  const w = u.exponent;
  if (isReal(v) && v.value() === 0) return int(0);
  if (isReal(v) && v.value() === 1) return int(1);
  if (isReal(w) && w.value() === 0) return int(1);
  if (isReal(w) && w.value() === 1) return v;
  const n = w;
  if ((isInt(v) || isFrac(v)) && isInt(n)) {
    return simplifyRNE(pow(v, n));
  }
  if (isPower(v) && isInt(w)) {
    const P = simplifyProduct(prod(v.exponent, w));
    return simplifyPower(pow(v.base, P));
  }
  if (isProduct(v) && isInt(w)) {
    const out = v.map((elt) => pow(elt, w));
    return out;
  }
  return pow(v, w);
}

function simplifyQuotient(u: Quotient) {
  const elts0 = u.args[0];
  const elts1 = u.args[1];
  const P = simplifyPower(pow(elts1, int(-1)));
  return simplifyProduct(prod(elts0, P));
}

function simplifyDiff(u: Difference) {
  if (u.args.length === 1) {
    return simplifyProduct(prod(int(-1), u.args[0]));
  }
  if (u.args.length === 2) {
    const x = simplifyProduct(prod(int(-1), u.args[1]));
    return simplifySum(sum(u.args[0], x));
  }
  throw algebraError("simplifyDiff failed");
}

// TODO - There's still a lot of work that needs
// to be done on the simplifyFunction algorithm.

/**
 * @internal Simplifies a function. Used by
 * the automatic simplification algorithm.
 * Users should not use this directly.
 */
function simplifyFunction(u: Func): MathObj {
  if (u.op === "ln") {
    if (u.args.length === 1) {
      const x = simplify(u.args[0]);
      // ln 1 -> 0
      if (x.equals(int(1))) return int(0);
      // ln 0 -> undefined
      if (x.equals(int(0))) return UNDEFINED();
      // ln e -> 1
      if (x.equals(sym("e"))) return int(1);
      // ln (e^x) -> x
      if (isPower(x) && x.base.equals(sym("e"))) {
        return x.exponent;
      }
      // ln (some number)
      if (isReal(x)) {
        const res = Math.log(x.value());
        if (Number.isInteger(res)) {
          return int(res);
        } else {
          return fn("ln", [x]).markSimplified();
        }
      }
      return fn("ln", [x]).markSimplified();
    } else {
      throw algebraError("log takes only one argument");
    }
  }
  if (u.op === "sin") {
    if (u.args.length === 1) {
      const x = simplify(u.args[0]);
      // sin of some number -> number
      if (isReal(x)) {
        const res = Math.sin(x.value());
        if (Number.isInteger(res)) {
          return int(res);
        } else {
          return fn("sin", [x]).markSimplified();
        }
      }
      // sin pi = 0
      if (isSym(x)) {
        if (x.sym === "pi") return int(0);
        return fn("sin", [x]).markSimplified();
      }
      return fn("sin", [x]).markSimplified();
    } else {
      throw algebraError("sin takes only one argument");
    }
  }
  if (u.op === "cos") {
    if (u.args.length === 1) {
      const x = simplify(u.args[0]);
      // sin of some number -> number
      if (isReal(x)) {
        const res = Math.cos(x.value());
        if (Number.isInteger(res)) return int(res);
        return float64(res);
      }
      // sin pi = 0
      if (isSym(x)) {
        if (x.sym === "pi") return int(-1);
      }
      return fn("cos", [x]).markSimplified();
    } else {
      throw algebraError("sin takes only one argument");
    }
  }
  return fn(u.op, u.args).markSimplified();
}

/**
 * Given the expression 𝑢, returns 𝑢 automatically
 * simplified.
 */
export function simplify(𝑢: MathObj | string): MathObj {
  const u = typeof 𝑢 === "string" ? exp(𝑢).obj() : 𝑢;
  if (
    isInt(u) ||
    isSym(u) ||
    isFloat64(u) ||
    isUndefined(u) ||
    u.isSimplified
  ) {
    return u;
  } else if (isFrac(u)) {
    return simplifyRationalNumber(u);
  } else {
    const v = u.map(simplify);
    if (isPower(v)) {
      return simplifyPower(v);
    } else if (isProduct(v)) {
      return simplifyProduct(v);
    } else if (isSum(v)) {
      return simplifySum(v);
    } else if (isQuotient(v)) {
      return simplifyQuotient(v);
    } else if (isDiff(v)) {
      return simplifyDiff(v);
    } else if (isFunc(v)) {
      return simplifyFunction(v);
    } else {
      throw algebraError("unrecognized math object passed to simplify");
    }
  }
}

/**
 * Where `𝑢` is an algebraic expression, returns the
 * numerator of `𝑢`.
 */
export function numerator(𝑢: MathObj | string): MathObj {
  let u = typeof 𝑢 === "string" ? exp(𝑢).obj() : 𝑢;
  u = simplify(u);
  if (u instanceof Fraction) {
    return u.numerator;
  }
  if (u instanceof Power) {
    if (
      (isInt(u.exponent) && u.exponent.int < 0) ||
      (isFrac(u.exponent) && u.exponent.value() < 0)
    ) {
      return int(1);
    } else {
      return u;
    }
  }
  if (u instanceof Product) {
    const v = u.args[0];
    const vn = numerator(v);
    const q = simplify(quot(u, v));
    const w = numerator(q);
    return simplify(prod(vn, w));
  }
  return u;
}

/**
 * Given the expression `𝑢`, returns the denominator
 * of `𝑢`.
 */
export function denominator(𝑢: MathObj | string): MathObj {
  let u = typeof 𝑢 === "string" ? exp(𝑢).obj() : 𝑢;
  u = simplify(u);
  if (u instanceof Fraction) {
    return u.denominator;
  }
  if (u instanceof Power) {
    if (
      (isInt(u.exponent) && u.exponent.int < 0) ||
      (isFrac(u.exponent) && u.exponent.value() < 0)
    ) {
      return pow(u, int(-1));
    } else {
      return int(1);
    }
  }
  if (u instanceof Product) {
    const v = u.args[0];
    const vd = denominator(v);
    const q = simplify(quot(u, v));
    const w = denominator(q);
    return simplify(prod(vd, w));
  }
  return int(1);
}

/**
 * @internal Determines if the given `expression1` does not contain
 * the given `expression2`. Used in `freeOf`'s implementation. Users
 * should not use this directly. Only `freeOf` is publicly available.
 */
function freeofOne(
  expression1: MathObj | string,
  expression2: MathObj | string
) {
  const u =
    typeof expression1 === "string" ? exp(expression1).obj() : expression1;
  const t =
    typeof expression2 === "string" ? exp(expression2).obj() : expression2;
  if (u.equals(t)) {
    return false;
  } else if (isReal(u) || isSym(u)) {
    return true;
  } else {
    for (let i = 0; i < u.operands().length; i++) {
      const arg = u.operands()[i];
      if (!freeofOne(arg, t)) return false;
    }
    return true;
  }
}

/**
 * Returns true if `expression` does not contain
 * any of the expressions contained in the array
 * of subexpressions.
 */
export function freeOf(
  expression: MathObj | string,
  subexpressions: (MathObj | string)[]
) {
  for (let i = 0; i < subexpressions.length; i++) {
    if (!freeofOne(expression, subexpressions[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Given a string `source` corresponding to
 * an expression, returns an object with
 * the following methods:
 *
 * 1. `ast()`: Returns the parsed MathObj as pretty-print string.
 * 2. `obj()`: Returns the parsed MathObj.
 * 3. `simplify()`: Returns the parsed MathObj reduced with
 *    automatic simplification.
 */
function exp(source: string) {
  const parse = () => {
    let $current = 0;
    const _tkns = lexical(source).stream();
    if (_tkns.isLeft()) return _tkns;
    const $tokens = _tkns.unwrap();

    const consume = (type: token_type, message: string) => {
      if (check(type)) return advance();
      throw syntaxError(message, peek().$line);
    };

    const peek = () => {
      return $tokens[$current];
    };

    const previous = () => {
      return $tokens[$current - 1];
    };

    const atEnd = () => {
      return $current >= $tokens.length;
    };

    const advance = () => {
      if (!atEnd()) $current++;
      return previous();
    };

    const check = (type: token_type) => {
      if (atEnd()) return false;
      return peek().$type === type;
    };

    const match = (...types: token_type[]) => {
      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        if (check(type)) {
          advance();
          return true;
        }
      }
      return false;
    };

    const expression = () => {
      return equality();
    };

    const equality = () => {
      let left = compare();
      while (match(token_type.equal)) {
        const right = compare();
        left = equation(left, right);
      }
      return left;
    };

    const compare = (): MathObj => {
      let left = addition();
      while (
        match(
          token_type.greater,
          token_type.greater_equal,
          token_type.less,
          token_type.less_equal,
          token_type.bang_equal
        )
      ) {
        const op = previous();
        const right = addition();
        left = relate(op.$lexeme as RelationOperator, [left, right]);
      }
      return left;
    };

    const addition = (): MathObj => {
      let left = subtraction();
      while (match(token_type.plus)) {
        const right = subtraction();
        left = sum(left, right);
      }
      return left;
    };

    const subtraction = (): MathObj => {
      let left = product();
      while (match(token_type.minus)) {
        const right = product();
        left = diff(left, right);
      }
      return left;
    };

    const product = (): MathObj => {
      let left = imul();
      while (match(token_type.star)) {
        const right = imul();
        left = prod(left, right);
      }
      return left;
    };

    const imul = (): MathObj => {
      let left = quotient();
      if (
        (isInt(left) || isFloat64(left)) &&
        (check(token_type.symbol) || check(token_type.native))
      ) {
        const right = quotient();
        left = prod(left, right);
      }
      return left;
    };

    const quotient = (): MathObj => {
      let left = power();
      while (match(token_type.slash)) {
        const right = power();
        left = quot(left, right);
      }
      return left;
    };

    const power = (): MathObj => {
      let left = negate();
      while (match(token_type.caret)) {
        const right = negate();
        left = pow(left, right);
      }
      return left;
    };

    const negate = (): MathObj => {
      if (match(token_type.minus)) {
        let right = factorial();
        if (isInt(right)) {
          right = int(-right.int);
          return right;
        } else if (isFloat64(right)) {
          right = float64(-right.float);
          return right;
        } else {
          return diff(right);
        }
      }
      return factorial();
    };

    const factorial = (): MathObj => {
      let left = call();
      if (match(token_type.bang)) {
        left = fn("!", [left]);
      }
      return left;
    };

    const call = (): MathObj => {
      let left = primary();
      while (true) {
        if (match(token_type.left_paren)) {
          left = finishCall(left);
        } else {
          break;
        }
      }
      return left;
    };

    const finishCall = (callee: MathObj) => {
      const args: MathObj[] = [];
      if (!check(token_type.right_paren)) {
        do {
          args.push(expression());
        } while (match(token_type.comma));
      }
      consume(token_type.right_paren, 'Expected ")" after arguments');
      if (!isSym(callee)) {
        throw syntaxError(
          "Expected a symbol for function call",
          previous().$line
        );
      }
      return fn(callee.sym, args);
    };

    const primary = (): MathObj => {
      if (match(token_type.boolean))
        return bool(previous().$literal as boolean);
      if (match(token_type.integer)) return int(previous().$literal as number);
      if (match(token_type.float))
        return float64(previous().$literal as number);
      if (match(token_type.numeric_constant)) return sym(previous().$lexeme);
      if (match(token_type.symbol)) return sym(previous().$lexeme);
      if (match(token_type.native)) return sym(previous().$lexeme);
      if (match(token_type.fraction)) {
        const f = previous().$literal as Fraction;
        return f;
      }
      if (match(token_type.left_paren)) {
        let expr = expression();
        consume(token_type.right_paren, `Expected a closing ")"`);
        expr = expr.parend();
        if (check(token_type.left_paren)) {
          const right = expression();
          return prod(expr, right);
        }
        return expr;
      }
      throw syntaxError(
        `Unrecognized lexeme: ${peek().$lexeme}.`,
        peek().$line
      );
    };

    const run = () => {
      try {
        const result = expression();
        return right(result);
      } catch (error) {
        return left(error as Err);
      }
    };

    return run();
  };

  return {
    /** Returns a pretty-print string of this expression's AST. */
    ast() {
      const res = parse();
      if (res.isLeft()) {
        return res.unwrap().toString();
      } else {
        return treestring(res.unwrap());
      }
    },
    /** Returns this expression as a math object. */
    obj() {
      const res = parse();
      if (res.isLeft()) {
        const r = res.unwrap().message;
        return UNDEFINED().setError(r);
      } else {
        return res.unwrap();
      }
    },
    /** Returns this expression as an automatically simplified expression. */
    simplify() {
      return simplify(this.obj());
    },
  };
}

function cset<T>(...elements: T[]) {
  return new Set(elements);
}

function union<T>(setA: Set<T>, setB: Set<T>) {
  const _union = new Set(setA);
  for (const elem of setB) {
    _union.add(elem);
  }
  return _union;
}

/**
 * Returns the subexpressions of the given `expression`/
 */
export function subexs(expression: MathObj | string) {
  const f = (expression: MathObj | string): Set<string> => {
    const u =
      typeof expression === "string" ? exp(expression).obj() : expression;
    if (isAtom(u)) {
      return cset(u.toString());
    } else {
      let s = cset(u.toString());
      for (let i = 0; i < u.operands().length; i++) {
        s = union(s, f(u.operandAt(i)));
      }
      return s;
    }
  };
  const out = f(expression);
  return [...out];
}

export function lcGPE(expression: string | MathObj, variable: string | Sym) {
  return coefGPE(expression, variable, gpeDeg(expression, [variable]));
}

/**
 * Returns a MathObject correspodning to the
 * derivative of the given `expression`
 * with respect to the given `variable`.
 */
export function derive(
  expression: MathObj | string,
  variable: Sym | string
): MathObj {
  let u: MathObj =
    typeof expression === "string" ? exp(expression).simplify() : expression;
  const x: Sym = typeof variable === "string" ? sym(variable) : variable;
  // deriv-1
  if (isSym(u) && u.equals(x)) {
    return int(1);
  }
  u = simplify(u);
  if (isPower(u)) {
    // u = v^w
    const v = simplify(u.base);
    const w = simplify(u.exponent);
    const d = simplify(diff(w, int(1)));
    return simplify(prod(w, pow(v, d)));
  }
  if (isQuotient(u)) {
    const f = u.args[0];
    const g = u.args[1];
    const df = derive(f, x);
    const dg = derive(g, x);
    const dfg = prod(df, g);
    const fdg = prod(f, dg);
    const gx2 = pow(g, int(2));
    const top = diff(dfg, fdg);
    const bottom = gx2;
    return simplify(quot(top, bottom));
  }
  if (isDiff(u)) {
    const s = u.map((arg) => derive(arg, x));
    return simplify(s);
  }
  if (isSum(u)) {
    const s = u.map((arg) => derive(arg, x));
    return simplify(s);
  }
  if (isProduct(u)) {
    const f = u.args[0];
    const g = u.args[1];
    const dg = derive(g, x);
    const df = derive(f, x);
    const left = prod(f, dg);
    const right = prod(df, g);
    return simplify(sum(left, right));
  }
  if (isFunc(u)) {
    if (u.op === "deriv") return u;
    if (u.op === "sin") {
      const v = u.args[0];
      const dvx = simplify(derive(v, x));
      const p = simplify(prod(fn("cos", [v]), dvx));
      return p;
    }
  }
  if (freeOf(u, [x])) {
    return int(0);
  }
  return fn("deriv", [u, x]).markSimplified();
}

export function isMonomial(
  expression: string | MathObj,
  variables: (string | MathObj)[]
): boolean {
  const vars: MathObj[] = [];
  variables.forEach((v) => {
    if (typeof v === "string") {
      vars.push(sym(v));
    } else {
      vars.push(v);
    }
  });
  const S = cset(...vars.map((x) => x.toString()));
  const u = typeof expression === "string" ? exp(expression).obj() : expression;
  const us = u.toString();
  if (S.has(us)) {
    return true;
  } else if (isPower(u)) {
    const base = u.base;
    const exponent = u.exponent;
    if (S.has(base.toString()) && isInt(exponent) && exponent.value() > 1) {
      return true;
    }
  } else if (isProduct(u)) {
    const operands = u.args;
    for (let i = 0; i < operands.length; i++) {
      const operand = operands[i];
      if (!isMonomial(operand, Array.from(S))) {
        return false;
      }
    }
    return true;
  }
  return freeOf(u, [...S]);
}

/**
 * Returns true if the given `expression` is a general
 * polynomial in the given `variables`, false otherwise.
 */
export function isPolynomial(
  expression: string | MathObj,
  variables: string[] | Sym[]
): boolean {
  const vars: Sym[] = [];
  variables.forEach((v) => {
    if (typeof v === "string") {
      vars.push(sym(v));
    } else {
      vars.push(v);
    }
  });
  const S = cset(...vars.map((x) => x.toString()));
  const u = typeof expression === "string" ? exp(expression).obj() : expression;
  if (!isSum(u)) {
    return isMonomial(u, variables);
  } else {
    if (S.has(u.toString())) {
      return true;
    }
    for (let i = 0; i < u.args.length; i++) {
      const operand = u.args[i];
      if (!isMonomial(operand, variables)) {
        return false;
      }
    }
    return true;
  }
}

function monDeg(
  expression: string | MathObj,
  variables: (string | Sym)[]
): Int {
  const vars: Sym[] = [];
  variables.forEach((v) => {
    if (typeof v === "string") {
      vars.push(sym(v));
    } else {
      vars.push(v);
    }
  });
  const vs = listx(vars);
  const u = typeof expression === "string" ? exp(expression).obj() : expression;
  if (freeOf(u, vars)) {
    return int(0);
  }
  if (vs.has(u)) {
    return int(1);
  }
  if (isPower(u) && isInt(u.exponent) && u.exponent.value() > 1) {
    return int(u.exponent.value());
  }
  if (isProduct(u)) {
    const out = u.args
      .map((x) => monDeg(x, variables))
      .reduce((p, c) => int(p.int + c.int), int(0));
    return out;
  }
  return int(0);
}

/**
 * Where `expression` is a general polynomial expression
 * and `variables` is a set of variables, returns the
 * degree of `expression`.
 */
export function gpeDeg(
  expression: string | MathObj,
  variables: (string | Sym)[]
): Int {
  const vars: Sym[] = [];
  variables.forEach((v) => {
    if (typeof v === "string") {
      vars.push(sym(v));
    } else {
      vars.push(v);
    }
  });
  let u = typeof expression === "string" ? exp(expression).obj() : expression;
  u = simplify(u);
  if (isSum(u)) {
    const rs = u.args.map((x) => {
      return monDeg(x, vars).int;
    });
    const res = Math.max(...rs);
    return int(res);
  }
  return monDeg(expression, variables);
}

export function vars(expression: MathObj | string) {
  const f = (expression: MathObj | string): Set<string> => {
    let u = typeof expression === "string" ? exp(expression).obj() : expression;
    u = simplify(u);
    if (isInt(u) || isFrac(u)) {
      return cset<string>();
    }
    if (isPower(u)) {
      if (isInt(u.exponent) && u.exponent.value() > 1) {
        return cset(u.base.toString());
      } else {
        return cset(u.toString());
      }
    }
    if (isSum(u)) {
      const x = u.args.reduce((p, c) => union(p, f(c)), cset<string>());
      return x;
    }
    if (isProduct(u)) {
      const sumOperands: MathObj[] = [];
      const nonSumOperands: MathObj[] = [];
      u.args.forEach((arg) => {
        if (isSum(arg)) {
          sumOperands.push(arg);
        } else {
          nonSumOperands.push(arg);
        }
      });
      const x = Array.from(
        nonSumOperands.reduce((p, c) => union(p, f(c)), cset<string>())
      ).map((n) => n.toString());
      const result = union(
        cset(...sumOperands.map((s) => s.toString())),
        cset(...x)
      );
      return result;
    }
    return cset(u.toString());
  };

  const out = f(expression);
  return Array.from(out);
}

function coefficientMonomialGPE(
  expression: string | MathObj,
  variable: string | Sym
): Undefined | [MathObj, Int] {
  let u = typeof expression === "string" ? exp(expression).obj() : expression;
  u = simplify(u);
  const x = typeof variable === "string" ? sym(variable) : variable;
  if (u.equals(x)) {
    return tuple(int(1), int(1));
  } else if (isPower(u)) {
    const base = u.base;
    const exponent = u.exponent;
    if (base.equals(x) && isInt(exponent) && exponent.int > 1) {
      return tuple(int(1), exponent);
    }
  } else if (isProduct(u)) {
    let m = int(0);
    let c: MathObj = u;
    for (let i = 0; i < u.args.length; i++) {
      const f = coefficientMonomialGPE(u.args[i], x);
      if (!Array.isArray(f) && isUndefined(f)) {
        return UNDEFINED();
      } else if (isReal(f[1]) && f[1].value() !== 0) {
        m = f[1];
        c = quot(u, pow(x, m));
      }
    }
    return tuple(c, m);
  }
  if (freeOf(u, [x])) {
    return tuple(u, int(0));
  } else {
    return UNDEFINED();
  }
}

export function coefGPE(
  expression: string | MathObj,
  variable: string | Sym,
  J: number | Int
) {
  let u = typeof expression === "string" ? exp(expression).obj() : expression;
  u = simplify(u);
  const x = typeof variable === "string" ? sym(variable) : variable;
  const j = typeof J === "number" ? int(J) : J;
  if (!isSum(u)) {
    const f = coefficientMonomialGPE(u, x);
    if (!Array.isArray(f) && isUndefined(f)) {
      return UNDEFINED();
    } else {
      if (j.equals(f[1])) {
        return f[0];
      } else {
        return int(0);
      }
    }
  } else {
    if (u.equals(x)) {
      if (j.equals(int(1))) {
        return int(1);
      } else {
        return int(0);
      }
    }
    let c: MathObj = int(0);
    for (let i = 0; i < u.args.length; i++) {
      const f = coefficientMonomialGPE(u.args[i], x);
      if (!Array.isArray(f) && isUndefined(f)) {
        return UNDEFINED();
      } else if (f[1].equals(j)) {
        c = sum(c, f[0]);
      }
    }
    return simplify(c);
  }
}

function expandProduct(r: MathObj, s: MathObj): MathObj {
  if (isSum(r)) {
    const f = r.args[0];
    const epfs = expandProduct(f, s);
    const rmf = simplify(diff(r, f));
    const eprmfs = expandProduct(rmf, s);
    const out = sum(epfs, eprmfs);
    return simplify(out);
  }
  if (isSum(s)) {
    const epsr = expandProduct(s, r);
    return simplify(epsr);
  }
  const out = prod(r, s);
  return simplify(out);
}

/**
 * Given an algebraic expression, returns the expanded form
 * of the expression.
 * @param expression The expression to expand.
 * @returns A MathObj corresponding to the expanded form.
 */
export function expand(expression: MathObj | string): MathObj {
  const u = typeof expression === "string" ? exp(expression).obj() : expression;
  if (isSum(u)) {
    const out = u.args.map((arg) => expand(arg));
    return simplify(sum(...out));
  }
  if (isProduct(u)) {
    const v = u.args[0];
    const ev = expand(v);
    const udv = simplify(quot(u, v));
    const eudv = expand(udv);
    const out = expandProduct(ev, eudv);
    return simplify(out);
  }
  if (isPower(u)) {
    const base = u.base;
    const exponent = u.exponent;
    if (isInt(exponent) && exponent.int >= 2) {
      const exprs = [];
      for (let i = 0; i < exponent.int; i++) {
        const aeb = expand(base);
        exprs.push(aeb);
      }
      const p = prod(...exprs);
      return expand(p);
    }
  }
  return u;
}

/**
 * Given the list of `expressions`, returns true if the list
 * contains an element that satisfies the `test` function.
 *
 * @example
 * ~~~ts
 * // reduces to true iff any of [a,b,c]
 * // is a sum.
 * hasExpr([a,b,c] (e) => isSum(e))
 * ~~~
 */
function hasExpr(expressions: MathObj[], test: (element: MathObj) => boolean) {
  for (let i = 0; i < expressions.length; i++) {
    const expr = expressions[i];
    if (test(expr)) {
      return true;
    }
  }
  return false;
}

export function distribute(𝑢: string | MathObj) {
  // const u = typeof 𝑢 === 'string' ? exp(𝑢).obj() : 𝑢;
  const u = typeof 𝑢 === "string" ? simplify(𝑢) : 𝑢;
  // If u is not a product, return u.
  // There's nothing to distribute.
  if (!isProduct(u)) {
    return u;
  }
  // u is a product.
  // if u does not have an operand that is a sum,
  // return u.
  if (!hasExpr(u.args, isSum)) {
    return u;
  }

  // u has an operand that is a sum.
  // Let v be the first operand that is a sum.
  // We form a new sum by multiplying the remaining
  // operands of u by each of operand of v.
  // Example:
  // a(b + c)(d + e)
  //    ^ This is the first operand that's sum.
  //      This is v.
  // So, we make a new sum by multiplying each
  // of the remaining operands:
  //  a, (d + e)
  // with each operand of v, which are `b` and `c`.
  // [b * a * (d + e)] + [c * a * (d + e)]

  // Approach: First, we locate the first operand
  // that's a sum. We do that by looping through
  // u's operands, checking whether the operand is
  // a sum. On the first operand that's a sum, we
  // note the index.
  let index_of_first_sum_operand = 0;
  for (let i = 0; i < u.args.length; i++) {
    const arg = u.args[i];
    if (isSum(arg)) {
      index_of_first_sum_operand = i;
      break;
    }
  }
  // Now we have the index of the first sum operand.
  // Save it as `v`.
  const v = u.args[index_of_first_sum_operand] as Sum;
  // Now create a new operand list with all the operands
  // of u, without v.
  const remaining_operands: MathObj[] = [];
  for (let i = 0; i < u.args.length; i++) {
    if (i !== index_of_first_sum_operand) {
      remaining_operands.push(u.args[i]);
    }
  }
  // We now have the remaining operands of u, without v.
  // Multiply each operand in remaining_operands with each operand
  // of v. We save these resulting products in a new operand list.
  const new_products: Product[] = [];
  for (let i = 0; i < v.args.length; i++) {
    const v_arg = v.args[i];
    let prodOfRest: MathObj | Product = prod(...remaining_operands);
    // handle the special edge case where there's only one
    // operand in remaining_operands
    if ((prodOfRest as Product).args.length === 1) {
      prodOfRest = (prodOfRest as Product).args[0];
    }
    const product = prod(v_arg, prodOfRest);
    new_products.push(product);
  }
  // now return the sum of these new products.
  return simplify(sum(...new_products));
}

/**
 * Where `𝑢` is a general monomial expression and `𝑆`
 * is an array of generalized variables, returns a pair with
 * the coefficient part and variable part of `𝑢`.
 */
export function coeffVarMonomial(𝑢: MathObj | string, 𝑆: (string | MathObj)[]) {
  const u = typeof 𝑢 === "string" ? exp(𝑢).obj() : 𝑢;
  const v = 𝑆.map((x) => (typeof x === "string" ? exp(x).obj() : x));
  if (!isMonomial(u, v)) {
    return UNDEFINED();
  }
  const loop = (
    coefficientPart: MathObj,
    variables: MathObj[]
  ): [MathObj, MathObj] => {
    if (variables.length === 0) {
      const variablePart = simplify(quot(u, coefficientPart));
      return tuple(coefficientPart, variablePart);
    } else if (freeOf(u, [variables[0]])) {
      return loop(coefficientPart, cdr(variables));
    } else {
      const q = simplify(quot(coefficientPart, variables[0]));
      const result = loop(q, cdr(variables));
      return result;
    }
  };
  const [a, b] = loop(u, v);
  return tuple(simplify(a), simplify(b));
}

export function collectTerms(𝑢: string | MathObj, 𝑆: (string | MathObj)[]) {
  let u = typeof 𝑢 === "string" ? exp(𝑢).obj() : 𝑢;
  const S = 𝑆.map((x) => (typeof x === "string" ? exp(x).obj() : x));
  u = simplify(u);
  if (!isSum(u)) {
    const cvm = coeffVarMonomial(u, S);
    if (cvm instanceof Undefined) {
      return UNDEFINED();
    }
    return u;
  } else {
    if (listx(S).has(u)) {
      return u;
    }
    let N = 0;
    const T: Record<number, MathObj[]> = {};
    for (let i = 0; i < u.args.length; i++) {
      const f = coeffVarMonomial(u.operandAt(i), S);
      if (f instanceof Undefined) {
        return UNDEFINED();
      } else {
        let j = 1;
        let combined = false;
        while (!combined && j <= N) {
          if (f[1].equals(T[j][1])) {
            T[j] = tuple(sum(f[0], T[j][0]), f[1]);
            combined = true;
          }
          j = j + 1;
        }
        if (!combined) {
          T[N + 1] = f;
          N = N + 1;
        }
      }
    }
    let v: MathObj = int(0);
    for (let j = 1; j <= N; j++) {
      v = sum(v, prod(T[j][0], T[j][1]));
    }
    return simplify(v);
  }
}

// § Nodekind Enum
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
}

interface Visitor<T> {
  blockStmt(node: BlockStmt): T;
  exprStmt(node: ExprStmt): T;
  fnStmt(node: FnStmt): T;
  ifStmt(node: IfStmt): T;
  printStmt(node: PrintStmt): T;
  returnStmt(node: ReturnStmt): T;
  variableStmt(node: VariableStmt): T;
  whileStmt(node: WhileStmt): T;
  classStmt(node: ClassStmt): T;
  // expressions
  indexExpr(node: IndexExpr): T;
  algebraString(node: AlgebraString): T;
  tupleExpr(node: TupleExpr): T;
  vectorExpr(node: VectorExpr): T;
  matrixExpr(node: MatrixExpr): T;
  relationExpr(node: RelationExpr): T;
  assignmentExpr(node: AssignmentExpr): T;
  nativeCallExpr(node: NativeCallExpr): T;
  negExpr(node: NegExpr): T;
  posExpr(node: PosExpr): T;
  factorialExpr(node: FactorialExpr): T;
  notExpr(node: NotExpr): T;
  vectorBinex(node: VectorBinex): T;
  algebraicBinex(node: AlgebraicBinex): T;
  logicalBinex(node: LogicalBinex): T;
  callExpr(node: CallExpr): T;
  parendExpr(node: ParendExpr): T;
  getExpr(node: GetExpr): T;
  setExpr(node: SetExpr): T;
  superExpr(node: SuperExpr): T;
  thisExpr(node: ThisExpr): T;
  stringConcat(node: StringConcatExpr): T;
  sym(node: Identifier): T;
  string(node: StringLit): T;
  bool(node: Bool): T;
  nil(node: Nil): T;
  integer(node: Integer): T;
  float(node: Float): T;
  bigInteger(node: BigInteger): T;
  sciNum(node: SciNum): T;
  frac(node: Frac): T;
  numConst(node: NumConst): T;
}

/** A node corresponding to some syntax tree node. */
abstract class TreeNode {
  abstract kind(): nodekind;
}

/** A node corresponding to an abstract syntax tree node. */
abstract class ASTNode extends TreeNode {
  abstract accept<T>(visitor: Visitor<T>): T;
  abstract toString(): string;
  abstract isStatement(): this is Statement;
  abstract isExpr(): this is Expr;
}

/** A node corresponding to a statement node. */
abstract class Statement extends ASTNode {
  isStatement(): this is Statement {
    return true;
  }
  isExpr(): this is Expr {
    return false;
  }
}

/** A node corresponding to a class statement node. */
class ClassStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.classStmt(this);
  }
  kind(): nodekind {
    return nodekind.class_statement;
  }
  toString(): string {
    return `class-statement`;
  }
  $name: Token;
  $methods: FnStmt[];
  constructor(name: Token, methods: FnStmt[]) {
    super();
    this.$name = name;
    this.$methods = methods;
  }
}

/** Returns a new class statement node. */
function $classStmt(name: Token, methods: FnStmt[]) {
  return new ClassStmt(name, methods);
}

/** A node corresponding to a block statement node. */
class BlockStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.blockStmt(this);
  }
  kind(): nodekind {
    return nodekind.block_statement;
  }
  toString(): string {
    return "block-statement";
  }
  /** The statements comprising this block. */
  $statements: Statement[];
  constructor(statements: Statement[]) {
    super();
    this.$statements = statements;
  }
}

/** Returns true, and asserts, iff the given node is a block statement node. */
function isBlockStmt(node: ASTNode): node is BlockStmt {
  return node.kind() === nodekind.block_statement;
}

/** Returns a new block statement node. */
function $blockStmt(statements: Statement[]) {
  return new BlockStmt(statements);
}

/** A node corresponding to an expression statement. */
class ExprStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.exprStmt(this);
  }
  kind(): nodekind {
    return nodekind.expression_statement;
  }
  toString(): string {
    return "expression-statement";
  }
  $expression: Expr;
  constructor(expression: Expr) {
    super();
    this.$expression = expression;
  }
}

/** Returns a new Expression Statement. */
function $exprStmt(expression: Expr) {
  return new ExprStmt(expression);
}

/** A node corresponding to a function declaration statement. */
class FnStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.fnStmt(this);
  }
  kind(): nodekind {
    return nodekind.function_declaration;
  }
  toString(): string {
    return "fn-declaration";
  }
  $name: Token<token_type.symbol>;
  $params: Identifier[];
  $body: Statement[];
  constructor(
    name: Token<token_type.symbol>,
    params: Identifier[],
    body: Statement[]
  ) {
    super();
    this.$name = name;
    this.$params = params;
    this.$body = body;
  }
}

/** Returns a new function declaration statement. */
function $fnStmt(
  name: Token<token_type.symbol>,
  params: Identifier[],
  body: Statement[]
) {
  return new FnStmt(name, params, body);
}

/** An AST node corresponding to an if-then statement. */
class IfStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.ifStmt(this);
  }
  kind(): nodekind {
    return nodekind.if_statement;
  }
  toString(): string {
    return "if-statement";
  }
  $keyword: Token;
  $condition: Expr;
  $then: Statement;
  $alt: Statement;
  constructor(
    keyword: Token,
    condition: Expr,
    then: Statement,
    alt: Statement
  ) {
    super();
    this.$keyword = keyword;
    this.$condition = condition;
    this.$then = then;
    this.$alt = alt;
  }
}

/** Returns a new if-then statement. */
function $ifStmt(
  keyword: Token,
  condition: Expr,
  then: Statement,
  alt: Statement
) {
  return new IfStmt(keyword, condition, then, alt);
}

/** An AST node corresponding to a print statement. */
class PrintStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.printStmt(this);
  }
  kind(): nodekind {
    return nodekind.print_statement;
  }
  toString(): string {
    return "print-statement";
  }
  $keyword: Token;
  $expression: Expr;
  constructor(keyword: Token, expression: Expr) {
    super();
    this.$keyword = keyword;
    this.$expression = expression;
  }
}

/** Returns a new print statement node. */
function $printStmt(keyword: Token, expression: Expr) {
  return new PrintStmt(keyword, expression);
}

/** A node corresponding to a return statement. */
class ReturnStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.returnStmt(this);
  }
  kind(): nodekind {
    return nodekind.return_statement;
  }
  toString(): string {
    return "return-statement";
  }
  $keyword: Token;
  $value: Expr;
  constructor(keyword: Token, value: Expr) {
    super();
    this.$keyword = keyword;
    this.$value = value;
  }
}

/** Returns a new return statement node. */
function $returnStmt(keyword: Token, expression: Expr) {
  return new ReturnStmt(keyword, expression);
}

class VariableStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.variableStmt(this);
  }
  kind(): nodekind {
    return nodekind.variable_declaration;
  }
  toString(): string {
    return "variable-declaration";
  }
  $variable: Identifier;
  $value: Expr;
  $mutable: boolean;
  constructor(variable: Identifier, value: Expr, mutable: boolean) {
    super();
    this.$variable = variable;
    this.$value = value;
    this.$mutable = mutable;
  }
}

/** Returns a new 'var' statement node. */
function $var(symbol: Identifier, value: Expr) {
  return new VariableStmt(symbol, value, true);
}

/** Returns a new 'let' statement node. */
function $let(symbol: Identifier, value: Expr) {
  return new VariableStmt(symbol, value, false);
}

/** An AST node corresponding to a while statement. */
class WhileStmt extends Statement {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.whileStmt(this);
  }
  kind(): nodekind {
    return nodekind.while_statement;
  }
  toString(): string {
    return "while-statement";
  }
  $keyword: Token;
  $condition: Expr;
  $body: Statement;
  constructor(keyword: Token, condition: Expr, body: Statement) {
    super();
    this.$keyword = keyword;
    this.$condition = condition;
    this.$body = body;
  }
}

/** Returns a new while statement node. */
function $while(keyword: Token, condition: Expr, body: Statement) {
  return new WhileStmt(keyword, condition, body);
}

/** A node corresponding to an expression node. */
abstract class Expr extends ASTNode {
  isStatement(): this is Statement {
    return false;
  }
  isExpr(): this is Expr {
    return true;
  }
}

/** An AST node corresponding to an indexing expression. */
class IndexExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.indexExpr(this);
  }
  kind(): nodekind {
    return nodekind.index_expression;
  }
  toString(): string {
    return `${this.$list.toString()}[${this.$index.toString()}]`;
  }
  $list: Expr;
  $index: Expr;
  $op: Token;
  constructor(list: Expr, index: Expr, op: Token) {
    super();
    this.$list = list;
    this.$index = index;
    this.$op = op;
  }
}

/** Returns a new indexing expression node. */
function $index(list: Expr, index: Expr, op: Token) {
  return new IndexExpr(list, index, op);
}

/** An AST node corresponding to an algebra string. */
class AlgebraString extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.algebraString(this);
  }
  kind(): nodekind {
    return nodekind.algebra_string;
  }
  toString(): string {
    return this.$expression.toString();
  }
  $expression: MathObj;
  $op: Token;
  constructor(expression: MathObj, op: Token) {
    super();
    this.$expression = expression;
    this.$op = op;
  }
}

/** Returns a new algebra string node. */
function $algebraString(expression: MathObj, op: Token) {
  return new AlgebraString(expression, op);
}

/** A node corresponding to a tuple expression. */
class TupleExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.tupleExpr(this);
  }
  kind(): nodekind {
    return nodekind.tuple_expression;
  }
  toString(): string {
    const elems = this._elements.map((e) => e.toString()).join(",");
    return `(${elems})`;
  }
  _elements: LinkedList<Expr>;
  constructor(elements: Expr[]) {
    super();
    this._elements = linkedList(...elements);
  }
}

/** Returns a new tuple expression. */
function $tuple(elements: Expr[]) {
  return new TupleExpr(elements);
}

class VectorExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.vectorExpr(this);
  }
  kind(): nodekind {
    return nodekind.vector_expression;
  }
  toString(): string {
    const elems = this._elements.map((e) => e.toString()).join(",");
    return `[${elems}]`;
  }
  $op: Token;
  _elements: Expr[];
  constructor(op: Token, elements: Expr[]) {
    super();
    this.$op = op;
    this._elements = elements;
  }
}

/** Returns a new vector expression node. */
function $vector(op: Token, elements: Expr[]) {
  return new VectorExpr(op, elements);
}

/** Returns true, and asserts, if the given node is a vector expression node. */
function isVectorExpr(node: ASTNode): node is VectorExpr {
  return node.kind() === nodekind.vector_expression;
}

/** A node corresponding to a matrix expression. */
class MatrixExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.matrixExpr(this);
  }
  kind(): nodekind {
    return nodekind.matrix_expression;
  }
  toString(): string {
    const vectors = this._vectors.map((v) => v.toString()).join(",");
    return `[${vectors}]`;
  }
  $op: Token;
  _vectors: VectorExpr[];
  $rowCount: number;
  $colCount: number;
  constructor(vectors: VectorExpr[], rows: number, columns: number, op: Token) {
    super();
    this._vectors = vectors;
    this.$rowCount = rows;
    this.$colCount = columns;
    this.$op = op;
  }
}

/** Returns a new matrix expression. */
function $matrix(
  vectors: VectorExpr[],
  rowCount: number,
  colCount: number,
  op: Token
) {
  return new MatrixExpr(vectors, rowCount, colCount, op);
}

/** A node corresponding to a symbol. */
class Identifier extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.sym(this);
  }
  kind(): nodekind {
    return nodekind.symbol;
  }
  toString(): string {
    return this.$symbol.$lexeme;
  }
  $symbol: Token<token_type.symbol>;
  constructor(symbol: Token<token_type.symbol>) {
    super();
    this.$symbol = symbol;
  }
}

/** Returns a new symbol node. */
function $sym(symbol: Token<token_type.symbol>) {
  return new Identifier(symbol);
}

/** Returns true, and asserts, if the given node is a symbol node. */
function isSymbol(node: ASTNode): node is Identifier {
  return node.kind() === nodekind.symbol;
}

/** An AST node corresponding to an assignment expression. */
class AssignmentExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.assignmentExpr(this);
  }
  kind(): nodekind {
    return nodekind.assignment_expression;
  }
  toString(): string {
    return `${this.$symbol.toString()} = ${this.$value.toString()}`;
  }
  $symbol: Identifier;
  $value: Expr;
  constructor(symbol: Identifier, value: Expr) {
    super();
    this.$symbol = symbol;
    this.$value = value;
  }
}

/** Returns a new assignment expression node. */
function $assign(symbol: Identifier, value: Expr) {
  return new AssignmentExpr(symbol, value);
}

/** An AST node corresponding to a native call expression.  */
class NativeCallExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.nativeCallExpr(this);
  }
  toString(): string {
    const args = this.$args.map((x) => x.toString()).join(",");
    return `${this.$name.$lexeme}(${args})`;
  }
  kind(): nodekind {
    return nodekind.native_call;
  }
  $name: Token<token_type.native>;
  $args: Expr[];
  constructor(name: Token<token_type.native>, args: Expr[]) {
    super();
    this.$name = name;
    this.$args = args;
  }
}

/** Returns a new native call expression node. */
function $nativeCall(name: Token<token_type.native>, args: Expr[]) {
  return new NativeCallExpr(name, args);
}

/** An AST node corresponding to algebraic negation */
class NegExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.negExpr(this);
  }
  kind(): nodekind {
    return nodekind.negation_expression;
  }
  toString(): string {
    return `-${this.$arg.toString()}`;
  }
  $op: Token<token_type.minus>;
  $arg: Expr;
  constructor(op: Token<token_type.minus>, arg: Expr) {
    super();
    this.$op = op;
    this.$arg = arg;
  }
}

/** Returns a new positivation expression node. */
function $neg(op: Token<token_type.minus>, arg: Expr) {
  return new NegExpr(op, arg);
}

/** An AST node corresponding to algebraic positivization. */
class PosExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.posExpr(this);
  }
  kind(): nodekind {
    return nodekind.positivization_expression;
  }
  toString(): string {
    return `+${this.$arg.toString()}`;
  }
  $op: Token<token_type.plus>;
  $arg: Expr;
  constructor(op: Token<token_type.plus>, arg: Expr) {
    super();
    this.$op = op;
    this.$arg = arg;
  }
}

/** Returns a new positivization expression node. */
function $pos(op: Token<token_type.plus>, arg: Expr) {
  return new PosExpr(op, arg);
}

/** A node corresponding to a factorial expression. */
class FactorialExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.factorialExpr(this);
  }
  kind(): nodekind {
    return nodekind.factorial_expression;
  }
  toString(): string {
    return `${this.$arg.toString()}!`;
  }
  $op: Token<token_type.bang>;
  $arg: Expr;
  constructor(op: Token<token_type.bang>, arg: Expr) {
    super();
    this.$op = op;
    this.$arg = arg;
  }
}

/** Returns a new factorial expression node. */
function $factorial(op: Token<token_type.bang>, arg: Expr) {
  return new FactorialExpr(op, arg);
}

/** A node corresponding to a not expression. */
class NotExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.notExpr(this);
  }
  kind(): nodekind {
    return nodekind.not_expression;
  }
  toString(): string {
    return `not ${this.$arg.toString()}`;
  }
  $op: Token<token_type.not>;
  $arg: Expr;
  constructor(op: Token<token_type.not>, arg: Expr) {
    super();
    this.$op = op;
    this.$arg = arg;
  }
}

/** Returns a new Not Expression node. */
function $not(op: Token<token_type.not>, arg: Expr) {
  return new NotExpr(op, arg);
}

/** A token corresponding to a vectory binary operator */
type VectorBinop =
  | token_type.dot_add // scalar/pairwise addition
  | token_type.dot_minus // scalar/pairwise subtraction
  | token_type.dot_star // scalar/pairwise multiplication
  | token_type.dot_caret // scalar/pairwise exponentiation
  | token_type.at; // dot product

/** An AST node corresponding to a binary expression node. */
class VectorBinex extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.vectorBinex(this);
  }
  kind(): nodekind {
    return nodekind.vector_binex;
  }
  toString(): string {
    const left = this.$left.toString();
    const op = this.$op.$lexeme;
    const right = this.$right.toString();
    return `${left} ${op} ${right}`;
  }
  $left: Expr;
  $op: Token<VectorBinop>;
  $right: Expr;
  constructor(left: Expr, op: Token<VectorBinop>, right: Expr) {
    super();
    this.$left = left;
    this.$op = op;
    this.$right = right;
  }
}

/** Returns a new vector binary expression. */
function $vectorBinex(left: Expr, op: Token<VectorBinop>, right: Expr) {
  return new VectorBinex(left, op, right);
}

/** A union of all algebraic operator token types. */
type AlgebraicOp =
  | token_type.plus // addition; 1 + 2 -> 3
  | token_type.star // multiplication; 3 * 4 -> 12
  | token_type.caret // exponentiation; 3^2 -> 9
  | token_type.slash // division; 3/6 -> 1/2 -> 0.5
  | token_type.minus // subtraction; 5 - 2 -> 3
  | token_type.rem // remainder; -10 rem 3 -> -1
  | token_type.mod // modulo; -10 mod 3 -> 2
  | token_type.percent // percent operator; 3 % 325 -> 9.75
  | token_type.div; // int division (divide number, round down to nearest int); 10 div 3 -> 3

/** An AST node corresponding to an algebraic binary expression. */
class AlgebraicBinex extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.algebraicBinex(this);
  }
  kind(): nodekind {
    return nodekind.algebraic_binex;
  }
  toString(): string {
    const left = this.$left.toString();
    const right = this.$right.toString();
    const op = this.$op.$lexeme;
    return `${left} ${op} ${right}`;
  }
  $left: Expr;
  $op: Token<AlgebraicOp>;
  $right: Expr;
  constructor(left: Expr, op: Token<AlgebraicOp>, right: Expr) {
    super();
    this.$left = left;
    this.$op = op;
    this.$right = right;
  }
}

/** Returns a new algebraic binary expression. */
function $algebraicBinex(left: Expr, op: Token<AlgebraicOp>, right: Expr) {
  return new AlgebraicBinex(left, op, right);
}

/** An AST node corresponding to a function call expression. */
class CallExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.callExpr(this);
  }
  kind(): nodekind {
    return nodekind.call_expression;
  }
  toString(): string {
    const callee = this.$callee.toString();
    const args = this.$args.map((arg) => arg.toString()).join(",");
    return `${callee}(${args})`;
  }
  $callee: Expr;
  $paren: Token;
  $args: Expr[];
  constructor(callee: Expr, paren: Token, args: Expr[]) {
    super();
    this.$callee = callee;
    this.$paren = paren;
    this.$args = args;
  }
}

/** Returns a new call expression. */
function $call(callee: Expr, paren: Token, args: Expr[]) {
  return new CallExpr(callee, paren, args);
}

/** An AST node corresponding to a parenthesized expression. */
class ParendExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.parendExpr(this);
  }
  kind(): nodekind {
    return nodekind.parend_expression;
  }
  toString(): string {
    return `(${this.$inner.toString()})`;
  }
  $inner: Expr;
  constructor(innerExpression: Expr) {
    super();
    this.$inner = innerExpression;
  }
}

/** Returns a new parenthesized expression node. */
function $parend(innerExpression: Expr) {
  return new ParendExpr(innerExpression);
}

/** Returns true, and asserts, if the given node is a parenthesized-expression node. */
function isParendExpr(node: ASTNode): node is ParendExpr {
  return node.kind() === nodekind.parend_expression;
}

/** An AST node corresponding to a string literal. */
class StringLit extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.string(this);
  }
  kind(): nodekind {
    return nodekind.string;
  }
  toString(): string {
    return this.$value;
  }
  $value: string;
  constructor(value: string) {
    super();
    this.$value = value;
  }
}

/** Returns a new string literal node. */
function $string(value: string) {
  return new StringLit(value);
}

/** An AST node corresponding to a Boolean literal. */
class Bool extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.bool(this);
  }
  kind(): nodekind {
    return nodekind.bool;
  }
  toString(): string {
    return `${this.$value}`;
  }
  $value: boolean;
  constructor(value: boolean) {
    super();
    this.$value = value;
  }
}

/** Returns a new Boolean literal node. */
function $bool(value: boolean) {
  return new Bool(value);
}

/** An AST node corresponding to a nil value. */
class Nil extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.nil(this);
  }
  kind(): nodekind {
    return nodekind.nil;
  }
  toString(): string {
    return `nil`;
  }
  $value: null;
  constructor() {
    super();
    this.$value = null;
  }
}

/** Returns a new nil node. */
function $nil() {
  return new Nil();
}

/** An AST node corresponding to an integer. */
class Integer extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.integer(this);
  }
  kind(): nodekind {
    return nodekind.integer;
  }
  toString(): string {
    return `${this.$value}`;
  }
  $value: number;
  constructor(value: number) {
    super();
    this.$value = value;
  }
}

/** Returns a new integer node. */
function $int(value: number) {
  return new Integer(value);
}

class Float extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.float(this);
  }
  kind(): nodekind {
    return nodekind.float;
  }
  toString(): string {
    return `${this.$value}`;
  }
  $value: number;
  constructor(value: number) {
    super();
    this.$value = value;
  }
}

/** Returns a new float node. */
function $float(value: number) {
  return new Float(value);
}

class BigInteger extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.bigInteger(this);
  }
  kind(): nodekind {
    return nodekind.big_integer;
  }
  toString(): string {
    return `${this.$value}`;
  }
  $value: bigint;
  constructor(value: bigint) {
    super();
    this.$value = value;
  }
}

class SciNum extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.sciNum(this);
  }
  kind(): nodekind {
    return nodekind.scientific_number;
  }
  toString(): string {
    return this.$value.toString();
  }
  $value: Exponential;
  constructor(value: Exponential) {
    super();
    this.$value = value;
  }
}

/** An AST node corresponding to a fraction. */
class Frac extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.frac(this);
  }
  kind(): nodekind {
    return nodekind.frac;
  }
  toString(): string {
    return this.$value.toString();
  }
  $value: Fraction;
  constructor(value: Fraction) {
    super();
    this.$value = value;
  }
}

/* Returns a new fraction node. */
function $frac(value: Fraction) {
  return new Frac(value);
}

/** Returns an empty statement. */
function emptyStmt() {
  return $exprStmt($nil());
}

/** An AST node corresponding to a numeric constant expression. */
class NumConst extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.numConst(this);
  }
  kind(): nodekind {
    return nodekind.numeric_constant;
  }
  toString(): string {
    return this.$sym;
  }
  $sym: string;
  $value: number;
  constructor(sym: string, value: number) {
    super();
    this.$sym = sym;
    this.$value = value;
  }
}

/** Returns a new numeric constant node. */
function $numConst(symbol: string, value: number) {
  return new NumConst(symbol, value);
}

/** A token type corresponding to a binary logic operator. */
type BinaryLogicOp =
  | token_type.and
  | token_type.nand
  | token_type.nor
  | token_type.xnor
  | token_type.xor
  | token_type.or;

/** An AST node corresponding to a logical binary expression. */
class LogicalBinex extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.logicalBinex(this);
  }
  kind(): nodekind {
    return nodekind.logical_binex;
  }
  toString(): string {
    const left = this.$left.toString();
    const op = this.$op.$lexeme;
    const right = this.$right.toString();
    return `${left} ${op} ${right}`;
  }
  $left: Expr;
  $op: Token<BinaryLogicOp>;
  $right: Expr;
  constructor(left: Expr, op: Token<BinaryLogicOp>, right: Expr) {
    super();
    this.$left = left;
    this.$op = op;
    this.$right = right;
  }
}

/** Returns a new logical binary expression node. */
function $logicalBinex(left: Expr, op: Token<BinaryLogicOp>, right: Expr) {
  return new LogicalBinex(left, op, right);
}

/** A token type corresponding to a relational operator. */
type RelationOp =
  | token_type.less
  | token_type.greater
  | token_type.equal_equal
  | token_type.bang_equal
  | token_type.greater_equal
  | token_type.less_equal;

/** An AST node corresponding to a relation expression node. */
class RelationExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.relationExpr(this);
  }
  kind(): nodekind {
    return nodekind.relation_expression;
  }
  toString(): string {
    const left = this.$left.toString();
    const op = this.$op.$lexeme;
    const right = this.$right.toString();
    return `${left} ${op} ${right}`;
  }
  $left: Expr;
  $op: Token<RelationOp>;
  $right: Expr;
  constructor(left: Expr, op: Token<RelationOp>, right: Expr) {
    super();
    this.$left = left;
    this.$op = op;
    this.$right = right;
  }
}

/** Returns a new relation expression node. */
function $relation(left: Expr, op: Token<RelationOp>, right: Expr) {
  return new RelationExpr(left, op, right);
}

/** An AST node corresponding to a get expression. */
class GetExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.getExpr(this);
  }
  kind(): nodekind {
    return nodekind.get_expression;
  }
  toString(): string {
    return "";
  }
  $object: Expr;
  $name: Token;
  constructor(object: Expr, name: Token) {
    super();
    this.$object = object;
    this.$name = name;
  }
}

/** Returns a new Get Expression node. */
function $get(object: Expr, name: Token) {
  return new GetExpr(object, name);
}

/** Returns true, and asserts, if the given node is a get-expression node. */
function isGetExpr(node: ASTNode): node is GetExpr {
  return node.kind() === nodekind.get_expression;
}

/* An AST node corresponding to a string concatenation expression. */
class StringConcatExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.stringConcat(this);
  }
  kind(): nodekind {
    return nodekind.string_concatenation;
  }
  toString(): string {
    const left = this.$left.toString();
    const right = this.$right.toString();
    return `${left} & ${right}`;
  }
  $left: Expr;
  $op: Token<token_type.ampersand>;
  $right: Expr;
  constructor(left: Expr, op: Token<token_type.ampersand>, right: Expr) {
    super();
    this.$left = left;
    this.$op = op;
    this.$right = right;
  }
}

/* Returns a new string concatenation node. */
function $stringConcat(
  left: Expr,
  op: Token<token_type.ampersand>,
  right: Expr
) {
  return new StringConcatExpr(left, op, right);
}

/** An AST node corresponding to a set expression. */
class SetExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.setExpr(this);
  }
  kind(): nodekind {
    return nodekind.set_expression;
  }
  toString(): string {
    return "";
  }
  $object: Expr;
  $name: Token;
  $value: Expr;
  constructor(object: Expr, name: Token, value: Expr) {
    super();
    this.$object = object;
    this.$name = name;
    this.$value = value;
  }
}

/** Returns a new set expression node. */
function $set(object: Expr, name: Token, value: Expr) {
  return new SetExpr(object, name, value);
}

/** An AST node corresponding to a super expression. */
class SuperExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.superExpr(this);
  }
  kind(): nodekind {
    return nodekind.super_expression;
  }
  toString(): string {
    return `super-expression`;
  }
  $method: Token;
  constructor(method: Token) {
    super();
    this.$method = method;
  }
}

/** An AST node corresponding to a this expression. */
class ThisExpr extends Expr {
  accept<T>(visitor: Visitor<T>): T {
    return visitor.thisExpr(this);
  }
  kind(): nodekind {
    return nodekind.this_expression;
  }
  toString(): string {
    return `this`;
  }
  $keyword: Token;
  constructor(keyword: Token) {
    super();
    this.$keyword = keyword;
  }
}

/** Returns a new this-expression node. */
function $this(keyword: Token) {
  return new ThisExpr(keyword);
}

class ParserState<STMT extends TreeNode, EXPR extends TreeNode> {
  $error: null | Err = null;
  private lexer!: ReturnType<typeof lexical>;
  init(source: string) {
    this.lexer = lexical(source);
    this.next();
    return this;
  }
  $prev: Token = Token.empty;
  $cursor: number = -1;
  $peek: Token = Token.empty;
  $current: Token = Token.empty;
  $lastExpression: EXPR;
  $currentExpression: EXPR;
  $lastStmt: nodekind;
  $currentStmt: nodekind;
  constructor(nilExpression: EXPR, emptyStatement: STMT) {
    this.$lastExpression = nilExpression;
    this.$currentExpression = nilExpression;
    this.$lastStmt = emptyStatement.kind();
    this.$currentStmt = emptyStatement.kind();
  }
  /** Returns true if an implicit semicolon is permissible. */
  implicitSemicolonOK() {
    return this.$peek.isType(token_type.end) || this.atEnd();
  }
  /** Returns a new expression (in a RIGHT monad). */
  newExpr<E extends EXPR>(expression: E) {
    const prev = this.$currentExpression;
    this.$currentExpression = expression;
    this.$lastExpression = prev;
    return right(expression);
  }
  /** Returns a new statement (in a LEFT monad). */
  newStmt<S extends STMT>(statement: S) {
    const prev = this.$currentStmt;
    this.$currentStmt = statement.kind();
    this.$lastStmt = prev;
    return right(statement);
  }

  /** Moves the parser state forward. */
  next() {
    this.$cursor++;
    this.$current = this.$peek;
    const nxtToken = this.lexer.scan();
    if (nxtToken.isErrorToken()) {
      this.$error = nxtToken.$literal;
      return Token.end;
    }
    this.$peek = nxtToken;
    return this.$current;
  }
  /** Returns true if there is nothing left to parse in the parser state. */
  atEnd() {
    return this.$peek.isType(token_type.end) || this.$error !== null;
  }

  /** Returns a new error in a LEFT monad. */
  error(message: string, line: number) {
    const e = syntaxError(message, line);
    this.$error = e;
    return left(e);
  }

  /** Returns true if the current token is of the given type. */
  check(type: token_type) {
    if (this.atEnd()) return false;
    return this.$peek.isType(type);
  }

  /** Returns true and moves the parser forward if the next token is of the given type.  */
  nextIs(type: token_type) {
    if (this.$peek.isType(type)) {
      this.next();
      return true;
    }
    return false;
  }
}

/**
 * A function that returns a new parser state.
 * @param nilExpr A nil expression to serve as a placeholder expression.
 * @param emptyStmt An empty statement to serve as a placeholder statement.
 * @returns A new Parser State.
 */
function enstate<EXPR extends TreeNode, STMT extends TreeNode>(
  nilExpr: EXPR,
  emptyStmt: STMT
) {
  return new ParserState(nilExpr, emptyStmt);
}

/** @internal A Pratt parsing function. */
type Parslet<T> = (current: Token, lastNode: T) => Either<Err, T>;

/** @internal An entry within parser’s BP table. The first element is a prefix parslet, the second element is an infix parslet, and the last element is the binding power of the operator. */
type ParsletEntry<T> = [Parslet<T>, Parslet<T>, bp];

/** @internal A record of parslet entries, where each key is a token type (`tt`). */
type BPTable<T> = Record<token_type, ParsletEntry<T>>;

/**
 * @param source - the source code to parse.
 * @returns An object with two methods:
 * 1. parsex - parses a single expression.
 * 2. parset - parses a list of statements.
 */
export function syntax(source: string) {
  /** Begin by initializing the state. */
  const state = enstate<Expr, Statement>($nil(), emptyStmt()).init(source);

  /**
   * The “blank” binding power. This particular binding power
   * is bound either (1) the {@link ___|blank parslet}
   * or (2) parlsets that should not trigger recursive calls.
   */
  const ___o = bp.nil;

  /**
   * The “blank” parslet. This parslet is used as a placeholder.
   * If the {@link expr|expression parser} calls this parslet,
   * then the {@link error} variable is set and parsing shall cease.
   */
  const ___: Parslet<Expr> = (token) => {
    if (state.$error !== null) {
      return left(state.$error);
    } else {
      return state.error(`Unexpected lexeme: ${token.$lexeme}`, token.$line);
    }
  };

  const listExpression: Parslet<Expr> = (op) => {
    let args: Expr[] = [];
    if (!state.nextIs(token_type.left_paren)) {
      return state.error('Expected an opening "("', op.$line);
    }
    if (!state.check(token_type.right_paren)) {
      const arglist = commaSepList(
        (node): node is Expr => node instanceof Expr,
        "Expected an expression"
      );
      if (arglist.isLeft()) return arglist;
      args = arglist.unwrap();
    }
    const paren = state.next();
    if (!paren.isType(token_type.right_paren)) {
      return state.error('Expected a closing ")"', paren.$line);
    }
    return state.newExpr($tuple(args));
  };

  /** Parses a parenthesized expression */
  const primary = () => {
    const innerExpression = expr();
    if (innerExpression.isLeft()) return innerExpression;
    // if (state.nextIs(token_type.comma)) {
    //   const elements: Expr[] = [innerExpression.unwrap()];
    //   do {
    //     const e = expr();
    //     if (e.isLeft()) return e;
    //     elements.push(e.unwrap());
    //   } while (state.nextIs(token_type.comma));
    //   if (!state.nextIs(token_type.right_paren))
    //     return state.error(
    //       `Expected a ")" to close the tuple.`,
    //       state.$current.$line
    //     );
    //   return state.newExpr($tuple(elements));
    // }
    if (!state.nextIs(token_type.right_paren)) {
      return state.error(`Expected a closing ")".`, state.$current.$line);
    }
    return innerExpression.map((e) => $parend(e));
  };

  /**
   * Returns true if the given node kind is of the type
   * that allows implicit multiplication.
   */
  const allowImplicit = (kind: nodekind) =>
    kind === nodekind.algebraic_binex ||
    kind === nodekind.negation_expression ||
    kind === nodekind.float ||
    kind === nodekind.numeric_constant ||
    kind === nodekind.native_call ||
    kind === nodekind.integer ||
    kind === nodekind.parend_expression;

  /** Parses a comma separated list. */
  const commaSepList = <E extends Expr>(
    filter: (e: Expr) => e is E,
    errorMessage: string
  ) => {
    const elements: E[] = [];
    do {
      const e = expr();
      if (e.isLeft()) return e;
      const element = e.unwrap();
      if (!filter(element)) {
        return state.error(errorMessage, state.$current.$line);
      }
      elements.push(element);
    } while (state.nextIs(token_type.comma));
    return right(elements);
  };

  /** Parses a function call expression */
  const funCall = (op: Token, node: Expr) => {
    const callee = node;
    // If the callee is a parenthesized expression, we want to check
    // if this is implicit multiplication.
    // E.g., (x + 2)(y + 9)
    if (isParendExpr(callee) && allowImplicit(callee.$inner.kind())) {
      const left = callee.$inner;
      const r = expr();
      if (r.isLeft()) return r;
      if (!state.nextIs(token_type.right_paren)) {
        return state.error(`Expected a closing ")"`, state.$current.$line);
      }
      const right = r.unwrap();
      const star = token(token_type.star, "*", state.$current.$line);
      return state.newExpr($algebraicBinex(left, star, right));
    }
    let args: Expr[] = [];
    if (!state.check(token_type.right_paren)) {
      const arglist = commaSepList(
        (node): node is Expr => node instanceof Expr,
        "Expected an expression"
      );
      if (arglist.isLeft()) return arglist;
      args = arglist.unwrap();
    }
    const paren = state.next();
    if (!paren.isType(token_type.right_paren)) {
      return state.error('Expected a closing ")', paren.$line);
    }
    return state.newExpr($call(callee, op, args));
  };

  /** Parses a vector expression */
  const vectorExpression = (prev: Token) => {
    const elements: Expr[] = [];
    const vectors: VectorExpr[] = [];
    let rows = 0;
    let columns = 0;
    if (!state.check(token_type.right_bracket)) {
      do {
        const elem = expr();
        if (elem.isLeft()) return elem;
        const element = elem.unwrap();
        // if this element is a vector expression, then we have a matrix
        if (isVectorExpr(element)) {
          rows++;
          columns = element._elements.length;
          vectors.push(element);
        } else {
          elements.push(element);
        }
      } while (state.nextIs(token_type.comma) && !state.atEnd());
    }
    if (!state.nextIs(token_type.right_bracket)) {
      return state.error(`Expected a right bracket "]"`, state.$current.$line);
    }
    if (vectors.length !== 0) {
      if (vectors.length !== columns) {
        return state.error(
          `Encountered a jagged matrix.`,
          state.$current.$line
        );
      }
      return state.newExpr($matrix(vectors, rows, columns, prev));
    }
    return state.newExpr($vector(prev, elements));
  };

  /** Parses an indexing expression. */
  const indexingExpression: Parslet<Expr> = (op, lhs) => {
    const index = expr();
    if (index.isLeft()) return index;
    const rbracket = state.next();
    if (!rbracket.isType(token_type.right_bracket)) {
      return state.error(`Expected a right bracket "]"`, rbracket.$line);
    }
    return state.newExpr($index(lhs, index.unwrap(), op));
  };

  /** Parses a get expression */
  const getExpression = (op: Token, lhs: Expr) => {
    const nxt = state.next();
    if (!nxt.isType(token_type.symbol)) {
      return state.error("Expected a property name", nxt.$line);
    }
    const exp = $get(lhs, nxt);
    if (state.nextIs(token_type.left_paren)) {
      const args: Expr[] = [];
      if (!state.check(token_type.right_paren)) {
        do {
          const x = expr();
          if (x.isLeft()) return x;
          const arg = x.unwrap();
          args.push(arg);
        } while (state.nextIs(token_type.comma));
      }
      const rparen = state.next();
      if (!rparen.isType(token_type.right_paren)) {
        return state.error(`Expected ")" after method arguments`, rparen.$line);
      }
      return state.newExpr($call(exp, op, args));
    }
    return state.newExpr(exp);
  };

  /** Parses an assignment expression */
  const assignment = (op: Token, node: Expr) => {
    if (isSymbol(node)) {
      return expr().chain((n) => state.newExpr($assign(node, n)));
    } else if (isGetExpr(node)) {
      const rhs = expr();
      if (rhs.isLeft()) return rhs;
      return state.newExpr($set(node.$object, node.$name, rhs.unwrap()));
    } else {
      return state.error(
        `Expected a valid assignment target, but got ${node.toString()}`,
        op.$line
      );
    }
  };

  /** Returns a factorial expression parser. */
  const factorialExpression = (op: Token, node: Expr) => {
    if (op.isType(token_type.bang)) {
      return state.newExpr($factorial(op, node));
    }
    return state.error(`Expected "!" but got ${op.$lexeme}`, op.$line);
  };

  /** Returns an increment or decrement parser. */
  const incdec = (operator: "+" | "-" | "*") => (op: Token, node: Expr) => {
    const tt =
      operator === "+"
        ? token_type.plus
        : operator === "*"
        ? token_type.star
        : token_type.minus;
    if (isSymbol(node)) {
      const right = $algebraicBinex(
        node,
        token(tt, operator, op.$line),
        operator === "*" ? node : $int(1)
      );
      return state.newExpr($assign(node, right));
    } else {
      return state.error(
        `Expected the lefthand side of "${operator}${operator}" to be either a variable or property accessor, but got ${node.toString()}`,
        state.$current.$line
      );
    }
  };

  /** Parses a decrement expression. */
  const decrementExpression = incdec("-");

  /** Parses an increment expression. */
  const incrementExpression = incdec("+");

  /** Parses an increment expression. */
  const squareExpression = incdec("+");

  /** Parses a vector infix expression. */
  const vectorInfix: Parslet<Expr> = (op, left) => {
    const p = precof(op.$type);
    return expr(p).chain((right) =>
      state.newExpr($vectorBinex(left, op as Token<VectorBinop>, right))
    );
  };

  /* Parses a comparison expression. */
  const compare = (op: Token, lhs: Expr) => {
    const p = precof(op.$type);
    return expr(p).chain((rhs) => {
      return state.newExpr($relation(lhs, op as Token<RelationOp>, rhs));
    });
  };

  /* Parses a prefix expression. */
  const prefix: Parslet<Expr> = (op) => {
    const p = precof(op.$type);
    const a = expr(p);
    if (a.isLeft()) return a;
    const arg = a.unwrap();
    if (op.isType(token_type.minus)) {
      return state.newExpr($neg(op, arg));
    } else if (op.isType(token_type.plus)) {
      return state.newExpr($pos(op, arg));
    } else {
      return state.error(`Unknown prefix operator "${op.$lexeme}"`, op.$line);
    }
  };

  /* Parses an infix expression. */
  const infix = (op: Token, lhs: Expr) => {
    // Detour to handling complex assignments.
    // E.g., x += 1
    if (state.nextIs(token_type.equal)) {
      if (isSymbol(lhs)) {
        const name = lhs;
        const r = expr();
        if (r.isLeft()) return r;
        const rhs = r.unwrap();
        const value = $algebraicBinex(lhs, op as Token<AlgebraicOp>, rhs);
        return state.newExpr($assign(name, value));
      } else {
        return state.error(
          `Invalid lefthand side of assignment. Expected a variable to the left of "${
            op.$lexeme
          }", but got "${lhs.toString()}"`,
          op.$line
        );
      }
    }
    // actual handling of infix expressions
    const p = precof(op.$type);
    const RHS = expr(p);
    if (RHS.isLeft()) return RHS;
    const rhs = RHS.unwrap();
    return state.newExpr($algebraicBinex(lhs, op as Token<AlgebraicOp>, rhs));
  };

  /* Parses a logical infix expression. */
  const logicInfix = (op: Token, lhs: Expr) => {
    const p = precof(op.$type);
    return expr(p).chain((rhs) => {
      return state.newExpr($logicalBinex(lhs, op as Token<BinaryLogicOp>, rhs));
    });
  };

  /* Parses a logical not expression. */
  const logicNot = (op: Token) => {
    const p = precof(op.$type);
    return expr(p).chain((arg) =>
      state.newExpr($not(op as Token<token_type.not>, arg))
    );
  };

  /* Parses a symbol. */
  const varname: Parslet<Expr> = (op) => {
    if (op.isType(token_type.symbol)) {
      const out = $sym(op);
      return state.newExpr(out);
    } else {
      return state.error(`Unexpected variable "${op.$lexeme}"`, op.$line);
    }
  };

  /* Parses an implicit multiplication. */
  const impMul: Parslet<Expr> = (op, left) => {
    if (op.isType(token_type.symbol)) {
      const right = $sym(op);
      const star = token(token_type.star, "*", op.$line);
      return state.newExpr($algebraicBinex(left, star, right));
    } else {
      return state.error(
        `Expected a symbol for implicit multiplication, but got "${op.$lexeme}"`,
        op.$line
      );
    }
  };

  /* Parses a string literal. */
  const stringLiteral: Parslet<Expr> = (t) => state.newExpr($string(t.$lexeme));

  /* Parses a boolean literal. */
  const boolLiteral: Parslet<Expr> = (op) => {
    if (op.isType(token_type.boolean) && typeof op.$literal === "boolean") {
      return state.newExpr($bool(op.$literal));
    } else {
      return state.error(`Unexpected boolean literal`, op.$line);
    }
  };

  /* Parses a native constant. */
  const constant = (op: Token) => {
    const type = op.$type;
    const erm = `Unexpected constant "${op.$lexeme}"`;
    switch (type) {
      case token_type.nan:
        return state.newExpr($numConst("NaN", NaN));
      case token_type.inf:
        return state.newExpr($numConst("Inf", Infinity));
      case token_type.numeric_constant: {
        switch (op.$lexeme as NativeConstants) {
          case "e":
            return state.newExpr($numConst("e", Math.E));
          case "pi":
            return state.newExpr($numConst("pi", Math.PI));
          case "ln2":
            return state.newExpr($numConst("ln2", Math.LN2));
          case "ln10":
            return state.newExpr($numConst("ln10", Math.LN10));
          case "log10e":
            return state.newExpr($numConst("log10e", Math.LOG10E));
          case "log2e":
            return state.newExpr($numConst("log2e", Math.LOG2E));
          case "sqrt2":
            return state.newExpr($numConst("sqrt2", Math.SQRT2));
        }
      }
      default:
        return state.error(erm, op.$line);
    }
  };

  /* Parses a number */
  const number = (t: Token) => {
    if (t.isNumber()) {
      const out = t.isType(token_type.integer)
        ? state.newExpr($int(t.$literal))
        : state.newExpr($float(t.$literal));
      const peek = state.$peek;
      if (
        peek.isType(token_type.left_paren) ||
        peek.isType(token_type.native) ||
        peek.isType(token_type.symbol)
      ) {
        const r = expr(bp.imul);
        if (r.isLeft()) return r;
        const right = r.unwrap();
        const star = token(token_type.star, "*", peek.$line);
        const left = out.unwrap();
        return state.newExpr($parend($algebraicBinex(left, star, right)));
      }
      return out;
    } else {
      return state.error(`Expected a number, but got "${t.$lexeme}"`, t.$line);
    }
  };

  /* Parses a native call expression. */
  const ncall = (op: Token) => {
    if (!state.nextIs(token_type.left_paren)) {
      return state.error(`Expected a "(" to open the argument list`, op.$line);
    }
    let args: Expr[] = [];
    if (!state.check(token_type.right_paren)) {
      const arglist = commaSepList(
        (e): e is Expr => e instanceof Expr,
        `Expected an expression`
      );
      if (arglist.isLeft()) return arglist;
      args = arglist.unwrap();
    }
    if (!state.nextIs(token_type.right_paren)) {
      return state.error(
        `Expected ")" to close the argument list`,
        state.$current.$line
      );
    }
    return state.newExpr($nativeCall(op as Token<token_type.native>, args));
  };

  /* Parses a string concatenation expression. */
  const concatenation: Parslet<Expr> = (op: Token, left: Expr) => {
    const p = precof(op.$type);
    return expr(p).chain((right) => {
      return state.newExpr(
        $stringConcat(left, op as Token<token_type.ampersand>, right)
      );
    });
  };

  /** Parses a fraction literal. */
  const fract = (op: Token) => {
    if (op.isType(token_type.fraction) && op.$literal instanceof Fraction) {
      return state.newExpr($frac(op.$literal));
    } else {
      return state.error(`Unexpected fraction`, op.$line);
    }
  };

  /* Parses an algebraic string literal */
  const algString = (op: Token) => {
    if (
      op.isType(token_type.algebra_string) &&
      typeof op.$literal === "string"
    ) {
      const algebraString = op.$literal;
      const t = token(token_type.algebra_string, "", op.$line);
      const result = exp(algebraString).obj();
      if (isUndefined(result)) {
        return state.error(result.error, t.$line);
      }
      return state.newExpr($algebraString(result, op));
    } else {
      return state.error(`Unexpected algebraic string`, op.$line);
    }
  };

  /* Parses a this expression. */
  const thisExpression = (t: Token) => state.newExpr($this(t));

  /**
   * The rules table comprises mappings from every
   * token type to a triple `(Prefix, Infix, B)`,
   * where `Prefix` and `Infix` are parslets (small
   * parsers that handle a single grammar rule), and `B` is a
   * binding power.
   */
  const rules: BPTable<Expr> = {
    [token_type.end]: [___, ___, ___o],
    [token_type.error]: [___, ___, ___o],
    [token_type.empty]: [___, ___, ___o],

    [token_type.list]: [listExpression, ___, ___o],

    [token_type.left_paren]: [primary, funCall, bp.call],
    [token_type.right_paren]: [___, ___, ___o],
    [token_type.left_brace]: [___, ___, ___o],
    [token_type.right_brace]: [___, ___, ___o],
    [token_type.left_bracket]: [vectorExpression, indexingExpression, bp.call],
    [token_type.right_bracket]: [___, ___, ___o],
    [token_type.semicolon]: [___, ___, ___o],
    [token_type.colon]: [___, ___, ___o],
    [token_type.dot]: [___, getExpression, bp.call],
    [token_type.comma]: [___, ___, ___o],
    // algebraic expressions
    [token_type.plus]: [prefix, infix, bp.sum],
    [token_type.minus]: [prefix, infix, bp.difference],
    [token_type.star]: [___, infix, bp.product],
    [token_type.slash]: [___, infix, bp.quotient],
    [token_type.caret]: [___, infix, bp.power],
    [token_type.percent]: [___, infix, bp.quotient],
    [token_type.rem]: [___, infix, bp.quotient],
    [token_type.mod]: [___, infix, bp.quotient],
    [token_type.div]: [___, infix, bp.quotient],

    [token_type.bang]: [___, factorialExpression, bp.postfix],
    [token_type.ampersand]: [___, concatenation, bp.stringop],
    [token_type.tilde]: [___, ___, ___o],
    [token_type.vbar]: [___, ___, ___o],
    [token_type.equal]: [___, assignment, bp.assign],

    // comparison expressions
    [token_type.less]: [___, compare, bp.rel],
    [token_type.greater]: [___, compare, bp.rel],
    [token_type.less_equal]: [___, compare, bp.rel],
    [token_type.greater_equal]: [___, compare, bp.rel],
    [token_type.bang_equal]: [___, compare, bp.rel],
    [token_type.equal_equal]: [___, compare, bp.rel],

    // tickers
    [token_type.plus_plus]: [___, incrementExpression, bp.postfix],
    [token_type.minus_minus]: [___, decrementExpression, bp.postfix],
    [token_type.star_star]: [___, squareExpression, bp.postfix],

    // Vector operation expressions
    [token_type.dot_add]: [___, vectorInfix, bp.sum],
    [token_type.dot_star]: [___, vectorInfix, bp.product],
    [token_type.dot_minus]: [___, vectorInfix, bp.sum],
    [token_type.dot_caret]: [___, vectorInfix, bp.power],
    [token_type.at]: [___, vectorInfix, bp.dot_product],

    // Matrix operation expressions
    [token_type.pound_plus]: [___, ___, ___o],
    [token_type.pound_minus]: [___, ___, ___o],
    [token_type.pound_star]: [___, ___, ___o],

    // Literals
    [token_type.integer]: [number, ___, bp.atom],
    [token_type.float]: [number, ___, bp.atom],
    [token_type.fraction]: [fract, ___, bp.atom],
    [token_type.scientific]: [___, ___, ___o],
    [token_type.big_integer]: [___, ___, ___o],
    [token_type.symbol]: [varname, impMul, bp.atom],
    [token_type.string]: [stringLiteral, ___, bp.atom],
    [token_type.boolean]: [boolLiteral, ___, bp.atom],
    [token_type.nan]: [constant, ___, bp.atom],
    [token_type.inf]: [constant, ___, bp.atom],
    [token_type.nil]: [constant, ___, bp.atom],
    [token_type.numeric_constant]: [constant, ___, bp.atom],

    // logical operations
    [token_type.and]: [___, logicInfix, bp.and],
    [token_type.or]: [___, logicInfix, bp.or],
    [token_type.nand]: [___, logicInfix, bp.nand],
    [token_type.xor]: [___, logicInfix, bp.xor],
    [token_type.xnor]: [___, logicInfix, bp.xnor],
    [token_type.nor]: [___, logicInfix, bp.nor],
    [token_type.not]: [logicNot, ___, bp.not],

    [token_type.if]: [___, ___, ___o],
    [token_type.else]: [___, ___, ___o],
    [token_type.fn]: [___, ___, ___o],
    [token_type.let]: [___, ___, ___o],
    [token_type.var]: [___, ___, ___o],
    [token_type.return]: [___, ___, ___o],
    [token_type.while]: [___, ___, ___o],
    [token_type.for]: [___, ___, ___o],
    [token_type.class]: [___, ___, ___o],
    [token_type.print]: [___, ___, ___o],
    [token_type.super]: [___, ___, ___o],
    [token_type.this]: [thisExpression, ___, bp.atom],

    // native calls
    [token_type.native]: [ncall, ___, bp.call],

    [token_type.algebra_string]: [algString, ___, bp.atom],
  };
  /**
   * Returns the prefix parsing rule mapped to by the given
   * token type.
   */
  const prefixRule = (t: token_type): Parslet<Expr> => rules[t][0];

  /**
   * Returns the infix parsing rule mapped to by the given
   * token type.
   */
  const infixRule = (t: token_type): Parslet<Expr> => rules[t][1];

  /**
   * Returns the {@link bp|precedence} of the given token type.
   */
  const precof = (t: token_type): bp => rules[t][2];

  const expr = (minbp: number = bp.lowest): Either<Err, Expr> => {
    let token = state.next();
    const pre = prefixRule(token.$type);
    let lhs = pre(token, $nil());
    if (lhs.isLeft()) {
      return lhs;
    }
    while (minbp < precof(state.$peek.$type)) {
      token = state.next();
      const r = infixRule(token.$type);
      const rhs = r(token, lhs.unwrap());
      if (rhs.isLeft()) return rhs;
      lhs = rhs;
    }
    return lhs;
  };

  // Statement parsers hereinafter.
  const EXPRESSION = () => {
    const out = expr();
    if (out.isLeft()) return out;
    const expression = out.unwrap();
    if (state.nextIs(token_type.semicolon) || state.implicitSemicolonOK()) {
      return state.newStmt($exprStmt(expression));
    } else {
      return state.error(
        `Expected ";" to end the statement`,
        state.$current.$line
      );
    }
  };

  const VAR = (prev: token_type.let | token_type.var) => {
    const name = state.next();
    if (!name.isType(token_type.symbol)) {
      return state.error(`Expected a valid identifier`, name.$line);
    }
    if (!state.nextIs(token_type.equal)) {
      return state.error(
        `Expected an assignment operator`,
        state.$current.$line
      );
    }
    const init = EXPRESSION();
    if (init.isLeft()) return init;
    const value = init.unwrap();
    return state.newStmt(
      (prev === token_type.let ? $let : $var)($sym(name), value.$expression)
    );
  };

  const BLOCK = () => {
    const statements: Statement[] = [];
    while (!state.atEnd() && !state.check(token_type.right_brace)) {
      const stmt = STATEMENT();
      if (stmt.isLeft()) return stmt;
      statements.push(stmt.unwrap());
    }
    if (!state.nextIs(token_type.right_brace)) {
      return state.error(
        `Expected a "}" to close the block`,
        state.$current.$line
      );
    }
    return state.newStmt($blockStmt(statements));
  };

  const FN = (): Either<Err, FnStmt> => {
    const name = state.next();
    if (!name.isType(token_type.symbol)) {
      return state.error(
        `Expected a valid identifier for the function's name, but got ${name.$lexeme}`,
        name.$line
      );
    }
    if (!state.nextIs(token_type.left_paren)) {
      return state.error(
        `Expected a "(" to begin the parameter list`,
        state.$current.$line
      );
    }
    const params: Token<token_type.symbol>[] = [];
    if (!state.$peek.isType(token_type.right_paren)) {
      do {
        const expression = state.next();
        if (!expression.isType(token_type.symbol)) {
          return state.error(
            `Expected a valid identifier as a parameter, but got "${expression.$lexeme}"`,
            expression.$line
          );
        }
        params.push(expression);
      } while (state.nextIs(token_type.comma));
    }
    if (!state.nextIs(token_type.right_paren)) {
      return state.error(
        `Expected a ")" to close the parameter list`,
        state.$current.$line
      );
    }
    if (state.nextIs(token_type.equal)) {
      const body = EXPRESSION();
      return body.chain((b) =>
        state.newStmt(
          $fnStmt(
            name,
            params.map((s) => $sym(s)),
            [b]
          )
        )
      );
    }
    if (!state.nextIs(token_type.left_brace)) {
      return state.error(
        `Expected a "{" to open the function's body`,
        state.$current.$line
      );
    }
    const body = BLOCK();
    return body.chain((b) =>
      state.newStmt(
        $fnStmt(
          name,
          params.map((p) => $sym(p)),
          b.$statements
        )
      )
    );
  };

  const IF = () => {
    const keyword = state.$current;
    const c = expr();
    if (c.isLeft()) return c;
    const condition = c.unwrap();
    if (!state.nextIs(token_type.left_brace)) {
      return state.error(
        `Expected a left brace "{" to begin the consequent block`,
        state.$current.$line
      );
    }
    const consequent = BLOCK();
    if (consequent.isLeft()) return consequent;
    const thenBranch = consequent.unwrap();
    let elseBranch: Statement = $returnStmt(state.$current, $nil());
    if (state.nextIs(token_type.else)) {
      const _else = STATEMENT();
      if (_else.isLeft()) return _else;
      elseBranch = _else.unwrap();
    }
    return state.newStmt($ifStmt(keyword, condition, thenBranch, elseBranch));
  };

  const RETURN = () => {
    const c = state.$current;
    const out = EXPRESSION();
    return out.chain((e) => state.newStmt($returnStmt(c, e.$expression)));
  };

  const WHILE = () => {
    const current = state.$current;
    const loopCondition = expr();
    if (loopCondition.isLeft()) return loopCondition;
    if (!state.nextIs(token_type.left_brace)) {
      return state.error(
        `Expected a block after the condition`,
        state.$current.$line
      );
    }
    const body = BLOCK();
    if (body.isLeft()) return body;
    return body.chain((loopBody) =>
      state.newStmt($while(current, loopCondition.unwrap(), loopBody))
    );
  };

  const FOR = () => {
    const current = state.$current;
    const preclauseToken = state.next();
    if (!preclauseToken.isType(token_type.left_paren)) {
      return state.error(
        `Expected a "(" after "for" to begin the loop's clauses, but got "${preclauseToken.$lexeme}"`,
        preclauseToken.$line
      );
    }
    let init: Statement | null = null;
    if (state.nextIs(token_type.semicolon)) {
      init = init;
    } else if (state.nextIs(token_type.var)) {
      const initializer = VAR(token_type.var);
      if (initializer.isLeft()) return initializer;
      init = initializer.unwrap();
    } else {
      const exp = EXPRESSION();
      if (exp.isLeft()) return exp;
      init = exp.unwrap();
    }
    let condition: Expr | null = null;
    if (!state.check(token_type.semicolon)) {
      const c = expr();
      if (c.isLeft()) return c;
      condition = c.unwrap();
    }
    const postConditionToken = state.next();
    if (!postConditionToken.isType(token_type.semicolon)) {
      return state.error(
        `Expected a ";" after the for-loop condition, but got "${postConditionToken.$lexeme}"`,
        postConditionToken.$line
      );
    }
    let ticker: Expr | null = null;
    if (!state.check(token_type.right_paren)) {
      const _ticker = expr();
      if (_ticker.isLeft()) return _ticker;
      ticker = _ticker.unwrap();
    }
    const postIncrementToken = state.next();
    if (!postIncrementToken.isType(token_type.right_paren)) {
      return state.error(
        `Expected a ")" to close the for-loop's clauses, but got "${postIncrementToken.$lexeme}"`,
        postConditionToken.$line
      );
    }
    const b = STATEMENT();
    if (b.isLeft()) return b;
    let body: Statement = b.unwrap();
    if (ticker !== null) {
      if (isBlockStmt(body)) {
        body.$statements.push($exprStmt(ticker));
      } else {
        body = $blockStmt([body, $exprStmt(ticker)]);
      }
    }
    let loopCondition: Expr = $bool(true);
    if (condition !== null) {
      loopCondition = condition;
    }
    body = $while(current, loopCondition, body);
    if (init !== null) {
      body = $blockStmt([init, body]);
    }
    return state.newStmt(body);
  };

  const CLASS = () => {
    const name = state.next();
    if (!name.isType(token_type.symbol)) {
      return state.error(
        `Expected a valid identifier after "class" but got "${name.$lexeme}"`,
        name.$line
      );
    }
    const lbrace = state.next();
    if (!lbrace.isType(token_type.left_brace)) {
      return state.error(
        `Expected a "{" to begin the body of class "${name.$lexeme}", but got "${lbrace.$lexeme}".`,
        lbrace.$line
      );
    }
    const methods: FnStmt[] = [];
    while (!state.check(token_type.left_brace) && !state.atEnd()) {
      const f = FN();
      if (f.isLeft()) return f;
      methods.push(f.unwrap());
    }
    const postMethodsToken = state.next();
    if (!postMethodsToken.isType(token_type.right_brace)) {
      return state.error(
        `Expected a "}" after the body of class "${name.$lexeme}", but got "${postMethodsToken.$lexeme}".`,
        postMethodsToken.$line
      );
    }
    return state.newStmt($classStmt(name, methods));
  };

  const PRINT = () => {
    const current = state.$current;
    const arg = EXPRESSION();
    return arg.map((x) => $printStmt(current, x.$expression));
  };

  const STATEMENT = (): Either<Err, Statement> => {
    if (state.nextIs(token_type.var)) {
      return VAR(token_type.var);
    } else if (state.nextIs(token_type.let)) {
      return VAR(token_type.let);
    } else if (state.nextIs(token_type.fn)) {
      return FN();
    } else if (state.nextIs(token_type.left_brace)) {
      return BLOCK();
    } else if (state.nextIs(token_type.if)) {
      return IF();
    } else if (state.nextIs(token_type.return)) {
      return RETURN();
    } else if (state.nextIs(token_type.while)) {
      return WHILE();
    } else if (state.nextIs(token_type.for)) {
      return FOR();
    } else if (state.nextIs(token_type.class)) {
      return CLASS();
    } else if (state.nextIs(token_type.print)) {
      return PRINT();
    } else {
      return EXPRESSION();
    }
  };

  return {
    /** Returns a syntax analysis of a single expression. */
    parsex() {
      if (state.$error !== null) {
        return left(state.$error);
      } else {
        const out = expr();
        return out;
      }
    },
    /** Returns a syntax analysis of the source code's statements. */
    parset() {
      if (state.$error !== null) {
        return left(state.$error);
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
    },
  };
}

type TypeName =
  | "nil"
  | "integer"
  | "float"
  | "string"
  | "bool"
  | "big_integer"
  | "fraction"
  | "exponential"
  | "error"
  | "obj"
  | "vector"
  | "matrix"
  | "fn"
  | "class"
  | "math_object"
  | "list"
  | "unknown";

function typename(x: Primitive): TypeName {
  if (x === null) {
    return "nil";
  } else if (typeof x === "number") {
    if (Number.isInteger(x)) {
      return "integer";
    } else {
      return "float";
    }
  } else if (typeof x === "string") {
    return "string";
  } else if (typeof x === "boolean") {
    return "bool";
  } else if (typeof x === "bigint") {
    return "big_integer";
  } else if (x instanceof MathObj) {
    return "math_object";
  } else if (x instanceof Fraction) {
    return "fraction";
  } else if (x instanceof Exponential) {
    return "exponential";
  } else if (x instanceof Err) {
    return "error";
  } else if (x instanceof Obj) {
    return "obj";
  } else if (x instanceof Vector) {
    return "vector";
  } else if (x instanceof Matrix) {
    return "matrix";
  } else if (x instanceof Fn) {
    return "fn";
  } else if (x instanceof Class) {
    return "class";
  } else if (x instanceof LinkedList) {
    return "list";
  } else {
    return "unknown";
  }
}

/** Returns a string form of the given Winnow primitive. */
export function strof(u: Primitive): string {
  if (u === null || u === undefined) {
    return "nil";
  } else if (
    isExponential(u) ||
    u instanceof Fraction ||
    isErr(u) ||
    u instanceof MathObj ||
    u instanceof Err ||
    u instanceof Obj ||
    u instanceof Vector ||
    u instanceof Matrix ||
    u instanceof Fn ||
    u instanceof Class ||
    u instanceof LinkedList
  ) {
    return u.toString();
  } else if (Array.isArray(u)) {
    const out = u.map((e) => strof(e)).join(", ");
    return `[${out}]`;
  } else {
    return `${u}`;
  }
}

interface Resolvable<X = any> {
  resolve(expr: Expr, i: number): X;
}

enum functionType {
  none,
  function,
  method,
  initializer,
}

enum classType {
  none,
  class,
}

class Resolver<T extends Resolvable = Resolvable> implements Visitor<void> {
  private $scopes: Map<string, boolean>[] = [];
  private scopesIsEmpty() {
    return this.$scopes.length === 0;
  }
  private $currentFunction: functionType = functionType.none;
  private $currentClass: classType = classType.none;
  private beginScope() {
    this.$scopes.push(new Map());
  }
  private endScope() {
    this.$scopes.pop();
  }
  private resolveEach(nodes: ASTNode[]) {
    for (let i = 0; i < nodes.length; i++) {
      this.resolve(nodes[i]);
    }
    return;
  }
  private resolve(node: ASTNode) {
    node.accept(this);
  }
  private peek(): Map<string, boolean> {
    return this.$scopes[this.$scopes.length - 1];
  }
  private declare(name: Token) {
    if (this.$scopes.length === 0) {
      return;
    }
    const scope = this.peek();
    if (scope.has(name.$lexeme)) {
      throw resolverError(
        `Encountered a name collision. The variable “${name.$lexeme}” has already been declared in the current scope.`,
        name.$line
      );
    }
    scope.set(name.$lexeme, false);
  }
  private define(name: string) {
    if (this.$scopes.length === 0) return;
    const peek = this.peek();
    peek.set(name, true);
  }

  private resolveFn(node: FnStmt, type: functionType) {
    const enclosingFunction = this.$currentFunction;
    this.$currentFunction = type;
    this.beginScope();
    for (let i = 0; i < node.$params.length; i++) {
      this.declare(node.$params[i].$symbol);
      this.define(node.$params[i].$symbol.$lexeme);
    }
    this.resolveEach(node.$body);
    this.endScope();
    this.$currentFunction = enclosingFunction;
  }

  resolveLocal(node: Expr, name: string) {
    for (let i = this.$scopes.length - 1; i >= 0; i--) {
      const scope = this.$scopes[i];
      if (scope !== undefined && scope.has(name)) {
        this.client.resolve(node, this.$scopes.length - 1 - i);
        return;
      }
    }
  }

  resolved(statements: Statement[]) {
    try {
      for (let i = 0; i < statements.length; i++) {
        this.resolve(statements[i]);
      }
      return right(1);
    } catch (error) {
      return left(error as Err);
    }
  }
  client: T;
  constructor(client: T) {
    this.client = client;
  }
  blockStmt(node: BlockStmt): void {
    this.beginScope();
    this.resolveEach(node.$statements);
    this.endScope();
    return;
  }
  exprStmt(node: ExprStmt): void {
    this.resolve(node.$expression);
    return;
  }
  fnStmt(node: FnStmt): void {
    this.declare(node.$name);
    this.define(node.$name.$lexeme);
    this.resolveFn(node, functionType.function);
    return;
  }
  ifStmt(node: IfStmt): void {
    this.resolve(node.$condition);
    this.resolve(node.$then);
    this.resolve(node.$alt);
    return;
  }
  printStmt(node: PrintStmt): void {
    this.resolve(node.$expression);
    return;
  }
  returnStmt(node: ReturnStmt): void {
    if (this.$currentFunction === functionType.none) {
      throw resolverError(
        `Encountered the “return” keyword at the top-level. This syntax has no semantic.`,
        node.$keyword.$line
      );
    }
    if (this.$currentFunction === functionType.initializer) {
      throw resolverError(
        `Encounterd the “return” keyword within an initializer.`,
        node.$keyword.$line
      );
    }
    this.resolve(node.$value);
    return;
  }
  variableStmt(node: VariableStmt): void {
    this.declare(node.$variable.$symbol);
    this.resolve(node.$value);
    this.define(node.$variable.$symbol.$lexeme);
    return;
  }
  whileStmt(node: WhileStmt): void {
    this.resolve(node.$condition);
    this.resolve(node.$body);
  }
  classStmt(node: ClassStmt): void {
    const enclosingClass = this.$currentClass;
    this.$currentClass = classType.class;
    this.declare(node.$name);
    this.define(node.$name.$lexeme);
    this.beginScope();
    const peek = this.peek();
    peek.set("this", true);
    const methods = node.$methods;
    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      let declaration = functionType.method;
      if (method.$name.$lexeme === "init") {
        declaration = functionType.initializer;
      }
      this.resolveFn(method, declaration);
    }
    this.endScope();
    this.$currentClass = enclosingClass;
    return;
  }
  indexExpr(node: IndexExpr): void {
    this.resolve(node.$list);
    this.resolve(node.$index);
    return;
  }
  algebraString(): void {
    return;
  }
  tupleExpr(node: TupleExpr): void {
    this.resolveEach(node._elements.toArray());
    return;
  }
  vectorExpr(node: VectorExpr): void {
    this.resolveEach(node._elements);
    return;
  }
  matrixExpr(node: MatrixExpr): void {
    this.resolveEach(node._vectors);
    return;
  }
  relationExpr(node: RelationExpr): void {
    this.resolve(node.$left);
    this.resolve(node.$right);
    return;
  }
  assignmentExpr(node: AssignmentExpr): void {
    this.resolve(node.$value);
    this.resolveLocal(node, node.$symbol.$symbol.$lexeme);
    return;
  }
  nativeCallExpr(node: NativeCallExpr): void {
    this.resolveEach(node.$args);
    return;
  }
  negExpr(node: NegExpr): void {
    this.resolve(node.$arg);
    return;
  }
  posExpr(node: PosExpr): void {
    this.resolve(node.$arg);
    return;
  }
  factorialExpr(node: FactorialExpr): void {
    this.resolve(node.$arg);
    return;
  }
  notExpr(node: NotExpr): void {
    this.resolve(node.$arg);
    return;
  }
  vectorBinex(node: VectorBinex): void {
    this.resolve(node.$left);
    this.resolve(node.$right);
    return;
  }
  algebraicBinex(node: AlgebraicBinex): void {
    this.resolve(node.$left);
    this.resolve(node.$right);
    return;
  }
  logicalBinex(node: LogicalBinex): void {
    this.resolve(node.$left);
    this.resolve(node.$right);
    return;
  }
  callExpr(node: CallExpr): void {
    this.resolve(node.$callee);
    this.resolveEach(node.$args);
    return;
  }
  parendExpr(node: ParendExpr): void {
    this.resolve(node.$inner);
    return;
  }
  getExpr(node: GetExpr): void {
    this.resolve(node.$object);
    return;
  }
  setExpr(node: SetExpr): void {
    this.resolve(node.$value);
    this.resolve(node.$object);
    return;
  }
  superExpr(node: SuperExpr): void {
    throw new Error(`super unhandled: ${node.$method.$line}`);
  }
  thisExpr(node: ThisExpr): void {
    if (this.$currentClass === classType.none) {
      throw resolverError(
        `Encountered the keyword “this” outside of a class definition. This syntax has no semantic, since “this” points to nothing.`,
        node.$keyword.$line
      );
    }
    this.resolveLocal(node, "this");
    return;
  }
  stringConcat(node: StringConcatExpr): void {
    throw new Error(`string concat not handled: ${node.$op.$line}`);
  }
  sym(node: Identifier): void {
    const name = node.$symbol;
    if (!this.scopesIsEmpty() && this.peek().get(name.$lexeme) === false) {
      throw resolverError(
        `The user is attempting to read the variable “${name.$lexeme}” from its own initializer. This syntax has no semantic.`,
        name.$line
      );
    }
    this.resolveLocal(node, node.$symbol.$lexeme);
    return;
  }
  string(): void {
    return;
  }
  bool(): void {
    return;
  }
  nil(): void {
    return;
  }
  integer(): void {
    return;
  }
  float(): void {
    return;
  }
  bigInteger(): void {
    return;
  }
  sciNum(): void {
    return;
  }
  frac(): void {
    return;
  }
  numConst(): void {
    return;
  }
}

function resolvable(client: Resolvable) {
  return new Resolver(client);
}

/** An object that maps variable names to values. */
class Environment<T> {
  /** This environment's map of variable names to values. */
  private $values: Map<string, T>;

  /** This environment's set of mutable variable names. */
  private $mutables: Set<string>;

  private $enclosing: Environment<T> | null;
  constructor(enclosing: Environment<T> | null) {
    this.$values = new Map();
    this.$mutables = new Set();
    this.$enclosing = enclosing;
  }

  /** Returns the parent environment `d` links away. */
  ancestor(d: number) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let env: Environment<T> | null = this;
    for (let i = 0; i < d; i++) {
      env = this.$enclosing;
    }
    return env;
  }

  /**
   * Stores the name-value binding at the parent environment
   * `d` links away.
   */
  assignAt(d: number, name: string, value: T): T {
    this.ancestor(d)?.$values.set(name, value);
    return value;
  }

  /**
   * Returns the value bound to the given name
   * in the parent environment `d` links away.
   */
  getAt(d: number, name: string): T {
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    return this.ancestor(d)?.$values.get(name)!;
  }

  /**
   * Assigns a new value to the given name.
   * If no such name exists, throws a new resolver error.
   * The name provided must be a {@link Token|token} to
   * ensure line and column numbers are reported.
   */
  assign(name: Token, value: T): T {
    if (this.$values.has(name.$lexeme)) {
      if (this.$mutables.has(name.$lexeme)) {
        this.$values.set(name.$lexeme, value);
        return value;
      }
      throw envError(
        `The variable “${name.$lexeme}” is not a mutable variable.`,
        name.$line
      );
    }
    if (this.$enclosing !== null) {
      return this.$enclosing.assign(name, value);
    }
    throw envError(
      `The variable “${name.$lexeme}” is not defined and only defined variables may be assigned.`,
      name.$line
    );
  }

  /**
   * Stores and binds the given name to the value.
   * The argument `mutable` indicates whether
   * the name in this binding can be mutated (assigned
   * a different value later on).
   */
  define(name: string, value: T, mutable: boolean) {
    this.$values.set(name, value);
    if (mutable) this.$mutables.add(name);
    return value;
  }

  /**
   * Retrieves the value bound to the given name.
   * If no such name exists, throws a new resolver error.
   * The name provided must be a T to ensure
   * line numbers are reported.
   */
  get(name: Token): T {
    if (this.$values.has(name.$lexeme)) {
      return this.$values.get(name.$lexeme)!;
    }
    if (this.$enclosing !== null) {
      return this.$enclosing.get(name);
    }
    throw envError(
      `The variable “${name.$lexeme}” is not defined.`,
      name.$line
    );
  }
}

/** Returns a new Winnow runtime environment. */
function runtimeEnv(enclosing: Environment<Primitive> | null) {
  return new Environment<Primitive>(enclosing);
}

function truthy(u: Primitive) {
  return typeof u === "boolean" ? u : u !== null;
}

/** An object representing a class instance in Twine. */
class Obj {
  private klass: Class;
  private fields: Map<string, Primitive>;
  constructor(klass: Class) {
    this.klass = klass;
    this.fields = new Map();
  }
  set(name: string, value: Primitive) {
    this.fields.set(name, value);
    return value;
  }
  get(name: Token): Primitive {
    if (this.fields.has(name.$lexeme)) {
      return this.fields.get(name.$lexeme)!;
    }
    const method = this.klass.findMethod(name.$lexeme);
    if (method !== null) {
      return method.bind(this);
    }
    throw runtimeError(
      `User accessed a non-existent property “${name}”.`,
      name.$line
    );
  }
  toString() {
    return `${this.klass.name} instance`;
  }
}

class Class {
  name: string;
  methods: Map<string, Fn>;
  constructor(name: string, methods: Map<string, Fn>) {
    this.name = name;
    this.methods = methods;
  }
  arity() {
    const initalizer = this.findMethod("def");
    if (initalizer === null) {
      return 0;
    }
    return initalizer.arity();
  }
  findMethod(name: string) {
    if (this.methods.has(name)) {
      return this.methods.get(name)!;
    }
    return null;
  }
  call(interpreter: Compiler, args: Primitive[]) {
    const instance = new Obj(this);
    const initializer = this.findMethod("def");
    if (initializer !== null) {
      initializer.bind(instance).call(interpreter, args);
    }
    return instance;
  }
  toString() {
    return this.name;
  }
}

function $isKlass(x: any): x is Class {
  return x instanceof Class;
}

function klassObj(name: string, methods: Map<string, Fn>) {
  return new Class(name, methods);
}

class RETURN {
  value: Primitive;
  constructor(value: Primitive) {
    this.value = value;
  }
}

/** Returns a new `RETURN`. */
function returnValue(value: Primitive) {
  return new RETURN(value);
}

/** An object representing a function in Twine.  */
export class Fn {
  private declaration: FnStmt;
  private closure: Environment<Primitive>;
  private isInitializer: boolean;
  constructor(
    declaration: FnStmt,
    closure: Environment<Primitive>,
    isInitializer: boolean
  ) {
    this.declaration = declaration;
    this.closure = closure;
    this.isInitializer = isInitializer;
  }
  arity() {
    return this.declaration.$params.length;
  }
  toString() {
    return `𝑓 ${this.declaration.$name.$lexeme}`;
  }
  bind(instance: Obj) {
    const environment = runtimeEnv(this.closure);
    environment.define("this", instance, true);
    return new Fn(this.declaration, environment, this.isInitializer);
  }
  call(interpreter: Compiler, args: Primitive[]) {
    const environment = runtimeEnv(this.closure);
    for (let i = 0; i < this.declaration.$params.length; i++) {
      environment.define(
        this.declaration.$params[i].$symbol.$lexeme,
        args[i],
        false
      );
    }
    try {
      const out = interpreter.executeBlock(this.declaration.$body, environment);
      if (this.isInitializer) {
        return this.closure.getAt(0, "this");
      }
      return out;
    } catch (E) {
      if (this.isInitializer) {
        return this.closure.getAt(0, "this");
      } else if (E instanceof RETURN) {
        return E.value;
      } else {
        throw E;
      }
    }
  }
}

/** Returns a new `Fn` object. */
function callable(
  declaration: FnStmt,
  closure: Environment<Primitive>,
  isInitializer: boolean
) {
  return new Fn(declaration, closure, isInitializer);
}

/** Returns true if `x` is an `Fn` oobject, false otherwise. */
function $isFn(x: any): x is Fn {
  return x instanceof Fn;
}

class Compiler implements Visitor<Primitive> {
  /** This interpreter's environment. */
  $environment: Environment<Primitive>;

  /** This interpreter's global environment. */
  $globals: Environment<Primitive>;

  /** This interpreter's local variables. */
  $locals: Map<Expr, number>;

  /** Looks up the given variable name. */
  lookupVariable(name: Token, expr: Expr) {
    const distance = this.$locals.get(expr);
    if (distance !== undefined) {
      return this.$environment.getAt(distance, name.$lexeme);
    } else {
      return this.$globals.get(name);
    }
  }

  resolve(expression: Expr, depth: number) {
    this.$locals.set(expression, depth);
  }

  constructor() {
    this.$globals = runtimeEnv(null);
    this.$environment = this.$globals;
    this.$locals = new Map();
  }

  executeBlock(statements: Statement[], environment: Environment<Primitive>) {
    const previous = this.$environment;
    try {
      this.$environment = environment;
      let result: Primitive = null;
      const L = statements.length;
      for (let i = 0; i < L; i++) {
        result = this.eval(statements[i]);
      }
      return result;
    } finally {
      this.$environment = previous;
    }
  }

  interpret(statements: Statement[]) {
    try {
      let result: Primitive = null;
      const L = statements.length;
      for (let i = 0; i < L; i++) {
        result = this.eval(statements[i]);
      }
      return right(result);
    } catch (error) {
      return left(error as Err);
    }
  }

  eval(expr: ASTNode): Primitive {
    return expr.accept(this);
  }

  blockStmt(node: BlockStmt): Primitive {
    const env = runtimeEnv(this.$environment);
    return this.executeBlock(node.$statements, env);
  }

  exprStmt(node: ExprStmt): Primitive {
    return this.eval(node.$expression);
  }

  fnStmt(node: FnStmt): Primitive {
    const f = callable(node, this.$environment, false);
    this.$environment.define(node.$name.$lexeme, f, false);
    return f;
  }

  ifStmt(node: IfStmt): Primitive {
    return truthy(this.eval(node))
      ? this.eval(node.$then)
      : this.eval(node.$alt);
  }

  printStmt(node: PrintStmt): Primitive {
    const result = this.eval(node.$expression);
    return strof(result);
  }

  returnStmt(node: ReturnStmt): Primitive {
    const value = this.eval(node.$value);
    throw returnValue(value);
  }

  variableStmt(node: VariableStmt): Primitive {
    const value = this.eval(node.$value);
    this.$environment.define(
      node.$variable.$symbol.$lexeme,
      value,
      node.$mutable
    );
    return value;
  }

  /** The upper limit on how many iterations to perform. By default, Infinity (no limit). */
  private $loopLimit: number = Infinity;

  /** Sets this engine's limit on iterations. */
  loopLimit(n: number) {
    this.$loopLimit = n;
    return this;
  }

  whileStmt(node: WhileStmt): Primitive {
    let out: Primitive = null;
    let i = 0;
    while (truthy(this.eval(node.$condition))) {
      out = this.eval(node.$body);
      i++;
      if (i > this.$loopLimit) {
        throw runtimeError(
          `Iterations exceed this environment’s loop limit`,
          node.$keyword.$line
        );
      }
    }
    return out;
  }

  classStmt(node: ClassStmt): Primitive {
    this.$environment.define(node.$name.$lexeme, null, true);
    const methods = new Map<string, Fn>();
    for (let i = 0; i < node.$methods.length; i++) {
      const method = node.$methods[i];
      const f = callable(
        method,
        this.$environment,
        method.$name.$lexeme === "init"
      );
      methods.set(method.$name.$lexeme, f);
    }
    const klass = klassObj(node.$name.$lexeme, methods);
    this.$environment.assign(node.$name, klass);
    return null;
  }

  indexExpr(node: IndexExpr): Primitive {
    const L = this.eval(node.$list);
    const I = this.eval(node.$index) as number;
    if (!isNumber(I)) {
      throw runtimeError(
        `Expected a number index, but got “${strof(I)}”`,
        node.$op.$line
      );
    }
    if (isVector(L) || isMatrix(L)) {
      const out = L.element(I);
      if (out === null) {
        throw runtimeError(
          `Encountered an out-of-bounds index.\nThe provided index exceeds the length of the targeted sequential.`,
          node.$op.$line
        );
      } else {
        return out;
      }
    } else if (Array.isArray(L)) {
      const out = L[I - 1];
      if (out === undefined) {
        return null;
      } else {
        return out;
      }
    } else {
      throw runtimeError(
        `Expected a sequential for indexing, but got “${strof(L)}”`,
        node.$op.$line
      );
    }
  }

  algebraString(node: AlgebraString): Primitive {
    return node.$expression;
  }

  tupleExpr(node: TupleExpr): Primitive {
    const elements = node._elements.map((e) => this.eval(e));
    return elements;
  }

  vectorExpr(node: VectorExpr): Primitive {
    const nums: number[] = [];
    const elements = node._elements;
    for (let i = 0; i < elements.length; i++) {
      const n = this.eval(elements[i]);
      if (typeof n !== "number") {
        throw runtimeError(
          `Vectors must only contain either numbers or expressions that reduce to numbers. The value ${strof(
            n
          )} is not a number.`,
          node.$op.$line
        );
      }
      nums.push(n);
    }
    return vector(nums);
  }

  matrixExpr(node: MatrixExpr): Primitive {
    const vs = node._vectors;
    const vectors: Vector[] = [];
    for (let i = 0; i < vs.length; i++) {
      const v = this.eval(vs[i]);
      if (!isVector(v)) {
        throw runtimeError(
          `Expected a vector but got a ${typename(v)}`,
          node.$op.$line
        );
      }
      vectors.push(v);
    }
    return matrix(vectors);
  }

  relationExpr(node: RelationExpr): Primitive {
    let L = this.eval(node.$left) as any;
    let R = this.eval(node.$right) as any;
    const op = node.$op;
    if ((isFrac(L) && isNumber(R)) || (isNumber(L) && isFrac(R))) {
      L = Fraction.from(L);
      R = Fraction.from(R);
    }
    if (isFrac(L) && isFrac(R)) {
      switch (op.$type) {
        case token_type.less:
          return L.lt(R);
        case token_type.greater:
          return L.gt(R);
        case token_type.equal_equal:
          return L.equals(R);
        case token_type.bang_equal:
          return !L.equals(R);
        case token_type.greater_equal:
          return L.gte(R);
        case token_type.less_equal:
          return L.lte(R);
      }
    }
    if (isNumber(L) && isNumber(R)) {
      switch (op.$type) {
        case token_type.less:
          return L < R;
        case token_type.greater:
          return L > R;
        case token_type.equal_equal:
          return L === R;
        case token_type.bang_equal:
          return L !== R;
        case token_type.greater_equal:
          return L >= R;
        case token_type.less_equal:
          return L <= R;
      }
    }
    throw runtimeError(
      `Operator "${op.$lexeme}" does not apply to (${typename(L)} × ${typename(
        R
      )})`,
      op.$line
    );
  }

  assignmentExpr(node: AssignmentExpr): Primitive {
    const value = this.eval(node.$value);
    const distance = this.$locals.get(node);
    if (distance !== undefined) {
      this.$environment.assignAt(distance, node.$symbol.$symbol.$lexeme, value);
    } else {
      this.$globals.assign(node.$symbol.$symbol, value);
    }
    return value;
  }

  private nativeFnOps: Record<NativeFn, (args: any[]) => Primitive> = {
    ceil: (args) => ceil(args[0]),
    floor: (args) => floor(args[0]),
    sin: (args) => sin(args[0]),
    cos: (args) => cos(args[0]),
    cosh: (args) => cosh(args[0]),
    tan: (args) => tan(args[0]),
    lg: (args) => lg(args[0]),
    ln: (args) => ln(args[0]),
    log: (args) => log(args[0]),
    arcsin: (args) => arcsin(args[0]),
    arccos: (args) => arccos(args[0]),
    arcsinh: (args) => arcsinh(args[0]),
    arctan: (args) => arctan(args[0]),
    sinh: (args) => sinh(args[0]),
    sqrt: (args) => sqrt(args[0]),
    tanh: (args) => tanh(args[0]),
    gcd: (args) => gcd(floor(args[0]), floor(args[1])),
    avg: (args) => avg(...args),
    arccosh: (args) => arccosh(args[0]),
    max: (args) => max(...args),
    min: (args) => min(...args),
    subexs: function (args: any[]): Primitive {
      const arg = args[0];
      if (!isMathObj(arg)) {
        throw algebraError("non-mathematical object passed to subexs operator");
      }
      return subexs(arg);
    },
    simplify: function (args: any[]): Primitive {
      const arg = args[0];
      if (!isMathObj(arg)) {
        throw algebraError("non-mathematical object passed to subexs operator");
      }
      return simplify(arg);
    },
  };

  nativeCallExpr(node: NativeCallExpr): Primitive {
    const args = node.$args.map((v) => this.eval(v)) as any[];
    const f = node.$name.$lexeme as NativeFn;
    return this.nativeFnOps[f](args);
  }

  negExpr(node: NegExpr): Primitive {
    const x = this.eval(node.$arg);
    if (typeof x === "number" || typeof x === "bigint") {
      return -x;
    } else if (x instanceof Fraction) {
      return x.negate();
    } else if (x instanceof Exponential) {
      return x.negate();
    } else {
      throw runtimeError(
        `Negation operator "-" cannot be applied to ${typename(x)}`,
        node.$op.$line
      );
    }
  }

  posExpr(node: PosExpr): Primitive {
    const x = this.eval(node.$arg);
    if (isNumber(x)) {
      return +x;
    } else if (x instanceof Fraction || x instanceof Exponential) {
      return x;
    } else {
      throw runtimeError(
        `Operator "+" cannot be applied to ${typename(x)}`,
        node.$op.$line
      );
    }
  }

  factorialExpr(node: FactorialExpr): Primitive {
    const result = this.eval(node.$arg);
    if (isNumber(result) && Number.isInteger(result)) {
      return factorialize(result);
    }
    throw runtimeError(
      `Operator "!" does not apply to ${typename(result)}`,
      node.$op.$line
    );
  }

  notExpr(node: NotExpr): Primitive {
    const x = this.eval(node.$arg);
    if (typeof x === "boolean") {
      return !x;
    } else {
      throw runtimeError(
        `Operator "not" cannot be applied to ${typename(x)}`,
        node.$op.$line
      );
    }
  }

  vectorBinex(node: VectorBinex): Primitive {
    const op = node.$op;
    const left = this.eval(node.$left);
    const right = this.eval(node.$right);
    if (!isVector(left) || !isVector(right)) {
      throw runtimeError(
        `The operator "${op.$lexeme}" is restricted to (vector × vector).`,
        op.$line
      );
    }
    switch (op.$type) {
      case token_type.dot_add:
        return left.add(right);
      case token_type.dot_minus:
        return left.sub(right);
      case token_type.dot_star:
        return left.mul(right);
      case token_type.dot_caret:
        return left.pow(right);
      case token_type.at:
        return left.dot(right);
    }
  }

  algebraicBinex(node: AlgebraicBinex): Primitive {
    let L = this.eval(node.$left) as any;
    let R = this.eval(node.$right) as any;
    const op = node.$op.$type;
    if ((isFrac(L) && isNumber(R)) || (isNumber(L) && isFrac(R))) {
      L = Fraction.from(L);
      R = Fraction.from(R);
    }
    if (isFrac(L) && isFrac(R)) {
      switch (op) {
        case token_type.star:
          return L.times(R);
        case token_type.slash:
          return L.divide(R);
        case token_type.plus:
          return L.plus(R);
        case token_type.minus:
          return L.minus(R);
        case token_type.percent:
          return Fraction.from(percent(L.float64().float, R.float64().value()));
        case token_type.rem:
          throw runtimeError(
            `Operator "rem" cannot be applied to fractions`,
            node.$op.$line
          );
        case token_type.mod:
          throw runtimeError(
            `Operator "mod" cannot be applied to fractions`,
            node.$op.$line
          );
        case token_type.div:
          throw runtimeError(
            `Operator "div" cannot be applied to fractions`,
            node.$op.$line
          );
        case token_type.caret:
          throw runtimeError(
            `Exponentiation on fractions currently unsupported`,
            node.$op.$line
          );
      }
    }
    if (isNumber(L) && isNumber(R)) {
      switch (op) {
        case token_type.plus:
          return L + R;
        case token_type.star:
          return L * R;
        case token_type.caret:
          return L ** R;
        case token_type.slash:
          return L / R;
        case token_type.minus:
          return L - R;
        case token_type.rem:
          return rem(L, R);
        case token_type.mod:
          return mod(L, R);
        case token_type.percent:
          return percent(L, R);
        case token_type.div:
          return iquot(L, R);
      }
    }
    const o = node.$op.$lexeme;
    throw runtimeError(
      `"${o}" cannot be applied to (${typename(L)} × ${typename(R)})`,
      node.$op.$line
    );
  }

  logicalBinex(node: LogicalBinex): Primitive {
    const L = this.eval(node.$left);
    const R = this.eval(node.$right);
    const op = node.$op;
    if (typeof L !== "boolean" || typeof R !== "boolean") {
      throw runtimeError(
        `Operator ${op.$lexeme} does not apply to (${typename(L)} × ${typename(
          R
        )}).`,
        op.$line
      );
    }
    switch (op.$type) {
      case token_type.and:
        return L && R;
      case token_type.or:
        return L || R;
      case token_type.nand:
        return !(L && R);
      case token_type.nor:
        return !(L || R);
      case token_type.xnor:
        return L === R;
      case token_type.xor:
        return L !== R;
    }
  }

  callExpr(node: CallExpr): Primitive {
    const callee = this.eval(node.$callee);
    const args: Primitive[] = [];
    for (let i = 0; i < node.$args.length; i++) {
      args.push(this.eval(node.$args[i]));
    }
    if ($isKlass(callee)) {
      return callee.call(this, args);
    }
    if ($isFn(callee)) {
      return callee.call(this, args);
    }
    // deno-fmt-ignore
    throw runtimeError(
      `“${strof(
        callee
      )}” is neither a function nor a class. Only functions and classes may be called.`,
      node.$paren.$line
    );
  }

  parendExpr(node: ParendExpr): Primitive {
    return this.eval(node.$inner);
  }

  getExpr(node: GetExpr): Primitive {
    throw new Error(`get not implemented: ${node.$name.$line}`);
  }

  setExpr(node: SetExpr): Primitive {
    throw new Error(`set not implemented: ${node.$name.$line}`);
  }

  superExpr(node: SuperExpr): Primitive {
    throw new Error(`super not implemented: ${node.$method.$line}`);
  }

  thisExpr(node: ThisExpr): Primitive {
    throw new Error(`this not implemented: ${node.$keyword.$line}`);
  }

  stringConcat(node: StringConcatExpr): Primitive {
    const L = this.eval(node.$left);
    const R = this.eval(node.$right);
    if (isString(L) && isString(R)) {
      return L + R;
    } else {
      throw runtimeError(
        `Operator "&" does not apply to (${typename(L)} × ${typename(R)})`,
        node.$op.$line
      );
    }
  }

  sym(node: Identifier): Primitive {
    return this.lookupVariable(node.$symbol, node);
  }

  string(node: StringLit): Primitive {
    return node.$value;
  }

  bool(node: Bool): Primitive {
    return node.$value;
  }

  nil(node: Nil): Primitive {
    return node.$value;
  }

  integer(node: Integer): Primitive {
    return node.$value;
  }

  float(node: Float): Primitive {
    return node.$value;
  }

  bigInteger(node: BigInteger): Primitive {
    return node.$value;
  }

  sciNum(node: SciNum): Primitive {
    return node.$value;
  }

  frac(node: Frac): Primitive {
    return node.$value;
  }

  numConst(node: NumConst): Primitive {
    return node.$value;
  }
}

export function engine() {
  const compiler = new Compiler();
  const parse = (code: string) => syntax(code).parset();
  const compile = (code: string) => {
    const prog = parse(code);
    if (prog.isLeft()) {
      return prog.unwrap();
    }
    const stmts = prog.unwrap();
    const interpreter = compiler;
    const resolved = resolvable(interpreter).resolved(stmts);
    if (resolved.isLeft()) return resolved.unwrap();
    const out = interpreter.interpret(stmts);
    return out.unwrap();
  };
  const tokens = (code: string) => {
    const prog = lexical(code).stream();
    if (prog.isLeft()) {
      return prog.unwrap().toString();
    } else {
      return treestring(prog.unwrap());
    }
  };
  const ast = (code: string) => {
    const prog = syntax(code).parset();
    if (prog.isLeft()) {
      return prog.unwrap().toString();
    } else {
      return treestring(prog.unwrap());
    }
  };
  return {
    compile,
    compiler,
    ast,
    tokens,
  };
}

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.