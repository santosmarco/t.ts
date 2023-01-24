export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer U] ? U : never;

export function forceConcat<T, U>(a: readonly T[] | undefined, b: readonly U[]) {
  return [...(a ?? []), ...b];
}

export function tail<T extends readonly unknown[]>(arr: T): Tail<T> {
  return arr.slice(1) as Tail<T>;
}
