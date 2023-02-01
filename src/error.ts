import util from "util";
import { TGlobal } from "./global";
import type { TIssue, TIssueKind } from "./issues";
import type { TParseContext } from "./parse";
import type { AnyTType, InputOf } from "./types";
import { ValueKind, isKindOf, type AllKeys, type StripKey } from "./utils";
import { string } from "joi";

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

export type TFormattedError<T, U = string> = {
  readonly _errors: readonly U[];
} & (NonNullable<T> extends readonly [unknown, ...unknown[]]
  ? { readonly [K in keyof NonNullable<T>]?: TFormattedError<NonNullable<T>[K], U> }
  : NonNullable<T> extends readonly unknown[]
  ? { readonly [x: number]: TFormattedError<NonNullable<T>[number], U> }
  : NonNullable<T> extends object
  ? { readonly [K in keyof NonNullable<T>]?: TFormattedError<NonNullable<T>[K], U> }
  : unknown);

export type TFlattenedError<T, U = string> = {
  readonly formErrors: readonly U[];
  readonly fieldErrors: T extends Record<string, unknown>
    ? { readonly [K in AllKeys<T>]?: readonly U[] }
    : T extends readonly [unknown, ...unknown[]]
    ? { [K in keyof T]?: readonly U[] }
    : never;
};

export class TError<$I = unknown> extends Error {
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

  override get name() {
    return "TError";
  }

  override get message() {
    return TGlobal.getErrorFormatter()(this.issues);
  }

  override toString() {
    return this.message;
  }

  get issues(): readonly TIssue[] {
    return this._ctx.allIssues;
  }

  format(): TFormattedError<$I>;
  format<U>(mapper: (issue: TIssue) => U): TFormattedError<$I, U>;
  format(_mapper?: (issue: TIssue) => unknown) {
    const mapper = _mapper ?? ((issue: TIssue) => issue.message);
    const fieldErrors = { _errors: [] } as { _errors: unknown[]; [x: string | number]: unknown };

    const processError = (error: TError) => {
      for (const iss of error.issues) {
        if (iss.payload && "errors" in iss.payload) {
          iss.payload.errors.map(processError);
        } else if (iss.payload && "error" in iss.payload) {
          processError(iss.payload.error);
        } else if (iss.path.length === 0) {
          fieldErrors._errors.push(mapper(iss));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < iss.path.length) {
            const el = iss.path[i]!;
            curr[el] = curr[el] ?? { _errors: [] };
            if (i === iss.path.length - 1) {
              (curr[el] as { _errors: unknown[] })._errors.push(mapper(iss));
            }
            curr = curr[el] as typeof fieldErrors;
            i++;
          }
        }
      }
    };

    processError(this);
    return fieldErrors as TFormattedError<$I, unknown>;
  }

  flatten(): TFlattenedError<$I>;
  flatten<U>(mapper: (issue: TIssue) => U): TFlattenedError<$I, U>;
  flatten(_mapper?: (issue: TIssue) => unknown): TFlattenedError<$I, unknown> {
    const mapper = _mapper ?? ((issue: TIssue) => issue.message);
    const fieldErrors: Record<string | number, unknown[]> = {};
    const formErrors: unknown[] = [];

    for (const iss of this.issues) {
      if (iss.path.length > 0) {
        const h = iss.path[0]!;
        fieldErrors[h] = fieldErrors[h] ?? [];
        fieldErrors[h]?.push(mapper(iss));
      } else {
        formErrors.push(mapper(iss));
      }
    }

    return { formErrors, fieldErrors };
  }
}

export type TFormattedErrorOf<T extends AnyTType, U = string> = TFormattedError<InputOf<T>, U>;
export type TFlattenedErrorOf<T extends AnyTType, U = string> = TFlattenedError<InputOf<T>, U>;

export class AbortedParse extends Error {
  constructor() {
    super("<<aborted>>");
  }
}
