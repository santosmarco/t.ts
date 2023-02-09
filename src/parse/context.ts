import { AbortedParse, TError, resolveErrorMaps } from "../error";
import { TGlobal } from "../global";
import { TIssueKind, type TIssue, type TIssueBase } from "../issues";
import type { ProcessedTParseOptions } from "../options";
import type { AnyTType } from "../types";
import { ValueKind, conditionalOmitKindDeep, isKindOf, kindOf, type StripKey, type utils } from "../utils";
import { processParseCtxCommon, type TParseContextCommon } from "./common";
import { createParseCtxHookDispatcher, type TParseContextHookDispatcher } from "./hooks";
import { TParseResult, type TParseResultSyncOf } from "./result";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TParse                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TParseContextStatus = {
  Valid: "valid",
  Invalid: "invalid",
} as const;

export type TParseContextStatus = typeof TParseContextStatus[keyof typeof TParseContextStatus];

export type TParseContextPath = ReadonlyArray<string | number | symbol>;

export type TParseContextIssueData = StripKey<
  TIssue,
  keyof utils.Except<TIssueBase<TIssueKind>, "kind" | "payload">
> & {
  readonly fatal?: boolean;
  readonly path?: TParseContextPath;
};

export type TParseContextDef<T extends AnyTType> = {
  readonly schema: T;
  readonly data: unknown;
  readonly path: TParseContextPath;
  readonly parent: TParseContext | null;
  readonly common: TParseContextCommon<T>;
};

export class TParseContext<T extends AnyTType = AnyTType> {
  private _status: TParseContextStatus;
  private _data: unknown;

  private readonly _schema: T;
  private readonly _path: ReadonlyArray<string | number>;
  private readonly _parent: TParseContext | null;
  private readonly _common: TParseContextCommon<T>;

  private readonly _children: TParseContext[];
  private readonly _issues: TIssue[];
  private readonly _warnings: TIssue[];

  private readonly _dispatcher: TParseContextHookDispatcher;

  private constructor(def: TParseContextDef<T>) {
    const { schema, data, path, parent, common } = def;

    this._status = TParseContextStatus.Valid;
    this._data = data;

    this._schema = schema;
    this._path = coercePath(path);
    this._parent = parent;
    this._common = common;

    this._children = [];
    this._issues = [];
    this._warnings = [];

    this._dispatcher = createParseCtxHookDispatcher(this);
  }

  get status(): TParseContextStatus {
    return this._status;
  }

  get data(): unknown {
    return this._data;
  }

  get dataKind(): ValueKind {
    return kindOf(this.data);
  }

  get schema(): T {
    return this._schema;
  }

  get path(): ReadonlyArray<string | number> {
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
    const action = this._dispatcher.onInvalidate();

    if (!this.valid || action?.prevent) {
      return this;
    }

    this._status = TParseContextStatus.Invalid;

    this.parent?.invalidate();

    return this;
  }

  child<U extends AnyTType>(schema: U, data: unknown, path: TParseContextPath = []): TParseContext<U> {
    const processedCommon = processParseCtxCommon(schema, this.common);

    const child = new TParseContext({
      schema,
      data,
      path: [...this.path, ...path],
      parent: this,
      common: processedCommon,
    });

    this._children.push(child);

    return child;
  }

  clone<U extends AnyTType>(schema: U, data: unknown, path: TParseContextPath = []): TParseContext<U> {
    const processedCommon = processParseCtxCommon(schema, this.common);

    return new TParseContext({
      schema,
      data,
      path: [...this.path, ...path],
      parent: null,
      common: processedCommon,
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
      path: issuePath,
      label: this.common.label ?? generateIssueLabel(this.path, locale.defaultLabel),
      hint: this.schema.show(),
      ...(this.common.warnOnly && { warning: true }),
    };

    const issueMsg =
      message ??
      resolveErrorMaps(
        [this.common.contextualErrorMap, this.common.schemaErrorMap, globalErrorMap],
        locale.map
      )(partialIssue);

    const fullIssue = { ...partialIssue, message: issueMsg };

    const action = this._dispatcher[this.common.warnOnly ? "onWarning" : "onIssue"]?.(fullIssue);

    if (action?.prevent) {
      return this;
    }

    if (!this.common.warnOnly) {
      if (this.valid) {
        this.invalidate();
      } else if (this.common.abortEarly) {
        return this;
      }
    }

    if (this.common.warnOnly) {
      this._warnings.push(fullIssue);
    } else {
      this._issues.push(fullIssue);
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
    if (!this.valid && !this.common.warnOnly) {
      return TParseResult.failure(new TError(this), this.allWarnings);
    }

    return TParseResult.success(arguments.length > 0 ? data : this.data, this.allWarnings);
  }

  async abortAsync(): Promise<never> {
    return Promise.reject(new AbortedParse());
  }

  async resolveAsync(): Promise<void> {
    return Promise.resolve();
  }

  handleAsyncAbort(err: unknown) {
    if (!(err instanceof AbortedParse) && isKindOf(err, ValueKind.Error)) {
      throw err;
    }

    return this.return();
  }

  static readonly createSync = TParseContext._makeCreate(false);
  static readonly createAsync = TParseContext._makeCreate(true);

  private static _makeCreate(async: boolean) {
    return <T extends AnyTType>(t: T, data: unknown, options: ProcessedTParseOptions<T["options"]>): TParseContext<T> =>
      new TParseContext({ schema: t, data, path: [], parent: null, common: { ...options, async } });
  }
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
