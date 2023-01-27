import type * as tf from "type-fest";
import { TError, TErrorMap, resolveErrorMaps } from "./error";
import { TGlobal } from "./global";
import { TIssueKind, type TIssue, type TIssueBase } from "./issues";
import { AnyTOptions, TColor } from "./options";
import type { AnyTType } from "./types";
import { DeepPartial, StripKey, ValueKind, conditionalOmitKindDeep, initParseDebug, isKindOf, kindOf } from "./utils";

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

export type TParseResultSync<$O, $I = $O> = TParseResultSuccess<$O> | TParseResultFailure<$I>;
export type TParseResultAsync<$O, $I = $O> = Promise<TParseResultSync<$O, $I>>;
export type TParseResult<$O, $I = $O> = TParseResultSync<$O, $I> | TParseResultAsync<$O, $I>;

export type TParseResultSuccessOf<T extends AnyTType> = TParseResultSuccess<T["$O"]>;
export type TParseResultFailureOf<T extends AnyTType> = TParseResultFailure<T["$I"]>;

export type TParseResultSyncOf<T extends AnyTType> = TParseResultSync<T["$O"], T["$I"]>;
export type TParseResultAsyncOf<T extends AnyTType> = TParseResultAsync<T["$O"], T["$I"]>;
export type TParseResultOf<T extends AnyTType> = TParseResultSyncOf<T> | TParseResultAsyncOf<T>;

export const TParseContextStatus = {
  Valid: "valid",
  Invalid: "invalid",
} as const;

export type TParseContextStatus = typeof TParseContextStatus[keyof typeof TParseContextStatus];

export type TParseContextPath = ReadonlyArray<string | number | symbol>;

export type TParseOnIssueHookConfig = {
  readonly skip?: boolean;
};

export type TParseOptions = {
  readonly abortEarly: boolean;
  readonly contextualErrorMap: TErrorMap | undefined;
  readonly debug: boolean;
  readonly label: string | undefined;
  readonly warnOnly: boolean;
  readonly hooks: {
    readonly onIssue: ((issue: TIssue) => void | TParseOnIssueHookConfig) | undefined;
  };
};

export type TParseContextCommon<T extends AnyTOptions> = TParseOptions & {
  readonly async: boolean;
  readonly color: TColor;
  readonly schemaErrorMap: TErrorMap | undefined;
  readonly messages: Exclude<T["messages"], undefined>;
};

export type TParseContextDef<T extends AnyTType> = {
  readonly t: T;
  readonly data: unknown;
  readonly path: TParseContextPath;
  readonly parent: TParseContext | null;
  readonly common: TParseContextCommon<T["options"]>;
};

export type TParseContextIssueData = StripKey<TIssue, keyof tf.Except<TIssueBase<TIssueKind>, "kind" | "payload">> & {
  readonly fatal?: boolean;
  readonly path?: TParseContextPath;
};

export class TParseContext<T extends AnyTType = AnyTType> {
  private _status: TParseContextStatus;
  private _data: unknown;

  private readonly _t: T;
  private readonly _path: ReadonlyArray<string | number>;
  private readonly _parent: TParseContext | null;
  private readonly _common: TParseContextCommon<T["options"]>;

  private readonly _children: TParseContext[];
  private readonly _issues: TIssue[];
  private readonly _warnings: TIssue[];

  private readonly _debug = initParseDebug(this);

  private constructor(def: TParseContextDef<T>) {
    const { t, data, path, parent, common } = def;

    this._status = TParseContextStatus.Valid;
    this._data = data;

    this._t = t;
    this._path = coercePath(path);
    this._parent = parent;
    this._common = common;

    this._children = [];
    this._issues = [];
    this._warnings = [];

    this._debug.log("Context initialized", { _data: data });
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

  get label() {
    const locale = TGlobal.getLocale();
    return this.common.label ?? generateIssueLabel(this.path, locale.defaultLabel);
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

  get common(): TParseContextCommon<T["options"]> {
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
    if (!this.parent) {
      return this.status === TParseContextStatus.Valid && this.allIssues.length === 0;
    }
    return this.parent.valid;
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
    const childPath = [...this.path, ...path];

    this._debug.log(`Creating child on context: ${this._debug.printPath(childPath)}`);

    const child = new TParseContext({
      t,
      data,
      path: [...this.path, ...path],
      parent: this,
      common: deriveCtxCommon(t, this),
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
      common: deriveCtxCommon(t, this),
    });
  }

  addIssue(issue: TParseContextIssueData, message: string | undefined): this {
    const locale = TGlobal.getLocale();
    const globalErrorMap = TGlobal.getErrorMap();

    const sanitizedIssue = Object.fromEntries(
      Object.entries(conditionalOmitKindDeep(issue, ValueKind.Function)).filter(
        ([_, v]) => typeof v !== "object" || Object.keys(v).length > 0
      )
    ) as TParseContextIssueData;

    const issuePath = issue.path ? [...this.path, ...coercePath(issue.path)] : this.path;

    const partialIssue = {
      ...sanitizedIssue,
      data: this.data,
      label: this.label,
      path: issuePath,
      ...(this.common.warnOnly && { warning: true }),
    };

    const issueMsg =
      message ??
      resolveErrorMaps(
        [this.common.contextualErrorMap, this.common.schemaErrorMap, globalErrorMap],
        locale.map
      )(partialIssue);

    const fullIssue = { ...partialIssue, message: issueMsg };

    const config = this.common.hooks.onIssue?.(fullIssue);

    if (config?.skip) {
      return this;
    }

    if (this.common.warnOnly) {
      this._warnings.push(fullIssue);
    } else {
      if (this.valid) {
        this.invalidate();
      } else if (this.common.abortEarly) {
        return this;
      }
      this._issues.push(fullIssue);
      this._debug.log(
        `Issue pushed to context: ${this._debug.underline(fullIssue.kind)} ${this._debug.italic(
          `(Total issues on root: ${this.root.allIssues.length})`
        )}`,
        { ["__Total issues on root__"]: this.root.allIssues.length, ...fullIssue }
      );
    }

    return this;
  }

  addWarning(warning: TIssue): this {
    this._warnings.push(warning);
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

  return<U extends T["$O"]>(data?: U): TParseResultSyncOf<T> {
    const base = {
      ...(this.allWarnings.length && { warnings: this.allWarnings }),
    };

    const result: TParseResultSyncOf<T> =
      this.valid || this.common.warnOnly
        ? { ...base, ok: true, data: arguments.length > 0 ? data : this.data }
        : { ...base, ok: false, error: new TError(this) };

    this._debug.log(
      `Returning ${
        this.valid || this.common.warnOnly ? this._debug.bold.green("valid") : this._debug.bold.red("invalid")
      } result`,
      result
    );

    return result;
  }

  static readonly createSync = TParseContext._makeCreate(false);
  static readonly createAsync = TParseContext._makeCreate(true);

  private static _makeCreate(async: boolean) {
    return <T extends AnyTType>(
      t: T,
      data: unknown,
      options: DeepPartial<TParseOptions> | undefined
    ): TParseContext<T> => {
      return new TParseContext({
        t,
        data,
        path: [],
        parent: null,
        common: makeCtxCommon(t.options, { ...options }, async),
      });
    };
  }
}

function makeCtxCommon<T extends AnyTOptions>(
  tOptions: T,
  parseOptions: DeepPartial<TParseOptions>,
  async: boolean
): TParseContextCommon<T> {
  return {
    abortEarly: tOptions.abortEarly ?? parseOptions.abortEarly ?? false,
    label: tOptions.label ?? parseOptions.label,
    debug: parseOptions.debug ?? false,
    color: tOptions.color ?? TColor.White,
    schemaErrorMap: tOptions.schemaErrorMap,
    contextualErrorMap: parseOptions.contextualErrorMap,
    warnOnly: tOptions.warnOnly ?? parseOptions.warnOnly ?? false,
    messages: { ...tOptions.messages } as Exclude<T["messages"], undefined>,
    hooks: {
      onIssue: parseOptions.hooks?.onIssue ?? undefined,
    },
    async,
  };
}

function deriveCtxCommon<T extends AnyTType, U extends AnyTType>(
  t: T,
  ctx: TParseContext<U>
): TParseContextCommon<T["options"]> {
  const previousCtxCommon = makeCtxCommon(t.options, ctx.common, ctx.common.async);
  return {
    ...previousCtxCommon,
    // Overwrite schema-specific fields
    label: t.options.label,
    schemaErrorMap: t.options.schemaErrorMap,
    messages: t.options.messages,
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

function coercePath(path: TParseContextPath): ReadonlyArray<string | number> {
  return path.map((segment) => {
    if (isKindOf(segment, ValueKind.Symbol)) {
      return String(segment);
    }

    return segment;
  });
}
