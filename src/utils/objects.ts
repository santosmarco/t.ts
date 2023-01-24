import { ValueKind, isKindOf } from "./kind-of";
import type { Branded, Unbranded } from "./types";

export function enbrand<T, U extends string>(x: T, _: U) {
  return x as Branded<T, U>;
}

export function debrand<T>(x: T) {
  return x as Unbranded<T>;
}

export function pick<T extends object, K extends keyof T>(x: T, k: K[]) {
  return Object.fromEntries(Object.entries(x).filter(([k2]) => k.includes(k2 as K))) as Pick<T, K>;
}

export function omit<T extends object, K extends keyof T>(x: T, k: K[]) {
  return Object.fromEntries(Object.entries(x).filter(([k2]) => !k.includes(k2 as K))) as Omit<T, K>;
}

export function conditionalOmitDeep<T extends object, V extends ValueKind>(x: T, vk: V): T {
  return Object.fromEntries(
    Object.entries(x)
      .map(([k, v]) => [k, isKindOf(v, ValueKind.Object) ? conditionalOmitDeep(v, vk) : v] as [string, unknown])
      .filter(([, v]) => !isKindOf(v, vk))
  ) as T;
}
