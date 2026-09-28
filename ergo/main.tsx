abstract class Atom {
  abstract toString(): string;
}

class Integer extends Atom {
  _value: number;
  constructor(value: number) {
    super();
    this._value = value;
  }
  toString(): string {
    return `${this._value}`;
  }
}

/** Returns a new Atom of type `Integer`. */
export function int(value: number) {
  return new Integer(value);
}
