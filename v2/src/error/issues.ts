import type { ValueKind, _ } from "../utils";

export namespace TIssueKind {
  export enum Base {
    Required = "base.required",
    InvalidType = "base.invalid_type",
    Forbidden = "base.forbidden",
  }
}

export type TIssueKind = TIssueKind.Base;

export interface TIssueBase<K extends TIssueKind = TIssueKind> {
  kind: K;
  data: unknown;
  path: (string | number)[];
  label: string;
  message: string;
  isWarning?: boolean;
}

export type MakeTIssue<K extends TIssueKind, P extends Record<string, unknown> | null = null> = _.ReadonlyDeep<
  TIssueBase<K> & (P extends null ? unknown : { payload: P })
>;

export namespace TIssue {
  export namespace Base {
    export type Required = MakeTIssue<TIssueKind.Base.Required>;

    export type InvalidType = MakeTIssue<TIssueKind.Base.InvalidType, { expected: ValueKind; received: ValueKind }>;

    export type Forbidden = MakeTIssue<
      TIssueKind.Base.Forbidden,
      { types?: ValueKind[]; values?: never } | { types?: never; values?: string[] }
    >;
  }
}

export type TIssue<K extends TIssueKind = TIssueKind> = Extract<
  TIssue.Base.Required | TIssue.Base.InvalidType | TIssue.Base.Forbidden,
  { kind: K }
>;
