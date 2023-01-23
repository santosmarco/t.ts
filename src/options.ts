import type * as tb from "ts-toolbelt";
import type { TErrorMap } from "./error";
import type { TIssueKind } from "./issues";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TOptionsOpts = {
  readonly issueKinds?: readonly Exclude<TIssueKind, "base.required" | "base.invalid_type">[];
};

export type TOptions<T extends TOptionsOpts | null = null> = {
  readonly abortEarly?: boolean;
  readonly label?: string;
  readonly schemaErrorMap?: TErrorMap;
  readonly messages?: {
    readonly [K in
      | "base.required"
      | "base.invalid_type"
      | (T extends { readonly issueKinds: infer U extends readonly TIssueKind[] } ? U[number] : never)]?: string;
  };
};

export type TCreateOptions<T extends TOptions = TOptions> = tb.A.Compute<T> & {};

export type TParseOptions = {
  readonly contextualErrorMap?: TErrorMap;
};
