import type * as tf from "type-fest";
import { includes } from "./arrays";
import { ValueKind, isKindOf } from "./kind-of";
import type { BRANDED, Merge, Unbranded } from "./types";

export function enbrand<T, U extends string>(x: T, _: U) {
  return x as BRANDED<T, U>;
}

export function debrand<T>(x: T) {
  return x as Unbranded<T>;
}

export function pick<T extends object, K extends keyof T>(x: T, k: readonly K[]) {
  return Object.fromEntries(Object.entries(x).filter(([k_]) => includes(k, k_))) as Pick<T, K>;
}

export function omit<T extends object, K extends keyof T>(x: T, k: readonly K[]) {
  return Object.fromEntries(Object.entries(x).filter(([k_]) => !includes(k, k_))) as Omit<T, K>;
}

export function conditionalPickValues<T extends object, V extends tf.Primitive>(x: T, v: readonly V[]) {
  return Object.fromEntries(Object.entries(x).filter(([, v_]) => includes(v, v_))) as tf.ConditionalPick<T, V>;
}

export function conditionalOmitKindDeep<T extends object, V extends ValueKind>(x: T, vk: V): T {
  return Object.fromEntries(
    Object.entries(x)
      .map(([k, v]) => [k, isKindOf(v, ValueKind.Object) ? conditionalOmitKindDeep(v, vk) : v] as [string, unknown])
      .filter(([, v]) => !isKindOf(v, vk))
  ) as T;
}

export function merge<A extends object, B extends object>(a: A, b: B): Merge<A, B> {
  return { ...a, ...b };
}

export function readonly<T extends object>(x: T): Readonly<T> {
  return Object.freeze(x);
}
