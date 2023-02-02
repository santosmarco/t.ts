import type { AnyTType, ProcessedTParseOptions } from "../types";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                 TParseContextCommon                                                */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TParseContextCommon<T extends AnyTType> = ProcessedTParseOptions<T["options"]> & {
  readonly async: boolean;
};

export type AnyTParseContextCommon = TParseContextCommon<AnyTType>;

export function processParseCtxCommon<T extends AnyTType>(
  schema: T,
  common: AnyTParseContextCommon
): TParseContextCommon<T> {
  return {
    ...schema.options,
    abortEarly: schema.options.abortEarly || common.abortEarly,
    contextualErrorMap: common.contextualErrorMap,
    warnOnly: schema.options.warnOnly || common.warnOnly,
    externalCtx: common.externalCtx,
    hooks: common.hooks,
    async: common.async,
  };
}
