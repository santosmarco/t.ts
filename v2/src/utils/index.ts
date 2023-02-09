import { tokens } from "../tokens";
import type { tt } from "../types";
import { ValueKind, kindOf } from "./kind-of";

export namespace _ {
  export type BuiltIn =
    | { readonly [Symbol.toStringTag]: string }
    | { readonly [tt]: true }
    | Date
    | Error
    | Function
    | Generator
    | Promise<unknown>
    | ReadonlyMap<unknown, unknown>
    | ReadonlySet<unknown>
    | RegExp;

  export type Equals<T, U> = (<X>() => X extends T ? 1 : 0) extends <Y>() => Y extends U ? 1 : 0 ? 1 : 0;

  export type Simplify<T> = T extends BuiltIn ? T : Equals<T, unknown> extends 1 ? T : { [K in keyof T]: T[K] } & {};
  export type SimplifyDeep<T> = T extends BuiltIn
    ? T
    : Equals<T, unknown> extends 1
    ? T
    : { [K in keyof T]: SimplifyDeep<T[K]> } & {};

  export function simplify<T>(value: T): Simplify<T>;
  export function simplify(value: unknown) {
    return value;
  }

  export type ReadonlyDeep<T> = T extends BuiltIn
    ? T
    : Equals<T, unknown> extends 1
    ? T
    : { readonly [K in keyof T]: ReadonlyDeep<T[K]> } & {};

  export function readonly<T>(value: T): Readonly<T> {
    return Object.freeze(value);
  }

  export type Merge<T, U> = Omit<T, keyof U> & U;

  export function merge<T, U>(target: T, source: U): Simplify<Merge<T, U>> {
    return simplify(Object.assign({}, target, source));
  }

  export type Except<T, K extends keyof T> = Omit<T, K>;
  export type StripKey<T, K extends keyof T> = T extends unknown ? Except<T, K> : never;

  export type AssertArray<T> = T extends readonly unknown[] ? T : [T];

  export function assertArray<T>(value: T): AssertArray<T>;
  export function assertArray(value: unknown) {
    return kindOf(value) === ValueKind.Array ? value : [value];
  }

  export function uniq<T extends readonly unknown[]>(arr: T): T;
  export function uniq(arr: readonly unknown[]) {
    return arr.filter((v, i) => arr.indexOf(v) === i);
  }

  export type OptionalKeys<T> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];
  export type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;
  export type EnforceOptional<T> = Pick<T, RequiredKeys<T>> & Partial<Pick<T, OptionalKeys<T>>>;

  export type BRANDED<T, B> = T & { readonly [tokens.BRAND]: B };
  export type UNBRANDED<T> = Omit<T, tokens.BRAND>;

  export function enbrand<T, B>(value: T, _brand: Narrow<B>): BRANDED<T, B>;
  export function enbrand(value: unknown) {
    return value;
  }

  export function debrand<T>(value: T): UNBRANDED<T>;
  export function debrand(value: unknown) {
    return value;
  }

  type _Narrow<T> =
    | (T extends [] ? [] : never)
    | (T extends string | number | bigint | boolean ? T : never)
    | { [K in keyof T]: T[K] extends Function ? T[K] : _Narrow<T[K]> };
  export type Narrow<T> = T extends [] ? T : _Narrow<T>;

  export function asConst<T>(value: Narrow<T>): ReadonlyDeep<T>;
  export function asConst(value: unknown) {
    return value;
  }

  export function widen<T>(value: Narrow<T>): T;
  export function widen(value: unknown) {
    return value;
  }

  export function sanitizeDeep<T extends object>(value: T): T;
  export function sanitizeDeep(value: object) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([k, v]) => asConst([k, kindOf(v) === ValueKind.Object ? sanitizeDeep(v) : v]))
        .filter(
          ([, v]) => kindOf(v) !== ValueKind.Function && (kindOf(v) !== ValueKind.Object || Object.keys(v).length > 0)
        )
    );
  }
}

export * from "./kind-of";
export * from "./print-value";
