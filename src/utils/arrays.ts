export function includes<T>(arr: readonly T[], x: unknown): x is T {
  for (const y of arr) {
    if (y === x) {
      return true;
    }
  }

  return false;
}

export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer U] ? U : never;

export function tail<T extends readonly unknown[]>(arr: T): Tail<T> {
  return arr.slice(1) as Tail<T>;
}

export type FilterOut<T extends readonly unknown[], U> = T extends readonly []
  ? []
  : T extends readonly [infer H, ...infer R]
  ? H extends U
    ? FilterOut<R, U>
    : [H, ...FilterOut<R, U>]
  : never;

export function filterOut<T extends readonly unknown[], U extends readonly unknown[]>(
  arr: T,
  x: U
): FilterOut<T, U[number]> {
  return arr.filter((y) => !includes(x, y)) as FilterOut<T, U[number]>;
}
