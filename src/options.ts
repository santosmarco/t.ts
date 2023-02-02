import type { TErrorMap } from "./error";
import type { TIssue, TIssueKind } from "./issues";
import { type TParseContext } from "./parse/context";
import { type AnyTType } from "./types";
import { utils } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TOptionsOpts = {
  readonly issueKinds?: ReadonlyArray<Exclude<TIssueKind, "base.required" | "base.invalid_type">>;
};

export type TOptions<T extends TOptionsOpts | null = null> = utils.Simplify<{
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

export type ProcessedCreateOptions<T extends AnyTOptions = AnyTOptions> = utils.Simplify<{
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
    messages: { ...opts?.messages },
  };
}

export type TParseHooks<T extends AnyTType = AnyTType, Ctx extends object = object> = {
  readonly hooks?: {
    readonly onInvalidate?: (ctx: Ctx, parseCtx: TParseContext<T>) => void;
    readonly onIssue?: (issue: TIssue, ctx: Ctx, parseCtx: TParseContext<T>) => void;
    readonly onWarning?: (warning: TIssue, ctx: Ctx, parseCtx: TParseContext<T>) => void;
  };
};

export type TParseOptions<Ctx extends object = object> = utils.Simplify<
  {
    readonly abortEarly?: boolean;
    readonly label?: string;
    readonly contextualErrorMap?: TErrorMap;
    readonly warnOnly?: boolean;
    readonly context?: Ctx;
  } & TParseHooks
>;

export type ProcessedTParseOptions<T extends AnyTOptions> = utils.Simplify<{
  readonly abortEarly: boolean;
  readonly label: string | undefined;
  readonly schemaErrorMap: TErrorMap | undefined;
  readonly contextualErrorMap: TErrorMap | undefined;
  readonly warnOnly: boolean;
  readonly messages: Exclude<T["messages"], undefined>;
  readonly externalCtx: object;
  readonly hooks: Exclude<TParseOptions["hooks"], undefined>;
}>;

export function processParseOptions<T extends AnyTOptions>(
  schemaOpts: ProcessedCreateOptions,
  parseOpts: TParseOptions | undefined
): ProcessedTParseOptions<T>;
export function processParseOptions(schemaOpts: ProcessedCreateOptions, parseOpts: TParseOptions | undefined) {
  return {
    abortEarly: parseOpts?.abortEarly ?? schemaOpts.abortEarly,
    label: parseOpts?.label ?? schemaOpts.label,
    schemaErrorMap: schemaOpts.schemaErrorMap,
    contextualErrorMap: parseOpts?.contextualErrorMap ?? undefined,
    warnOnly: parseOpts?.warnOnly ?? schemaOpts.warnOnly,
    messages: schemaOpts.messages,
    externalCtx: { ...parseOpts?.context },
    hooks: { ...parseOpts?.hooks },
  };
}

export function pickTransferrableOptions(options: AnyTOptions) {
  return utils.pick(options, "abortEarly", "schemaErrorMap", "warnOnly", "messages");
}
