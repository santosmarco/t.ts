import { t } from "../tokens";
import type { tt } from "../types";
import { ValueKind, kindOf } from "./kind-of";

export namespace _ {
  type _BuiltIn =
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

  export type Simplify<T> = T extends _BuiltIn ? T : Equals<T, unknown> extends 1 ? T : { [K in keyof T]: T[K] } & {};

  export type ReadonlyDeep<T> = T extends _BuiltIn
    ? T
    : Equals<T, unknown> extends 1
    ? T
    : { readonly [K in keyof T]: ReadonlyDeep<T[K]> };

  export type Merge<T, U> = Omit<T, keyof U> & U;

  export function merge<T, U>(target: T, source: U): Simplify<Merge<T, U>> {
    return simplify(Object.assign({}, target, source));
  }

  export type Except<T, K extends keyof T> = Omit<T, K>;

  export type StripKey<T, K extends keyof T> = T extends unknown ? Except<T, K> : never;

  export type Promisable<T> = T | PromiseLike<T>;

  export type Join<T extends readonly string[], D extends string> = T extends readonly [
    infer H extends string,
    ...infer R
  ]
    ? R extends readonly []
      ? H
      : R extends readonly string[]
      ? `${H}${D}${Join<R, D>}`
      : never
    : never;

  export function join<T extends readonly [string, ...string[]], D extends string>(values: T, delimiter: D): Join<T, D>;
  export function join(values: readonly string[], delimiter: string) {
    return values.join(delimiter);
  }

  export type FilterOutDuplicates<T extends readonly unknown[]> = T extends readonly [infer H, ...infer R]
    ? R extends readonly []
      ? T
      : R extends readonly unknown[]
      ? H extends R[number]
        ? FilterOutDuplicates<R>
        : [H, ...FilterOutDuplicates<R>]
      : never
    : never;

  export function filterOutDuplicates<T extends readonly [unknown, ...unknown[]]>(values: T): FilterOutDuplicates<T>;
  export function filterOutDuplicates(values: readonly unknown[]) {
    return values.filter((v, i) => values.indexOf(v) === i);
  }

  export function simplify<T>(value: T): Simplify<T>;
  export function simplify(value: unknown) {
    return value;
  }

  type _Narrow<T> =
    | (T extends [] ? [] : never)
    | (T extends string | number | bigint | boolean ? T : never)
    | { [K in keyof T]: T[K] extends Function ? T[K] : _Narrow<T[K]> };
  export type Narrow<T> = T extends [] ? T : _Narrow<T>;

  export type BRANDED<T, B> = T & { readonly [t.BRAND]: B };
  export type UNBRANDED<T> = Omit<T, t.BRAND>;

  export function enbrand<T, B>(value: T, _brand: Narrow<B>): BRANDED<T, B>;
  export function enbrand(value: unknown) {
    return value;
  }

  export function debrand<T>(value: T): UNBRANDED<T>;
  export function debrand(value: unknown) {
    return value;
  }

  export function asConst<T>(value: Narrow<T>): ReadonlyDeep<T>;
  export function asConst(value: unknown) {
    return value;
  }

  export function extractProp<T, P extends keyof T>(value: T, prop: P): T[P] {
    return value[prop];
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
