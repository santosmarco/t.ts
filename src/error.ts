import util from "util";
import { TGlobal } from "./global";
import type { TIssue, TIssueKind } from "./issues";
import type { TParseContext } from "./parse";
import { ValueKind, isKindOf, type StripKey } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TError                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TErrorMapFn<K extends TIssueKind = TIssueKind> = (issue: StripKey<TIssue<K>, "message">) => string;
export type TErrorMapObj = { readonly [K in TIssueKind]?: TErrorMapFn<K> | string };
export type TErrorMap = TErrorMapFn | TErrorMapObj | string;

export function resolveErrorMaps(
  maps: ReadonlyArray<TErrorMap | null | undefined>,
  defaultMapFn: TErrorMapFn
): TErrorMapFn {
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
      .filter((msg): msg is string => Boolean(msg));

    return msgs[0] ?? defaultMapFn(issue);
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

export class TError<$I = unknown> extends Error {
  override get name() {
    return "TError";
  }

  private readonly _ctx: TParseContext;

  constructor(ctx: TParseContext) {
    super();

    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      // eslint-disable-next-line no-proto
      (this as Record<string, unknown>)["__proto__"] = actualProto;
    }

    this._ctx = ctx.root;

    Object.keys(this).forEach((k) =>
      Object.defineProperty(this, k, {
        enumerable: !/^_\w*/.exec(String(k)),
      })
    );
  }

  get issues(): readonly TIssue[] {
    return this._ctx.allIssues;
  }

  override get message() {
    return TGlobal.getErrorFormatter()(this.issues);
  }
}
