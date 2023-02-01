import type * as tf from "type-fest";
import type { TCheck, TCheckBase } from "./checks";
import type { TError } from "./error";
import type { TEnumValue, TLiteralValue } from "./types";
import type { GetNestedValues, utils } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TIssues                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TIssueKind = {
  Base: {
    Required: "base.required",
    InvalidType: "base.invalid_type",
    Forbidden: "base.forbidden",
  },
  Literal: {
    Invalid: "literal.invalid",
  },
  Enum: {
    Invalid: "enum.invalid",
  },
  String: {
    Min: "string.min",
    Max: "string.max",
    Length: "string.length",
    Range: "string.range",
    Pattern: "string.pattern",
    Alphanum: "string.alphanum",
    Email: "string.email",
    Url: "string.url",
    Cuid: "string.cuid",
    Uuid: "string.uuid",
    Hex: "string.hex",
    Base64: "string.base64",
    Ascii: "string.ascii",
    DataUri: "string.data_uri",
    Hostname: "string.hostname",
    Ip: "string.ip",
    IpVersion: "string.ip_version",
    Uri: "string.uri",
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
  Array: {
    Min: "array.min",
    Max: "array.max",
    Length: "array.length",
    Range: "array.range",
    Unique: "array.unique",
    Sort: "array.sort",
  },
  Tuple: {
    Length: "tuple.length",
  },
  Set: {
    Min: "set.min",
    Max: "set.max",
    Size: "set.size",
    Range: "set.range",
  },
  Buffer: {
    Min: "buffer.min",
    Max: "buffer.max",
    Length: "buffer.length",
    Range: "buffer.range",
  },
  Record: {
    InvalidKey: "record.invalid_key",
    MinKeys: "record.min_keys",
    MaxKeys: "record.max_keys",
  },
  Map: {
    InvalidKey: "map.invalid_key",
  },
  Object: {
    UnknownKeys: "object.unknown_keys",
    MissingKeys: "object.missing_keys",
  },
  Function: {
    InvalidThisType: "function.invalid_this_type",
    InvalidArguments: "function.invalid_arguments",
    InvalidReturnType: "function.invalid_return_type",
  },
  Union: {
    Invalid: "union.invalid",
  },
  Intersection: {
    Invalid: "intersection.invalid",
  },
  Custom: {
    Invalid: "custom.invalid",
  },
} as const;

export type TIssueKind = GetNestedValues<typeof TIssueKind>;

export type TIssueBase<K extends TIssueKind> = {
  kind: K;
  data: unknown;
  path: Array<string | number>;
  label: string;
  message: string;
  hint: string;
  warning?: boolean;
  payload?: unknown;
};

export type MakeTIssue<K extends TIssueKind, P extends Record<string, unknown> | null = null> = utils.SimplifyDeep<
  utils.ReadonlyDeep<
    TIssueBase<K> &
      (P extends null
        ? { payload?: never }
        : [tf.HasRequiredKeys<P & object>] extends [true]
        ? { payload: { [K in keyof P as P[K] extends (...args: readonly any[]) => any ? never : K]: P[K] } }
        : { payload?: { [K in keyof P as P[K] extends (...args: readonly any[]) => any ? never : K]: P[K] } })
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

  export namespace Literal {
    export type Invalid = MakeTIssue<
      "literal.invalid",
      { expected: TLiteralValue; received: { value: TLiteralValue; type?: never } | { value?: never; type: string } }
    >;
  }

  export namespace Enum {
    export type Invalid = MakeTIssue<
      "enum.invalid",
      { expected: TEnumValue[]; received: { value: TEnumValue; type?: never } | { value?: never; type: string } }
    >;
  }

  export namespace String {
    export type Min = FromTCheck<"string.min", TCheck.Min, { received: number }>;
    export type Max = FromTCheck<"string.max", TCheck.Max, { received: number }>;
    export type Length = FromTCheck<"string.length", TCheck.Length, { received: number }>;
    export type Range = FromTCheck<"string.range", TCheck.Range, { received: number }>;
    export type Pattern = FromTCheck<"string.pattern", TCheck.Pattern>;
    export type Alphanum = FromTCheck<"string.alphanum", TCheck.Alphanum>;
    export type Email = FromTCheck<"string.email", TCheck.Email>;
    export type Url = FromTCheck<"string.url", TCheck.Url>;
    export type Cuid = FromTCheck<"string.cuid", TCheck.Cuid>;
    export type Uuid = FromTCheck<"string.uuid", TCheck.Uuid>;
    export type Hex = FromTCheck<"string.hex", TCheck.Hex>;
    export type Base64 = FromTCheck<"string.base64", TCheck.Base64>;
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

  export namespace Array {
    export type Min = FromTCheck<"array.min", TCheck.Min, { received: number }>;
    export type Max = FromTCheck<"array.max", TCheck.Max, { received: number }>;
    export type Length = FromTCheck<"array.length", TCheck.Length, { received: number }>;
    export type Range = FromTCheck<"array.range", TCheck.Range, { received: number }>;
    export type Unique = FromTCheck<
      "array.unique",
      TCheck.Unique,
      { duplicates: Array<{ value: unknown; index: number }> }
    >;
    export type Sort = FromTCheck<"array.sort", TCheck.Sort>;
  }

  export namespace Tuple {
    export type Length = FromTCheck<"tuple.length", TCheck.TupleLength, { received: number }>;
  }

  export namespace Set {
    export type Min = FromTCheck<"set.min", TCheck.Min, { received: number }>;
    export type Max = FromTCheck<"set.max", TCheck.Max, { received: number }>;
    export type Size = FromTCheck<"set.size", TCheck.Size, { received: number }>;
    export type Range = FromTCheck<"set.range", TCheck.Range, { received: number }>;
  }

  export namespace Buffer {
    export type Min = FromTCheck<"buffer.min", TCheck.Min, { received: number }>;
    export type Max = FromTCheck<"buffer.max", TCheck.Max, { received: number }>;
    export type Length = FromTCheck<"buffer.length", TCheck.Length, { received: number }>;
    export type Range = FromTCheck<"buffer.range", TCheck.Range, { received: number }>;
  }

  export namespace Record {
    export type InvalidKey = MakeTIssue<"record.invalid_key", { key: PropertyKey; error: TError }>;
    export type MinKeys = FromTCheck<"record.min_keys", TCheck.MinKeys, { received: number }>;
    export type MaxKeys = FromTCheck<"record.max_keys", TCheck.MaxKeys, { received: number }>;
  }

  export namespace Map {
    export type InvalidKey = MakeTIssue<"map.invalid_key", { key: unknown; error: TError }>;
  }

  export namespace Object {
    export type UnknownKeys = MakeTIssue<"object.unknown_keys", { keys: PropertyKey[] }>;
    export type MissingKeys = MakeTIssue<"object.missing_keys", { keys: string[] }>;
  }

  export namespace Function {
    export type InvalidThisType = MakeTIssue<"function.invalid_this_type", { error: TError }>;
    export type InvalidArguments = MakeTIssue<"function.invalid_arguments", { error: TError }>;
    export type InvalidReturnType = MakeTIssue<"function.invalid_return_type", { error: TError }>;
  }

  export namespace Union {
    export type Invalid = MakeTIssue<"union.invalid", { errors: TError[] }>;
  }

  export namespace Intersection {
    export type Invalid = MakeTIssue<"intersection.invalid", { errors: TError[] }>;
  }

  export namespace Custom {
    export type Invalid = MakeTIssue<"custom.invalid", { params?: Record<string, unknown> }>;
  }
}

export type TIssue<K extends TIssueKind = TIssueKind> = Extract<
  // Base
  | TIssue.Required
  | TIssue.InvalidType
  | TIssue.Forbidden
  // Literal
  | TIssue.Literal.Invalid
  // Enum
  | TIssue.Enum.Invalid
  // String
  | TIssue.String.Min
  | TIssue.String.Max
  | TIssue.String.Length
  | TIssue.String.Range
  | TIssue.String.Pattern
  | TIssue.String.Alphanum
  | TIssue.String.Email
  | TIssue.String.Url
  | TIssue.String.Cuid
  | TIssue.String.Uuid
  | TIssue.String.Hex
  | TIssue.String.Base64
  // Number
  | TIssue.Number.Integer
  | TIssue.Number.Precision
  | TIssue.Number.Min
  | TIssue.Number.Max
  | TIssue.Number.Range
  | TIssue.Number.Multiple
  | TIssue.Number.Port
  | TIssue.Number.Safe
  | TIssue.Number.Finite
  // Array
  | TIssue.Array.Min
  | TIssue.Array.Max
  | TIssue.Array.Length
  | TIssue.Array.Range
  | TIssue.Array.Unique
  | TIssue.Array.Sort
  // Tuple
  | TIssue.Tuple.Length
  // Set
  | TIssue.Set.Min
  | TIssue.Set.Max
  | TIssue.Set.Size
  | TIssue.Set.Range
  // Buffer
  | TIssue.Buffer.Min
  | TIssue.Buffer.Max
  | TIssue.Buffer.Length
  | TIssue.Buffer.Range
  // Record
  | TIssue.Record.InvalidKey
  | TIssue.Record.MinKeys
  | TIssue.Record.MaxKeys
  // Map
  | TIssue.Map.InvalidKey
  // Object
  | TIssue.Object.UnknownKeys
  | TIssue.Object.MissingKeys
  // Function
  | TIssue.Function.InvalidThisType
  | TIssue.Function.InvalidArguments
  | TIssue.Function.InvalidReturnType
  // Union
  | TIssue.Union.Invalid
  // Intersection
  | TIssue.Intersection.Invalid
  // Custom
  | TIssue.Custom.Invalid,
  { readonly kind: K }
>;
