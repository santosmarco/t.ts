const { toString } = Object.prototype;

export const ValueKind = {
  Arguments: "arguments",
  Array: "Array",
  ArrayIterator: "Array Iterator",
  BigInt: "bigint",
  Boolean: "boolean",
  Buffer: "Buffer",
  Date: "Date",
  Error: "Error",
  False: "false",
  Float32Array: "Float32Array",
  Float64Array: "Float64Array",
  Function: "function",
  Generator: "Generator",
  GeneratorFunction: "GeneratorFunction",
  Int16Array: "Int16Array",
  Int32Array: "Int32Array",
  Int8Array: "Int8Array",
  Map: "Map",
  MapIterator: "Map Iterator",
  NaN: "NaN",
  Null: "null",
  Number: "number",
  Object: "object",
  Promise: "Promise",
  RegExp: "RegExp",
  Set: "Set",
  SetIterator: "Set Iterator",
  String: "string",
  StringIterator: "String Iterator",
  Symbol: "symbol",
  True: "true",
  Uint16Array: "Uint16Array",
  Uint32Array: "Uint32Array",
  Uint8Array: "Uint8Array",
  Uint8ClampedArray: "Uint8ClampedArray",
  Undefined: "undefined",
  Unknown: "unknown",
  Void: "void",
  WeakMap: "WeakMap",
  WeakSet: "WeakSet",
} as const;

export type ValueKind = typeof ValueKind[keyof typeof ValueKind];

export type ValueKindMap<T extends ValueKind> = {
  "Array Iterator": IterableIterator<unknown>;
  "Map Iterator": IterableIterator<[unknown, unknown]>;
  "Set Iterator": IterableIterator<unknown>;
  "String Iterator": IterableIterator<string>;
  arguments: IArguments;
  Array: unknown[];
  bigint: bigint;
  boolean: boolean;
  Buffer: Buffer;
  Date: Date;
  Error: Error;
  false: false;
  Float32Array: Float32Array;
  Float64Array: Float64Array;
  function: Function;
  Generator: Generator<unknown, unknown>;
  GeneratorFunction: GeneratorFunction;
  Int16Array: Int16Array;
  Int32Array: Int32Array;
  Int8Array: Int8Array;
  Map: Map<unknown, unknown>;
  NaN: number;
  null: null;
  number: number;
  object: object;
  Promise: Promise<unknown>;
  RegExp: RegExp;
  Set: Set<unknown>;
  string: string;
  symbol: symbol;
  true: true;
  Uint16Array: Uint16Array;
  Uint32Array: Uint32Array;
  Uint8Array: Uint8Array;
  Uint8ClampedArray: Uint8ClampedArray;
  undefined: undefined;
  unknown: unknown;
  void: void;
  WeakMap: WeakMap<object, unknown>;
  WeakSet: WeakSet<object>;
}[T];

export function kindOf(x: unknown) {
  if (x === undefined) return ValueKind.Undefined;
  if (x === null) return ValueKind.Null;

  let type: string = typeof x;
  if (type === "boolean") return ValueKind.Boolean;
  if (type === "string") return ValueKind.String;
  if (type === "number") {
    return Number.isNaN(x) ? ValueKind.NaN : ValueKind.Number;
  }

  if (type === "bigint") return ValueKind.BigInt;
  if (type === "symbol") return ValueKind.Symbol;
  if (type === "function") {
    return isGeneratorFn(x) ? ValueKind.GeneratorFunction : ValueKind.Function;
  }

  if (isArray(x)) return ValueKind.Array;
  if (isBuffer(x)) return ValueKind.Buffer;
  if (isArguments(x)) return ValueKind.Arguments;
  if (isDate(x)) return ValueKind.Date;
  if (isError(x)) return ValueKind.Error;
  if (isRegexp(x)) return ValueKind.RegExp;

  switch (ctorName(x)) {
    case "Symbol":
      return ValueKind.Symbol;
    case "Promise":
      return ValueKind.Promise;

    // Set, Map, WeakSet, WeakMap
    case "WeakMap":
      return ValueKind.WeakMap;
    case "WeakSet":
      return ValueKind.WeakSet;
    case "Map":
      return ValueKind.Map;
    case "Set":
      return ValueKind.Set;

    // 8-bit typed arrays
    case "Int8Array":
      return ValueKind.Int8Array;
    case "Uint8Array":
      return ValueKind.Uint8Array;
    case "Uint8ClampedArray":
      return ValueKind.Uint8ClampedArray;

    // 16-bit typed arrays
    case "Int16Array":
      return ValueKind.Int16Array;
    case "Uint16Array":
      return ValueKind.Uint16Array;

    // 32-bit typed arrays
    case "Int32Array":
      return ValueKind.Int32Array;
    case "Uint32Array":
      return ValueKind.Uint32Array;
    case "Float32Array":
      return ValueKind.Float32Array;
    case "Float64Array":
      return ValueKind.Float64Array;

    default:
      break;
  }

  if (isGeneratorObj(x)) {
    return ValueKind.Generator;
  }

  // Non-plain objects
  type = toString.call(x);
  switch (type) {
    case "[object Object]":
      return ValueKind.Object;

    // Iterators
    case "[object Map Iterator]":
      return ValueKind.MapIterator;
    case "[object Set Iterator]":
      return ValueKind.SetIterator;
    case "[object String Iterator]":
      return ValueKind.StringIterator;
    case "[object Array Iterator]":
      return ValueKind.ArrayIterator;

    default:
      break;
  }

  // Other
  return ValueKind.Unknown;
}

export function isKindOf<T extends ValueKind>(x: unknown, k: T): x is ValueKindMap<T>;
export function isKindOf<T extends [ValueKind, ...ValueKind[]]>(x: unknown, ks: T): x is ValueKindMap<T[number]>;
export function isKindOf(x: unknown, k: ValueKind | ValueKind[]) {
  return (isArray(k) ? k : [k]).includes(kindOf(x));
}

export function isPlainObject(x: unknown) {
  if (!isKindOf(x, ValueKind.Object)) return false;

  // If has modified constructor
  const ctor = x.constructor;
  if (ctor === undefined) return true;

  // If has modified prototype
  const proto = ctor.prototype as unknown;
  if (!isKindOf(proto, ValueKind.Object)) return false;

  // If constructor does not have an Object-specific method
  if (!Object.prototype.hasOwnProperty.call(proto, "isPrototypeOf")) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

function ctorName(x: unknown): string | null {
  return typeof x === "object" && x !== null && typeof x.constructor === "function" ? x.constructor.name : null;
}

function isArray(x: unknown): x is unknown[] {
  if (Array.isArray) return Array.isArray(x);
  return x instanceof Array;
}

function isError(x: unknown): x is Error {
  if (x instanceof Error) return true;
  return (
    typeof x === "object" &&
    x !== null &&
    "message" in x &&
    typeof x.message === "string" &&
    x.constructor &&
    "stackTraceLimit" in x.constructor &&
    typeof x.constructor.stackTraceLimit === "number"
  );
}

function isDate(x: unknown): x is Date {
  if (x instanceof Date) return true;
  return (
    typeof x === "object" &&
    x !== null &&
    "toDateString" in x &&
    typeof x.toDateString === "function" &&
    "getDate" in x &&
    typeof x.getDate === "function" &&
    "setDate" in x &&
    typeof x.setDate === "function"
  );
}

function isRegexp(x: object): x is RegExp {
  if (x instanceof RegExp) return true;
  return (
    "flags" in x &&
    typeof x.flags === "string" &&
    "ignoreCase" in x &&
    typeof x.ignoreCase === "boolean" &&
    "multiline" in x &&
    typeof x.multiline === "boolean" &&
    "global" in x &&
    typeof x.global === "boolean"
  );
}

function isGeneratorFn(x: unknown): x is GeneratorFunction {
  return ctorName(x) === "GeneratorFunction";
}

function isGeneratorObj(x: unknown): x is Generator {
  return (
    typeof x === "object" &&
    x !== null &&
    "throw" in x &&
    typeof x.throw === "function" &&
    "return" in x &&
    typeof x.return === "function" &&
    "next" in x &&
    typeof x.next === "function"
  );
}

function isArguments(x: unknown): x is typeof arguments {
  try {
    if (
      typeof x === "object" &&
      x !== null &&
      "length" in x &&
      typeof x.length === "number" &&
      "callee" in x &&
      typeof x.callee === "function"
    ) {
      return true;
    }
  } catch (err) {
    if (isError(err) && err.message.includes("callee")) {
      return true;
    }
  }

  return false;
}

function isBuffer(x: unknown): x is Buffer {
  if (
    typeof x === "object" &&
    x !== null &&
    x.constructor &&
    "isBuffer" in x.constructor &&
    typeof x.constructor.isBuffer === "function"
  ) {
    return Boolean(x.constructor.isBuffer(x));
  }

  return false;
}
