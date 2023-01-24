import type { TErrorMap } from "./error";
import { TGlobal } from "./global";
import type { TIssueKind } from "./issues";
import { pick } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TOptionsOpts = {
  readonly issueKinds?: ReadonlyArray<Exclude<TIssueKind, "base.required" | "base.invalid_type">>;
};

export type TOptions<T extends TOptionsOpts | null = null> = {
  readonly abortEarly?: boolean;
  readonly label?: string;
  readonly schemaErrorMap?: TErrorMap;
  readonly warnOnly?: boolean;
  readonly messages?: {
    readonly [K in
      | "base.required"
      | "base.invalid_type"
      | (T extends TOptionsOpts ? Exclude<T["issueKinds"], undefined>[number] : never)]?: string;
  };
};

export type AnyTOptions = TOptions<Required<TOptionsOpts>>;

export type TParseOptions = {
  readonly abortEarly?: boolean;
  readonly label?: string;
  readonly contextualErrorMap?: TErrorMap;
  readonly warnOnly?: boolean;
};

export type TOptionsProcessed<T extends AnyTOptions> = ReturnType<typeof processCreateOptions<T>>;

export function processCreateOptions<T extends AnyTOptions>(opts: T | undefined) {
  const locale = TGlobal.getLocale();
  return {
    abortEarly: opts?.abortEarly ?? false,
    label: opts?.label ?? locale.defaultLabel,
    schemaErrorMap: opts?.schemaErrorMap ?? undefined,
    warnOnly: opts?.warnOnly ?? false,
    messages: {
      ...opts?.messages,
    },
  };
}

export type TParseOptionsProcessed<T extends AnyTOptions> = ReturnType<typeof processParseOptions<T>>;

export function processParseOptions<T extends AnyTOptions>(
  schemaOpts: TOptionsProcessed<T>,
  parseOpts: TParseOptions | undefined
) {
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
