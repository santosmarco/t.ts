import type { AnyTProcessedParseOptions } from "../options";
import type { AnyTType } from "../types";
import type { _ } from "../utils";

export interface TParseContextCommon extends _.UNBRANDED<AnyTProcessedParseOptions> {
  readonly async: boolean;
}

export function processParseCtxCommon(schema: AnyTType, common: TParseContextCommon): TParseContextCommon {
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
