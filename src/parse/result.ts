import type { TError } from "../error";
import type { TIssue } from "../issues";
import type { AnyTType } from "../types";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TParseResult                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TParseResultSuccess<$O> = {
  readonly ok: true;
  readonly data: $O;
  readonly error?: never;
  readonly warnings?: readonly TIssue[];
};

export type TParseResultFailure<$I> = {
  readonly ok: false;
  readonly data?: never;
  readonly error: TError<$I>;
  readonly warnings?: readonly TIssue[];
};

export type TParseResultSync<$O, $I> = TParseResultSuccess<$O> | TParseResultFailure<$I>;
export type TParseResultAsync<$O, $I> = Promise<TParseResultSync<$O, $I>>;
export type TParseResult<$O, $I> = TParseResultSync<$O, $I> | TParseResultAsync<$O, $I>;

export type TParseResultSuccessOf<T extends AnyTType> = TParseResultSuccess<T["$O"]>;
export type TParseResultFailureOf<T extends AnyTType> = TParseResultFailure<T["$I"]>;
export type TParseResultSyncOf<T extends AnyTType> = TParseResultSync<T["$O"], T["$I"]>;
export type TParseResultAsyncOf<T extends AnyTType> = TParseResultAsync<T["$O"], T["$I"]>;
export type TParseResultOf<T extends AnyTType> = TParseResultSyncOf<T> | TParseResultAsyncOf<T>;

export const TParseResult = {
  success<$O>(data: $O, warnings?: readonly TIssue[]): TParseResultSuccess<$O> {
    return { ok: true, data, ...(warnings?.length && { warnings }) };
  },

  failure<$I>(error: TError<$I>, warnings?: readonly TIssue[]): TParseResultFailure<$I> {
    return { ok: false, error, ...(warnings?.length && { warnings }) };
  },
};
