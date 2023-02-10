import type { TErrorMap, TIssue, TIssueKind } from "../error";
import { tokens } from "../tokens";
import { _ } from "../utils";
import type { AnyTProcessedOptions } from "./schemaOptions";

export type TParseHookResult = _.Simplify<{
  readonly prevent?: boolean;
}>;

export type TParseHooks<Ctx extends Record<string, unknown>> = _.Simplify<{
  onInvalidate?(context: Ctx): TParseHookResult | void;
  onIssue?(issue: TIssue, context: Ctx): TParseHookResult | void;
  onWarning?(warning: TIssue, context: Ctx): TParseHookResult | void;
}>;

export type TParseOptions<Ctx extends Record<string, unknown>> = _.Simplify<{
  readonly abortEarly?: boolean;
  readonly context?: Ctx;
  readonly contextualErrorMap?: TErrorMap;
  readonly hooks?: TParseHooks<Ctx>;
  readonly label?: string;
  readonly warnOnly?: boolean;
}>;

export type TProcessedParseOptions<Ctx extends Record<string, unknown>> = _.BRANDED<
  {
    // From schema and/or parse options
    readonly abortEarly: boolean;
    readonly label: string | undefined;
    readonly schemaErrorMap: TErrorMap | undefined;
    readonly warnOnly: boolean;
    readonly messages: Partial<Record<TIssueKind, string>>;
    // From parse options only
    readonly externalContext: Ctx;
    readonly contextualErrorMap: TErrorMap | undefined;
    readonly hooks: TParseHooks<Ctx>;
  },
  typeof tokens.PROCESSED_PARSE_OPTIONS
>;

export type AnyTProcessedParseOptions = TProcessedParseOptions<Record<string, unknown>>;

export function processParseOptions<Ctx extends Record<string, unknown>>(
  schemaOptions: AnyTProcessedOptions,
  parseOptions: TParseOptions<Ctx> = {}
): TProcessedParseOptions<Ctx> {
  return _.enbrand(
    {
      ...schemaOptions,
      externalCtx: parseOptions.context ?? {},
      contextualErrorMap: parseOptions.contextualErrorMap,
      hooks: parseOptions.hooks ?? {},
    },
    tokens.PROCESSED_PARSE_OPTIONS
  );
}
