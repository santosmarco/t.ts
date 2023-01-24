import type * as tf from "type-fest";
import { omit, type AtLeastOne } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TChecks                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TCheckKind = {
  Finite: "finite",
  Integer: "integer",
  Length: "length",
  Max: "max",
  Min: "min",
  Multiple: "multiple",
  Port: "port",
  Precision: "precision",
  Range: "range",
  Safe: "safe",
  Size: "size",
  Sort: "sort",
  Unique: "unique",
} as const;

export type TCheckKind = typeof TCheckKind[keyof typeof TCheckKind];

export type TCheckBase<K extends TCheckKind = TCheckKind> = {
  kind: K;
  message: string | undefined;
};

export type MakeTCheck<K extends TCheckKind, P extends Record<string, unknown> | null = null> = tf.Simplify<
  tf.ReadonlyDeep<TCheckBase<K> & (P extends null ? unknown : P)>
>;

export namespace TCheck {
  export type Min<V = number> = MakeTCheck<"min", { value: V; inclusive: boolean }>;
  export type Max<V = number> = MakeTCheck<"max", { value: V; inclusive: boolean }>;
  export type Range<V = number> = MakeTCheck<"range", { min: V; max: V; inclusive: `${"[" | "("}${"]" | ")"}` }>;

  export type Length<V = number> = MakeTCheck<"length", { value: V }>;
  export type Size<V = number> = MakeTCheck<"size", { value: V }>;

  export type Unique = MakeTCheck<
    "unique",
    { comparator: ((a: any, b: any, x: number, y: number, arr: any[]) => boolean) | undefined; strict: boolean }
  >;
  export type Sort = MakeTCheck<
    "sort",
    { comparator: ((a: any, b: any, x: number, y: number, arr: any[]) => number) | undefined; strict: boolean }
  >;

  export type Integer = MakeTCheck<"integer", { strict: boolean }>;
  export type Precision = MakeTCheck<"precision", { value: number; inclusive: boolean; strict: boolean }>;
  export type Multiple = MakeTCheck<"multiple", { value: number }>;
  export type Port = MakeTCheck<"port">;
  export type Safe = MakeTCheck<"safe">;
  export type Finite = MakeTCheck<"finite">;
}

export function sanitizeCheck<C extends TCheckBase>(check: C) {
  return omit(check, ["kind", "message"]);
}

export function filterChecks<C extends TCheckBase, K extends AtLeastOne<C["kind"]>>(
  checks: readonly C[],
  kinds: K
): Array<Extract<C, { kind: K[number] }>> {
  return checks.filter((check): check is Extract<C, { kind: K[number] }> => kinds.includes(check.kind));
}

export function filterOutChecks<C extends TCheckBase, K extends AtLeastOne<C["kind"]>>(
  checks: readonly C[],
  kinds: K
): Array<Exclude<C, { kind: K[number] }>> {
  return checks.filter((check): check is Exclude<C, { kind: K[number] }> => !kinds.includes(check.kind));
}
