import type * as tf from "type-fest";
import type { TCheck, TCheckBase } from "./checks";
import type { GetNestedValues } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TIssues                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TIssueKind = {
  Base: {
    Required: "base.required",
    InvalidType: "base.invalid_type",
    Forbidden: "base.forbidden",
  },
  Array: {
    Min: "array.min",
    Max: "array.max",
    Length: "array.length",
    Unique: "array.unique",
    Sort: "array.sort",
  },
  Number: {
    Integer: "number.integer",
    Precision: "number.precision",
    Min: "number.min",
    Max: "number.max",
    Range: "number.range",
    Multiple: "number.multiple",
    Port: "number.port",
    Safe: "number.safe",
    Finite: "number.finite",
  },
} as const;

export type TIssueKind = GetNestedValues<typeof TIssueKind>;

export type TIssueBase<K extends TIssueKind> = {
  kind: K;
  data: unknown;
  path: Array<string | number>;
  label: string;
  message: string;
  warning?: boolean;
  payload?: unknown;
};

export type MakeTIssue<K extends TIssueKind, P extends Record<string, unknown> | null = null> = tf.Simplify<
  tf.ReadonlyDeep<
    TIssueBase<K> &
      (P extends null
        ? { payload?: never }
        : [tf.HasRequiredKeys<P & object>] extends [true]
        ? { payload: { [K in keyof P as P[K] extends (...args: any[]) => any ? never : K]: P[K] } }
        : { payload?: { [K in keyof P as P[K] extends (...args: any[]) => any ? never : K]: P[K] } })
  >
>;

export type FromTCheck<
  K extends TIssueKind,
  C extends TCheckBase,
  P extends Record<string, unknown> | null = null
> = MakeTIssue<
  K,
  tf.Except<C, keyof TCheckBase> extends infer CP
    ? CP extends Record<string, unknown>
      ? P extends null
        ? CP
        : CP & P
      : P
    : never
>;

export namespace TIssue {
  export type Required = MakeTIssue<"base.required">;
  export type InvalidType = MakeTIssue<"base.invalid_type", { expected: string; received: string }>;
  export type Forbidden = MakeTIssue<"base.forbidden", { types?: string[] }>;

  export namespace Array {
    export type Min = FromTCheck<"array.min", TCheck.Min, { received: number }>;
    export type Max = FromTCheck<"array.max", TCheck.Max, { received: number }>;
    export type Length = FromTCheck<"array.length", TCheck.Length, { received: number }>;
    export type Unique = FromTCheck<
      "array.unique",
      TCheck.Unique,
      { duplicates: Array<{ value: unknown; index: number }> }
    >;
    export type Sort = FromTCheck<"array.sort", TCheck.Sort>;
  }

  export namespace Number {
    export type Integer = FromTCheck<"number.integer", TCheck.Integer>;
    export type Precision = FromTCheck<"number.precision", TCheck.Precision, { received: number }>;
    export type Min = FromTCheck<"number.min", TCheck.Min>;
    export type Max = FromTCheck<"number.max", TCheck.Max>;
    export type Range = FromTCheck<"number.range", TCheck.Range>;
    export type Multiple = FromTCheck<"number.multiple", TCheck.Multiple>;
    export type Port = FromTCheck<"number.port", TCheck.Port>;
    export type Safe = FromTCheck<"number.safe", TCheck.Safe>;
    export type Finite = FromTCheck<"number.finite", TCheck.Finite>;
  }
}

export type TIssue<K extends TIssueKind = TIssueKind> = Extract<
  // Base
  | TIssue.Required
  | TIssue.InvalidType
  | TIssue.Forbidden
  // Array
  | TIssue.Array.Min
  | TIssue.Array.Max
  | TIssue.Array.Length
  | TIssue.Array.Unique
  | TIssue.Array.Sort
  // Number
  | TIssue.Number.Integer
  | TIssue.Number.Precision
  | TIssue.Number.Min
  | TIssue.Number.Max
  | TIssue.Number.Range
  | TIssue.Number.Multiple
  | TIssue.Number.Port
  | TIssue.Number.Safe
  | TIssue.Number.Finite,
  { readonly kind: K }
>;
