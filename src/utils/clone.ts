import type * as tf from "type-fest";
import { ValueKind, isKindOf, isPlainObject } from "./kind-of";
import { enbrand } from "./objects";
import type { BRANDED } from "./types";

export function cloneDeep<T>(x: T): BRANDED<T, "__deepCloned"> {
  return enbrand(
    ((): T => {
      if (isKindOf(x, ValueKind.Object)) {
        return cloneObjectDeep(x);
      }

      if (isKindOf(x, ValueKind.Array)) {
        return cloneArrayDeep(x);
      }

      return clone(x) as T;
    })(),
    "__deepCloned"
  );
}

function cloneObjectDeep<T extends object>(x: T): T {
  if (isPlainObject(x)) {
    const res = Reflect.construct(x.constructor as new () => T, []);

    for (const k in x) {
      if (Object.prototype.hasOwnProperty.call(x, k)) {
        res[k] = cloneDeep(x[k]);
      }
    }

    return res;
  }

  return x;
}

function cloneArrayDeep<T extends unknown[]>(x: T): T {
  const res = Reflect.construct(x.constructor as new (len: number) => T, [x.length]);

  for (let i = 0; i < x.length; i++) {
    res[i] = cloneDeep(x[i]);
  }

  return res;
}

function clone(x: unknown) {
  if (isKindOf(x, ValueKind.Array)) {
    return x.slice();
  }

  if (isKindOf(x, ValueKind.Object)) {
    return { ...x };
  }

  if (isKindOf(x, ValueKind.Date)) {
    return Reflect.construct(x.constructor as typeof Date, [Number(x)]);
  }

  if (isKindOf(x, ValueKind.Map)) {
    return new Map(x);
  }

  if (isKindOf(x, ValueKind.Set)) {
    return new Set(x);
  }

  if (isKindOf(x, ValueKind.Buffer)) {
    return cloneBuffer(x);
  }

  if (isKindOf(x, ValueKind.Symbol)) {
    return cloneSymbol(x);
  }

  if (
    isKindOf(x, [
      ValueKind.Float32Array,
      ValueKind.Float64Array,
      ValueKind.Int16Array,
      ValueKind.Int32Array,
      ValueKind.Int8Array,
      ValueKind.Uint16Array,
      ValueKind.Uint32Array,
      ValueKind.Uint8Array,
      ValueKind.Uint8ClampedArray,
    ])
  ) {
    return cloneTypedArray(x);
  }

  if (isKindOf(x, ValueKind.RegExp)) {
    return cloneRegExp(x);
  }

  if (isKindOf(x, ValueKind.Error)) {
    return Object.create(x) as typeof x;
  }

  return x;
}

function cloneRegExp(x: RegExp): RegExp {
  const flags = x.flags ?? /\w+$/.exec(String(x)) ?? undefined;
  const re = Reflect.construct(x.constructor as typeof RegExp, [x.source, flags]);
  re.lastIndex = x.lastIndex;
  return re;
}

function cloneTypedArray<T extends tf.TypedArray>(x: T): T {
  return Reflect.construct(x.constructor, [x.buffer, x.byteOffset, x.length]) as T;
}

function cloneBuffer(x: Buffer): Buffer {
  const len = x.length;
  const buf = Buffer.allocUnsafe ? Buffer.allocUnsafe(len) : Buffer.from(String(len));
  x.copy(buf);
  return buf;
}

function cloneSymbol(x: symbol): symbol {
  return x;
}
