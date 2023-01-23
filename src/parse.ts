import type * as tf from "type-fest";
import { TError, resolveErrorMaps } from "./error";
import { TGlobal } from "./global";
import { TIssueKind, type TIssue, type TIssueBase } from "./issues";
import type { TOptions, TParseOptions } from "./options";
import type { AnyTType } from "./types";
import { ValueKind, isKindOf, kindOf, type StripKey } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TParse                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TParseResultSuccess<T> = {
  readonly ok: true;
  readonly data: T;
  readonly error?: never;
};

export type TParseResultFailure = {
  readonly ok: false;
  readonly data?: never;
  readonly error: TError;
};

export type TParseResultSync<T> = TParseResultSuccess<T> | TParseResultFailure;
export type TParseResultAsync<T> = Promise<TParseResultSync<T>>;
export type TParseResult<T> = TParseResultSync<T> | TParseResultAsync<T>;

export const TParseContextStatus = {
  Valid: "valid",
  Invalid: "invalid",
} as const;

export type TParseContextStatus = typeof TParseContextStatus[keyof typeof TParseContextStatus];

export type TParseContextPath = readonly (string | number | symbol)[];

export type TParseContextIssueInput<K extends TIssueKind> = K extends unknown
  ? tf.Except<TIssue<K>, keyof TIssueBase<K>>
  : never;

export type TParseContextCommon = TParseOptions & {
  readonly async: boolean;
};

export type TParseContextDef = {
  readonly t: AnyTType;
  readonly data: unknown;
  readonly path: TParseContextPath;
  readonly parent: TParseContext | null;
  readonly common: TParseContextCommon;
};

export class TParseContext {
  private _status: TParseContextStatus;
  private _data: unknown;

  private readonly _t: AnyTType;
  private readonly _path: readonly (string | number)[];
  private readonly _parent: TParseContext | null;
  private readonly _common: TParseContextCommon;

  private readonly _children: TParseContext[];
  private readonly _issues: TIssue[];

  private constructor(def: TParseContextDef) {
    const { t, data, path, parent, common } = def;

    this._status = TParseContextStatus.Valid;
    this._data = data;

    this._t = t;
    this._path = path.map((part) => (isKindOf(part, ValueKind.Symbol) ? String(part) : part));
    this._parent = parent;
    this._common = common;

    this._children = [];
    this._issues = [];
  }

  get status() {
    return this._status;
  }

  get data() {
    return this._data;
  }

  get dataKind() {
    return kindOf(this.data);
  }

  get t() {
    return this._t;
  }

  get path(): TParseContextPath {
    return this._path;
  }

  get parent(): TParseContext | null {
    return this._parent;
  }

  get root(): TParseContext {
    return this.parent?.root ?? this;
  }

  get common(): TParseContextCommon & TOptions {
    return { ...this._common, ...this.t.options };
  }

  get ownChildren(): readonly TParseContext[] {
    return this._children;
  }

  get allChildren(): readonly TParseContext[] {
    return this.ownChildren.concat(this.ownChildren.flatMap((child) => child.allChildren));
  }

  get ownIssues(): readonly TIssue[] {
    return this._issues;
  }

  get allIssues(): readonly TIssue[] {
    return this.ownIssues.concat(this.ownChildren.flatMap((child) => child.allIssues));
  }

  get valid(): boolean {
    return this.status === TParseContextStatus.Valid && this.allChildren.every((child) => child.valid);
  }

  setData(data: unknown): this {
    this._data = data;
    return this;
  }

  invalidate(): this {
    if (!this.valid) return this;
    this._status = TParseContextStatus.Invalid;
    this.parent?.invalidate();
    return this;
  }

  child(t: AnyTType, data: unknown, path: TParseContextPath = []): TParseContext {
    const child = new TParseContext({
      t,
      data,
      path: this.path.concat(path),
      parent: this,
      common: this.common,
    });
    this._children.push(child);
    return child;
  }

  clone(t: AnyTType, data: unknown, path: TParseContextPath = []): TParseContext {
    return new TParseContext({
      t,
      data,
      path: this.path.concat(path),
      parent: null,
      common: this.common,
    });
  }

  addIssue<K extends TIssueKind>(
    kind: K,
    ...args: "payload" extends tf.OptionalKeysOf<TParseContextIssueInput<K>>
      ? [message: string | undefined]
      : [payload: TParseContextIssueInput<K>["payload"], message: string | undefined]
  ): this {
    const [message, payload] = isKindOf(args[0], ValueKind.String)
      ? ([args[0], undefined] as const)
      : ([args[1], args[0]] as const);

    if (!this.valid) {
      if (this.common.abortEarly) {
        return this;
      }
    } else {
      this.invalidate();
    }

    const locale = TGlobal.getLocale();

    const partialIssue = {
      kind,
      data: this.data,
      path: this.path,
      label: this.common.label ?? generateIssueLabel(this.path, locale.defaultLabel),
      ...(payload && { payload }),
    } as StripKey<TIssue<K>, "message">;

    const issueMsg =
      message ??
      resolveErrorMaps(
        [this.common.contextualErrorMap, this.common.schemaErrorMap, TGlobal.getErrorMap()],
        locale
      )(partialIssue);

    const fullIssue = { ...partialIssue, message: issueMsg };

    this._issues.push(fullIssue);

    return this;
  }

  invalidType({ expected }: { readonly expected: string }) {
    if (this.dataKind === ValueKind.Undefined) {
      return this.addIssue(TIssueKind.Base.Required, this.common.messages?.[TIssueKind.Base.Required]);
    }

    return this.addIssue(
      TIssueKind.Base.InvalidType,
      { received: this.dataKind, expected },
      this.common.messages?.[TIssueKind.Base.InvalidType]
    );
  }

  abort(): TParseResultFailure {
    if (this.valid) {
      this.invalidate();
    }

    return {
      ok: false,
      error: new TError(this),
    };
  }

  result<T>(data: T): TParseResultSync<T> {
    if (!this.valid) {
      return this.abort();
    }

    return {
      ok: true,
      data,
    };
  }

  static createSync(t: AnyTType, data: unknown, options: TParseOptions | undefined): TParseContext {
    return new TParseContext({
      t,
      data,
      path: [],
      parent: null,
      common: { ...options, async: false },
    });
  }

  static createAsync(t: AnyTType, data: unknown, options: TParseOptions | undefined): TParseContext {
    return new TParseContext({
      t,
      data,
      path: [],
      parent: null,
      common: { ...options, async: true },
    });
  }
}

function generateIssueLabel(path: TParseContextPath, defaultValue: string): string {
  let label = "";

  for (let segment of path) {
    if (isKindOf(segment, ValueKind.Symbol)) {
      segment = String(segment);
    }

    if (isKindOf(segment, ValueKind.String)) {
      if (label) {
        label += ".";
      }

      label += segment;
    } else {
      label += `[${segment}]`;
    }
  }

  if (!label) {
    return defaultValue;
  }

  return label;
}
