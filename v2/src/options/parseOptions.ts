import { TErrorMap, TIssue, TIssueKind } from "../error";
import { t } from "../tokens";
import { _ } from "../utils";
import type { AnyTProcessedOptions } from "./schemaOptions";

export interface TParseHookResult {
  readonly prevent?: boolean;
}

export interface TParseHooks<Ctx extends Record<string, unknown>> {
  onInvalidate?(context: Ctx): TParseHookResult | void;
  onIssue?(issue: TIssue, context: Ctx): TParseHookResult | void;
  onWarning?(warning: TIssue, context: Ctx): TParseHookResult | void;
}

export interface TParseOptions<Ctx extends Record<string, unknown>> {
  readonly abortEarly?: boolean;
  readonly context?: Ctx;
  readonly contextualErrorMap?: TErrorMap;
  readonly hooks?: TParseHooks<Ctx>;
  readonly label?: string;
  readonly warnOnly?: boolean;
}

export type TProcessedParseOptions<Ctx extends Record<string, unknown>> = _.BRANDED<
  {
    // From schema and/or parse options
    readonly abortEarly: boolean;
    readonly label: string | undefined;
    readonly schemaErrorMap: TErrorMap | undefined;
    readonly warnOnly: boolean;
    readonly messages: Partial<Record<TIssueKind, string>>;
    // From parse options
    readonly externalCtx: Ctx;
    readonly contextualErrorMap: TErrorMap | undefined;
    readonly hooks: TParseHooks<Ctx>;
  },
  typeof t.PROCESSED_PARSE_OPTIONS
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
    t.PROCESSED_PARSE_OPTIONS
  );
}
