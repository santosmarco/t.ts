import { TError, TIssueKind, type TIssue, type TIssueBase, resolveErrorMaps } from "../error";
import { TGlobal } from "../global";
import type { TProcessedParseOptions } from "../options";
import type { AnyTType } from "../types";
import { ValueKind, _, kindOf } from "../utils";
import { TParseContextCommon, processParseCtxCommon } from "./common";
import { parseResult, type TParseResultSync } from "./results";

export enum TParseContextStatus {
  Valid = "valid",
  Invalid = "invalid",
}

export type TParseContextRawPath = readonly (string | number | symbol)[];
export type TParseContextPath = readonly (string | number)[];

export type TParseContextIssueInput = _.StripKey<TIssue, keyof _.Except<TIssueBase, "kind">> & {
  readonly fatal?: boolean;
  readonly path?: TParseContextRawPath;
};

export type TParseContextDef<Out, In> = {
  readonly schema: AnyTType<Out, In>;
  readonly data: unknown;
  readonly path: TParseContextPath;
  readonly parent: AnyTParseContext | null;
  readonly common: TParseContextCommon;
};

export class TParseContext<Out, In> {
  private _status: TParseContextStatus;
  private _data: unknown;

  private readonly _schema: AnyTType<Out, In>;
  private readonly _path: TParseContextPath;
  private readonly _parent: AnyTParseContext | null;
  private readonly _common: TParseContextCommon;

  private readonly _children: AnyTParseContext[];
  private readonly _issues: TIssue[];
  private readonly _warnings: TIssue[];

  constructor(def: TParseContextDef<Out, In>) {
    this._status = TParseContextStatus.Valid;
    this._data = def.data;

    this._schema = def.schema;
    this._path = def.path;
    this._parent = def.parent;
    this._common = def.common;

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

  get schema() {
    return this._schema;
  }

  get path(): readonly (string | number)[] {
    return this._path.slice();
  }

  get parent() {
    return this._parent;
  }

  get root(): AnyTParseContext {
    return this.parent?.root ?? this;
  }

  get common() {
    return this._common;
  }

  get ownChildren(): readonly AnyTParseContext[] {
    return this._children.slice();
  }

  get allChildren(): readonly AnyTParseContext[] {
    return this.ownChildren.concat(this.ownChildren.flatMap((child) => child.allChildren));
  }

  get ownIssues(): readonly TIssue[] {
    return this._issues.slice();
  }

  get allIssues(): readonly TIssue[] {
    return this.ownIssues.concat(this.ownChildren.flatMap((child) => child.allIssues));
  }

  get ownWarnings(): readonly TIssue[] {
    return this._warnings.slice();
  }

  get allWarnings(): readonly TIssue[] {
    return this.ownWarnings.concat(this.ownChildren.flatMap((child) => child.allWarnings));
  }

  get isValid(): boolean {
    if (!this.parent) {
      return this.status === TParseContextStatus.Valid && this.allIssues.length === 0;
    }

    return this.parent.isValid;
  }

  setData(data: unknown): this {
    this._data = data;
    return this;
  }

  invalidate(): this {
    const hookResult = this.common.hooks.onInvalidate?.(this.common.externalCtx);

    // Return early if the context is already invalid or if the hook has prevented the invalidation
    if (!this.isValid || hookResult?.prevent) {
      return this;
    }

    // Invalidate this context and all of its parents
    this._status = TParseContextStatus.Invalid;
    this.parent?.invalidate();

    return this;
  }

  child<T extends AnyTType>(schema: T, data: unknown, path: TParseContextPath = []): TParseContextOf<T> {
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

  addIssue(issue: TParseContextIssueInput, message: string | undefined) {
    const locale = TGlobal.getLocale();
    const globalErrorMap = TGlobal.getErrorMap();

    const sanitizedIssue = _.sanitizeDeep(issue);

    const issuePath = issue.path ? [...this.path, ...coerceRawPath(issue.path)] : this.path;

    const partialIssue = {
      ...sanitizedIssue,
      data: this.data,
      path: issuePath,
      label: this.common.label ?? generateLabel(this.path, locale.defaultLabel),
      ...(this.common.warnOnly && { warning: true }),
    };

    const issueMsg =
      message ??
      resolveErrorMaps(
        [this.common.contextualErrorMap, this.common.schemaErrorMap, globalErrorMap],
        locale.map
      )(partialIssue);

    const fullIssue = { ...partialIssue, message: issueMsg };

    const hookResult = this.common.hooks[this.common.warnOnly ? "onWarning" : "onIssue"]?.(
      fullIssue,
      this.common.externalCtx
    );

    // Return early if the hook has prevented the context from storing the issue
    if (hookResult?.prevent) {
      return this;
    }

    if (!this.common.warnOnly) {
      if (this.isValid) {
        // If not in warnOnly mode and the context is still valid, invalidate it
        this.invalidate();
      } else if (this.common.abortEarly) {
        // If the context is already invalid and we're in abortEarly mode, return
        // without storing the issue
        return this;
      }
    }

    // Store the warning/issue accordingly
    this[this.common.warnOnly ? "_warnings" : "_issues"].push(fullIssue);

    return this;
  }

  invalidType({ expected }: { readonly expected: ValueKind }) {
    if (this.dataKind === ValueKind.Undefined) {
      return this.addIssue({ kind: TIssueKind.Base.Required }, this.common.messages?.[TIssueKind.Base.Required]);
    }

    return this.addIssue(
      {
        kind: TIssueKind.Base.InvalidType,
        payload: { received: this.dataKind, expected },
      },
      this.common.messages?.[TIssueKind.Base.InvalidType]
    );
  }

  return(data?: Out): TParseResultSync<Out, In> {
    if (!this.isValid && !this.common.warnOnly) {
      // If the context is invalid and we're not in warnOnly mode, return a failure
      return parseResult.failure(TError.fromParseContext(this), this.allWarnings);
    }

    // We return a success even if the context is invalid if we're in warnOnly mode
    return parseResult.success((arguments.length > 0 ? data : this.data) as Out, this.allWarnings);
  }

  static readonly createSync = TParseContext._makeCreate(false);
  static readonly createAsync = TParseContext._makeCreate(true);

  private static _makeCreate(async: boolean) {
    return <T extends AnyTType, Ctx extends Record<string, unknown>>(
      schema: T,
      data: unknown,
      options: TProcessedParseOptions<Ctx>
    ): TParseContext<T["$O"], T["$I"]> =>
      new TParseContext({
        schema,
        data,
        path: [],
        parent: null,
        common: { ...options, async },
      });
  }
}

export type AnyTParseContext = TParseContext<unknown, unknown>;

export type TParseContextOf<T extends AnyTType> = TParseContext<T["$O"], T["$I"]>;

function generateLabel(path: TParseContextPath, defaultValue: string): string {
  let label = "";

  for (const segment of path) {
    if (typeof segment === "string") {
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

function coerceRawPath(path: TParseContextRawPath): TParseContextPath {
  return path.map((segment) => {
    if (typeof segment === "symbol") {
      return String(segment);
    }

    return segment;
  });
}
