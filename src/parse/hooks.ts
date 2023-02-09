import type { TIssue } from "../types";
import type { TParseContext } from "./context";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                             TParseContextHookDispatcher                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TParseContextHookReturn = void | {
  readonly prevent?: boolean;
};

export type TParseContextHookDispatcher = {
  onInvalidate(): TParseContextHookReturn;
  onIssue(issue: TIssue): TParseContextHookReturn;
  onWarning(issue: TIssue): TParseContextHookReturn;
};

export function createParseCtxHookDispatcher(ctx: TParseContext): TParseContextHookDispatcher {
  const {
    common: { hooks, externalCtx },
  } = ctx;

  return {
    onInvalidate(): TParseContextHookReturn {
      return hooks.onInvalidate?.(externalCtx, ctx);
    },

    onIssue(issue): TParseContextHookReturn {
      return hooks.onIssue?.(issue, externalCtx, ctx);
    },

    onWarning(issue): TParseContextHookReturn {
      return hooks.onWarning?.(issue, externalCtx, ctx);
    },
  };
}
