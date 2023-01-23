import util from "util";
import { TGlobal } from "./global";
import type { TIssue, TIssueKind } from "./issues";
import type { TLocale } from "./locales/_base";
import { TParseContext } from "./parse";
import { ValueKind, isKindOf, type StripKey } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TError                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TErrorMapFn<K extends TIssueKind = TIssueKind> = (issue: StripKey<TIssue<K>, "message">) => string;
export type TErrorMapObj = { readonly [K in TIssueKind]?: TErrorMapFn<K> | string };
export type TErrorMap = TErrorMapFn | TErrorMapObj | string;

export function resolveErrorMaps(maps: readonly (TErrorMap | undefined)[], locale: TLocale): TErrorMapFn {
  return (issue) => {
    const msgs = [...maps]
      .reverse()
      .map((map) => {
        if (isKindOf(map, ValueKind.String)) {
          return map;
        }

        if (isKindOf(map, ValueKind.Function)) {
          return map(issue);
        }

        const fnOrMsg = map?.[issue.kind];

        if (isKindOf(fnOrMsg, ValueKind.String)) {
          return fnOrMsg;
        }

        return fnOrMsg?.(issue as never);
      })
      .filter((msg): msg is string => !!msg);

    return msgs[0] ?? locale.map(issue);
  };
}

export type TErrorFormatter = (issues: readonly TIssue[]) => string;

export function defaultErrorFormatter(issues: readonly TIssue[]): string {
  return util.inspect(issues, {
    colors: true,
    depth: Infinity,
    maxArrayLength: Infinity,
    maxStringLength: Infinity,
    sorted: true,
  });
}

export class TError extends Error {
  readonly name = "TError";

  private readonly _ctx: TParseContext;

  constructor(ctx: TParseContext) {
    super();

    this._ctx = ctx.root;
  }

  get issues(): readonly TIssue[] {
    return this._ctx.allIssues;
  }

  get message() {
    return TGlobal.getErrorFormatter()(this.issues);
  }
}
