import type { _ } from "../utils";
import type { TError, TIssue } from "../error";
import type { AnyTType } from "../types";

export type TParseResultSuccess<Out> = {
  readonly ok: true;
  readonly data: Out;
  readonly error?: never;
  readonly warnings?: readonly TIssue[];
};

export type TParseResultFailure<In> = {
  readonly ok: false;
  readonly data?: never;
  readonly error: TError<In>;
  readonly warnings?: readonly TIssue[];
};

export type TParseResultSync<Out, In> = TParseResultSuccess<Out> | TParseResultFailure<In>;
export type TParseResultAsync<Out, In> = Promise<TParseResultSync<Out, In>>;
export type TParseResult<Out, In> = TParseResultSync<Out, In> | TParseResultAsync<Out, In>;

export type TParseResultSuccessOf<T extends AnyTType> = TParseResultSuccess<T["$O"]>;
export type TParseResultFailureOf<T extends AnyTType> = TParseResultFailure<T["$I"]>;
export type TParseResultSyncOf<T extends AnyTType> = TParseResultSync<T["$O"], T["$I"]>;
export type TParseResultAsyncOf<T extends AnyTType> = TParseResultAsync<T["$O"], T["$I"]>;
export type TParseResultOf<T extends AnyTType> = TParseResultSyncOf<T> | TParseResultAsyncOf<T>;

export const parseResult = {
  success<Out>(data: Out, warnings?: readonly TIssue[]): TParseResultSuccess<Out> {
    return {
      ok: true,
      data,
      ...(warnings?.length && { warnings }),
    };
  },

  failure<In>(error: TError<In>, warnings?: readonly TIssue[]): TParseResultFailure<In> {
    return {
      ok: false,
      error,
      ...(warnings?.length && { warnings }),
    };
  },
};
