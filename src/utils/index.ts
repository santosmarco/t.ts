import { type tt } from "../types";
import { ValueKind, isKindOf } from "./kind-of";

export * from "./arrays";
export * from "./clone";
export * from "./kind-of";
export * from "./objects";
export * from "./print-value";
export * from "./types";

export namespace utils {
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

  export type Equals<T, U> = (<X>(x: T) => X extends T ? 1 : 0) extends <Y>(y: U) => Y extends U ? 1 : 0 ? 1 : 0;

  export type Except<T, K extends keyof T> = Omit<T, K>;

  export type Simplify<T> = Equals<T, unknown> extends 1 ? T : T extends BuiltIn ? T : { [K in keyof T]: T[K] } & {};
  export type SimplifyDeep<T> = Equals<T, unknown> extends 1
    ? T
    : T extends BuiltIn
    ? T
    : { [K in keyof T]: SimplifyDeep<T[K]> } & {};

  export type Readonly<T> = Equals<T, unknown> extends 1
    ? T
    : T extends BuiltIn
    ? T
    : { readonly [K in keyof T]: T[K] } & {};
  export type ReadonlyDeep<T> = Equals<T, unknown> extends 1
    ? T
    : T extends BuiltIn
    ? T
    : { readonly [K in keyof T]: ReadonlyDeep<T[K]> } & {};

  export type AtLeastOne<T> = readonly [T, ...T[]];

  export type Exact<T, U> = Equals<T, U> extends 1
    ? T
    : T extends unknown[]
    ? Array<Exact<T[number], U extends readonly unknown[] ? U[number] : never>>
    : T extends readonly unknown[]
    ? ReadonlyArray<Exact<T[number], U extends readonly unknown[] ? U[number] : never>>
    : T extends object
    ? { [K in keyof T]: Exact<T[K], K extends keyof U ? U[K] : never> } & Record<
        Exclude<keyof U, T extends unknown ? keyof T : never>,
        never
      >
    : T;

  export type OptionalKeys<T> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];
  export type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;
  export type EnforceOptional<T> = Pick<T, RequiredKeys<T>> & Partial<Pick<T, OptionalKeys<T>>>;

  export type EnforceOptionalTuple<T extends readonly unknown[]> = T extends readonly []
    ? []
    : T extends readonly [infer H, ...infer R]
    ? undefined extends H
      ? [H?, ...EnforceOptionalTuple<R>]
      : [H, ...EnforceOptionalTuple<R>]
    : never;

  export type SetOptional<T, K extends keyof T> = Simplify<Omit<T, K> & Partial<Pick<T, K>>>;

  export function simplify<T>(x: T): Simplify<T>;
  export function simplify(x: unknown) {
    return x;
  }

  export function readonly<T>(x: T): Readonly<T>;
  export function readonly(x: unknown) {
    return Object.freeze(x);
  }

  export function pick<T extends object, K extends keyof T>(x: T, ...keys: K[]): Pick<T, K>;
  export function pick(x: object, ...keys: string[]) {
    return Object.fromEntries(Object.entries(x).filter(([k]) => keys.includes(k)));
  }

  export function omit<T extends object, K extends keyof T>(x: T, ...keys: K[]): Omit<T, K>;
  export function omit(x: object, ...keys: string[]) {
    return Object.fromEntries(Object.entries(x).filter(([k]) => !keys.includes(k)));
  }

  export type Narrow<T> =
    | (T extends [] ? [] : never)
    | (T extends string | number | boolean | bigint ? T : never)
    | { [K in keyof T]: T[K] extends Function ? T[K] : Narrow<T[K]> };

  export function asConst<T>(x: T | Narrow<T>): Simplify<Readonly<T>> & {};
  export function asConst(x: unknown) {
    return simplify(readonly(x));
  }

  export function extractProp<T, P extends keyof T>(x: T, prop: P): T[P] {
    return x[prop];
  }

  export function mapProp<T extends Record<string, unknown>, P extends keyof T[keyof T]>(
    obj: T,
    prop: P
  ): { [K in keyof T]: T[K][P] };
  export function mapProp<T extends readonly unknown[], P extends keyof T[number]>(
    arr: T,
    prop: P
  ): { [K in keyof T]: T[K][P] };
  export function mapProp<T extends Record<string | number, unknown>>(x: T, prop: keyof T[keyof T]) {
    if (isKindOf(x, ValueKind.Array)) {
      return x.map((x) => (x as T[keyof T])[prop]);
    }
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, (v as T[keyof T])[prop]]));
  }

  export function extractMsg(x: { message?: string } | string | undefined): string | undefined {
    return isKindOf(x, ValueKind.String) ? x : x?.message;
  }
}
