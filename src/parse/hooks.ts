import type { TIssue } from "../types";
import type { TParseContext } from "./context";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                TParseHooksDispatcher                                               */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TParseContextHooksDispatcher = {
  onInvalidate(): void;
  onIssue(issue: TIssue): void;
  onWarning(issue: TIssue): void;
};

export function createParseCtxHooksDispatcher(ctx: TParseContext): TParseContextHooksDispatcher {
  const {
    common: { hooks, externalCtx },
  } = ctx;

  return {
    onInvalidate() {
      hooks.onInvalidate?.(externalCtx, ctx);
    },

    onIssue(issue) {
      hooks.onIssue?.(issue, externalCtx, ctx);
    },

    onWarning(issue) {
      hooks.onWarning?.(issue, externalCtx, ctx);
    },
  };
}
