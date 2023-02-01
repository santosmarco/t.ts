import type * as tf from "type-fest";
import { ValueKind, isKindOf, omit, type AtLeastOne, type utils } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TChecks                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TCheckKind = {
  Min: "min",
  Max: "max",
  Length: "length",
  Size: "size",
  Range: "range",
  // String
  Pattern: "pattern",
  Alphanum: "alphanum",
  Email: "email",
  Url: "url",
  Cuid: "cuid",
  Uuid: "uuid",
  Hex: "hex",
  Base64: "base64",
  // Number
  Integer: "integer",
  Precision: "precision",
  Multiple: "multiple",
  Port: "port",
  Safe: "safe",
  Finite: "finite",
  // Array
  Unique: "unique",
  Sort: "sort",
  // Tuple
  TupleLength: "tuple_length",
  // Record
  MinKeys: "min_keys",
  MaxKeys: "max_keys",
  // ——— Transforms
  Trim: "trim",
  Uppercase: "uppercase",
  Lowercase: "lowercase",
  Capitalize: "capitalize",
  Uncapitalize: "uncapitalize",
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

  export type TupleLength = MakeTCheck<"tuple_length", { min: number; max: number | null }>;

  export type Unique = MakeTCheck<
    "unique",
    { comparator: ((a: any, b: any, x: number, y: number, arr: any[]) => boolean) | null; strict: boolean }
  >;
  export type Sort = MakeTCheck<
    "sort",
    { comparator: ((a: any, b: any, x: number, y: number, arr: any[]) => number) | null; strict: boolean }
  >;

  export type Pattern = MakeTCheck<"pattern", { pattern: RegExp; type: "disallow" | "enforce"; name: string }>;
  export type Alphanum = MakeTCheck<"alphanum">;
  export type Email = MakeTCheck<"email">;
  export type Url = MakeTCheck<"url">;
  export type Cuid = MakeTCheck<"cuid">;
  export type Uuid = MakeTCheck<"uuid">;
  export type Hex = MakeTCheck<"hex">;
  export type Base64 = MakeTCheck<"base64", { paddingRequired: boolean; urlSafe: boolean }>;
  // ——— Transforms
  export type Trim = MakeTCheck<"trim">;
  export type Uppercase = MakeTCheck<"uppercase">;
  export type Lowercase = MakeTCheck<"lowercase">;
  export type Capitalize = MakeTCheck<"capitalize">;
  export type Uncapitalize = MakeTCheck<"uncapitalize">;

  export type Integer = MakeTCheck<"integer", { strict: boolean }>;
  export type Precision = MakeTCheck<"precision", { value: number; inclusive: boolean; strict: boolean }>;
  export type Multiple = MakeTCheck<"multiple", { value: number }>;
  export type Port = MakeTCheck<"port">;
  export type Safe = MakeTCheck<"safe">;
  export type Finite = MakeTCheck<"finite">;

  export type MinKeys = MakeTCheck<"min_keys", { value: number; inclusive: boolean }>;
  export type MaxKeys = MakeTCheck<"max_keys", { value: number; inclusive: boolean }>;

  export type Options<P extends Record<string, unknown> | null = null> = utils.Simplify<
    Readonly<({ message?: string } & (P extends null ? unknown : P)) | string>
  >;
}

export function parseSimpleCheck<K extends TCheckKind>(kind: K, options: { message?: string } | string | undefined) {
  const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
  return { kind, message: parsedOpts.message };
}

export function parseMinCheck<V>(
  value: V,
  options: Partial<Pick<TCheck.Min<V>, "inclusive" | "message">> | string | undefined
) {
  const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
  return {
    ...parseSimpleCheck(TCheckKind.Min, options),
    value,
    inclusive: parsedOpts.inclusive ?? true,
  };
}

export function parseMaxCheck<V>(
  value: V,
  options: Partial<Pick<TCheck.Max<V>, "inclusive" | "message">> | string | undefined
) {
  const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
  return {
    ...parseSimpleCheck(TCheckKind.Max, options),
    value,
    inclusive: parsedOpts.inclusive ?? true,
  };
}

export function parseRangeCheck<V>(
  min: V,
  max: V,
  options: Partial<Pick<TCheck.Range<V>, "inclusive" | "message">> | string | undefined
) {
  const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
  return {
    ...parseSimpleCheck(TCheckKind.Range, options),
    min,
    max,
    inclusive: parsedOpts.inclusive ?? "[)",
  };
}

export function validateMin<V>(value: V, check: TCheck.Min<V> | TCheck.MinKeys): boolean {
  return check.inclusive ? value >= check.value : value > check.value;
}

export function validateMax<V>(value: V, check: TCheck.Max<V> | TCheck.MaxKeys): boolean {
  return check.inclusive ? value <= check.value : value < check.value;
}

export function validateRange<V>(value: V, check: TCheck.Range<V>): boolean {
  return {
    "[": {
      "]": value >= check.min && value <= check.max,
      ")": value >= check.min && value < check.max,
    },
    "(": {
      "]": value > check.min && value <= check.max,
      ")": value > check.min && value < check.max,
    },
  }[check.inclusive[0] as "[" | "("][check.inclusive[1] as "]" | ")"];
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
