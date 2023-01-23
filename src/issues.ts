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
} as const;

export type TIssueKind = GetNestedValues<typeof TIssueKind>;

export type TIssueBase<K extends TIssueKind> = {
  readonly kind: K;
  readonly data: unknown;
  readonly path: readonly (string | number)[];
  readonly label: string;
  readonly message: string;
};

export type MakeTIssue<K extends TIssueKind, P extends Record<string, unknown> | null = null> = TIssueBase<K> &
  (P extends null ? { readonly payload?: never } : { readonly payload: P });

export namespace TIssue {
  export type Required = MakeTIssue<"base.required">;

  export type InvalidType = MakeTIssue<"base.invalid_type", { readonly expected: string; readonly received: string }>;

  export type Forbidden = MakeTIssue<"base.forbidden">;
}

export type TIssue<K extends TIssueKind = TIssueKind> = Extract<
  TIssue.Required | TIssue.InvalidType | TIssue.Forbidden,
  { readonly kind: K }
>;
