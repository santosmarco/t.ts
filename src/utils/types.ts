import type * as tf from "type-fest";

export type BuiltIn =
  | { readonly [Symbol.toStringTag]: string }
  | Date
  | Error
  | Function
  | Generator
  | Promise<unknown>
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | RegExp;

export type Try<T, U, Catch = never> = T extends U ? T : Catch;

export type _<T> = tf.IsEqual<T, unknown> extends true ? T : T extends BuiltIn ? T : { [K in keyof T]: T[K] } & {};
export type __<T> = tf.IsEqual<T, unknown> extends true ? T : T extends BuiltIn ? T : { [K in keyof T]: __<T[K]> } & {};

type _ReadonlyDeep<T> = tf.IsEqual<T, unknown> extends true
  ? T
  : T extends BuiltIn
  ? T
  : { readonly [K in keyof T]: _ReadonlyDeep<T[K]> } & {};
export type ReadonlyDeep<T> = _<_ReadonlyDeep<T>>;

export type HasKey<T extends Record<string, unknown>, K extends keyof T> = K extends keyof T ? 1 : 0;

export type GetNestedValues<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Record<string, unknown> ? GetNestedValues<T[K]> : T[K];
}[keyof T];

export type StripKey<T, K extends keyof T> = T extends unknown ? tf.Except<T, K> : never;

export type AllKeys<T> = T extends unknown ? keyof T : never;

export type AtLeastOne<T> = readonly [T, ...T[]];
export type AtLeastTwo<T> = readonly [T, T, ...T[]];

export const BRAND = Symbol("t.brand");
export type BRAND = typeof BRAND;
export type BRANDED<T, B> = T & { [BRAND]: B };
export type Unbranded<T> = Omit<T, BRAND>;

type UnionToIntersectionFn<T> = (T extends unknown ? (x: () => T) => void : never) extends (x: infer I) => void
  ? I
  : never;

type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer L ? L : never;

export type UnionToTuple<T, Acc extends readonly unknown[] = []> = [T] extends [never]
  ? Acc
  : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ...Acc]>;

export type OptionalKeys<T> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];
export type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;
export type EnforceOptional<T> = Pick<T, RequiredKeys<T>> & Partial<Pick<T, OptionalKeys<T>>>;

export type Merge<A, B> = Omit<A, keyof B> & B;

export function assertNever(_x: never): never {
  throw new Error("Impossible");
}
