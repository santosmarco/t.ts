import type { TParseContext } from "../parse";
import type { _ } from "../utils";
import type { TIssue, TIssueKind } from "./issues";

export type TErrorMapFn<K extends TIssueKind = TIssueKind> = (issue: _.StripKey<TIssue<K>, "message">) => string;
export type TErrorMapObj = { readonly [K in TIssueKind]?: TErrorMapFn<K> | string };
export type TErrorMap = TErrorMapFn | TErrorMapObj | string;

export type TErrorFormatter = (issues: readonly TIssue[]) => string;

export class TError<In> extends Error {
  override readonly name = "TError";

  protected readonly _issues: readonly TIssue[];

  constructor(issues: readonly TIssue[]) {
    super();

    this._issues = issues;
  }

  get issues() {
    return this._issues.slice();
  }

  static fromParseContext<In>(context: TParseContext<unknown, In>) {
    return new TError<In>([...context.allIssues, ...context.allWarnings]);
  }
}

export function resolveErrorMaps(
  maps: ReadonlyArray<TErrorMap | null | undefined>,
  defaultMapFn: TErrorMapFn
): TErrorMapFn {
  return (issue) => {
    const msgs = [...maps]
      .reverse()
      .map((map) => {
        if (typeof map === "string") {
          return map;
        }

        if (typeof map === "function") {
          return map(issue);
        }

        const fnOrMsg = map?.[issue.kind];

        if (typeof fnOrMsg === "string") {
          return fnOrMsg;
        }

        return fnOrMsg?.(issue as never);
      })
      .filter((msg): msg is NonNullable<typeof msg> => !!msg);

    return msgs[0] ?? defaultMapFn(issue);
  };
}
