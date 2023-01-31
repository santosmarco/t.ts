import type { TErrorMap } from "./error";
import type { TIssueKind } from "./issues";
import { pick, type _ } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TOptionsOpts = {
  readonly issueKinds?: ReadonlyArray<Exclude<TIssueKind, "base.required" | "base.invalid_type">>;
};

export type TOptions<T extends TOptionsOpts | null = null> = _<{
  readonly abortEarly?: boolean;
  readonly label?: string;
  readonly schemaErrorMap?: TErrorMap;
  readonly warnOnly?: boolean;
  readonly messages?: {
    readonly [K in
      | "base.required"
      | "base.invalid_type"
      | (T extends { readonly issueKinds: ReadonlyArray<infer U extends string> } ? U : never)]?: string;
  };
}>;

export type AnyTOptions = TOptions<Required<TOptionsOpts>>;

export type ProcessedCreateOptions<T extends AnyTOptions = AnyTOptions> = _<{
  readonly abortEarly: boolean;
  readonly label: string | undefined;
  readonly schemaErrorMap: TErrorMap | undefined;
  readonly warnOnly: boolean;
  readonly messages: Exclude<T["messages"], undefined>;
}>;

export function processCreateOptions<T extends AnyTOptions>(opts: T | undefined): ProcessedCreateOptions<T>;
export function processCreateOptions(opts: AnyTOptions | undefined) {
  return {
    abortEarly: opts?.abortEarly ?? false,
    label: opts?.label,
    schemaErrorMap: opts?.schemaErrorMap,
    warnOnly: opts?.warnOnly ?? false,
    messages: {
      ...opts?.messages,
    },
  };
}

export type TParseOptions = _<{
  readonly abortEarly?: boolean;
  readonly label?: string;
  readonly contextualErrorMap?: TErrorMap;
  readonly warnOnly?: boolean;
}>;

export type ProcessedParseOptions<T extends AnyTOptions = AnyTOptions> = _<{
  readonly abortEarly: boolean;
  readonly label: string | undefined;
  readonly schemaErrorMap: TErrorMap | undefined;
  readonly contextualErrorMap: TErrorMap | undefined;
  readonly warnOnly: boolean;
  readonly messages: Exclude<T["messages"], undefined>;
}>;

export function processParseOptions<T extends AnyTOptions>(
  schemaOpts: ProcessedCreateOptions,
  parseOpts: TParseOptions | undefined
): ProcessedParseOptions<T>;
export function processParseOptions(schemaOpts: ProcessedCreateOptions, parseOpts: TParseOptions | undefined) {
  return {
    abortEarly: parseOpts?.abortEarly ?? schemaOpts.abortEarly,
    label: parseOpts?.label ?? schemaOpts.label,
    schemaErrorMap: schemaOpts.schemaErrorMap,
    contextualErrorMap: parseOpts?.contextualErrorMap ?? undefined,
    warnOnly: parseOpts?.warnOnly ?? schemaOpts.warnOnly,
    messages: schemaOpts.messages,
  };
}

export function pickTransferrableOptions(options: AnyTOptions) {
  return pick(options, ["abortEarly", "schemaErrorMap", "warnOnly", "messages"]);
}
