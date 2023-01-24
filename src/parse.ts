import type * as tf from "type-fest";
import { TError, resolveErrorMaps } from "./error";
import { TGlobal } from "./global";
import { TIssueKind, type TIssue, type TIssueBase } from "./issues";
import { processCreateOptions, type TParseOptionsProcessed } from "./options";
import type { AnyTType } from "./types";
import { ValueKind, conditionalOmitDeep, isKindOf, kindOf } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TParse                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TParseResultSuccess<$O, $I = $O> = {
  readonly ok: true;
  readonly data: $O;
  readonly error?: never;
  readonly warnings?: readonly TIssue[];
};

export type TParseResultFailure<$O, $I = $O> = {
  readonly ok: false;
  readonly data?: never;
  readonly error: TError;
  readonly warnings?: readonly TIssue[];
};

export type TParseResultSync<$O, $I = $O> = TParseResultSuccess<$O, $I> | TParseResultFailure<$O, $I>;
export type TParseResultAsync<$O, $I = $O> = Promise<TParseResultSync<$O, $I>>;
export type TParseResult<$O, $I = $O> = TParseResultSync<$O, $I> | TParseResultAsync<$O, $I>;

export type TParseResultSuccessOf<T extends AnyTType> = TParseResultSuccess<T["$O"], T["$I"]>;
export type TParseResultFailureOf<T extends AnyTType> = TParseResultFailure<T["$O"], T["$I"]>;
export type TParseResultSyncOf<T extends AnyTType> = TParseResultSync<T["$O"], T["$I"]>;
export type TParseResultAsyncOf<T extends AnyTType> = TParseResultAsync<T["$O"], T["$I"]>;
export type TParseResultOf<T extends AnyTType> = TParseResultSyncOf<T> | TParseResultAsyncOf<T>;

export const TParseContextStatus = {
  Valid: "valid",
  Invalid: "invalid",
} as const;

export type TParseContextStatus = typeof TParseContextStatus[keyof typeof TParseContextStatus];

export type TParseContextPath = ReadonlyArray<string | number | symbol>;

export type TParseContextIssueInput<K extends TIssueKind> = K extends unknown
  ? tf.Except<TIssue<K>, keyof tf.Except<TIssueBase<K>, "kind" | "payload">>
  : never;

export type TParseContextCommon<T extends AnyTType> = TParseOptionsProcessed<T["options"]> & {
  readonly async: boolean;
};

export type TParseContextDef<T extends AnyTType> = {
  readonly t: T;
  readonly data: unknown;
  readonly path: TParseContextPath;
  readonly parent: TParseContext | null;
  readonly common: TParseContextCommon<T>;
};

export class TParseContext<T extends AnyTType = AnyTType> {
  private _status: TParseContextStatus;
  private _data: unknown;

  private readonly _t: T;
  private readonly _path: ReadonlyArray<string | number>;
  private readonly _parent: TParseContext | null;
  private readonly _common: TParseContextCommon<T>;

  private readonly _children: TParseContext[];
  private readonly _issues: TIssue[];
  private readonly _warnings: TIssue[];

  private constructor(def: TParseContextDef<T>) {
    const { t, data, path, parent, common } = def;

    this._status = TParseContextStatus.Valid;
    this._data = data;

    this._t = t;
    this._path = path.map((part) => (isKindOf(part, ValueKind.Symbol) ? String(part) : part));
    this._parent = parent;
    this._common = common;

    this._children = [];
    this._issues = [];
    this._warnings = [];
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

  get path() {
    return this._path;
  }

  get parent(): TParseContext | null {
    return this._parent;
  }

  get root(): TParseContext {
    return this.parent?.root ?? this;
  }

  get common(): TParseContextCommon<T> {
    return this._common;
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

  get ownWarnings(): readonly TIssue[] {
    return this._warnings;
  }

  get allWarnings(): readonly TIssue[] {
    return this.ownWarnings.concat(this.ownChildren.flatMap((child) => child.allWarnings));
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

  child<U extends AnyTType>(t: U, data: unknown, path: TParseContextPath = []): TParseContext<U> {
    const child = new TParseContext({
      t,
      data,
      path: [...this.path, ...path],
      parent: this,
      common: processTParseContextCommon(t, this.common),
    });
    this._children.push(child);
    return child;
  }

  clone<U extends AnyTType>(t: U, data: unknown, path: TParseContextPath = []): TParseContext<U> {
    return new TParseContext({
      t,
      data,
      path: [...this.path, ...path],
      parent: null,
      common: processTParseContextCommon(t, this.common),
    });
  }

  addIssue<K extends TIssueKind>(issue: TParseContextIssueInput<K>, message: string | undefined): this {
    if (!this.common.warnOnly) {
      if (this.valid) {
        this.invalidate();
      } else if (this.common.abortEarly) {
        return this;
      }
    }

    const locale = TGlobal.getLocale();
    const globalErrorMap = TGlobal.getErrorMap();

    const sanitizedIssue = conditionalOmitDeep(issue, ValueKind.Function);

    const partialIssue = {
      ...sanitizedIssue,
      data: this.data,
      path: this.path,
      label: this.common.label ?? generateIssueLabel(this.path, locale.defaultLabel),
      ...(this.common.warnOnly && { warning: true }),
    };

    console.log(this.t.typeName, this.common);

    const issueMsg =
      message ??
      resolveErrorMaps(
        [this.common.contextualErrorMap, this.common.schemaErrorMap, globalErrorMap],
        locale.map
      )(partialIssue);

    const fullIssue = { ...partialIssue, message: issueMsg };

    if (this.common.warnOnly) {
      this._warnings.push(fullIssue);
    } else {
      this._issues.push(fullIssue);
    }

    return this;
  }

  invalidType({ expected }: { readonly expected: string }) {
    if (this.dataKind === ValueKind.Undefined) {
      return this.addIssue({ kind: TIssueKind.Base.Required }, this.common.messages?.[TIssueKind.Base.Required]);
    }

    return this.addIssue(
      { kind: TIssueKind.Base.InvalidType, payload: { received: this.dataKind, expected } },
      this.common.messages?.[TIssueKind.Base.InvalidType]
    );
  }

  result<U extends T["$O"]>(data?: U): TParseResultSyncOf<T> {
    const base = {
      ...(this.allWarnings.length && { warnings: this.allWarnings }),
    };

    if (!this.valid && !this.common.warnOnly) {
      return {
        ...base,
        ok: false,
        error: new TError(this),
      };
    }

    return {
      ...base,
      ok: true,
      data: arguments.length > 0 ? data : this.data,
    };
  }

  static createSync<T extends AnyTType>(
    t: T,
    data: unknown,
    options: TParseOptionsProcessed<T["options"]>
  ): TParseContext<T> {
    return new TParseContext({
      t,
      data,
      path: [],
      parent: null,
      common: { ...options, async: false },
    });
  }

  static createAsync<T extends AnyTType>(
    t: T,
    data: unknown,
    options: TParseOptionsProcessed<T["options"]>
  ): TParseContext<T> {
    return new TParseContext({
      t,
      data,
      path: [],
      parent: null,
      common: { ...options, async: true },
    });
  }
}

function processTParseContextCommon<T extends AnyTType, U extends AnyTType>(
  t: T,
  common: TParseContextCommon<U>
): TParseContextCommon<T> {
  const processedTOpts = processCreateOptions(t.options);

  return {
    ...common,
    ...processedTOpts,
  };
}

function generateIssueLabel(path: TParseContextPath, defaultValue: string): string {
  let label = "";

  for (const segment of path) {
    if (isKindOf(segment, ValueKind.String)) {
      if (label) {
        label += ".";
      }

      label += segment;
    } else {
      label += `[${String(segment)}]`;
    }
  }

  if (!label) {
    return defaultValue;
  }

  if (label.startsWith("[")) {
    return defaultValue + label;
  }

  return label;
}