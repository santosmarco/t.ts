import type * as tf from "type-fest";

export type HasKey<T extends Record<string, unknown>, K extends keyof T> = K extends keyof T ? 1 : 0;

export type GetNestedValues<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Record<string, unknown> ? GetNestedValues<T[K]> : T[K];
}[keyof T];

export type StripKey<T, K extends keyof T> = T extends unknown ? tf.Except<T, K> : never;

export type AtLeastOne<T> = readonly [T, ...T[]];

export const BRAND = Symbol("t.brand");
export type BRAND = typeof BRAND;
export type Branded<T, B> = T & { [BRAND]: B };
export type Unbranded<T> = Omit<T, BRAND>;

type UnionToIntersectionFn<T> = (T extends unknown ? (x: () => T) => void : never) extends (x: infer I) => void
  ? I
  : never;

type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer L ? L : never;

export type UnionToTuple<T, Acc extends readonly unknown[] = []> = [T] extends [never]
  ? Acc
  : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ...Acc]>;

export function assertNever(_x: never): never {
  throw new Error("Impossible");
}
