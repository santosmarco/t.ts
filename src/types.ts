import type * as tf from "type-fest";
import {
  TCheckKind,
  filterChecks,
  filterOutChecks,
  sanitizeCheck,
  validateMax,
  validateMin,
  validateRange,
  type TCheck,
} from "./checks";
import type { AnyBrandedTDef, MakeTDef, TCtorDef, TDef, TRuntimeDef } from "./def";
import { type TErrorMap } from "./error";
import { TGlobal } from "./global";
import { TIssueKind } from "./issues";
import { parseMaybeDescriptive, type DescriptiveWithValue } from "./manifest";
import {
  pickTransferrableOptions,
  processCreateOptions,
  processParseOptions,
  type TOptions,
  type TParseOptions,
} from "./options";
import { TParseContext, type TParseResultOf, type TParseResultSyncOf } from "./parse";
import {
  ValueKind,
  assertNever,
  cloneDeep,
  debrand,
  filterOut,
  includes,
  isKindOf,
  kindOf,
  tail,
  type AtLeastOne,
  type FilterOut,
  type UnionToTuple,
} from "./utils";

export const TTypeName = {
  Any: "TAny",
  Array: "TArray",
  BigInt: "TBigInt",
  Boolean: "TBoolean",
  Buffer: "TBuffer",
  Catch: "TCatch",
  Date: "TDate",
  Default: "TDefault",
  Defined: "TDefined",
  Enum: "TEnum",
  False: "TFalse",
  Intersection: "TIntersection",
  Lazy: "TLazy",
  Literal: "TLiteral",
  Map: "TMap",
  NaN: "TNaN",
  NativeEnum: "TNativeEnum",
  Never: "TNever",
  NonNullable: "TNonNullable",
  Null: "TNull",
  Nullable: "TNullable",
  Number: "TNumber",
  Optional: "TOptional",
  Promise: "TPromise",
  Record: "TRecord",
  Set: "TSet",
  String: "TString",
  Symbol: "TSymbol",
  True: "TTrue",
  Undefined: "TUndefined",
  Union: "TUnion",
  Unknown: "TUnknown",
  Void: "TVoid",
} as const;

export type TTypeName = typeof TTypeName[keyof typeof TTypeName];

export const tt = Symbol("tt");
export type tt = typeof tt;

export abstract class TType<D extends AnyBrandedTDef> {
  declare readonly $O: D["$Out"];
  declare readonly $I: D["$In"];

  protected readonly _def: TRuntimeDef<D>;

  protected constructor(def: TCtorDef<D>) {
    const { typeName, props = null, options, manifest = {}, checks = [] } = def;

    this._def = cloneDeep({ typeName, props, options: debrand(options), manifest, checks });

    this.clone = this.clone.bind(this);
    // Parsing
    this._parse = this._parse.bind(this);
    this._parseSync = this._parseSync.bind(this);
    this._parseAsync = this._parseAsync.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parse = this.parse.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.guard = this.guard.bind(this);
    // Utils
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.defined = this.defined.bind(this);
    this.nonnullable = this.nonnullable.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.promisable = this.promisable.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.lazy = this.lazy.bind(this);
    // Options
    this.abortEarly = this.abortEarly.bind(this);
    this.label = this.label.bind(this);
    this.errorMap = this.errorMap.bind(this);
    this.warnOnly = this.warnOnly.bind(this);
    this.messages = this.messages.bind(this);
    // Manifest
    this.title = this.title.bind(this);
    this.summary = this.summary.bind(this);
    this.description = this.description.bind(this);
    this.examples = this.examples.bind(this);
    this.tags = this.tags.bind(this);
    this.notes = this.notes.bind(this);
    this.unit = this.unit.bind(this);
    this.meta = this.meta.bind(this);

    Object.keys(this).forEach((k) =>
      Object.defineProperty(this, k, {
        enumerable: !/^\$\w*/.exec(String(k)),
      })
    );
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get typeName(): D["$TypeName"] {
    return this._def.typeName;
  }

  get props(): D["$Props"] {
    return this._def.props;
  }

  get options(): D["$Options"] {
    return this._def.options;
  }

  get manifest(): D["$Manifest"] {
    return this._def.manifest;
  }

  get checks(): D["$Checks"] {
    return this._def.checks;
  }

  clone(): this {
    return this._construct();
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  abstract _parse(ctx: TParseContext<this>): TParseResultOf<this>;

  _parseSync(ctx: TParseContext<this>): TParseResultSyncOf<this> {
    const result = this._parse(ctx);

    if (isKindOf(result, ValueKind.Promise)) {
      throw new Error("Synchronous parse encountered Promise. Use `.parseAsync()`/`.safeParseAsync()` instead.");
    }

    return result;
  }

  async _parseAsync(ctx: TParseContext<this>): Promise<TParseResultSyncOf<this>> {
    return Promise.resolve(this._parse(ctx));
  }

  safeParse(data: unknown, options?: TParseOptions): TParseResultSyncOf<this> {
    const result = this._parseSync(TParseContext.createSync(this, data, processParseOptions(this.options, options)));
    return result;
  }

  parse(data: unknown, options?: TParseOptions): this["$O"] {
    const result = this.safeParse(data, options);

    if (!result.ok) {
      throw result.error;
    }

    return result.data;
  }

  async safeParseAsync(data: unknown, options?: TParseOptions): Promise<TParseResultSyncOf<this>> {
    const result = this._parseAsync(TParseContext.createAsync(this, data, processParseOptions(this.options, options)));
    return result;
  }

  async parseAsync(data: unknown, options?: TParseOptions): Promise<this["$O"]> {
    const result = await this.safeParseAsync(data, options);

    if (!result.ok) {
      throw result.error;
    }

    return result.data;
  }

  guard(data: unknown): data is this["$O"] {
    return this.safeParse(data).ok;
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  optional(): TOptional<this> {
    return TOptional.create(this, pickTransferrableOptions(this.options));
  }

  nullable(): TNullable<this> {
    return TNullable.create(this, pickTransferrableOptions(this.options));
  }

  nullish(): TOptional<TNullable<this>> {
    return this.nullable().optional();
  }

  defined(): TDefined<this> {
    return TDefined.create(this, pickTransferrableOptions(this.options));
  }

  nonnullable(): TNonNullable<this> {
    return TNonNullable.create(this, pickTransferrableOptions(this.options));
  }

  array(): TArray<this> {
    return TArray.create(this, pickTransferrableOptions(this.options));
  }

  record(): TRecord<TString, this> {
    return TRecord.create(this, pickTransferrableOptions(this.options));
  }

  promise(): TPromise<this> {
    return TPromise.create(this, pickTransferrableOptions(this.options));
  }

  promisable(): TUnion<[this, TPromise<this>]> {
    return this.or(this.promise());
  }

  or<T extends AtLeastOne<AnyTType>>(...types: T): TUnion<[this, ...T]> {
    return TUnion._create([this, ...types], pickTransferrableOptions(this.options));
  }

  and<T extends AtLeastOne<AnyTType>>(...types: T): TIntersection<[this, ...T]> {
    return TIntersection._create([this, ...types], pickTransferrableOptions(this.options));
  }

  default<D extends Exclude<this["$I"], undefined>>(getDefault: () => D): TDefault<this, D>;
  default<D extends Exclude<this["$I"], undefined>>(defaultValue: D): TDefault<this, D>;
  default<D extends Exclude<this["$I"], undefined>>(defaultValueOrGetter: D | (() => D)): TDefault<this, D> {
    return TDefault.create(this, defaultValueOrGetter, pickTransferrableOptions(this.options));
  }

  catch<C extends this["$O"]>(getCatch: () => C): TCatch<this, C>;
  catch<C extends this["$O"]>(catchValue: C): TCatch<this, C>;
  catch<C extends this["$O"]>(catchValueOrGetter: C | (() => C)): TCatch<this, C> {
    return TCatch.create(this, catchValueOrGetter, pickTransferrableOptions(this.options));
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, pickTransferrableOptions(this.options));
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  abortEarly(enabled = true) {
    return this._construct({ ...this._def, options: { ...this.options, abortEarly: enabled } });
  }

  label(label: string): this {
    return this._construct({ ...this._def, options: { ...this.options, label } });
  }

  errorMap(errorMap: TErrorMap) {
    return this._construct({ ...this._def, options: { ...this.options, schemaErrorMap: errorMap } });
  }

  warnOnly(enabled = true) {
    return this._construct({ ...this._def, options: { ...this.options, warnOnly: enabled } });
  }

  messages(messages: this["options"]["messages"], options = { overwrite: false }) {
    return this._construct({
      ...this._def,
      options: { ...this.options, messages: options.overwrite ? messages : { ...this.options.messages, ...messages } },
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  title(title: string): this {
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, title } });
  }

  summary(summary: string): this {
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, summary } });
  }

  description(description: string): this {
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, description } });
  }

  examples(
    examples: tf.RequireAtLeastOne<{
      in: MaybeWithOverride<AtLeastOne<DescriptiveWithValue<D["$In"]>>>;
      out: MaybeWithOverride<AtLeastOne<DescriptiveWithValue<D["$Out"]>>>;
    }>
  ): this {
    const currExamplesIn = this._def.manifest.examples?.in ?? [];
    const currExamplesOut = this._def.manifest.examples?.out ?? [];
    return this._construct({
      ...this._def,
      manifest: {
        ...this._def.manifest,
        examples: {
          ...this._def.manifest.examples,
          ...(examples.in && {
            in: examples.in[0] === TMarkers.override ? tail(examples.in) : [...currExamplesIn, ...examples.in],
          }),
          ...(examples.out && {
            out: examples.out[0] === TMarkers.override ? tail(examples.out) : [...currExamplesOut, ...examples.out],
          }),
        },
      },
    });
  }

  tags(...tags: MaybeWithOverride<AtLeastOne<string | DescriptiveWithValue<string>>>) {
    const currTags = this._def.manifest.tags ?? [];
    const updatedTags =
      tags[0] === TMarkers.override ? tail(tags) : [...currTags, ...tags.map((t) => parseMaybeDescriptive(t))];
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, tags: updatedTags } });
  }

  notes(...notes: MaybeWithOverride<AtLeastOne<string | DescriptiveWithValue<string>>>) {
    const currNotes = this._def.manifest.tags ?? [];
    const updatedNotes =
      notes[0] === TMarkers.override ? tail(notes) : [...currNotes, ...notes.map((n) => parseMaybeDescriptive(n))];
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, notes: updatedNotes } });
  }

  unit(unit: string | DescriptiveWithValue<string>) {
    return this._construct({
      ...this._def,
      manifest: { ...this._def.manifest, unit: typeof unit === "string" ? { value: unit } : unit },
    });
  }

  meta(meta: Record<string, unknown>, options = { overwrite: false }) {
    return this._construct({
      ...this._def,
      manifest: { ...this._def.manifest, meta: options.overwrite ? meta : { ...this._def.manifest.meta, ...meta } },
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  protected _addCheck(
    check: Exclude<D["$Checks"], null>[number],
    options?: { unique?: boolean; remove?: AtLeastOne<Exclude<D["$Checks"], null>[number]["kind"]> }
  ) {
    let self = this.clone();

    if (options?.unique) {
      self = self._removeChecks(check.kind);
    }

    if (options?.remove) {
      self = self._removeChecks(...options.remove);
    }

    return self._construct({ ...this._def, checks: [...(this._def.checks ?? []), check] });
  }

  protected _removeChecks(...checks: AtLeastOne<Exclude<D["$Checks"], null>[number]["kind"]>) {
    return this._construct({
      ...this._def,
      checks: (this._def.checks ?? []).filter((check) => !checks.includes(check.kind)),
    });
  }

  protected _construct(def?: tf.Except<TRuntimeDef<D>, "typeName">): this {
    return Reflect.construct<[def: TRuntimeDef<D>], this>(this.constructor as new (def: TRuntimeDef<D>) => this, [
      { ...this._def, ...def },
    ]);
  }

  get [tt]() {
    return true;
  }
}

export type AnyTType = TType<any>;

export type OutputOf<T extends AnyTType> = tf.Simplify<T["$O"]>;
export type InputOf<T extends AnyTType> = tf.Simplify<T["$I"]>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TAnyDef = MakeTDef<{
  $Out: any;
  $TypeName: "TAny";
}>;

export class TAny extends TType<TAnyDef> {
  _parse(ctx: TParseContext<this>) {
    return ctx.return(ctx.data);
  }

  static create(options?: TOptions): TAny {
    return new TAny({ typeName: TTypeName.Any, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TUnknown                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUnknownDef = MakeTDef<{
  $Out: unknown;
  $TypeName: "TUnknown";
}>;

export class TUnknown extends TType<TUnknownDef> {
  _parse(ctx: TParseContext<this>) {
    return ctx.return(ctx.data);
  }

  static create(options?: TOptions): TUnknown {
    return new TUnknown({ typeName: TTypeName.Unknown, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNever                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNeverOptions = TOptions<{ issueKinds: ["base.forbidden"] }>;

export type TNeverDef = MakeTDef<{
  $Out: never;
  $TypeName: "TNever";
  $Options: TNeverOptions;
}>;

export class TNever extends TType<TNeverDef> {
  _parse(ctx: TParseContext<this>) {
    return ctx
      .addIssue({ kind: TIssueKind.Base.Forbidden }, this.options.messages?.[TIssueKind.Base.Forbidden])
      .return();
  }

  static create(options?: TNeverOptions): TNever {
    return new TNever({ typeName: TTypeName.Never, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUndefinedDef = MakeTDef<{
  $Out: undefined;
  $TypeName: "TUndefined";
}>;

export class TUndefined extends TType<TUndefinedDef> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, ValueKind.Undefined)
      ? ctx.return(ctx.data)
      : ctx.invalidType({ expected: ValueKind.Undefined }).return();
  }

  static create(options?: TOptions): TUndefined {
    return new TUndefined({ typeName: TTypeName.Undefined, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TVoid                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TVoidDef = MakeTDef<{
  $Out: void;
  $TypeName: "TVoid";
}>;

export class TVoid extends TType<TVoidDef> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, ValueKind.Undefined)
      ? ctx.return(ctx.data)
      : ctx.invalidType({ expected: ValueKind.Void }).return();
  }

  static create(options?: TOptions): TVoid {
    return new TVoid({ typeName: TTypeName.Void, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNullDef = MakeTDef<{
  $Out: null;
  $TypeName: "TNull";
}>;

export class TNull extends TType<TNullDef> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, ValueKind.Null)
      ? ctx.return(ctx.data)
      : ctx.invalidType({ expected: ValueKind.Null }).return();
  }

  static create(options?: TOptions): TNull {
    return new TNull({ typeName: TTypeName.Null, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TStringCoercion = boolean;

export type TStringDef<Co extends TStringCoercion> = MakeTDef<{
  $Out: string;
  $In: Co extends true ? any : string;
  $TypeName: "TString";
  $Props: { readonly coercion: Co };
}>;

export class TString<Co extends TStringCoercion = false> extends TType<TStringDef<Co>> {
  _parse(ctx: TParseContext<this>) {
    if (this.props.coercion) {
      ctx.setData(String(ctx.data));
    }

    if (!isKindOf(ctx.data, ValueKind.String)) {
      return ctx.invalidType({ expected: ValueKind.String }).return();
    }

    return ctx.return(ctx.data);
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends TStringCoercion = true>(value = true as C): TString<C> {
    return new TString<C>({ ...this._def, props: { ...this.props, coercion: value } });
  }

  static create(options?: TOptions): TString {
    return new TString({
      typeName: TTypeName.String,
      props: { coercion: false },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTString = TString<TStringCoercion>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNumberCoercion = boolean | AtLeastOne<"string" | "bigint">;
export type TNumberCasting = false | "string" | "bigint";

export type TNumberDef<Co extends TNumberCoercion, Ca extends TNumberCasting> = MakeTDef<{
  $Out: Ca extends "string" ? string : Ca extends "bigint" ? bigint : number;
  $In: Co extends true ? any : Co extends "string" ? string | number : Co extends "bigint" ? bigint | number : number;
  $TypeName: "TNumber";
  $Props: { readonly coercion: Co; readonly casting: Ca };
  $Checks: ReadonlyArray<
    | TCheck.Integer
    | TCheck.Precision
    | TCheck.Min
    | TCheck.Max
    | TCheck.Range
    | TCheck.Multiple
    | TCheck.Port
    | TCheck.Safe
    | TCheck.Finite
  >;
}>;

const precisionRx = /(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

function floatSafeRemainder(value: number, step: number): number {
  const valDecCount = (value.toString().split(".")[1] ?? "").length;
  const stepDecCount = (step.toString().split(".")[1] ?? "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(value.toFixed(decCount).replace(".", ""), 10);
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""), 10);
  return (valInt % stepInt) / 10 ** decCount;
}

function validatePrecision(data: number, check: { value: number; inclusive: boolean }) {
  const places = [...(precisionRx.exec(data.toString()) ?? [])];
  const decimals = Math.max((places[1] ? places[1].length : 0) - (places[2] ? parseInt(places[2], 10) : 0), 0);
  return { valid: check.inclusive ? decimals <= check.value : decimals < check.value, decimals };
}

export class TNumber<Co extends TNumberCoercion = false, Ca extends TNumberCasting = false> extends TType<
  TNumberDef<Co, Ca>
> {
  _parse(ctx: TParseContext<this>) {
    const { coercion, casting } = this.props;

    if (
      coercion &&
      (coercion === true ||
        (coercion.includes("string") && isKindOf(ctx.data, ValueKind.String)) ||
        (coercion.includes("bigint") && isKindOf(ctx.data, ValueKind.BigInt)))
    ) {
      ctx.setData(Number(ctx.data));
    }

    if (!isKindOf(ctx.data, ValueKind.Number)) {
      return ctx.invalidType({ expected: ValueKind.Number }).return();
    }

    const safeCheck = filterChecks(this.checks, [TCheckKind.Safe]).reverse()[0];
    const finiteCheck = filterChecks(this.checks, [TCheckKind.Finite]).reverse()[0];

    if (safeCheck && (ctx.data < Number.MIN_SAFE_INTEGER || ctx.data > Number.MAX_SAFE_INTEGER)) {
      ctx.addIssue({ kind: TIssueKind.Number.Safe }, safeCheck.message);
      if (ctx.common.abortEarly) return ctx.return();
    }

    if (finiteCheck && !Number.isFinite(ctx.data)) {
      ctx.addIssue({ kind: TIssueKind.Number.Finite }, finiteCheck.message);
      if (ctx.common.abortEarly) return ctx.return();
    }

    const postChecks = filterOutChecks(this.checks, [TCheckKind.Safe, TCheckKind.Finite]);

    for (const check of postChecks) {
      switch (check.kind) {
        case TCheckKind.Integer:
          if (!check.strict) {
            ctx.setData(Math.trunc(ctx.data));
          } else if (!Number.isInteger(ctx.data)) {
            ctx.addIssue({ kind: TIssueKind.Number.Integer, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Precision:
          if (check.strict) {
            const { valid, decimals } = validatePrecision(ctx.data, check);
            if (!valid) {
              ctx.addIssue(
                { kind: TIssueKind.Number.Precision, payload: { ...sanitizeCheck(check), received: decimals } },
                check.message
              );
              if (ctx.common.abortEarly) return ctx.return();
            }
          } else {
            ctx.setData(Math.round(ctx.data * 10 ** check.value) / 10 ** check.value);
          }
          break;
        case TCheckKind.Min:
          if (!validateMin(ctx.data, check)) {
            ctx.addIssue({ kind: TIssueKind.Number.Min, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Max:
          if (!validateMax(ctx.data, check)) {
            ctx.addIssue({ kind: TIssueKind.Number.Max, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Range:
          if (!validateRange(ctx.data, check)) {
            ctx.addIssue({ kind: TIssueKind.Number.Range, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Multiple:
          if (floatSafeRemainder(ctx.data, check.value) !== 0) {
            ctx.addIssue({ kind: TIssueKind.Number.Multiple, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Port:
          if (ctx.data < 0 || ctx.data > 65535) {
            ctx.addIssue({ kind: TIssueKind.Number.Port, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;

        default:
          assertNever(check);
      }
    }

    return ctx.return(
      (casting === "string" ? String(ctx.data) : casting === "bigint" ? BigInt(ctx.data) : ctx.data) as this["$O"]
    );
  }

  /* ----------------------------------------------- Coercion/Casting ----------------------------------------------- */

  coerce<C extends TNumberCoercion = true>(value = true as C): TNumber<C, Ca> {
    return new TNumber<C, Ca>({ ...this._def, props: { ...this.props, coercion: value } });
  }

  cast<C extends TNumberCasting = "string">(value = "string" as C): TNumber<Co, C> {
    return new TNumber<Co, C>({ ...this._def, props: { ...this.props, casting: value } });
  }

  integer(options?: { strict?: boolean; message?: string }) {
    return this._addCheck(
      {
        kind: TCheckKind.Integer,
        strict: options?.strict ?? true,
        message: options?.message,
      },
      { unique: true, remove: [TCheckKind.Precision] }
    );
  }

  int(options?: { strict?: boolean; message?: string }) {
    return this.integer(options);
  }

  precision(value: number, options?: { inclusive?: boolean; strict?: boolean; message?: string }) {
    return this._addCheck(
      {
        kind: TCheckKind.Precision,
        value,
        inclusive: options?.inclusive ?? true,
        strict: options?.strict ?? true,
        message: options?.message,
      },
      { unique: true, remove: [TCheckKind.Integer] }
    );
  }

  min(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Min,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  gt(value: number, options?: { message?: string }) {
    return this.min(value, { inclusive: false, message: options?.message });
  }

  gte(value: number, options?: { message?: string }) {
    return this.min(value, { inclusive: true, message: options?.message });
  }

  positive(options?: { message?: string }) {
    return this.min(0, { inclusive: false, message: options?.message });
  }

  nonnegative(options?: { message?: string }) {
    return this.min(0, { inclusive: true, message: options?.message });
  }

  max(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Max,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  lt(value: number, options?: { message?: string }) {
    return this.max(value, { inclusive: false, message: options?.message });
  }

  lte(value: number, options?: { message?: string }) {
    return this.max(value, { inclusive: true, message: options?.message });
  }

  negative(options?: { message?: string }) {
    return this.max(0, { inclusive: false, message: options?.message });
  }

  nonpositive(options?: { message?: string }) {
    return this.max(0, { inclusive: true, message: options?.message });
  }

  range(min: number, max: number, options?: { inclusive?: `${"[" | "("}${"]" | ")"}`; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Range,
      min,
      max,
      inclusive: options?.inclusive ?? "[]",
      message: options?.message,
    });
  }

  between(min: number, max: number, options?: { inclusive?: `${"[" | "("}${"]" | ")"}`; message?: string }) {
    return this.range(min, max, options);
  }

  multiple(value: number, options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Multiple, value, message: options?.message });
  }

  step(value: number, options?: { message?: string }) {
    return this.multiple(value, options);
  }

  port(options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Port, message: options?.message }, { unique: true });
  }

  safe(options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Safe, message: options?.message }, { unique: true });
  }

  unsafe() {
    return this._removeChecks(TCheckKind.Safe);
  }

  finite(options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Finite, message: options?.message }, { unique: true });
  }

  infinite() {
    return this._removeChecks(TCheckKind.Finite);
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get minValue(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Min, TCheckKind.Range]).reduce<number | undefined>((min, check) => {
      const compare = "min" in check ? check.min : check.value;
      return min === undefined || compare > min ? compare : min;
    }, undefined);
  }

  get maxValue(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Max, TCheckKind.Range]).reduce<number | undefined>((max, check) => {
      const compare = "max" in check ? check.max : check.value;
      return max === undefined || compare < max ? compare : max;
    }, undefined);
  }

  get multipleOf(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Multiple]).reduce<number | undefined>(
      (mult, check) => (mult ?? 1) * check.value,
      undefined
    );
  }

  get isInteger() {
    return filterChecks(this.checks, [TCheckKind.Integer]).length > 0;
  }

  get isFloat() {
    return filterChecks(this.checks, [TCheckKind.Precision]).length > 0;
  }

  get isPositive() {
    return this.minValue === undefined || this.minValue > 0;
  }

  get isNegative() {
    return this.maxValue === undefined || this.maxValue < 0;
  }

  get isPort() {
    return filterChecks(this.checks, [TCheckKind.Port]).length > 0;
  }

  get isSafe() {
    return filterChecks(this.checks, [TCheckKind.Safe]).length > 0;
  }

  get isFinite() {
    return filterChecks(this.checks, [TCheckKind.Finite]).length > 0;
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  static create(options?: TOptions): TNumber {
    return new TNumber({
      typeName: TTypeName.Number,
      props: { coercion: false, casting: false },
      checks: [],
      options: processCreateOptions(options),
    })
      .safe()
      .finite();
  }
}

export type AnyTNumber = TNumber<TNumberCoercion, TNumberCasting>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNaNDef = MakeTDef<{
  $Out: number;
  $TypeName: "TNaN";
}>;

export class TNaN extends TType<TNaNDef> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, ValueKind.NaN)
      ? ctx.return(ctx.data)
      : ctx.invalidType({ expected: ValueKind.NaN }).return();
  }

  static create(options?: TOptions): TNaN {
    return new TNaN({ typeName: TTypeName.NaN, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBigInt                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBigIntDef = MakeTDef<{
  $Out: bigint;
  $TypeName: "TBigInt";
}>;

export class TBigInt extends TType<TBigIntDef> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.BigInt)) {
      return ctx.invalidType({ expected: ValueKind.BigInt }).return();
    }

    return ctx.return(ctx.data);
  }

  static create(options?: TOptions): TBigInt {
    return new TBigInt({ typeName: TTypeName.BigInt, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TBoolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBooleanDef = MakeTDef<{
  $Out: boolean;
  $TypeName: "TBoolean";
}>;

export class TBoolean extends TType<TBooleanDef> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Boolean)) {
      return ctx.invalidType({ expected: ValueKind.Boolean }).return();
    }

    return ctx.return(ctx.data);
  }

  true(): TTrue {
    return TTrue.create(this.options);
  }

  false(): TFalse {
    return TFalse.create(this.options);
  }

  static create(options?: TOptions): TBoolean {
    return new TBoolean({ typeName: TTypeName.Boolean, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export type TTrueDef = MakeTDef<{
  $Out: true;
  $TypeName: "TTrue";
}>;

export class TTrue extends TType<TTrueDef> {
  _parse(ctx: TParseContext<this>) {
    return ctx.data === true ? ctx.return<true>(ctx.data) : ctx.invalidType({ expected: ValueKind.True }).return();
  }

  static create(options?: TOptions): TTrue {
    return new TTrue({ typeName: TTypeName.True, options: processCreateOptions(options) });
  }
}

/* ----------------------------------------------------- TFalse ----------------------------------------------------- */

export type TFalseDef = MakeTDef<{
  $Out: false;
  $TypeName: "TFalse";
}>;

export class TFalse extends TType<TFalseDef> {
  _parse(ctx: TParseContext<this>) {
    return ctx.data === false ? ctx.return<false>(ctx.data) : ctx.invalidType({ expected: ValueKind.False }).return();
  }

  static create(options?: TOptions): TFalse {
    return new TFalse({ typeName: TTypeName.False, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDate                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TDateDef = MakeTDef<{
  $Out: Date;
  $TypeName: "TDate";
}>;

export class TDate extends TType<TDateDef> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Date)) {
      return ctx.invalidType({ expected: ValueKind.Date }).return();
    }

    return ctx.return(ctx.data);
  }

  static create(options?: TOptions): TDate {
    return new TDate({ typeName: TTypeName.Date, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TSymbol                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TSymbolDef = MakeTDef<{
  $Out: symbol;
  $TypeName: "TSymbol";
}>;

export class TSymbol extends TType<TSymbolDef> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, ValueKind.Symbol)
      ? ctx.return(ctx.data)
      : ctx.invalidType({ expected: ValueKind.Symbol }).return();
  }

  static create(options?: TOptions): TSymbol {
    return new TSymbol({ typeName: TTypeName.Symbol, options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TLiteral                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TLiteralValue = string | number | bigint | boolean | symbol | null | undefined;

export type TLiteralOptions = TOptions<{ issueKinds: ["literal.invalid"] }>;

export type TLiteralDef<T extends TLiteralValue> = MakeTDef<{
  $Out: T;
  $TypeName: "TLiteral";
  $Props: { readonly value: T };
  $Options: TLiteralOptions;
}>;

export class TLiteral<T extends TLiteralValue> extends TType<TLiteralDef<T>> {
  _parse(ctx: TParseContext<this>) {
    const kindOfValue = kindOf(this.value);
    const kindOfData = kindOf(ctx.data);

    if (this.value !== ctx.data) {
      if (kindOfValue === kindOfData) {
        ctx.addIssue(
          {
            kind: TIssueKind.Literal.Invalid,
            payload: { expected: this.value, received: { value: ctx.data as TLiteralValue } },
          },
          this.options.messages[TIssueKind.Literal.Invalid]
        );
      } else {
        ctx.addIssue(
          { kind: TIssueKind.Literal.Invalid, payload: { expected: this.value, received: { type: kindOfData } } },
          this.options.messages[TIssueKind.Literal.Invalid]
        );
      }

      return ctx.return();
    }

    return ctx.return(ctx.data as T);
  }

  get value(): T {
    return this.props.value;
  }

  static create<T extends TLiteralValue>(value: T, options?: TLiteralOptions): TLiteral<T> {
    return new TLiteral({ typeName: TTypeName.Literal, props: { value }, options: processCreateOptions(options) });
  }
}

export type AnyTLiteral = TLiteral<TLiteralValue>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TEnum                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TEnumValue = string | number;
export type TEnumValues = AtLeastOne<TEnumValue>;

export type EnumLike = {
  readonly [x: string]: string | number;
  readonly [y: number]: string;
};

export type MakeEnum<T extends readonly TEnumValue[]> = { [K in T[number]]: K };

export type TEnumOptions = TOptions<{ issueKinds: ["enum.invalid"] }>;

export type TEnumDef<T extends readonly TEnumValue[]> = MakeTDef<{
  $Out: T[number];
  $TypeName: "TEnum";
  $Props: { readonly values: T };
  $Options: TEnumOptions;
}>;

function parseEnum<T extends AnyTType>(
  ctx: TParseContext<T>,
  values: readonly TEnumValue[],
  invalidMsg: string | undefined
) {
  const validKinds = [...new Set(values.map((v) => kindOf(v)))];
  const kindOfData = kindOf(ctx.data);

  if (!includes(values, ctx.data)) {
    if (validKinds.includes(kindOfData)) {
      ctx.addIssue(
        {
          kind: TIssueKind.Enum.Invalid,
          payload: { expected: values, received: { value: ctx.data as TEnumValue } },
        },
        invalidMsg
      );
    } else {
      ctx.addIssue(
        { kind: TIssueKind.Enum.Invalid, payload: { expected: values, received: { type: kindOfData } } },
        invalidMsg
      );
    }

    return ctx.return();
  }

  return ctx.return(ctx.data);
}

export class TEnum<T extends readonly TEnumValue[]> extends TType<TEnumDef<T>> {
  _parse(ctx: TParseContext<this>) {
    return parseEnum(ctx, this.values, this.options.messages[TIssueKind.Enum.Invalid]);
  }

  get values(): T {
    return this.props.values;
  }

  get enum(): MakeEnum<T> {
    // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
    return this.values.reduce((acc, v) => ({ ...acc, [v]: v }), {} as MakeEnum<T>);
  }

  extract<U extends AtLeastOne<T[number]>>(values: U): TEnum<U> {
    return new TEnum<U>({ ...this._def, props: { values } });
  }

  exclude<U extends AtLeastOne<T[number]>>(
    values: U
  ): U["length"] extends T["length"] ? TNever : TEnum<FilterOut<T, U[number]>>;
  exclude<U extends AtLeastOne<T[number]>>(values: U) {
    const excluded = filterOut(this.values, values);

    if ((excluded as unknown[]).length <= 0) {
      return TNever.create(pickTransferrableOptions(this.options));
    }

    return new TEnum<FilterOut<T, U[number]>>({ ...this._def, props: { values: excluded } });
  }

  static create = Object.freeze(
    Object.assign(TEnum._create, {
      native<T extends EnumLike>(enum_: T, options?: TEnumOptions): TNativeEnum<T> {
        return TNativeEnum.create(enum_, options);
      },
    })
  );

  private static _create<T extends string | number, U extends AtLeastOne<T>>(
    values: U,
    options?: TEnumOptions
  ): TEnum<U>;
  private static _create<T extends EnumLike>(enum_: T, options?: TEnumOptions): TNativeEnum<T>;
  private static _create(valuesOrEnum: TEnumValues | EnumLike, options?: TEnumOptions) {
    if (Array.isArray(valuesOrEnum)) {
      return new TEnum({
        typeName: TTypeName.Enum,
        props: { values: valuesOrEnum as TEnumValues },
        options: processCreateOptions(options),
      });
    }

    return TNativeEnum.create(valuesOrEnum as EnumLike, options);
  }
}

export type AnyTEnum = TEnum<TEnumValue[]>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TNativeEnum                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNativeEnumDef<T extends EnumLike> = MakeTDef<{
  $Out: T[keyof T];
  $TypeName: "TNativeEnum";
  $Props: { readonly enum: T };
  $Options: TEnumOptions;
}>;

function getValidEnumValues(enum_: EnumLike) {
  const validKeys = Object.keys(enum_).filter((k) => {
    const x = enum_[k];
    return x !== undefined && typeof enum_[x] !== "number";
  });
  return validKeys.map((k) => enum_[k]).filter((x): x is NonNullable<typeof x> => x !== undefined);
}

export class TNativeEnum<T extends EnumLike> extends TType<TNativeEnumDef<T>> {
  _parse(ctx: TParseContext<this>) {
    const validValues = getValidEnumValues(this.enum);
    return parseEnum(ctx, validValues, this.options.messages[TIssueKind.Enum.Invalid]);
  }

  get enum(): T {
    return this.props.enum;
  }

  get values(): UnionToTuple<T[keyof T]> {
    return getValidEnumValues(this.enum) as UnionToTuple<T[keyof T]>;
  }

  static create<T extends EnumLike>(enum_: T, options?: TEnumOptions): TNativeEnum<T> {
    return new TNativeEnum({
      typeName: TTypeName.NativeEnum,
      props: { enum: enum_ },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTNativeEnum = TNativeEnum<EnumLike>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TArrayCardinality = "many" | "atleastone";

export type TArrayIO<
  T extends AnyTType,
  Card extends TArrayCardinality,
  IO extends "$O" | "$I" = "$O"
> = Card extends "many" ? Array<T[IO]> : [T[IO], ...Array<T[IO]>];

export type TArrayDef<T extends AnyTType, Card extends TArrayCardinality> = MakeTDef<{
  $Out: TArrayIO<T, Card>;
  $In: TArrayIO<T, Card, "$I">;
  $TypeName: "TArray";
  $Props: { readonly element: T };
  $Checks: ReadonlyArray<TCheck.Min | TCheck.Max | TCheck.Length | TCheck.Range | TCheck.Unique | TCheck.Sort>;
}>;

export type TArrayComparatorFn<T extends AnyTType, R> = ((
  a: tf.ReadonlyDeep<OutputOf<T>>,
  b: tf.ReadonlyDeep<OutputOf<T>>,
  x: number,
  y: number,
  arr: tf.ReadonlyDeep<Array<OutputOf<T>>>
) => R) & {};

function finalizeArray<T extends AnyTType, U>(
  ctx: TParseContext<T>,
  arr: U[],
  checks: Array<TCheck.Unique | TCheck.Sort>
) {
  let result = arr;

  for (const check of checks) {
    const _result = result;

    if (check.kind === TCheckKind.Unique) {
      const unique = check.comparator
        ? _result.reduce<U[]>((acc, a, x) => {
            if (!acc.some((b, y) => check.comparator?.(a, b, x, y, _result))) acc.push(a);
            return acc;
          }, [])
        : [...new Set(_result)];

      if (!check.strict) {
        result = unique;
      } else if (unique.length !== _result.length) {
        const duplicates = _result
          .map((value, index) => ({ value, index }))
          .filter(({ value }, i) => _result.indexOf(value) !== i);
        ctx.addIssue(
          { kind: TIssueKind.Array.Unique, payload: { ...sanitizeCheck(check), duplicates } },
          check.message
        );
        if (ctx.common.abortEarly) {
          return ctx.return();
        }
      }
    } else if (check.kind === TCheckKind.Sort) {
      const sorted = check.comparator
        ? _result
            .map((v, i) => [v, i] as const)
            .sort((a, b) => check.comparator?.(a[0], b[0], a[1], b[1], _result) ?? 0)
            .map(([v]) => v)
        : [..._result].sort((a, b) => (String(a) > String(b) ? 1 : -1));

      if (!check.strict) {
        result = sorted;
      } else if (!_result.every((v, i) => v === sorted[i])) {
        ctx.addIssue({ kind: TIssueKind.Array.Sort, payload: sanitizeCheck(check) }, check.message);
        if (ctx.common.abortEarly) {
          return ctx.return();
        }
      }
    } else {
      assertNever(check);
    }
  }

  return ctx.return(result);
}

export class TArray<T extends AnyTType, Card extends TArrayCardinality = "many"> extends TType<TArrayDef<T, Card>> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Array)) {
      return ctx.invalidType({ expected: ValueKind.Array }).return();
    }

    const { element } = this.props;
    const { length } = ctx.data;
    const entries = [...ctx.data.entries()];

    const preChecks = filterOutChecks(this.checks, [TCheckKind.Unique, TCheckKind.Sort]);
    const postChecks = filterChecks(this.checks, [TCheckKind.Unique, TCheckKind.Sort]);

    for (const check of preChecks) {
      switch (check.kind) {
        case TCheckKind.Min:
          if (!validateMin(length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Array.Min, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Max:
          if (!validateMax(length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Array.Max, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Length:
          if (length !== check.value) {
            ctx.addIssue(
              { kind: TIssueKind.Array.Length, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Range:
          if (!validateRange(length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Array.Range, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;

        default:
          assertNever(check);
      }
    }

    const result: Array<OutputOf<T>> = [];

    if (ctx.common.async) {
      return Promise.all(
        entries.map(async ([i, v]) => {
          const parsed = await element._parseAsync(ctx.child(element, v, [i]));
          if (parsed.ok) {
            result[i] = parsed.data;
          } else if (ctx.common.abortEarly) {
            return Promise.reject();
          }
        })
      )
        .then(() => finalizeArray(ctx, result, postChecks))
        .catch(() => ctx.return());
    }

    for (const [i, v] of entries) {
      const res = element._parseSync(ctx.child(element, v, [i]));
      if (res.ok) {
        result.push(res.data);
      } else if (ctx.common.abortEarly) {
        return ctx.return();
      }
    }

    return finalizeArray(ctx, result, postChecks);
  }

  get element(): T {
    return this.props.element;
  }

  unwrap(): T {
    return this.element;
  }

  min(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Min,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  max(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Max,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  length(value: number, options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Length, value, message: options?.message });
  }

  range(min: number, max: number, options?: { inclusive?: `${"[" | "("}${"]" | ")"}`; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Range,
      min,
      max,
      inclusive: options?.inclusive ?? "[]",
      message: options?.message,
    });
  }

  between(min: number, max: number, options?: { inclusive?: `${"[" | "("}${"]" | ")"}`; message?: string }) {
    return this.range(min, max, options);
  }

  nonempty(options?: { message?: string }): TArray<T, "atleastone"> {
    return this.min(1, { inclusive: true, message: options?.message }) as TArray<T, "atleastone">;
  }

  unique(comparator?: TArrayComparatorFn<T, boolean>, options?: { strict?: boolean; message?: string }): this;
  unique(options?: { strict?: boolean; message?: string }): this;
  unique(
    comparatorOrOptions?: TArrayComparatorFn<T, boolean> | { strict?: boolean; message?: string },
    maybeOptions?: { strict?: boolean; message?: string }
  ) {
    const comparator = isKindOf(comparatorOrOptions, ValueKind.Function) ? comparatorOrOptions : undefined;
    const options = isKindOf(comparatorOrOptions, ValueKind.Function) ? maybeOptions : comparatorOrOptions;

    return this._addCheck({
      kind: TCheckKind.Unique,
      comparator,
      strict: options?.strict ?? false,
      message: options?.message,
    });
  }

  sort(comparator?: TArrayComparatorFn<T, number>, options?: { strict?: boolean; message?: string }): this;
  sort(options?: { strict?: boolean; message?: string }): this;
  sort(
    comparatorOrOptions?: TArrayComparatorFn<T, number> | { strict?: boolean; message?: string },
    maybeOptions?: { strict?: boolean; message?: string }
  ) {
    const comparator = isKindOf(comparatorOrOptions, ValueKind.Function) ? comparatorOrOptions : undefined;
    const options = isKindOf(comparatorOrOptions, ValueKind.Function) ? maybeOptions : comparatorOrOptions;

    return this._addCheck({
      kind: TCheckKind.Sort,
      comparator,
      strict: options?.strict ?? false,
      message: options?.message,
    });
  }

  map<U extends AnyTType>(fn: (element: T) => U): TArray<U, Card> {
    return new TArray<U, Card>({ ...this._def, props: { ...this.props, element: fn(this.element) } });
  }

  sparse(enabled?: true): TArray<TOptional<T>, Card>;
  sparse(enabled: false): TArray<TDefined<T>, Card>;
  sparse(enabled = true) {
    return this.map((e) => (enabled ? e.optional() : e.defined()));
  }

  partial(): TArray<TOptional<T>, Card> {
    return this.sparse(true);
  }

  required(): TArray<TDefined<T>, Card> {
    return this.sparse(false);
  }

  concat<U extends AnyTArray>(other: U): TArray<TUnion<[T, U["element"]]>, Card> {
    return this.map((e) => e.or(other.element));
  }

  static create = Object.assign(TArray._create, {
    of<T extends AnyTType>(element: T): TArray<T> {
      return TArray._create(element);
    },
  });

  private static _create<T extends AnyTType>(element: T, options?: TOptions): TArray<T> {
    return new TArray({
      typeName: TTypeName.Array,
      props: { element },
      checks: [],
      options: processCreateOptions(options),
    });
  }
}

export type AnyTArray = TArray<AnyTType, TArrayCardinality>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TSet                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TSetDef<T extends AnyTType> = MakeTDef<{
  $Out: Set<OutputOf<T>>;
  $In: Set<InputOf<T>>;
  $TypeName: "TSet";
  $Props: { readonly element: T };
  $Checks: ReadonlyArray<TCheck.Min | TCheck.Max | TCheck.Size | TCheck.Range>;
}>;

export class TSet<T extends AnyTType> extends TType<TSetDef<T>> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Set)) {
      return ctx.invalidType({ expected: ValueKind.Set }).return();
    }

    const { element } = this.props;
    const { size } = ctx.data;
    const values = [...ctx.data];

    for (const check of this.checks) {
      switch (check.kind) {
        case TCheckKind.Min:
          if (!validateMin(size, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Set.Min, payload: { ...sanitizeCheck(check), received: size } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Max:
          if (!validateMax(size, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Set.Max, payload: { ...sanitizeCheck(check), received: size } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Size:
          if (size !== check.value) {
            ctx.addIssue(
              { kind: TIssueKind.Set.Size, payload: { ...sanitizeCheck(check), received: size } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Range:
          if (!validateRange(size, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Set.Range, payload: { ...sanitizeCheck(check), received: size } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;

        default:
          assertNever(check);
      }
    }

    const result = new Set<OutputOf<T>>();

    if (ctx.common.async) {
      return Promise.all(
        values.map(async (v, i) => {
          const parsed = await element._parseAsync(ctx.child(element, v, [i]));
          if (parsed.ok) {
            result.add(parsed.data);
          } else if (ctx.common.abortEarly) {
            return Promise.reject();
          }
        })
      )
        .then(() => ctx.return(result))
        .catch(() => ctx.return());
    }

    for (const [i, v] of values.entries()) {
      const res = element._parseSync(ctx.child(element, v, [i]));
      if (res.ok) {
        result.add(res.data);
      } else if (ctx.common.abortEarly) {
        return ctx.return();
      }
    }

    return ctx.return(result);
  }

  get element(): T {
    return this.props.element;
  }

  unwrap(): T {
    return this.element;
  }

  min(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Min,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  max(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Max,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  size(value: number, options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Size, value, message: options?.message });
  }

  range(min: number, max: number, options?: { inclusive?: `${"[" | "("}${"]" | ")"}`; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Range,
      min,
      max,
      inclusive: options?.inclusive ?? "[]",
      message: options?.message,
    });
  }

  between(min: number, max: number, options?: { inclusive?: `${"[" | "("}${"]" | ")"}`; message?: string }) {
    return this.range(min, max, options);
  }

  map<U extends AnyTType>(fn: (element: T) => U): TSet<U> {
    return new TSet<U>({
      ...this._def,
      props: { ...this.props, element: fn(this.element) },
    });
  }

  sparse(enabled?: true): TSet<TOptional<T>>;
  sparse(enabled: false): TSet<TDefined<T>>;
  sparse(enabled = true) {
    return this.map((e) => (enabled ? e.optional() : e.defined()));
  }

  partial(): TSet<TOptional<T>> {
    return this.sparse(true);
  }

  required(): TSet<TDefined<T>> {
    return this.sparse(false);
  }

  static create = Object.assign(TSet._create, {
    of<T extends AnyTType>(element: T): TSet<T> {
      return TSet._create(element);
    },
  });

  private static _create<T extends AnyTType>(element: T, options?: TOptions): TSet<T> {
    return new TSet({
      typeName: TTypeName.Set,
      props: { element },
      checks: [],
      options: processCreateOptions(options),
    });
  }
}

export type AnyTSet = TSet<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBuffer                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TBufferDef = MakeTDef<{
  $Out: Buffer;
  $TypeName: "TBuffer";
  $Checks: ReadonlyArray<TCheck.Min | TCheck.Max | TCheck.Length | TCheck.Range>;
}>;

export class TBuffer extends TType<TBufferDef> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Buffer)) {
      return ctx.invalidType({ expected: ValueKind.Buffer }).return();
    }

    const { length } = ctx.data;

    for (const check of this.checks) {
      switch (check.kind) {
        case TCheckKind.Min:
          if (!validateMin(length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Buffer.Min, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Max:
          if (!validateMax(length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Buffer.Max, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Length:
          if (length !== check.value) {
            ctx.addIssue(
              { kind: TIssueKind.Buffer.Length, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Range:
          if (!validateRange(length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Buffer.Range, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;

        default:
          assertNever(check);
      }
    }

    return ctx.return(ctx.data);
  }

  min(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Min,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  max(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Max,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  length(value: number, options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Length, value, message: options?.message });
  }

  range(min: number, max: number, options?: { inclusive?: `${"[" | "("}${"]" | ")"}`; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.Range,
      min,
      max,
      inclusive: options?.inclusive ?? "[]",
      message: options?.message,
    });
  }

  between(min: number, max: number, options?: { inclusive?: `${"[" | "("}${"]" | ")"}`; message?: string }) {
    return this.range(min, max, options);
  }

  static create(options?: TOptions): TBuffer {
    return new TBuffer({
      typeName: TTypeName.Buffer,
      checks: [],
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TRecord                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TRecordKeys = TType<MakeTDef<tf.Merge<TDef, { $Out: PropertyKey; $In: PropertyKey }>>>;

export type TRecordOptions = TOptions<{ issueKinds: ["record.invalid_key"] }>;

export type TRecordDef<K extends TRecordKeys, V extends AnyTType> = MakeTDef<{
  $Out: Record<K["$O"], V["$O"]>;
  $In: Record<K["$I"], V["$I"]>;
  $TypeName: "TRecord";
  $Checks: ReadonlyArray<TCheck.MinKeys | TCheck.MaxKeys>;
  $Props: { readonly keys: K; readonly values: V };
  $Options: TRecordOptions;
}>;

function handleKeyTransformation(k: string | symbol) {
  if (isKindOf(k, ValueKind.Symbol)) {
    return k;
  }

  if (isKindOf(Number(k), ValueKind.NaN)) {
    return k;
  }

  return Number(k);
}

export class TRecord<K extends TRecordKeys, V extends AnyTType> extends TType<TRecordDef<K, V>> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Object)) {
      return ctx.invalidType({ expected: ValueKind.Object }).return();
    }

    const { keys, values } = this.props;
    const entries = Reflect.ownKeys(ctx.data).map(
      (k) => [handleKeyTransformation(k), (ctx.data as Record<string | symbol, unknown>)[k]] as const
    );
    const { length } = entries;

    for (const check of this.checks) {
      switch (check.kind) {
        case TCheckKind.MinKeys:
          if (!validateMin(length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Record.MinKeys, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.MaxKeys:
          if (!validateMax(length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.Record.MaxKeys, payload: { ...sanitizeCheck(check), received: length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;

        default:
          assertNever(check);
      }
    }

    const result: Record<PropertyKey, unknown> = {};

    if (ctx.common.async) {
      return Promise.all(
        entries.map(async ([k, v]) => {
          const [parsedKey, parsedValue] = await Promise.all([
            keys._parseAsync(ctx.clone(keys, k)),
            values._parseAsync(ctx.child(values, v, [k])),
          ]);
          if (!parsedKey.ok) {
            ctx.addIssue(
              { kind: TIssueKind.Record.InvalidKey, payload: { key: k, error: parsedKey.error } },
              this.options.messages[TIssueKind.Record.InvalidKey]
            );
            if (ctx.common.abortEarly) {
              return Promise.reject();
            }
          } else if (parsedValue.ok) {
            result[parsedKey.data] = parsedValue.data;
          } else if (ctx.common.abortEarly) {
            return Promise.reject();
          }
        })
      )
        .then(() => ctx.return(result))
        .catch(() => ctx.return());
    }

    for (const [k, v] of entries) {
      const [parsedKey, parsedValue] = [
        keys._parseSync(ctx.clone(keys, k)),
        values._parseSync(ctx.child(values, v, [k])),
      ];
      if (!parsedKey.ok) {
        ctx.addIssue(
          { kind: TIssueKind.Record.InvalidKey, payload: { key: k, error: parsedKey.error } },
          this.options.messages[TIssueKind.Record.InvalidKey]
        );
        if (ctx.common.abortEarly) {
          return ctx.return();
        }
      } else if (parsedValue.ok) {
        result[parsedKey.data] = parsedValue.data;
      } else if (ctx.common.abortEarly) {
        return ctx.return();
      }
    }

    return ctx.return(result);
  }

  get keys(): K {
    return this.props.keys;
  }

  get values(): V {
    return this.props.values;
  }

  get entries(): [key: K, value: V] {
    return [this.keys, this.values];
  }

  minKeys(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.MinKeys,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  maxKeys(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck({
      kind: TCheckKind.MaxKeys,
      value,
      inclusive: options?.inclusive ?? true,
      message: options?.message,
    });
  }

  static create<V extends AnyTType>(values: V, options?: TRecordOptions): TRecord<TString, V>;
  static create<K extends TRecordKeys, V extends AnyTType>(keys: K, values: V, options?: TRecordOptions): TRecord<K, V>;
  static create<K extends TRecordKeys, V extends AnyTType>(
    keysOrValues: K | V,
    valuesOrOptions?: V | TRecordOptions,
    maybeOptions?: TRecordOptions
  ) {
    if (valuesOrOptions instanceof TType) {
      return new TRecord({
        typeName: TTypeName.Record,
        props: { keys: keysOrValues, values: valuesOrOptions },
        checks: [],
        options: processCreateOptions(maybeOptions),
      });
    }

    return new TRecord({
      typeName: TTypeName.Record,
      props: { keys: TString.create(), values: keysOrValues },
      checks: [],
      options: processCreateOptions(valuesOrOptions),
    });
  }
}

export type AnyTRecord = TRecord<TRecordKeys, AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TMap                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TMapOptions = TOptions<{ issueKinds: ["map.invalid_key"] }>;

export type TMapDef<K extends AnyTType, V extends AnyTType> = MakeTDef<{
  $Out: Map<K["$O"], V["$O"]>;
  $In: Map<K["$I"], V["$I"]>;
  $TypeName: "TMap";
  $Props: { readonly keys: K; readonly values: V };
  $Options: TMapOptions;
}>;

export class TMap<K extends TRecordKeys, V extends AnyTType> extends TType<TMapDef<K, V>> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Map)) {
      return ctx.invalidType({ expected: ValueKind.Map }).return();
    }

    const { keys, values } = this.props;
    const entries = [...ctx.data.entries()];

    const result = new Map<K["$O"], V["$O"]>();

    if (ctx.common.async) {
      return Promise.all(
        entries.map(async ([k, v], i) => {
          const [parsedKey, parsedValue] = await Promise.all([
            keys._parseAsync(ctx.clone(keys, k)),
            values._parseAsync(ctx.child(values, v, [i])),
          ]);
          if (!parsedKey.ok) {
            ctx.addIssue(
              { kind: TIssueKind.Map.InvalidKey, payload: { key: k, error: parsedKey.error } },
              this.options.messages[TIssueKind.Map.InvalidKey]
            );
            if (ctx.common.abortEarly) {
              return Promise.reject();
            }
          } else if (parsedValue.ok) {
            result.set(parsedKey.data, parsedValue.data);
          } else if (ctx.common.abortEarly) {
            return Promise.reject();
          }
        })
      )
        .then(() => ctx.return(result))
        .catch(() => ctx.return());
    }

    for (const [k, v, i] of entries.map((e, i) => [...e, i] as const)) {
      const [parsedKey, parsedValue] = [
        keys._parseSync(ctx.clone(keys, k)),
        values._parseSync(ctx.child(values, v, [i])),
      ];
      if (!parsedKey.ok) {
        ctx.addIssue(
          { kind: TIssueKind.Map.InvalidKey, payload: { key: k, error: parsedKey.error } },
          this.options.messages[TIssueKind.Map.InvalidKey]
        );
        if (ctx.common.abortEarly) {
          return ctx.return();
        }
      } else if (parsedValue.ok) {
        result.set(parsedKey.data, parsedValue.data);
      } else if (ctx.common.abortEarly) {
        return ctx.return();
      }
    }

    return ctx.return(result);
  }

  get keys(): K {
    return this.props.keys;
  }

  get values(): V {
    return this.props.values;
  }

  get entries(): [key: K, value: V] {
    return [this.keys, this.values];
  }

  static create<K extends AnyTType, V extends AnyTType>(keys: K, values: V, options?: TMapOptions): TMap<K, V> {
    return new TMap({ typeName: TTypeName.Map, props: { keys, values }, options: processCreateOptions(options) });
  }
}

export type AnyTMap = TMap<AnyTType, AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TPromiseDef<T extends AnyTType> = MakeTDef<{
  $Out: Promise<OutputOf<T>>;
  $In: Promise<InputOf<T>>;
  $TypeName: "TPromise";
  $Props: { readonly underlying: T };
}>;

export class TPromise<T extends AnyTType> extends TType<TPromiseDef<T>> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Promise) && !ctx.common.async) {
      return ctx.invalidType({ expected: ValueKind.Promise }).return();
    }

    return ctx.return(
      (isKindOf(ctx.data, ValueKind.Promise) ? ctx.data : Promise.resolve(ctx.data)).then(async (awaited) =>
        this.underlying.parseAsync(awaited, ctx.common)
      )
    );
  }

  get underlying(): T {
    return this.props.underlying;
  }

  get awaited(): T {
    return this.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TPromise"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Promise]);
  }

  static create<T extends AnyTType>(underlying: T, options?: TOptions): TPromise<T> {
    return new TPromise({
      typeName: TTypeName.Promise,
      props: { underlying },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTPromise = TPromise<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptional                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TOptionalDef<T extends AnyTType> = MakeTDef<{
  $Out: OutputOf<T> | undefined;
  $In: InputOf<T> | undefined;
  $TypeName: "TOptional";
  $Props: { readonly underlying: T };
}>;

export class TOptional<T extends AnyTType> extends TType<TOptionalDef<T>> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, ValueKind.Undefined)
      ? ctx.return(ctx.data)
      : this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying(): T {
    return this.props.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TOptional"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Optional]);
  }

  unwrapNullishDeep(): UnwrapDeep<T, "TOptional" | "TNullable"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Optional, TTypeName.Nullable]);
  }

  static create<T extends AnyTType>(underlying: T, options?: TOptions): TOptional<T> {
    return new TOptional({
      typeName: TTypeName.Optional,
      props: { underlying },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTOptional = TOptional<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TNullable                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNullableDef<T extends AnyTType> = MakeTDef<{
  $Out: OutputOf<T> | null;
  $In: InputOf<T> | null;
  $TypeName: "TNullable";
  $Props: { readonly underlying: T };
}>;

export class TNullable<T extends AnyTType> extends TType<TNullableDef<T>> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, ValueKind.Null)
      ? ctx.return(ctx.data)
      : this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying(): T {
    return this.props.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TNullable"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Nullable]);
  }

  unwrapNullishDeep(): UnwrapDeep<T, "TNullable" | "TOptional"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Nullable, TTypeName.Optional]);
  }

  static create<T extends AnyTType>(underlying: T, options?: TOptions): TNullable<T> {
    return new TNullable({
      typeName: TTypeName.Nullable,
      props: { underlying },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTNullable = TNullable<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TDefined                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TDefinedDef<T extends AnyTType> = MakeTDef<{
  $Out: Exclude<OutputOf<T>, undefined>;
  $In: Exclude<InputOf<T>, undefined>;
  $TypeName: "TDefined";
  $Props: { readonly underlying: T };
}>;

export class TDefined<T extends AnyTType> extends TType<TDefinedDef<T>> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, ValueKind.Undefined)
      ? ctx.addIssue({ kind: TIssueKind.Base.Required }, this.options.messages?.[TIssueKind.Base.Required]).return()
      : this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying(): T {
    return this.props.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TDefined"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Defined]);
  }

  static create<T extends AnyTType>(underlying: T, options?: TOptions): TDefined<T> {
    return new TDefined({
      typeName: TTypeName.Defined,
      props: { underlying },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTDefined = TDefined<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TNonNullable                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNonNullableOptions = TOptions<{ issueKinds: ["base.forbidden"] }>;

export type TNonNullableDef<T extends AnyTType> = MakeTDef<{
  $Out: Exclude<OutputOf<T>, null | undefined>;
  $In: Exclude<InputOf<T>, null | undefined>;
  $TypeName: "TNonNullable";
  $Props: { readonly underlying: T };
  $Options: TNonNullableOptions;
}>;

export class TNonNullable<T extends AnyTType> extends TType<TNonNullableDef<T>> {
  _parse(ctx: TParseContext<this>) {
    return isKindOf(ctx.data, [ValueKind.Undefined, ValueKind.Null])
      ? ctx
          .addIssue(
            { kind: TIssueKind.Base.Forbidden, payload: { types: [ValueKind.Undefined, ValueKind.Null] } },
            this.options.messages?.[TIssueKind.Base.Forbidden]
          )
          .return()
      : this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying(): T {
    return this.props.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TNonNullable"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.NonNullable]);
  }

  static create<T extends AnyTType>(underlying: T, options?: TNonNullableOptions): TNonNullable<T> {
    return new TNonNullable({
      typeName: TTypeName.NonNullable,
      props: { underlying },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTNonNullable = TNonNullable<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TLazy                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TLazyDef<T extends AnyTType> = MakeTDef<{
  $Out: OutputOf<T>;
  $In: InputOf<T>;
  $TypeName: "TLazy";
  $Props: { readonly getType: () => T };
}>;

export class TLazy<T extends AnyTType> extends TType<TLazyDef<T>> {
  _parse(ctx: TParseContext<this>) {
    return this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying(): T {
    return this.props.getType();
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TLazy"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Lazy]);
  }

  static create<T extends AnyTType>(getType: () => T, options?: TOptions): TLazy<T> {
    return new TLazy({ typeName: TTypeName.Lazy, props: { getType }, options: processCreateOptions(options) });
  }
}

export type AnyTLazy = TLazy<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TDefault                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TDefaultDef<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>> = MakeTDef<{
  $Out: Exclude<OutputOf<T>, undefined> | D;
  $In: InputOf<T> | undefined;
  $TypeName: "TDefault";
  $Props: { readonly underlying: T; readonly getDefault: () => D };
}>;

export class TDefault<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>> extends TType<TDefaultDef<T, D>> {
  _parse(ctx: TParseContext<this>) {
    return this.underlying._parse(
      ctx.child(this.underlying, isKindOf(ctx.data, ValueKind.Undefined) ? this.defaultValue : ctx.data)
    );
  }

  get underlying(): T {
    return this.props.underlying;
  }

  get defaultValue(): D {
    return this.props.getDefault();
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TDefault"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Default]);
  }

  removeDefault(): T {
    return this.underlying;
  }

  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    getDefault: () => D,
    options?: TOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValue: D,
    options?: TOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: TOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: TOptions
  ): TDefault<T, D> {
    return new TDefault({
      typeName: TTypeName.Default,
      props: {
        underlying,
        getDefault: isKindOf(defaultValueOrGetter, ValueKind.Function)
          ? defaultValueOrGetter
          : () => defaultValueOrGetter,
      },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTDefault = TDefault<AnyTType, any>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCatch                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TCatchDef<T extends AnyTType, C extends OutputOf<T>> = MakeTDef<{
  $Out: OutputOf<T> | C;
  $In: any;
  $TypeName: "TCatch";
  $Props: { readonly underlying: T; readonly getCatch: () => C };
}>;

export class TCatch<T extends AnyTType, C extends OutputOf<T>> extends TType<TCatchDef<T, C>> {
  _parse(ctx: TParseContext<this>) {
    const underlyingResult = this.underlying._parse(ctx.child(this.underlying, ctx.data));

    return isKindOf(underlyingResult, ValueKind.Promise)
      ? underlyingResult.then((res) => ctx.return(res.ok ? res.data : this.catchValue))
      : ctx.return(underlyingResult.ok ? underlyingResult.data : this.catchValue);
  }

  get underlying(): T {
    return this.props.underlying;
  }

  get catchValue(): C {
    return this.props.getCatch();
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TCatch"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Catch]);
  }

  removeCatch(): T {
    return this.underlying;
  }

  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    getCatch: () => C,
    options?: TOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValue: C,
    options?: TOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: TOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: TOptions
  ): TCatch<T, C> {
    return new TCatch({
      typeName: TTypeName.Catch,
      props: {
        underlying,
        getCatch: isKindOf(catchValueOrGetter, ValueKind.Function) ? catchValueOrGetter : () => catchValueOrGetter,
      },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTCatch = TCatch<AnyTType, any>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TUnionDef<T extends AnyTType[]> = MakeTDef<{
  $Out: OutputOf<T[number]>;
  $In: InputOf<T[number]>;
  $TypeName: "TUnion";
  $Props: { readonly types: T };
}>;

export class TUnion<T extends AnyTType[]> extends TType<TUnionDef<T>> {
  get types(): T {
    return this.props.types;
  }

  toIntersection(): TIntersection<T> {
    return TIntersection._create(this.types, this.options);
  }

  static create<T extends [AnyTType, AnyTType, ...AnyTType[]]>(types: T, options?: TOptions): TUnion<T> {
    return this._create(types, options);
  }

  static _create<T extends AnyTType[]>(types: T, options: TOptions | undefined): TUnion<T> {
    return new TUnion({ typeName: TTypeName.Union, props: { types }, options: processCreateOptions(options) });
  }
}

export type AnyTUnion = TUnion<AnyTType[]>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TIntersection                                                   */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TIntersectionDef<T extends AnyTType[]> = MakeTDef<{
  $Out: tf.UnionToIntersection<OutputOf<T[number]>>;
  $In: tf.UnionToIntersection<InputOf<T[number]>>;
  $TypeName: "TIntersection";
  $Props: { readonly types: T };
}>;

export class TIntersection<T extends AnyTType[]> extends TType<TIntersectionDef<T>> {
  get types(): T {
    return this.props.types;
  }

  toUnion(): TUnion<T> {
    return TUnion._create(this.types, this.options);
  }

  static create<T extends [AnyTType, AnyTType, ...AnyTType[]]>(types: T, options?: TOptions): TIntersection<T> {
    return this._create(types, options);
  }

  static _create<T extends AnyTType[]>(types: T, options: TOptions | undefined): TIntersection<T> {
    return new TIntersection({
      typeName: TTypeName.Intersection,
      props: { types },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTIntersection = TIntersection<AnyTType[]>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCoerce                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TCoerce = {
  string(...args: Parameters<typeof TString.create>): TString<true> {
    return TString.create(...args).coerce(true);
  },
  number<C extends Exclude<TNumberCoercion, false> = true>(
    value = true as C,
    ...args: Parameters<typeof TNumber.create>
  ): TNumber<C> {
    return TNumber.create(...args).coerce(value);
  },
};

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TCast                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TCast = {
  number<C extends Exclude<TNumberCasting, false> = "string">(
    value = "string" as C,
    ...args: Parameters<typeof TNumber.create>
  ): TNumber<false, C> {
    return TNumber.create(...args).cast(value);
  },
};

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TMarkers                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TOverrideMarker = Symbol("t.override");
export type TOverrideMarker = typeof TOverrideMarker;

export type MaybeWithOverride<T extends readonly unknown[]> = T | [TOverrideMarker, ...T] extends infer X ? X : never;

export const TUnsetMarker = Symbol("t.unset");
export type TUnsetMarker = typeof TUnsetMarker;

export const TMarkers = {
  override: TOverrideMarker,
  unset: TUnsetMarker,
} as const;

/* ------------------------------------------------------------------------------------------------------------------ */

export const anyType = TAny.create;
export const arrayType = TArray.create;
export const bigintType = TBigInt.create;
export const booleanType = TBoolean.create;
export const bufferType = TBuffer.create;
export const castType = TCast;
export const catchType = TCatch.create;
export const coerceType = TCoerce;
export const dateType = TDate.create;
export const defaultType = TDefault.create;
export const definedType = TDefined.create;
export const enumType = TEnum.create;
export const falseType = TFalse.create;
export const intersectionType = TIntersection.create;
export const lazyType = TLazy.create;
export const literalType = TLiteral.create;
export const mapType = TMap.create;
export const nanType = TNaN.create;
export const nativeEnumType = TNativeEnum.create;
export const neverType = TNever.create;
export const nonnullableType = TNonNullable.create;
export const nullableType = TNullable.create;
export const nullType = TNull.create;
export const numberType = TNumber.create;
export const optionalType = TOptional.create;
export const promiseType = TPromise.create;
export const recordType = TRecord.create;
export const setType = TSet.create;
export const stringType = TString.create;
export const symbolType = TSymbol.create;
export const trueType = TTrue.create;
export const undefinedType = TUndefined.create;
export const unionType = TUnion.create;
export const unknownType = TUnknown.create;
export const voidType = TVoid.create;

export const markers = TMarkers;
export const overrideMarker: typeof TOverrideMarker = TMarkers.override;
export const unsetMarker: typeof TUnsetMarker = TMarkers.unset;

export const global = () => TGlobal;

export {
  anyType as any,
  arrayType as array,
  bigintType as bigint,
  booleanType as boolean,
  bufferType as binary,
  bufferType as buffer,
  castType as cast,
  catchType as catch,
  coerceType as coerce,
  dateType as date,
  defaultType as def,
  definedType as defined,
  definedType as required,
  enumType as enum,
  falseType as false,
  intersectionType as and,
  intersectionType as intersection,
  lazyType as lazy,
  literalType as literal,
  mapType as map,
  nanType as nan,
  nativeEnumType as nativeEnum,
  neverType as never,
  nonnullableType as nonnullable,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  optionalType as optional,
  overrideMarker as override,
  promiseType as promise,
  recordType as record,
  setType as set,
  stringType as string,
  symbolType as symbol,
  trueType as true,
  undefinedType as undefined,
  unionType as or,
  unionType as union,
  unknownType as unknown,
  unsetMarker as unset,
  voidType as void,
};

export type output<T extends AnyTType> = OutputOf<T>;
export type input<T extends AnyTType> = InputOf<T>;
export type infer<T extends AnyTType> = OutputOf<T>;

/* ------------------------------------------------------------------------------------------------------------------ */

export type UnwrapDeep<T extends AnyTType, TN extends TTypeName> = T extends {
  readonly typeName: TN;
  unwrap(): infer U extends AnyTType;
}
  ? UnwrapDeep<U, TN>
  : T;

function handleUnwrapDeep<T extends AnyTType, TN extends [TTypeName, ...TTypeName[]]>(t: T, tns: TN) {
  let unwrapped: AnyTType = t;

  while (tns.includes(unwrapped.typeName) && "unwrap" in unwrapped && typeof unwrapped.unwrap === "function") {
    unwrapped = unwrapped.unwrap() as AnyTType;
  }

  return unwrapped as UnwrapDeep<T, TN[number]>;
}
