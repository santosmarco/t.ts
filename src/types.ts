import type { F } from "ts-toolbelt";
import type * as tf from "type-fest";
import {
  TCheckKind,
  filterChecks,
  filterOutChecks,
  parseMaxCheck,
  parseMinCheck,
  parseRangeCheck,
  parseSimpleCheck,
  sanitizeCheck,
  validateMax,
  validateMin,
  validateRange,
  type TCheck,
} from "./checks";
import type { AnyTDef, MakeTDef } from "./def";
import { type TError, type TErrorMap, type TFlattenedErrorOf, type TFormattedErrorOf } from "./error";
import { TGlobal } from "./global";
import { TIssueKind } from "./issues";
import { parseMaybeDescriptive, type AnyTManifest, type DescriptiveWithValue, type TManifestOf } from "./manifest";
import {
  pickTransferrableOptions,
  processCreateOptions,
  processParseOptions,
  type ProcessedCreateOptions,
  type TOptions,
  type TParseOptions,
} from "./options";
import {
  TParseContext,
  type TParseContextIssueData,
  type TParseContextPath,
  type TParseResult,
  type TParseResultOf,
  type TParseResultSyncOf,
} from "./parse";
import { colorize, show } from "./show";
import { isNullable, isOptional, isReadonly, type TSpec } from "./spec";
import {
  ValueKind,
  assertNever,
  cloneDeep,
  filterOut,
  includes,
  isKindOf,
  kindOf,
  literalBool,
  merge,
  tail,
  utils,
  type AtLeastTwo,
  type EnforceOptionalTuple,
  type FilterOut,
  type Merge,
  type ReadonlyFlat,
  type Try,
  type UnionToTuple,
} from "./utils";

export const TTypeName = {
  Any: "TAny",
  Array: "TArray",
  BigInt: "TBigInt",
  Boolean: "TBoolean",
  Brand: "TBrand",
  Buffer: "TBuffer",
  Catch: "TCatch",
  Custom: "TCustom",
  Date: "TDate",
  Default: "TDefault",
  Defined: "TDefined",
  Effects: "TEffects",
  Enum: "TEnum",
  False: "TFalse",
  If: "TIf",
  InstanceOf: "TInstanceOf",
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
  Object: "TObject",
  Optional: "TOptional",
  Pipeline: "TPipeline",
  Promise: "TPromise",
  Readonly: "TReadonly",
  Record: "TRecord",
  Set: "TSet",
  String: "TString",
  Symbol: "TSymbol",
  True: "TTrue",
  Tuple: "TTuple",
  Undefined: "TUndefined",
  Union: "TUnion",
  Unknown: "TUnknown",
  Void: "TVoid",
} as const;

export type TTypeName = typeof TTypeName[keyof typeof TTypeName];

export type TTypeNameMap<T extends TTypeName = TTypeName> = {
  TAny: TAny;
  TArray: AnyTArray;
  TBigInt: TBigInt;
  TBoolean: TBoolean;
  TBrand: AnyTBrand;
  TBuffer: TBuffer;
  TCatch: AnyTCatch;
  TCustom: AnyTCustom;
  TDate: TDate;
  TDefault: AnyTDefault;
  TDefined: AnyTDefined;
  TEffects: AnyTEffects;
  TEnum: AnyTEnum;
  TFalse: TFalse;
  TIf: AnyTIf;
  TInstanceOf: AnyTInstanceOf;
  TIntersection: AnyTIntersection;
  TLazy: AnyTLazy;
  TLiteral: AnyTLiteral;
  TMap: AnyTMap;
  TNaN: TNaN;
  TNativeEnum: AnyTNativeEnum;
  TNever: TNever;
  TNonNullable: AnyTNonNullable;
  TNull: TNull;
  TNullable: AnyTNullable;
  TNumber: AnyTNumber;
  TObject: AnyTObject;
  TOptional: AnyTOptional;
  TPipeline: AnyTPipeline;
  TPromise: AnyTPromise;
  TReadonly: AnyTReadonly;
  TRecord: AnyTRecord;
  TSet: AnyTSet;
  TString: AnyTString;
  TSymbol: TSymbol;
  TTrue: TTrue;
  TTuple: AnyTTuple;
  TUndefined: TUndefined;
  TUnion: AnyTUnion;
  TUnknown: TUnknown;
  TVoid: TVoid;
}[T];

export const tt = Symbol("tt");
export type tt = typeof tt;

export abstract class TType<Def extends AnyTDef = AnyTDef> {
  declare readonly $O: Def["$Out"];
  declare readonly $I: Def["$In"];

  readonly _def: {
    readonly typeName: Def["$TypeName"];
    readonly props: Def["$Props"];
    readonly checks: Def["$Checks"];
    readonly options: ProcessedCreateOptions<Def["$Options"]>;
    readonly manifest: AnyTManifest;
  };

  constructor(
    def: {
      readonly typeName: Def["$TypeName"];
    } & (Def["$Props"] extends null ? { readonly props?: null } : { readonly props: Def["$Props"] }) &
      (Def["$Checks"] extends null ? { readonly checks?: null } : { readonly checks: Def["$Checks"] }) & {
        readonly options: ProcessedCreateOptions<Def["$Options"]>;
        readonly manifest?: AnyTManifest;
      }
  ) {
    const { typeName, props = null, checks = null, options, manifest = {} } = def;

    this._def = cloneDeep({ typeName, props, checks, options, manifest });

    this.clone = this.clone.bind(this);
    this.show = this.show.bind(this);
    this.describe = this.describe.bind(this);

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
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.pipe = this.pipe.bind(this);
    this.lazy = this.lazy.bind(this);
    this.readonly = this.readonly.bind(this);
    this.preprocess = this.preprocess.bind(this);
    this.refine = this.refine.bind(this);
    this.transform = this.transform.bind(this);
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

    this.isT = this.isT.bind(this);

    Object.keys(this).forEach((k) =>
      Object.defineProperty(this, k, {
        enumerable: !/^\$\w*/.exec(String(k)),
      })
    );
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  abstract get _spec(): TSpec;

  /* ---------------------------------------------------------------------------------------------------------------- */

  get typeName(): Def["$TypeName"] {
    return this._def.typeName;
  }

  get props(): Def["$Props"] {
    return this._def.props;
  }

  get checks(): Def["$Checks"] {
    return this._def.checks;
  }

  get options(): ProcessedCreateOptions<Def["$Options"]> {
    return this._def.options;
  }

  get manifest(): TManifestOf<this> & this["_spec"] {
    return { ...this._def.manifest, ...this._spec };
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  clone(): this {
    return this._construct();
  }

  show(options?: { readonly colors?: boolean }): string {
    const hint = show(this as AnyValidTType);
    return options?.colors ? colorize(hint) : hint;
  }

  describe() {
    return {
      typeName: this.typeName,
      props: this.props,
      checks: this.checks,
      options: this.options,
      manifest: this.manifest,
    };
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

  parse(data: unknown, options?: TParseOptions): Def["$Out"] {
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

  async parseAsync(data: unknown, options?: TParseOptions): Promise<Def["$Out"]> {
    const result = await this.safeParseAsync(data, options);
    if (!result.ok) {
      throw result.error;
    }

    return result.data;
  }

  guard(data: unknown): data is Def["$Out"] {
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

  or<T extends utils.AtLeastOne<AnyTType>>(...types: T): TUnion<[this, ...T]> {
    return TUnion._create([this, ...types], pickTransferrableOptions(this.options));
  }

  and<T extends utils.AtLeastOne<AnyTType>>(...types: T): TIntersection<[this, ...T]> {
    return TIntersection._create([this, ...types], pickTransferrableOptions(this.options));
  }

  brand<B>(getBrand: () => F.Narrow<B>): TBrand<this, B>;
  brand<B>(brand: F.Narrow<B>): TBrand<this, B>;
  brand<B>(brandValueOrGetter: F.Narrow<B> | (() => F.Narrow<B>)): TBrand<this, B> {
    return TBrand.create<this, B>(this, brandValueOrGetter, pickTransferrableOptions(this.options));
  }

  default<D extends Exclude<InputOf<this>, undefined>>(getDefault: () => F.Narrow<D>): TDefault<this, D>;
  default<D extends Exclude<InputOf<this>, undefined>>(defaultValue: F.Narrow<D>): TDefault<this, D>;
  default<D extends Exclude<InputOf<this>, undefined>>(
    defaultValueOrGetter: F.Narrow<D> | (() => F.Narrow<D>)
  ): TDefault<this, D> {
    return TDefault.create(this, defaultValueOrGetter, pickTransferrableOptions(this.options));
  }

  catch<C extends OutputOf<this>>(getCatch: () => F.Narrow<C>): TCatch<this, C>;
  catch<C extends OutputOf<this>>(catchValue: F.Narrow<C>): TCatch<this, C>;
  catch<C extends OutputOf<this>>(catchValueOrGetter: F.Narrow<C> | (() => F.Narrow<C>)): TCatch<this, C> {
    return TCatch.create(this, catchValueOrGetter, pickTransferrableOptions(this.options));
  }

  pipe<T extends TType<Merge<AnyTDef, { $In: Def["$Out"] }>>>(type: T): TPipeline<this, T> {
    return TPipeline.create(this, type, pickTransferrableOptions(this.options));
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, pickTransferrableOptions(this.options));
  }

  readonly(): TReadonly<this> {
    return TReadonly.create(this, pickTransferrableOptions(this.options));
  }

  preprocess<T extends InputOf<this>>(preprocess: (data: unknown) => T): TPreprocess<this, T> {
    return TPreprocess.create(this, preprocess, pickTransferrableOptions(this.options));
  }

  refine<Out extends OutputOf<this>>(
    refinement: (data: OutputOf<this>, ctx: TEffectCtx) => data is Out,
    data?: TRefinementData<this>
  ): TRefinement<this, Out>;
  refine(
    refinement: (data: OutputOf<this>, ctx: TEffectCtx) => unknown,
    data?: TRefinementData<this>
  ): TRefinement<this, OutputOf<this>>;
  refine(refinement: (data: OutputOf<this>, ctx: TEffectCtx) => unknown, data?: TRefinementData<this>) {
    return TRefinement.create(this, refinement, data, pickTransferrableOptions(this.options));
  }

  transform<Out>(transform: (data: OutputOf<this>) => Out): TTransform<this, Out> {
    return TTransform.create(this, transform, pickTransferrableOptions(this.options));
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  abortEarly(enabled = true): this {
    return this._construct({ ...this._def, options: { ...this._def.options, abortEarly: enabled } });
  }

  label(label: string): this {
    return this._construct({ ...this._def, options: { ...this._def.options, label } });
  }

  errorMap(errorMap: TErrorMap): this {
    return this._construct({ ...this._def, options: { ...this._def.options, schemaErrorMap: errorMap } });
  }

  warnOnly(enabled = true): this {
    return this._construct({ ...this._def, options: { ...this._def.options, warnOnly: enabled } });
  }

  messages(messages: this["options"]["messages"], options = { overwrite: false }): this {
    return this._construct({
      ...this._def,
      options: {
        ...this._def.options,
        messages: options.overwrite ? messages : { ...this._def.options.messages, ...messages },
      },
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
      in: MaybeWithTOverride<utils.AtLeastOne<DescriptiveWithValue<Def["$In"]>>>;
      out: MaybeWithTOverride<utils.AtLeastOne<DescriptiveWithValue<Def["$Out"]>>>;
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

  tags(...tags: MaybeWithTOverride<utils.AtLeastOne<string | DescriptiveWithValue<string>>>): this {
    const currTags = this._def.manifest.tags ?? [];
    const updatedTags =
      tags[0] === TMarkers.override ? tail(tags) : [...currTags, ...tags.map((t) => parseMaybeDescriptive(t))];
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, tags: updatedTags } });
  }

  notes(...notes: MaybeWithTOverride<utils.AtLeastOne<string | DescriptiveWithValue<string>>>): this {
    const currNotes = this._def.manifest.tags ?? [];
    const updatedNotes =
      notes[0] === TMarkers.override ? tail(notes) : [...currNotes, ...notes.map((n) => parseMaybeDescriptive(n))];
    return this._construct({ ...this._def, manifest: { ...this._def.manifest, notes: updatedNotes } });
  }

  unit(unit: string | DescriptiveWithValue<string>): this {
    return this._construct({
      ...this._def,
      manifest: { ...this._def.manifest, unit: typeof unit === "string" ? { value: unit } : unit },
    });
  }

  meta(meta: Record<string, unknown>, options = { overwrite: false }): this {
    return this._construct({
      ...this._def,
      manifest: { ...this._def.manifest, meta: options.overwrite ? meta : { ...this._def.manifest.meta, ...meta } },
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get isOptional(): this["_spec"]["optional"] {
    return isOptional(this);
  }

  get isNullable(): this["_spec"]["nullable"] {
    return isNullable(this);
  }

  get isNullish(): boolean {
    return this.isOptional && this.isNullable;
  }

  get isRequired(): boolean {
    return !this.isOptional;
  }

  get isReadonly(): this["_spec"]["readonly"] {
    return isReadonly(this);
  }

  isT<T extends utils.AtLeastOne<TTypeName>>(...typeNames: T): this is TTypeNameMap<T[number]> {
    return typeNames.includes(this._def.typeName);
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  protected _addCheck(
    check: Exclude<Def["$Checks"], null>[number],
    options?: { unique?: boolean; remove?: utils.AtLeastOne<Exclude<Def["$Checks"], null>[number]["kind"]> }
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

  protected _removeChecks(...checks: utils.AtLeastOne<Exclude<Def["$Checks"], null>[number]["kind"]>) {
    return this._construct({
      ...this._def,
      checks: (this._def.checks ?? []).filter((check) => !checks.includes(check.kind)),
    });
  }

  protected _construct(def?: Record<string, unknown>): this {
    return Reflect.construct(this.constructor as new (def: Record<string, unknown>) => this, [
      { ...this._def, ...def },
    ]);
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  get [tt]() {
    return true;
  }
}

export type AnyTType = TType<any>;
export type AnyValidTType = TTypeNameMap;

export type OutputOf<T> = T extends { readonly $O: infer U } ? U : never;
export type InputOf<T> = T extends { readonly $I: infer U } ? U : never;

/* -------------------------------------------------- TUnwrappable -------------------------------------------------- */

export type TUnwrappable<T extends AnyTType, TN extends TTypeName> = {
  readonly underlying: T;
  unwrap(): T;
  unwrapDeep(): UnwrapDeep<T, TN>;
  modify<U extends AnyTType>(fn: (underlying: T) => U): TUnwrappable<U, TN>;
};

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TAnyDef = MakeTDef<{
  $Out: any;
  $TypeName: "TAny";
}>;

export class TAny extends TType<TAnyDef> {
  get _spec() {
    return utils.asConst({
      optional: true,
      nullable: true,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: true,
      nullable: true,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: true,
      nullable: false,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: true,
      nullable: false,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: true,
      readonly: false,
    });
  }

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
  $Checks: ReadonlyArray<
    | TCheck.Min
    | TCheck.Max
    | TCheck.Length
    | TCheck.Range
    | TCheck.Pattern
    | TCheck.Alphanum
    | TCheck.Email
    | TCheck.Url
    | TCheck.Cuid
    | TCheck.Uuid
    | TCheck.Hex
    | TCheck.Base64
    // ——— Transforms
    | TCheck.Trim
    | TCheck.Uppercase
    | TCheck.Lowercase
    | TCheck.Capitalize
    | TCheck.Uncapitalize
  >;
}>;

const alphanumRx = /^[a-z0-9]+$/i;
const emailRx =
  /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@((?!-)([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{1,})[^-<>()[\].,;:\s@"]$/i;
const cuidRx = /^c[^\s-]{8,}$/i;
const uuidRx =
  /^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}|00000000-0000-0000-0000-000000000000)$/i;
const hexRx = /^[a-f0-9]+$/i;
const base64Rx = {
  // paddingRequired
  true: {
    // urlSafe
    true: /^(?:[\w-]{2}[\w-]{2})*(?:[\w-]{2}==|[\w-]{3}=)?$/,
    false: /^(?:[A-Za-z0-9+/]{2}[A-Za-z0-9+/]{2})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
  },
  false: {
    true: /^(?:[\w-]{2}[\w-]{2})*(?:[\w-]{2}(==)?|[\w-]{3}=?)?$/,
    false: /^(?:[A-Za-z0-9+/]{2}[A-Za-z0-9+/]{2})*(?:[A-Za-z0-9+/]{2}(==)?|[A-Za-z0-9+/]{3}=?)?$/,
  },
} as const;

export class TString<Co extends TStringCoercion = false> extends TType<TStringDef<Co>> {
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

  _parse(ctx: TParseContext<this>) {
    if (this.props.coercion) {
      ctx.setData(String(ctx.data));
    }

    if (!isKindOf(ctx.data, ValueKind.String)) {
      return ctx.invalidType({ expected: ValueKind.String }).return();
    }

    for (const check of this.checks) {
      switch (check.kind) {
        case TCheckKind.Min:
          if (!validateMin(ctx.data.length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.String.Min, payload: { ...sanitizeCheck(check), received: ctx.data.length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Max:
          if (!validateMax(ctx.data.length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.String.Max, payload: { ...sanitizeCheck(check), received: ctx.data.length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Length:
          if (ctx.data.length !== check.value) {
            ctx.addIssue(
              { kind: TIssueKind.String.Length, payload: { ...sanitizeCheck(check), received: ctx.data.length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Range:
          if (!validateRange(ctx.data.length, check)) {
            ctx.addIssue(
              { kind: TIssueKind.String.Range, payload: { ...sanitizeCheck(check), received: ctx.data.length } },
              check.message
            );
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Pattern:
          if (
            (check.type === "enforce" && !check.pattern.test(ctx.data)) ||
            (check.type === "disallow" && check.pattern.test(ctx.data))
          ) {
            ctx.addIssue({ kind: TIssueKind.String.Pattern, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Alphanum:
          if (!alphanumRx.test(ctx.data)) {
            ctx.addIssue({ kind: TIssueKind.String.Alphanum, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Email:
          if (!emailRx.test(ctx.data)) {
            ctx.addIssue({ kind: TIssueKind.String.Email, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Url:
          try {
            // eslint-disable-next-line no-new
            new URL(ctx.data);
          } catch {
            ctx.addIssue({ kind: TIssueKind.String.Url, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Cuid:
          if (!cuidRx.test(ctx.data)) {
            ctx.addIssue({ kind: TIssueKind.String.Cuid, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Uuid:
          if (!uuidRx.test(ctx.data)) {
            ctx.addIssue({ kind: TIssueKind.String.Uuid, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Hex:
          if (!hexRx.test(ctx.data)) {
            ctx.addIssue({ kind: TIssueKind.String.Hex, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        case TCheckKind.Base64:
          if (!base64Rx[literalBool(check.paddingRequired)][literalBool(check.urlSafe)].test(ctx.data)) {
            ctx.addIssue({ kind: TIssueKind.String.Base64, payload: sanitizeCheck(check) }, check.message);
            if (ctx.common.abortEarly) return ctx.return();
          }
          break;
        // ——— Transforms
        case TCheckKind.Trim:
          ctx.setData(ctx.data.trim());
          break;
        case TCheckKind.Uppercase:
          ctx.setData(ctx.data.toUpperCase());
          break;
        case TCheckKind.Lowercase:
          ctx.setData(ctx.data.toLowerCase());
          break;
        case TCheckKind.Capitalize:
          ctx.setData(ctx.data.charAt(0).toUpperCase() + ctx.data.slice(1));
          break;
        case TCheckKind.Uncapitalize:
          ctx.setData(ctx.data.charAt(0).toLowerCase() + ctx.data.slice(1));
          break;

        default:
          assertNever(check);
      }
    }

    return ctx.return(ctx.data);
  }

  coerce<C extends TStringCoercion = true>(value = true as C): TString<C> {
    return new TString<C>({ ...this._def, props: { ...this._def.props, coercion: value } });
  }

  min(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck(parseMinCheck(value, options));
  }

  max(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck(parseMaxCheck(value, options));
  }

  length(value: number, options?: TCheck.Options): this {
    const opts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
    return this._addCheck({ kind: TCheckKind.Length, value, message: opts.message });
  }

  range(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>): this {
    return this._addCheck(parseRangeCheck(min, max, options));
  }

  between(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>): this {
    return this.range(min, max, options);
  }

  pattern(regex: RegExp, options?: TCheck.Options<{ type?: "disallow" | "enforce"; name?: string }>): this {
    const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
    return this._addCheck({
      kind: TCheckKind.Pattern,
      pattern: regex,
      type: parsedOpts.type ?? "enforce",
      name: parsedOpts.name ?? regex.toString(),
      message: parsedOpts.message,
    });
  }

  regex(pattern: RegExp, options?: TCheck.Options<{ type?: "disallow" | "enforce"; name?: string }>): this {
    return this.pattern(pattern, options);
  }

  enforce(pattern: RegExp, options?: TCheck.Options<{ name?: string }>): this {
    return this.pattern(pattern, {
      ...(isKindOf(options, ValueKind.String) ? { message: options } : options),
      type: "enforce",
    });
  }

  disallow(pattern: RegExp, options?: TCheck.Options<{ name?: string }>): this {
    return this.pattern(pattern, {
      ...(isKindOf(options, ValueKind.String) ? { message: options } : options),
      type: "disallow",
    });
  }

  alphanumeric(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Alphanum, options));
  }

  alphanum(options?: TCheck.Options): this {
    return this.alphanumeric(options);
  }

  email(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Email, options));
  }

  url(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Url, options));
  }

  cuid(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Cuid, options));
  }

  uuid(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Uuid, options));
  }

  hex(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Hex, options));
  }

  base64(options?: TCheck.Options<{ paddingRequired?: boolean; urlSafe?: boolean }>): this {
    const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
    return this._addCheck({
      kind: TCheckKind.Base64,
      paddingRequired: parsedOpts.paddingRequired ?? true,
      urlSafe: parsedOpts.urlSafe ?? false,
      message: parsedOpts.message,
    });
  }

  trim(): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Trim, undefined));
  }

  uppercase(): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Uppercase, undefined));
  }

  lowercase(): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Lowercase, undefined));
  }

  capitalize(): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Capitalize, undefined));
  }

  uncapitalize(): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Uncapitalize, undefined));
  }

  get minLength(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Min, TCheckKind.Length]).reduce<number | undefined>(
      (min, check) => (min === undefined || check.value > min ? check.value : min),
      undefined
    );
  }

  get maxLength(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Min, TCheckKind.Length]).reduce<number | undefined>(
      (min, check) => (min === undefined || check.value < min ? check.value : min),
      undefined
    );
  }

  get isAlphanum(): boolean {
    return filterChecks(this.checks, [TCheckKind.Alphanum]).length > 0;
  }

  get isEmail(): boolean {
    return filterChecks(this.checks, [TCheckKind.Email]).length > 0;
  }

  get isUrl(): boolean {
    return filterChecks(this.checks, [TCheckKind.Url]).length > 0;
  }

  get isCuid(): boolean {
    return filterChecks(this.checks, [TCheckKind.Cuid]).length > 0;
  }

  get isUuid(): boolean {
    return filterChecks(this.checks, [TCheckKind.Uuid]).length > 0;
  }

  get isHex(): boolean {
    return filterChecks(this.checks, [TCheckKind.Hex]).length > 0;
  }

  get isBase64(): boolean {
    return filterChecks(this.checks, [TCheckKind.Base64]).length > 0;
  }

  static create(options?: TOptions): TString {
    return new TString({
      typeName: TTypeName.String,
      props: { coercion: false },
      checks: [],
      options: processCreateOptions(options),
    });
  }
}

export type AnyTString = TString<TStringCoercion>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNumberCoercion = boolean | utils.AtLeastOne<"string" | "bigint">;
export type TNumberCasting = false | "string" | "bigint";

export type TNumberDef<Co extends TNumberCoercion, Ca extends TNumberCasting> = MakeTDef<{
  $Out: Ca extends "string" ? string : Ca extends "bigint" ? bigint : number;
  $In: Co extends true ? any : Co extends "string" ? string | number : Co extends "bigint" ? bigint | number : number;
  $TypeName: "TNumber";
  $Props: { readonly coercion: Co; readonly casting: Ca };
  $Checks: ReadonlyArray<
    | TCheck.Min
    | TCheck.Max
    | TCheck.Range
    | TCheck.Integer
    | TCheck.Precision
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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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

  coerce<C extends TNumberCoercion = true>(value = true as C): TNumber<C, Ca> {
    return new TNumber<C, Ca>({ ...this._def, props: { ...this._def.props, coercion: value } });
  }

  cast<C extends TNumberCasting = "string">(value = "string" as C): TNumber<Co, C> {
    return new TNumber<Co, C>({ ...this._def, props: { ...this._def.props, casting: value } });
  }

  integer(options?: TCheck.Options<{ strict?: boolean }>): this {
    const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
    return this._addCheck(
      { kind: TCheckKind.Integer, strict: parsedOpts.strict ?? true, message: parsedOpts.message },
      { unique: true, remove: [TCheckKind.Precision] }
    );
  }

  int(options?: TCheck.Options<{ strict?: boolean }>): this {
    return this.integer(options);
  }

  precision(value: number, options?: TCheck.Options<{ inclusive?: boolean; strict?: boolean }>): this {
    const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };
    return this._addCheck(
      {
        kind: TCheckKind.Precision,
        value,
        inclusive: parsedOpts.inclusive ?? true,
        strict: parsedOpts.strict ?? true,
        message: parsedOpts.message,
      },
      { unique: true, remove: [TCheckKind.Integer] }
    );
  }

  min(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck(parseMinCheck(value, options));
  }

  gt(value: number, options?: TCheck.Options): this {
    return this.min(value, {
      inclusive: false,
      message: isKindOf(options, ValueKind.String) ? options : options?.message,
    });
  }

  gte(value: number, options?: TCheck.Options): this {
    return this.min(value, {
      inclusive: true,
      message: isKindOf(options, ValueKind.String) ? options : options?.message,
    });
  }

  positive(options?: TCheck.Options): this {
    return this.min(0, { inclusive: false, message: isKindOf(options, ValueKind.String) ? options : options?.message });
  }

  nonnegative(options?: TCheck.Options): this {
    return this.min(0, { inclusive: true, message: isKindOf(options, ValueKind.String) ? options : options?.message });
  }

  max(value: number, options?: TCheck.Options<{ inclusive?: boolean }>) {
    return this._addCheck(parseMaxCheck(value, options));
  }

  lt(value: number, options?: TCheck.Options): this {
    return this.max(value, {
      inclusive: false,
      message: isKindOf(options, ValueKind.String) ? options : options?.message,
    });
  }

  lte(value: number, options?: TCheck.Options): this {
    return this.max(value, {
      inclusive: true,
      message: isKindOf(options, ValueKind.String) ? options : options?.message,
    });
  }

  negative(options?: TCheck.Options): this {
    return this.max(0, { inclusive: false, message: isKindOf(options, ValueKind.String) ? options : options?.message });
  }

  nonpositive(options?: TCheck.Options): this {
    return this.max(0, { inclusive: true, message: isKindOf(options, ValueKind.String) ? options : options?.message });
  }

  range(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>): this {
    return this._addCheck(parseRangeCheck(min, max, options));
  }

  between(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>): this {
    return this.range(min, max, options);
  }

  multiple(value: number, options?: TCheck.Options): this {
    return this._addCheck({
      kind: TCheckKind.Multiple,
      value,
      message: isKindOf(options, ValueKind.String) ? options : options?.message,
    });
  }

  step(value: number, options?: TCheck.Options): this {
    return this.multiple(value, options);
  }

  port(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Port, options));
  }

  safe(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Safe, options), { unique: true });
  }

  unsafe(): this {
    return this._removeChecks(TCheckKind.Safe);
  }

  finite(options?: TCheck.Options): this {
    return this._addCheck(parseSimpleCheck(TCheckKind.Finite, options), { unique: true });
  }

  infinite(): this {
    return this._removeChecks(TCheckKind.Finite);
  }

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

  get isInteger(): boolean {
    return filterChecks(this.checks, [TCheckKind.Integer]).length > 0;
  }

  get isFloat(): boolean {
    return filterChecks(this.checks, [TCheckKind.Precision]).length > 0;
  }

  get isPositive(): boolean {
    return this.minValue === undefined || this.minValue > 0;
  }

  get isNegative(): boolean {
    return this.maxValue === undefined || this.maxValue < 0;
  }

  get isPort(): boolean {
    return filterChecks(this.checks, [TCheckKind.Port]).length > 0;
  }

  get isSafe(): boolean {
    return filterChecks(this.checks, [TCheckKind.Safe]).length > 0;
  }

  get isFinite(): boolean {
    return filterChecks(this.checks, [TCheckKind.Finite]).length > 0;
  }

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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

  _parse(ctx: TParseContext<this>) {
    return ctx.data === true ? ctx.return(ctx.data) : ctx.invalidType({ expected: ValueKind.True }).return();
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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

  _parse(ctx: TParseContext<this>) {
    return ctx.data === false ? ctx.return(ctx.data) : ctx.invalidType({ expected: ValueKind.False }).return();
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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
  get _spec() {
    return utils.asConst({
      optional: this.props.value === undefined,
      nullable: this.props.value === null,
      readonly: false,
    });
  }

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
export type TEnumValues = utils.AtLeastOne<TEnumValue>;

export type EnumLike = { [x: string]: string | number; [y: number]: string };

export type MakeEnum<T extends readonly TEnumValue[]> = { readonly [K in T[number]]: K };

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
        { kind: TIssueKind.Enum.Invalid, payload: { expected: values, received: { value: ctx.data as TEnumValue } } },
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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

  _parse(ctx: TParseContext<this>) {
    return parseEnum(ctx, this.values, this.options.messages[TIssueKind.Enum.Invalid]);
  }

  get values(): Readonly<T> {
    return utils.readonly(this.props.values);
  }

  get enum(): MakeEnum<T> {
    return utils.readonly(this.values.reduce((acc, v) => ({ ...acc, [v]: v }), {})) as MakeEnum<T>;
  }

  extract<U extends utils.AtLeastOne<T[number]>>(values: U): TEnum<U> {
    return new TEnum<U>({ ...this._def, props: { values } });
  }

  exclude<U extends utils.AtLeastOne<T[number]>>(
    values: U
  ): U["length"] extends T["length"] ? TNever : TEnum<FilterOut<T, U[number]>>;
  exclude<U extends utils.AtLeastOne<T[number]>>(values: U) {
    const excluded = filterOut(this.values, values);

    if ((excluded as unknown[]).length <= 0) {
      return TNever.create(pickTransferrableOptions(this.options));
    }

    return new TEnum<FilterOut<T, U[number]>>({ ...this._def, props: { values: excluded } });
  }

  static readonly create = Object.freeze(
    Object.assign(TEnum._create, {
      native<T extends EnumLike>(enum_: T, options?: TEnumOptions): TNativeEnum<T> {
        return TNativeEnum.create(enum_, options);
      },
    })
  );

  private static _create<T extends EnumLike>(enum_: T, options?: TEnumOptions): TNativeEnum<T>;
  private static _create<T extends string | number, U extends utils.AtLeastOne<T>>(
    values: U,
    options?: TEnumOptions
  ): TEnum<U>;
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
  get _spec() {
    return utils.asConst({
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

  _parse(ctx: TParseContext<this>) {
    const validValues = getValidEnumValues(this.enum);
    return parseEnum(ctx, validValues, this.options.messages[TIssueKind.Enum.Invalid]);
  }

  get enum(): T {
    return this.props.enum;
  }

  get values(): Readonly<UnionToTuple<T[keyof T]>> {
    return utils.readonly(getValidEnumValues(this.enum) as UnionToTuple<T[keyof T]>);
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
  $Props: { readonly element: T; readonly cardinality: Card };
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
  get _spec() {
    return utils.asConst({
      element: utils.extractProp(this.element, "manifest"),
      minItems: this.minItems ?? null,
      maxItems: this.maxItems ?? null,
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
            return ctx.abortAsync();
          }
          return ctx.resolveAsync();
        })
      )
        .then(() => finalizeArray(ctx, result, postChecks))
        .catch((err) => ctx.handleAsyncAbort(err));
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

  min(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck(parseMinCheck(value, options));
  }

  max(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck(parseMaxCheck(value, options));
  }

  length(value: number, options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Length, value, message: options?.message });
  }

  range(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>): this {
    return this._addCheck(parseRangeCheck(min, max, options));
  }

  between(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>): this {
    return this.range(min, max, options);
  }

  nonempty(options?: TCheck.Options): TArray<T, "atleastone"> {
    const nonempty = this.min(1, {
      inclusive: true,
      message: isKindOf(options, ValueKind.String) ? options : options?.message,
    });
    return new TArray<T, "atleastone">({ ...nonempty._def, props: { ...nonempty.props, cardinality: "atleastone" } });
  }

  unique(comparator?: TArrayComparatorFn<T, boolean>, options?: TCheck.Options<{ strict?: boolean }>): this;
  unique(options?: TCheck.Options<{ strict?: boolean }>): this;
  unique(
    comparatorOrOptions?: TArrayComparatorFn<T, boolean> | TCheck.Options<{ strict?: boolean }>,
    maybeOptions?: TCheck.Options<{ strict?: boolean }>
  ): this {
    const comparator = isKindOf(comparatorOrOptions, ValueKind.Function) ? comparatorOrOptions : null;
    const options = isKindOf(comparatorOrOptions, ValueKind.Function) ? maybeOptions : comparatorOrOptions;
    const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };

    return this._addCheck({
      kind: TCheckKind.Unique,
      comparator,
      strict: parsedOpts.strict ?? false,
      message: parsedOpts.message,
    });
  }

  sorted(comparator?: TArrayComparatorFn<T, number>, options?: TCheck.Options<{ strict?: boolean }>): this;
  sorted(options?: TCheck.Options<{ strict?: boolean }>): this;
  sorted(
    comparatorOrOptions?: TArrayComparatorFn<T, number> | TCheck.Options<{ strict?: boolean }>,
    maybeOptions?: TCheck.Options<{ strict?: boolean }>
  ): this {
    const comparator = isKindOf(comparatorOrOptions, ValueKind.Function) ? comparatorOrOptions : null;
    const options = isKindOf(comparatorOrOptions, ValueKind.Function) ? maybeOptions : comparatorOrOptions;
    const parsedOpts = isKindOf(options, ValueKind.String) ? { message: options } : { ...options };

    return this._addCheck({
      kind: TCheckKind.Sort,
      comparator,
      strict: parsedOpts.strict ?? false,
      message: parsedOpts.message,
    });
  }

  map<U extends AnyTType>(fn: (element: T) => U): TArray<U, Card> {
    return new TArray<U, Card>({ ...this._def, props: { ...this._def.props, element: fn(this.element) } });
  }

  sparse(enabled?: true): TArray<TOptional<T>, Card>;
  sparse(enabled: false): TArray<TDefined<T>, Card>;
  sparse(enabled = true) {
    return this.map((e) => (enabled ? e.optional() : e.defined()));
  }

  partial(): TArray<TOptional<T>, Card> {
    return this.sparse(true);
  }

  deepPartial(): DeepPartial<this>;
  deepPartial(): AnyTType {
    return deepPartialify(this).unwrap();
  }

  required(): TArray<TDefined<T>, Card> {
    return this.sparse(false);
  }

  concat<U extends AnyTType>(other: TArray<U, TArrayCardinality>): TArray<TUnion<[T, U]>, Card> {
    return new TArray<TUnion<[T, U]>, Card>({
      ...this._def,
      props: { ...this._def.props, element: this.element.or(other.element) },
      checks: [...this.checks, ...other.checks],
    });
  }

  get minItems(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Min, TCheckKind.Length]).reduce<number | undefined>(
      (min, check) => (min === undefined || check.value > min ? check.value : min),
      undefined
    );
  }

  get maxItems(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Max, TCheckKind.Length]).reduce<number | undefined>(
      (max, check) => (max === undefined || check.value < max ? check.value : max),
      undefined
    );
  }

  get isNonEmpty(): boolean {
    return this.props.cardinality === "atleastone";
  }

  get isUnique(): boolean {
    return filterChecks(this.checks, [TCheckKind.Unique]).length > 0;
  }

  get isSorted(): boolean {
    return filterChecks(this.checks, [TCheckKind.Sort]).length > 0;
  }

  static readonly create = Object.freeze(
    Object.assign(TArray._create, {
      of<T extends AnyTType>(element: T, options?: TOptions): TArray<T> {
        return TArray._create(element, options);
      },
    })
  );

  private static _create<T extends AnyTType>(element: T, options?: TOptions): TArray<T> {
    return new TArray({
      typeName: TTypeName.Array,
      props: { element, cardinality: "many" },
      checks: [],
      options: processCreateOptions(options),
    });
  }
}

export type AnyTArray = TArray<AnyTType, TArrayCardinality>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TTuple                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TTupleIO<T extends readonly AnyTType[], R extends AnyTType | null, IO extends "$O" | "$I" = "$O"> = [
  ...EnforceOptionalTuple<{ [K in keyof T]: T[K][IO] }>,
  ...(R extends AnyTType ? Array<R[IO]> : [])
];

export type TTupleOptions = TOptions<{ issueKinds: ["tuple.length"] }>;

export type TTupleDef<T extends readonly AnyTType[], R extends AnyTType | null> = MakeTDef<{
  $Out: TTupleIO<T, R>;
  $In: TTupleIO<T, R, "$I">;
  $TypeName: "TTuple";
  $Props: { readonly items: T; readonly rest: R };
  $Options: TTupleOptions;
}>;

export class TTuple<T extends readonly AnyTType[], R extends AnyTType | null> extends TType<TTupleDef<T, R>> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Array)) {
      return ctx.invalidType({ expected: ValueKind.Array }).return();
    }

    const { items, rest } = this.props;
    const { data } = ctx;
    const { length } = data;

    if (length < this.minItems || (this.maxItems !== null && length > this.maxItems)) {
      return ctx
        .addIssue(
          { kind: TIssueKind.Tuple.Length, payload: { min: this.minItems, max: this.maxItems, received: length } },
          this.options.messages[TIssueKind.Tuple.Length]
        )
        .return();
    }

    const result: unknown[] = [];

    if (ctx.common.async) {
      return Promise.all(
        data.map(async (v, i) => {
          const t = items[i] ?? rest;
          if (!t) {
            return ctx.abortAsync();
          }
          const parsed = await t._parseAsync(ctx.child(t, v, [i]));
          if (parsed.ok) {
            result[i] = parsed.data;
          } else if (ctx.common.abortEarly) {
            return ctx.abortAsync();
          }
          return ctx.resolveAsync();
        })
      )
        .then(() => ctx.return(result as TTupleIO<T, R>))
        .catch((err) => ctx.handleAsyncAbort(err));
    }

    for (const [i, v] of data.entries()) {
      const t = items[i] ?? rest;
      if (!t) {
        return ctx.return();
      }
      const parsed = t._parseSync(ctx.child(t, v, [i]));
      if (parsed.ok) {
        result[i] = parsed.data;
      } else if (ctx.common.abortEarly) {
        return ctx.return();
      }
    }

    return ctx.return(result as TTupleIO<T, R>);
  }

  get items(): T {
    return this.props.items;
  }

  get restType(): R {
    return this.props.rest;
  }

  rest<NewR extends AnyTType>(rest: NewR): TTuple<T, NewR> {
    return new TTuple<T, NewR>({ ...this._def, props: { ...this._def.props, rest } });
  }

  removeRest(): TTuple<T, null> {
    return new TTuple<T, null>({ ...this._def, props: { ...this._def.props, rest: null } });
  }

  head(): T extends readonly [infer Head extends AnyTType, ...unknown[]] ? Head : TNever;
  head() {
    return this.items[0] ?? TNever.create(pickTransferrableOptions(this.options));
  }

  tail(): T extends readonly [unknown, ...infer Tail extends AnyTType[]] ? TTuple<Tail, R> : TTuple<[], R>;
  tail() {
    return this.items.length <= 0
      ? new TTuple<[], R>({ ...this._def, props: { ...this._def.props, items: [] } })
      : new TTuple({ ...this._def, props: { ...this._def.props, items: this.items.slice(1) } });
  }

  last(): T extends readonly [...(readonly unknown[]), infer Last extends AnyTType] ? Last : TNever;
  last() {
    return this.items[this.items.length - 1] ?? TNever.create(pickTransferrableOptions(this.options));
  }

  prepend<Head extends utils.AtLeastOne<AnyTType>>(...head: Head): TTuple<[...Head, ...T], R> {
    return new TTuple<[...Head, ...T], R>({
      ...this._def,
      props: { ...this._def.props, items: [...head, ...this.items] },
    });
  }

  unshift<Head extends utils.AtLeastOne<AnyTType>>(...head: Head): TTuple<[...Head, ...T], R> {
    return this.prepend(...head);
  }

  append<Tail extends utils.AtLeastOne<AnyTType>>(...tail: Tail): TTuple<[...T, ...Tail], R> {
    return new TTuple<[...T, ...Tail], R>({
      ...this._def,
      props: { ...this._def.props, items: [...this.items, ...tail] },
    });
  }

  push<Tail extends utils.AtLeastOne<AnyTType>>(...tail: Tail): TTuple<[...T, ...Tail], R> {
    return this.append(...tail);
  }

  concat<T1 extends readonly AnyTType[], R1 extends AnyTType | null>(
    other: TTuple<T1, R1>
  ): TTuple<[...T, ...T1], R extends AnyTType ? (R1 extends AnyTType ? TUnion<[R, R1]> : R) : R1>;
  concat(other: AnyTTuple): AnyTTuple {
    return new TTuple<AnyTType[], AnyTType | null>({
      ...other._def,
      props: {
        ...other.props,
        items: [...this.items, ...other.items],
        rest:
          this.restType && other.restType
            ? TUnion.create([this.restType, other.restType])
            : this.restType ?? other.restType,
      },
    });
  }

  map<U extends AnyTType>(fn: (item: T[number], index: number) => U): TTuple<{ [K in keyof T]: U }, R> {
    return new TTuple<{ [K in keyof T]: U }, R>({
      ...this._def,
      props: { ...this._def.props, items: this.items.map((i, idx) => fn(i, idx)) as { [K in keyof T]: U } },
    });
  }

  partial(): TTuple<{ [K in keyof T]: TOptional<T[K]> }, R> {
    return this.map((i) => i.optional());
  }

  deepPartial(): DeepPartial<this>;
  deepPartial(): AnyTType {
    return deepPartialify(this).unwrap();
  }

  required(): TTuple<{ [K in keyof T]: TDefined<T[K]> }, R> {
    return this.map((i) => i.defined());
  }

  get minItems(): number {
    const firstRequired = this.items.findIndex((i) => !i.isOptional);
    return firstRequired === -1 ? 0 : firstRequired + 1;
  }

  get maxItems(): number | null {
    return this.restType ? null : this.items.length;
  }

  static create<T extends utils.AtLeastOne<AnyTType> | readonly [], R extends AnyTType | null>(
    items: T,
    rest: R,
    options?: TTupleOptions
  ): TTuple<T, R>;
  static create<T extends utils.AtLeastOne<AnyTType> | readonly []>(items: T, options?: TTupleOptions): TTuple<T, null>;
  static create<T extends utils.AtLeastOne<AnyTType> | readonly [], R extends AnyTType | null>(
    items: T,
    restOrOptions?: R | TTupleOptions,
    maybeOptions?: TTupleOptions
  ) {
    const rest: AnyTType | null = restOrOptions instanceof TType ? restOrOptions : null;
    const options: TTupleOptions | undefined = restOrOptions
      ? restOrOptions instanceof TType
        ? maybeOptions
        : restOrOptions
      : undefined;

    return new TTuple({ typeName: TTypeName.Tuple, props: { items, rest }, options: processCreateOptions(options) });
  }
}

export type AnyTTuple = TTuple<AnyTType[], AnyTType | null>;

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
  get _spec() {
    return utils.asConst({
      element: utils.extractProp(this.element, "manifest"),
      minItems: this.minItems ?? null,
      maxItems: this.maxItems ?? null,
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
            return ctx.abortAsync();
          }
          return ctx.resolveAsync();
        })
      )
        .then(() => ctx.return(result))
        .catch((err) => ctx.handleAsyncAbort(err));
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

  min(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck(parseMinCheck(value, options));
  }

  max(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck(parseMaxCheck(value, options));
  }

  size(value: number, options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Size, value, message: options?.message });
  }

  range(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>): this {
    return this._addCheck(parseRangeCheck(min, max, options));
  }

  between(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>): this {
    return this.range(min, max, options);
  }

  map<U extends AnyTType>(fn: (element: T) => U): TSet<U> {
    return new TSet({ ...this._def, props: { ...this._def.props, element: fn(this.element) } });
  }

  sparse(enabled?: true): TSet<TOptional<T>>;
  sparse(enabled: false): TSet<TDefined<T>>;
  sparse(enabled = true) {
    return this.map((e) => (enabled ? e.optional() : e.defined()));
  }

  partial(): TSet<TOptional<T>> {
    return this.sparse(true);
  }

  deepPartial(): DeepPartial<this>;
  deepPartial(): AnyTType {
    return deepPartialify(this).unwrap();
  }

  required(): TSet<TDefined<T>> {
    return this.sparse(false);
  }

  get minItems(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Min, TCheckKind.Size]).reduce<number | undefined>(
      (min, check) => (min === undefined || check.value > min ? check.value : min),
      undefined
    );
  }

  get maxItems(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Max, TCheckKind.Size]).reduce<number | undefined>(
      (max, check) => (max === undefined || check.value < max ? check.value : max),
      undefined
    );
  }

  static readonly create = Object.freeze(
    Object.assign(TSet._create, {
      of<T extends AnyTType>(element: T, options?: TOptions): TSet<T> {
        return TSet._create(element, options);
      },
    })
  );

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
  get _spec() {
    return utils.asConst({
      minBytes: this.minBytes ?? null,
      maxBytes: this.maxBytes ?? null,
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

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
    return this._addCheck(parseMinCheck(value, options));
  }

  max(value: number, options?: { inclusive?: boolean; message?: string }) {
    return this._addCheck(parseMaxCheck(value, options));
  }

  length(value: number, options?: { message?: string }) {
    return this._addCheck({ kind: TCheckKind.Length, value, message: options?.message });
  }

  range(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>) {
    return this._addCheck(parseRangeCheck(min, max, options));
  }

  between(min: number, max: number, options?: TCheck.Options<{ inclusive?: `${"[" | "("}${"]" | ")"}` }>) {
    return this.range(min, max, options);
  }

  get minBytes(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Min, TCheckKind.Length]).reduce<number | undefined>(
      (min, check) => (min === undefined || check.value > min ? check.value : min),
      undefined
    );
  }

  get maxBytes(): number | undefined {
    return filterChecks(this.checks, [TCheckKind.Max, TCheckKind.Length]).reduce<number | undefined>(
      (max, check) => (max === undefined || check.value < max ? check.value : max),
      undefined
    );
  }

  static create(options?: TOptions): TBuffer {
    return new TBuffer({ typeName: TTypeName.Buffer, checks: [], options: processCreateOptions(options) });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TRecord                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TRecordKeys = TType<Merge<AnyTDef, { $Out: PropertyKey; $In: PropertyKey }>>;

export type TRecordIO<K extends TRecordKeys, V extends AnyTType, IO extends "$O" | "$I" = "$O"> = true extends
  | tf.IsEqual<K[IO], string>
  | tf.IsEqual<K[IO], number>
  | tf.IsEqual<K[IO], symbol>
  ? Record<K[IO], V[IO]>
  : Partial<Record<K[IO], V[IO]>>;

export type TRecordOptions = TOptions<{ issueKinds: ["record.invalid_key"] }>;

export type TRecordDef<K extends TRecordKeys, V extends AnyTType> = MakeTDef<{
  $Out: TRecordIO<K, V>;
  $In: TRecordIO<K, V, "$I">;
  $TypeName: "TRecord";
  $Props: { readonly keys: K; readonly values: V };
  $Checks: ReadonlyArray<TCheck.MinKeys | TCheck.MaxKeys>;
  $Options: TRecordOptions;
}>;

function handleKeyTransformation(k: string | symbol) {
  if (kindOf(k) === ValueKind.Symbol || Number.isNaN(Number(k))) {
    return k;
  }

  return Number(k);
}

export class TRecord<K extends TRecordKeys, V extends AnyTType> extends TType<TRecordDef<K, V>> {
  get _spec() {
    return {
      keys: utils.extractProp(this.props.keys, "manifest"),
      values: utils.extractProp(this.props.values, "manifest"),
      optional: false,
      nullable: false,
      readonly: false,
    };
  }

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
            parsedKey.warnings?.forEach((w) => ctx.addWarning(w));
            ctx.addIssue(
              { kind: TIssueKind.Record.InvalidKey, payload: { key: k, error: parsedKey.error } },
              this.options.messages[TIssueKind.Record.InvalidKey]
            );
            if (ctx.common.abortEarly) {
              return ctx.abortAsync();
            }
          } else if (parsedValue.ok) {
            result[parsedKey.data] = parsedValue.data;
          } else if (ctx.common.abortEarly) {
            return ctx.abortAsync();
          }
          return ctx.resolveAsync();
        })
      )
        .then(() => ctx.return(result))
        .catch((err) => ctx.handleAsyncAbort(err));
    }

    for (const [k, v] of entries) {
      const [parsedKey, parsedValue] = [
        keys._parseSync(ctx.clone(keys, k)),
        values._parseSync(ctx.child(values, v, [k])),
      ];
      if (!parsedKey.ok) {
        parsedKey.warnings?.forEach((w) => ctx.addWarning(w));
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

  minKeys(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck({ ...parseMinCheck(value, options), kind: TCheckKind.MinKeys });
  }

  maxKeys(value: number, options?: TCheck.Options<{ inclusive?: boolean }>): this {
    return this._addCheck({ ...parseMaxCheck(value, options), kind: TCheckKind.MaxKeys });
  }

  mapKeys<U extends TRecordKeys>(fn: (key: K) => U): TRecord<U, V> {
    return new TRecord<U, V>({ ...this._def, props: { ...this._def.props, keys: fn(this.keys) } });
  }

  mapValues<U extends AnyTType>(fn: (value: V) => U): TRecord<K, U> {
    return new TRecord<K, U>({ ...this._def, props: { ...this._def.props, values: fn(this.values) } });
  }

  partial(): TRecord<K, TOptional<V>> {
    return this.mapValues((v) => v.optional());
  }

  required(): TRecord<K, TDefined<V>> {
    return this.mapValues((v) => v.defined());
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

export class TMap<K extends AnyTType, V extends AnyTType> extends TType<TMapDef<K, V>> {
  get _spec() {
    return {
      keys: utils.extractProp(this.props.keys, "manifest"),
      values: utils.extractProp(this.props.values, "manifest"),
      optional: false,
      nullable: false,
      readonly: false,
    };
  }

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
              return ctx.abortAsync();
            }
          } else if (parsedValue.ok) {
            result.set(parsedKey.data, parsedValue.data);
          } else if (ctx.common.abortEarly) {
            return ctx.abortAsync();
          }
          return ctx.resolveAsync();
        })
      )
        .then(() => ctx.return(result))
        .catch((err) => ctx.handleAsyncAbort(err));
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

  mapKeys<U extends AnyTType>(fn: (key: K) => U): TMap<U, V> {
    return new TMap<U, V>({ ...this._def, props: { ...this._def.props, keys: fn(this.keys) } });
  }

  mapValues<U extends AnyTType>(fn: (value: V) => U): TMap<K, U> {
    return new TMap<K, U>({ ...this._def, props: { ...this._def.props, values: fn(this.values) } });
  }

  partial(): TMap<K, TOptional<V>> {
    return this.mapValues((v) => v.optional());
  }

  deepPartial(): DeepPartial<this>;
  deepPartial(): AnyTType {
    return deepPartialify(this).unwrap();
  }

  required(): TMap<K, TDefined<V>> {
    return this.mapValues((v) => v.defined());
  }

  static create<K extends AnyTType, V extends AnyTType>(keys: K, values: V, options?: TMapOptions): TMap<K, V> {
    return new TMap({ typeName: TTypeName.Map, props: { keys, values }, options: processCreateOptions(options) });
  }
}

export type AnyTMap = TMap<AnyTType, AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TObject                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TObjectShape = Record<string, AnyTType>;
export type TObjectUnknownKeys = "passthrough" | "strict" | "strip";

export type TObjectIO<
  S extends TObjectShape,
  U extends TObjectUnknownKeys | null,
  C extends AnyTType | null,
  SMK extends boolean,
  IO extends "$O" | "$I" = "$O"
> = utils.SimplifyDeep<
  (SMK extends true
    ? {
        [K in keyof S as SMK extends true
          ? UnwrapUntil<S[K], "TOptional"> extends AnyTOptional
            ? K
            : never
          : K]?: S[K][IO];
      } & {
        [K in keyof S as SMK extends true
          ? UnwrapUntil<S[K], "TOptional"> extends AnyTOptional
            ? never
            : K
          : never]: S[K][IO];
      }
    : utils.EnforceOptional<{ [K in keyof S]: S[K][IO] }>) &
    (C extends AnyTType
      ? Record<string, C[IO]>
      : U extends "passthrough"
      ? Record<string, unknown>
      : U extends "strict"
      ? Record<string, never>
      : unknown)
>;

export type TObjectOptions = TOptions<{ issueKinds: ["object.unknown_keys", "object.missing_keys"] }>;

export type TObjectDef<
  S extends TObjectShape,
  U extends TObjectUnknownKeys | null,
  C extends AnyTType | null,
  SMK extends boolean
> = MakeTDef<{
  $Out: TObjectIO<S, U, C, SMK>;
  $In: TObjectIO<S, U, C, SMK, "$I">;
  $TypeName: "TObject";
  $Props: {
    readonly shape: S;
    readonly unknownKeys: U;
    readonly catchall: C;
    readonly strictMissingKeys: SMK;
  };
  $Options: TObjectOptions;
}>;

export class TObject<
  S extends TObjectShape,
  U extends TObjectUnknownKeys | null = "strip",
  C extends AnyTType | null = null,
  SMK extends boolean = false
> extends TType<TObjectDef<S, U, C, SMK>> {
  get _spec() {
    return utils.asConst({
      shape: utils.readonly(utils.mapProp(this.props.shape, "manifest")),
      unknownKeys: this.props.unknownKeys,
      catchall: this.props.catchall,
      optional: false,
      nullable: false,
      readonly: false,
    });
  }

  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Object)) {
      return ctx.invalidType({ expected: ValueKind.Object }).return();
    }

    const { shape, unknownKeys, catchall, strictMissingKeys } = this.props;
    const data = ctx.data as Record<string | symbol, unknown>;

    const extraKeys: Array<string | symbol> = [];
    if (catchall ?? unknownKeys !== "strip") {
      for (const k of Reflect.ownKeys(ctx.data)) {
        if (!(k in shape)) {
          extraKeys.push(k);
        }
      }
    }

    if (unknownKeys === "strict") {
      ctx.addIssue(
        { kind: TIssueKind.Object.UnknownKeys, payload: { keys: extraKeys } },
        this.options.messages[TIssueKind.Object.UnknownKeys]
      );
      if (ctx.common.abortEarly) {
        return ctx.return();
      }
    }

    const missingKeys = Object.keys(shape).filter(
      (k) => !handleUnwrapUntil(shape[k as keyof S], [TTypeName.Optional]).isT(TTypeName.Optional) && !(k in data)
    );

    if (strictMissingKeys && missingKeys.length > 0) {
      ctx.addIssue(
        { kind: TIssueKind.Object.MissingKeys, payload: { keys: missingKeys } },
        this.options.messages[TIssueKind.Object.MissingKeys]
      );
      if (ctx.common.abortEarly) {
        return ctx.return();
      }
    }

    const result: Record<string | symbol, unknown> = {};

    if (ctx.common.async) {
      return Promise.all(
        Object.entries(shape).map(async ([k, t]) => {
          const parsed = await t._parseAsync(ctx.child(t, data[k], [k]));
          if (parsed.ok) {
            if (k in data) {
              result[k] = parsed.data;
            }
          } else if (ctx.common.abortEarly) {
            return ctx.abortAsync();
          }
          return ctx.resolveAsync();
        })
      )
        .then(async () =>
          Promise.all(
            extraKeys.map(async (k) => {
              if (catchall) {
                const parsed = await catchall._parseAsync(ctx.child(catchall, data[k], [k]));
                if (parsed.ok) {
                  result[k] = parsed.data;
                } else if (ctx.common.abortEarly) {
                  return ctx.abortAsync();
                }
              } else if (unknownKeys === "passthrough") {
                result[k] = data[k];
              }
              return ctx.resolveAsync();
            })
          )
        )
        .then(() => ctx.return(result as TObjectIO<S, U, C, SMK>))
        .catch((err) => ctx.handleAsyncAbort(err));
    }

    for (const [k, t] of Object.entries(shape)) {
      const parsed = t._parseSync(ctx.child(t, data[k], [k]));
      if (parsed.ok) {
        if (k in data) {
          result[k] = parsed.data;
        }
      } else if (ctx.common.abortEarly) {
        return ctx.return();
      }
    }

    for (const k of extraKeys) {
      if (catchall) {
        const parsed = catchall._parseSync(ctx.child(catchall, data[k], [k]));
        if (parsed.ok) {
          result[k] = parsed.data;
        } else if (ctx.common.abortEarly) {
          return ctx.return();
        }
      } else if (unknownKeys === "passthrough") {
        result[k] = data[k];
      }
    }

    return ctx.return(result as TObjectIO<S, U, C, SMK>);
  }

  get shape(): S {
    return this.props.shape;
  }

  keyof(): utils.Equals<keyof S, never> extends 1 ? TNever : TEnum<Try<UnionToTuple<keyof S>, TEnumValues>>;
  keyof() {
    const keys = Object.keys(this.props.shape);
    const transferrableOptions = pickTransferrableOptions(this.options);

    if (keys.length === 0) {
      return TNever.create(transferrableOptions);
    }

    return TEnum.create(keys as Try<UnionToTuple<keyof S>, TEnumValues>, transferrableOptions);
  }

  passthrough() {
    return this._setUnknownKeys("passthrough");
  }

  strict(options?: TCheck.Options) {
    const updated = this._setUnknownKeys("strict");
    return new TObject<S, "strict", null, SMK>({
      ...updated._def,
      options: {
        ...updated._def.options,
        messages: {
          ...updated._def.options.messages,
          [TIssueKind.Object.UnknownKeys]:
            utils.extractMsg(options) ?? updated._def.options.messages[TIssueKind.Object.UnknownKeys],
        },
      },
    });
  }

  strip() {
    return this._setUnknownKeys("strip");
  }

  catchall<T extends AnyTType>(catchall: T) {
    return new TObject<S, null, T, SMK>({ ...this._def, props: { ...this._def.props, unknownKeys: null, catchall } });
  }

  removeCatchall() {
    return this.strip();
  }

  strictPresence(options?: TCheck.Options): TObject<S, U, C, true> {
    return new TObject<S, U, C, true>({
      ...this._def,
      props: { ...this._def.props, strictMissingKeys: true },
      options: {
        ...this._def.options,
        messages: {
          ...this._def.options.messages,
          [TIssueKind.Object.MissingKeys]:
            utils.extractMsg(options) ?? this._def.options.messages[TIssueKind.Object.MissingKeys],
        },
      },
    });
  }

  augment<T extends TObjectShape>(augmentation: T) {
    return this._setShape(merge(this.shape, augmentation));
  }

  extend<T extends TObjectShape>(extension: T) {
    return this.augment(extension);
  }

  setKey<K extends string, V extends AnyTType>(key: K, type: V) {
    return this.augment({ [key]: type } as { [P in K]: V });
  }

  merge<S1 extends TObjectShape, U1 extends TObjectUnknownKeys | null, C1 extends AnyTType | null>(
    other: TObject<S1, U1, C1>
  ) {
    return other._setShape(merge(this.shape, other.shape));
  }

  pick<K extends utils.AtLeastOne<keyof S>>(...keys: K) {
    return this._setShape(utils.pick<S, K[number]>(this.shape, ...keys));
  }

  omit<K extends utils.AtLeastOne<keyof S>>(...keys: K) {
    return this._setShape(utils.omit<S, K[number]>(this.shape, ...keys));
  }

  partial(): TObject<{ [K in keyof S]: TOptional<S[K]> }, U, C, SMK>;
  partial<K extends utils.AtLeastOne<keyof S>>(
    keys: K
  ): TObject<{ [P in keyof S]: P extends K ? TOptional<S[P]> : S[P] }, U, C, SMK>;
  partial(keys?: utils.AtLeastOne<keyof S>): AnyTObject {
    return this._setShape(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, v]) => [k, keys ? (keys.includes(k) ? v.optional() : v) : v.optional()])
      )
    );
  }

  required(): TObject<{ [K in keyof S]: TDefined<S[K]> }, U, C, SMK>;
  required<K extends utils.AtLeastOne<keyof S>>(
    keys: K
  ): TObject<{ [P in keyof S]: P extends K ? TDefined<S[P]> : S[P] }, U, C, SMK>;
  required(keys?: utils.AtLeastOne<keyof S>): AnyTObject {
    return this._setShape(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, v]) => [k, keys ? (keys.includes(k) ? v.defined() : v) : v.defined()])
      )
    );
  }

  deepPartial(): DeepPartial<this>;
  deepPartial(): AnyTType {
    return deepPartialify(this).unwrap();
  }

  private _setShape<T extends TObjectShape>(shape: T) {
    return new TObject<T, U, C, SMK>({ ...this._def, props: { ...this._def.props, shape } });
  }

  private _setUnknownKeys<T extends TObjectUnknownKeys>(unknownKeys: T) {
    return new TObject<S, T, null, SMK>({ ...this._def, props: { ...this._def.props, unknownKeys, catchall: null } });
  }

  static readonly create = Object.freeze(
    Object.assign(TObject._makeCreate("strip"), {
      passthrough: TObject._makeCreate("passthrough"),
      strict: TObject._makeCreate("strict"),
      lazy: <S extends TObjectShape>(shape: () => S, options?: TObjectOptions) =>
        TObject._makeCreate("strip")(shape(), options),
    })
  );

  private static _makeCreate<U extends TObjectUnknownKeys>(unknownKeys: U) {
    return <S extends TObjectShape>(shape: S, options?: TObjectOptions): TObject<S, U> =>
      new TObject({
        typeName: TTypeName.Object,
        props: { shape, unknownKeys, catchall: null, strictMissingKeys: false },
        options: processCreateOptions(options),
      });
  }
}

export type AnyTObject = TObject<any, TObjectUnknownKeys | null, AnyTType | null, any>;
export type SomeTObject = TObject<TObjectShape, TObjectUnknownKeys | null, AnyTType | null, any>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TInstanceOf                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TInstanceOfDef<T extends abstract new (...args: readonly any[]) => any> = MakeTDef<{
  $Out: InstanceType<T>;
  $In: InstanceType<T>;
  $TypeName: "TInstanceOf";
  $Props: { readonly ctor: T };
}>;

export class TInstanceOf<T extends abstract new (...args: readonly any[]) => any> extends TType<TInstanceOfDef<T>> {
  _parse(ctx: TParseContext<this>) {
    if (!isKindOf(ctx.data, ValueKind.Object)) {
      return ctx.invalidType({ expected: ValueKind.Object }).return();
    }

    if (!(ctx.data instanceof this.ctor)) {
      return ctx.invalidType({ expected: this.ctor.name }).return();
    }

    return ctx.return(ctx.data as InstanceType<T>);
  }

  get ctor() {
    return this.props.ctor;
  }

  static create<T extends abstract new (...args: readonly any[]) => any>(ctor: T, options?: TOptions) {
    return new TInstanceOf({ typeName: TTypeName.InstanceOf, props: { ctor }, options: processCreateOptions(options) });
  }
}

export type AnyTInstanceOf = TInstanceOf<abstract new (...args: readonly any[]) => any>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TPromiseDef<T extends AnyTType> = MakeTDef<{
  $Out: Promise<OutputOf<T>>;
  $In: Promise<InputOf<T>>;
  $TypeName: "TPromise";
  $Props: { readonly underlying: T };
}>;

export class TPromise<T extends AnyTType> extends TType<TPromiseDef<T>> implements TUnwrappable<T, "TPromise"> {
  get _spec() {
    return utils.asConst({
      promise: true,
      underlying: utils.extractProp(this.props.underlying, "manifest"),
      optional: utils.extractProp(this.props.underlying.manifest, "optional"),
      nullable: utils.extractProp(this.props.underlying.manifest, "nullable"),
      readonly: utils.extractProp(this.props.underlying.manifest, "readonly"),
    });
  }

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

  modify<U extends AnyTType>(fn: (underlying: T) => U): TPromise<U> {
    return new TPromise<U>({ ...this._def, props: { ...this._def.props, underlying: fn(this.underlying) } });
  }

  static create<T extends AnyTType>(underlying: T, options?: TOptions): TPromise<T> {
    return new TPromise({ typeName: TTypeName.Promise, props: { underlying }, options: processCreateOptions(options) });
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

export class TOptional<T extends AnyTType> extends TType<TOptionalDef<T>> implements TUnwrappable<T, "TOptional"> {
  get _spec() {
    return utils.asConst({
      underlying: utils.extractProp(this.props.underlying, "manifest"),
      nullable: utils.extractProp(this.props.underlying.manifest, "nullable"),
      readonly: utils.extractProp(this.props.underlying.manifest, "readonly"),
      optional: true,
    });
  }

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

  modify<U extends AnyTType>(fn: (underlying: T) => U): TOptional<U> {
    return new TOptional<U>({ ...this._def, props: { ...this._def.props, underlying: fn(this.underlying) } });
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

export class TNullable<T extends AnyTType> extends TType<TNullableDef<T>> implements TUnwrappable<T, "TNullable"> {
  get _spec() {
    return utils.asConst({
      underlying: utils.extractProp(this.props.underlying, "manifest"),
      optional: utils.extractProp(this.props.underlying.manifest, "optional"),
      readonly: utils.extractProp(this.props.underlying.manifest, "readonly"),
      nullable: true,
    });
  }

  _parse(ctx: TParseContext<this>): TParseResultOf<this> {
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

  modify<U extends AnyTType>(fn: (underlying: T) => U): TNullable<U> {
    return new TNullable<U>({ ...this._def, props: { ...this._def.props, underlying: fn(this.underlying) } });
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

export class TDefined<T extends AnyTType> extends TType<TDefinedDef<T>> implements TUnwrappable<T, "TDefined"> {
  get _spec() {
    return utils.asConst({
      underlying: utils.extractProp(this.props.underlying, "manifest"),
      nullable: utils.extractProp(this.props.underlying.manifest, "nullable"),
      readonly: utils.extractProp(this.props.underlying.manifest, "readonly"),
      optional: false,
    });
  }

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

  modify<U extends AnyTType>(fn: (underlying: T) => U): TDefined<U> {
    return new TDefined<U>({ ...this._def, props: { ...this._def.props, underlying: fn(this.underlying) } });
  }

  static create<T extends AnyTType>(underlying: T, options?: TOptions): TDefined<T> {
    return new TDefined({ typeName: TTypeName.Defined, props: { underlying }, options: processCreateOptions(options) });
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

export class TNonNullable<T extends AnyTType>
  extends TType<TNonNullableDef<T>>
  implements TUnwrappable<T, "TNonNullable">
{
  get _spec() {
    return utils.asConst({
      underlying: utils.extractProp(this.props.underlying, "manifest"),
      readonly: utils.extractProp(this.props.underlying.manifest, "readonly"),
      optional: false,
      nullable: false,
    });
  }

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

  modify<U extends AnyTType>(fn: (underlying: T) => U): TNonNullable<U> {
    return new TNonNullable<U>({ ...this._def, props: { ...this._def.props, underlying: fn(this.underlying) } });
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

export class TLazy<T extends AnyTType> extends TType<TLazyDef<T>> implements TUnwrappable<T, "TLazy"> {
  get _spec() {
    return utils.extractProp(this.props.getType(), "_spec");
  }

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

  modify<U extends AnyTType>(fn: (underlying: T) => U): TLazy<U> {
    return new TLazy<U>({ ...this._def, props: { ...this._def.props, getType: () => fn(this.underlying) } });
  }

  static create<T extends AnyTType>(getType: () => T, options?: TOptions): TLazy<T> {
    return new TLazy({ typeName: TTypeName.Lazy, props: { getType }, options: processCreateOptions(options) });
  }
}

export type AnyTLazy = TLazy<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TReadonly                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TReadonlyDef<T extends AnyTType> = MakeTDef<{
  $Out: ReadonlyFlat<OutputOf<T>>;
  $In: InputOf<T>;
  $TypeName: "TReadonly";
  $Props: { readonly underlying: T };
}>;

export class TReadonly<T extends AnyTType> extends TType<TReadonlyDef<T>> implements TUnwrappable<T, "TReadonly"> {
  get _spec() {
    return utils.asConst({
      underlying: utils.extractProp(this.props.underlying, "manifest"),
      optional: utils.extractProp(this.props.underlying.manifest, "optional"),
      nullable: utils.extractProp(this.props.underlying.manifest, "nullable"),
      readonly: true,
    });
  }

  _parse(ctx: TParseContext<this>): TParseResultOf<this> {
    const freezeRes = (res: TParseResultSyncOf<T>) => (res.data ? { ...res, data: Object.freeze(res.data) } : res);

    if (ctx.common.async) {
      return this.underlying._parseAsync(ctx.child(this.underlying, ctx.data)).then((res) => freezeRes(res));
    }

    return freezeRes(this.underlying._parseSync(ctx.child(this.underlying, ctx.data)));
  }

  get underlying(): T {
    return this.props.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TReadonly"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Readonly]);
  }

  modify<U extends AnyTType>(fn: (underlying: T) => U): TReadonly<U> {
    return new TReadonly<U>({ ...this._def, props: { ...this._def.props, underlying: fn(this.underlying) } });
  }

  static create<T extends AnyTType>(underlying: T, options?: TOptions): TReadonly<T> {
    return new TReadonly({
      typeName: TTypeName.Readonly,
      props: { underlying },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTReadonly = TReadonly<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBrand                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const BRAND = Symbol("t.brand");
export type BRAND = typeof BRAND;
export type BRANDED<T, B> = T & { [BRAND]: B };

export type TBrandDef<T extends AnyTType, B> = MakeTDef<{
  $Out: BRANDED<OutputOf<T>, B>;
  $In: InputOf<T>;
  $TypeName: "TBrand";
  $Props: { readonly underlying: T; readonly getBrand: () => B };
}>;

export class TBrand<T extends AnyTType, B> extends TType<TBrandDef<T, B>> implements TUnwrappable<T, "TBrand"> {
  _parse(ctx: TParseContext<this>) {
    return this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying(): T {
    return this.props.underlying;
  }

  get brandValue(): B {
    return this.props.getBrand();
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TBrand"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Brand]);
  }

  removeBrand(): T {
    return this.underlying;
  }

  modify<U extends AnyTType>(fn: (underlying: T) => U): TBrand<U, B> {
    return new TBrand<U, B>({ ...this._def, props: { ...this._def.props, underlying: fn(this.underlying) } });
  }

  enbrand<V extends OutputOf<T>>(value: V): BRANDED<V, B>;
  enbrand(value: unknown) {
    return value;
  }

  debrand<V extends OutputOf<T>>(value: BRANDED<V, B>): V;
  debrand(value: unknown) {
    return value;
  }

  static create<T extends AnyTType, B>(underlying: T, getBrand: () => F.Narrow<B>, options?: TOptions): TBrand<T, B>;
  static create<T extends AnyTType, B>(underlying: T, brand: F.Narrow<B>, options?: TOptions): TBrand<T, B>;
  static create<T extends AnyTType, B>(
    underlying: T,
    brandValueOrGetter: F.Narrow<B> | (() => F.Narrow<B>),
    options?: TOptions
  ): TBrand<T, B>;
  static create<T extends AnyTType, B>(
    underlying: T,
    brandValueOrGetter: F.Narrow<B> | (() => F.Narrow<B>),
    options?: TOptions
  ): TBrand<T, B> {
    return new TBrand({
      typeName: TTypeName.Brand,
      props: {
        underlying,
        getBrand: (isKindOf(brandValueOrGetter, ValueKind.Function)
          ? brandValueOrGetter
          : (): unknown => brandValueOrGetter) as () => B,
      },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTBrand = TBrand<AnyTType, any>;

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
    getDefault: () => F.Narrow<D>,
    options?: TOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValue: F.Narrow<D>,
    options?: TOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValueOrGetter: F.Narrow<D> | (() => F.Narrow<D>),
    options?: TOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValueOrGetter: F.Narrow<D> | (() => F.Narrow<D>),
    options?: TOptions
  ): TDefault<T, D> {
    return new TDefault({
      typeName: TTypeName.Default,
      props: {
        underlying,
        getDefault: (isKindOf(defaultValueOrGetter, ValueKind.Function)
          ? defaultValueOrGetter
          : (): unknown => defaultValueOrGetter) as () => D,
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
    getCatch: () => F.Narrow<C>,
    options?: TOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValue: F.Narrow<C>,
    options?: TOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: F.Narrow<C> | (() => F.Narrow<C>),
    options?: TOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: F.Narrow<C> | (() => F.Narrow<C>),
    options?: TOptions
  ): TCatch<T, C> {
    return new TCatch({
      typeName: TTypeName.Catch,
      props: {
        underlying,
        getCatch: (isKindOf(catchValueOrGetter, ValueKind.Function)
          ? catchValueOrGetter
          : (): unknown => catchValueOrGetter) as () => C,
      },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTCatch = TCatch<AnyTType, any>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPipeline                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TPipelineDef<A extends AnyTType, B extends AnyTType> = MakeTDef<{
  $Out: OutputOf<B>;
  $In: InputOf<A>;
  $TypeName: "TPipeline";
  $Props: { readonly from: A; readonly to: B };
}>;

export class TPipeline<A extends AnyTType, B extends AnyTType> extends TType<TPipelineDef<A, B>> {
  _parse(ctx: TParseContext<this>) {
    if (ctx.common.async) {
      return this.from._parseAsync(ctx.child(this.from, ctx.data)).then((fromResult) => {
        if (!fromResult.ok) {
          return ctx.return();
        }

        return this.to._parseAsync(ctx.child(this.to, fromResult.data));
      });
    }

    const fromResult = this.from._parseSync(ctx.child(this.from, ctx.data));
    if (!fromResult.ok) {
      return ctx.return();
    }

    return this.to._parseSync(ctx.child(this.to, fromResult.data));
  }

  get from(): A {
    return this.props.from;
  }

  get to(): B {
    return this.props.to;
  }

  static create<
    A,
    B,
    C,
    T extends TType<Merge<AnyTDef, { $Out: B; $In: A }>>,
    U extends TType<Merge<AnyTDef, { $Out: C; $In: B }>>
  >(from: T, to: U, options?: TOptions): TPipeline<T, U> {
    return new TPipeline({ typeName: TTypeName.Pipeline, props: { from, to }, options: processCreateOptions(options) });
  }
}

export type AnyTPipeline = TPipeline<AnyTType, AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

type _FlattenMembers<T extends readonly AnyTType[], TN extends "TUnion" | "TIntersection"> = T extends readonly []
  ? []
  : T extends readonly [infer H extends AnyTType, ...infer R extends readonly AnyTType[]]
  ? H extends { readonly typeName: TN; readonly types: infer U extends readonly AnyTType[] }
    ? [..._FlattenMembers<U, TN>, ..._FlattenMembers<R, TN>]
    : [H, ..._FlattenMembers<R, TN>]
  : T;

export type FlattenMembers<T extends readonly AnyTType[], TN extends "TUnion" | "TIntersection"> = Try<
  _FlattenMembers<T, TN>,
  AnyTType[],
  AnyTType[]
>;

function flattenMembers<T extends readonly AnyTType[], TN extends "TUnion" | "TIntersection">(
  m: T,
  tn: TN
): FlattenMembers<T, TN> {
  return m.flatMap((t) => (t.isT(tn) ? flattenMembers(t.types, tn) : [t]), []) as FlattenMembers<T, TN>;
}

export type TUnionOptions = TOptions<{ issueKinds: ["union.invalid"] }>;

export type TUnionDef<T extends readonly AnyTType[]> = MakeTDef<{
  $Out: OutputOf<T[number]>;
  $In: InputOf<T[number]>;
  $TypeName: "TUnion";
  $Props: { readonly types: T };
  $Options: TUnionOptions;
}>;

export class TUnion<T extends readonly AnyTType[]> extends TType<TUnionDef<T>> {
  get _spec() {
    return utils.asConst({
      types: utils.mapProp(this.props.types, "manifest"),
      optional: this.props.types.some((t) => t.isOptional),
      nullable: this.props.types.some((t) => t.isNullable),
      readonly: false,
    });
  }

  _parse(ctx: TParseContext<this>): TParseResultOf<this> {
    const members = flattenMembers(this.types, TTypeName.Union);

    const errors: TError[] = [];

    if (ctx.common.async) {
      return Promise.all(members.map(async (m, i) => m._parseAsync(ctx.clone(m, ctx.data, ["options", i])))).then(
        (results) => {
          for (const res of results) {
            if (res.ok) {
              return ctx.return(res.data);
            }

            res.warnings?.forEach((w) => ctx.addWarning(w));
            errors.push(res.error);
          }

          return ctx
            .addIssue(
              { kind: TIssueKind.Union.Invalid, payload: { errors } },
              this.options.messages[TIssueKind.Union.Invalid]
            )
            .return();
        }
      );
    }

    for (const [i, m] of members.entries()) {
      const res = m._parseSync(ctx.clone(m, ctx.data, ["options", i]));

      if (res.ok) {
        return ctx.return(res.data);
      }

      res.warnings?.forEach((w) => ctx.addWarning(w));
      errors.push(res.error);
    }

    return ctx
      .addIssue(
        { kind: TIssueKind.Union.Invalid, payload: { errors } },
        this.options.messages[TIssueKind.Union.Invalid]
      )
      .return();
  }

  get types(): T {
    return this.props.types;
  }

  flatten(): TUnion<FlattenMembers<T, "TUnion">> {
    return TUnion._create(flattenMembers(this.types, TTypeName.Union), this.options);
  }

  map<U extends AnyTType>(fn: (type: T[number], index: number) => U): TUnion<{ [K in keyof T]: U }> {
    return new TUnion<{ [K in keyof T]: U }>({
      ...this._def,
      props: { ...this._def.props, types: this.types.map((t, idx) => fn(t, idx)) as { [K in keyof T]: U } },
    });
  }

  toIntersection(): TIntersection<T> {
    return TIntersection._create(this.types, this.options);
  }

  static create<T extends AtLeastTwo<AnyTType>>(types: T, options?: TUnionOptions): TUnion<T> {
    return TUnion._create(types, options);
  }

  static _create<T extends readonly AnyTType[]>(types: T, options: TUnionOptions | undefined): TUnion<T> {
    return new TUnion({ typeName: TTypeName.Union, props: { types }, options: processCreateOptions(options) });
  }
}

export type AnyTUnion = TUnion<AnyTType[]>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TIntersection                                                   */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TIntersectionIO<T extends readonly AnyTType[], IO extends "$O" | "$I" = "$O"> = T extends readonly []
  ? unknown
  : T extends readonly [infer H extends AnyTType, ...infer R extends readonly AnyTType[]]
  ? H[IO] & TIntersectionIO<R, IO>
  : never;

export type TIntersectionOptions = TOptions<{ issueKinds: ["intersection.invalid"] }>;

export type TIntersectionDef<T extends readonly AnyTType[]> = MakeTDef<{
  $Out: TIntersectionIO<T>;
  $In: TIntersectionIO<T, "$I">;
  $TypeName: "TIntersection";
  $Props: { readonly types: T };
  $Options: TIntersectionOptions;
}>;

export class TIntersection<T extends readonly AnyTType[]> extends TType<TIntersectionDef<T>> {
  get _spec() {
    return utils.asConst({
      types: utils.mapProp(this.props.types, "manifest"),
      optional: this.props.types.every((t) => t.isOptional),
      nullable: this.props.types.every((t) => t.isNullable),
      readonly: false,
    });
  }

  _parse(ctx: TParseContext<this>): TParseResultOf<this> {
    const members = flattenMembers(this.types, TTypeName.Intersection);

    const errors: TError[] = [];

    const terminate = () =>
      ctx
        .addIssue(
          { kind: TIssueKind.Intersection.Invalid, payload: { errors } },
          this.options.messages[TIssueKind.Intersection.Invalid]
        )
        .return();

    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        for (const [i, m] of members.entries()) {
          const res = await m._parseAsync(ctx.clone(m, ctx.data, ["intersectees", i]));

          res.warnings?.forEach((w) => ctx.addWarning(w));

          if (res.ok) {
            ctx.setData(res.data);
            continue;
          }

          errors.push(res.error);

          if (ctx.common.abortEarly) {
            return terminate();
          }
        }

        if (errors.length > 0) {
          return terminate();
        }

        return ctx.return();
      });
    }

    for (const [i, m] of members.entries()) {
      const res = m._parseSync(ctx.clone(m, ctx.data, ["intersectees", i]));

      res.warnings?.forEach((w) => ctx.addWarning(w));

      if (res.ok) {
        ctx.setData(res.data);
        continue;
      }

      errors.push(res.error);

      if (ctx.common.abortEarly) {
        return terminate();
      }
    }

    if (errors.length > 0) {
      return terminate();
    }

    return ctx.return();
  }

  get types(): T {
    return this.props.types;
  }

  flatten(): TIntersection<FlattenMembers<T, "TIntersection">> {
    return TIntersection._create(flattenMembers(this.types, TTypeName.Intersection), this.options);
  }

  map<U extends AnyTType>(fn: (type: T[number], index: number) => U): TIntersection<{ [K in keyof T]: U }> {
    return new TIntersection<{ [K in keyof T]: U }>({
      ...this._def,
      props: { ...this._def.props, types: this.types.map((t, idx) => fn(t, idx)) as { [K in keyof T]: U } },
    });
  }

  toUnion(): TUnion<T> {
    return TUnion._create(this.types, this.options);
  }

  static create<T extends AtLeastTwo<AnyTType>>(types: T, options?: TIntersectionOptions): TIntersection<T> {
    return TIntersection._create(types, options);
  }

  static _create<T extends readonly AnyTType[]>(types: T, options: TIntersectionOptions | undefined): TIntersection<T> {
    return new TIntersection({
      typeName: TTypeName.Intersection,
      props: { types },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTIntersection = TIntersection<AnyTType[]>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TEffects                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TEffectKind = {
  Preprocess: "preprocess",
  Refinement: "refinement",
  Transform: "transform",
} as const;

export type TEffectKind = typeof TEffectKind[keyof typeof TEffectKind];

export type TEffectBase<K extends TEffectKind> = {
  readonly kind: K;
};

export type TEffectIssueData = utils.Simplify<
  TParseContextIssueData & { readonly message?: string; readonly params?: Readonly<Record<string, unknown>> }
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface TEffectCtx {
  readonly path: TParseContextPath;
  addIssue(issue: TEffectIssueData): this;
}

export type TPreprocessEffect<T extends AnyTType> = TEffectBase<"preprocess"> & {
  preprocess(data: unknown): InputOf<T>;
};

export type TRefinementEffect<T extends AnyTType> = TEffectBase<"refinement"> & {
  refine(data: OutputOf<T>, ctx: TEffectCtx): unknown;
};

export type TTransformEffect<T extends AnyTType, U> = TEffectBase<"transform"> & {
  transform(data: OutputOf<T>, ctx: TEffectCtx): U;
};

export type TEffect<T extends AnyTType = AnyTType, U = unknown> =
  | TPreprocessEffect<T>
  | TRefinementEffect<T>
  | TTransformEffect<T, U>;

export type TEffectsDef<T extends AnyTType, Out = OutputOf<T>, In = InputOf<T>> = MakeTDef<{
  $Out: Out;
  $In: In;
  $TypeName: "TEffects";
  $Props: { readonly underlying: T; readonly effect: TEffect<T> };
}>;

export class TEffects<T extends AnyTType, Out = OutputOf<T>, In = InputOf<T>> extends TType<TEffectsDef<T, Out, In>> {
  _parse(ctx: TParseContext<this>): TParseResultOf<this> {
    const { underlying, effect } = this.props;

    if (effect.kind === TEffectKind.Preprocess) {
      const processed = effect.preprocess(ctx.data);

      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (awaited) =>
          underlying._parseAsync(ctx.child(underlying, awaited))
        );
      }
      return underlying._parseSync(ctx.child(underlying, processed));
    }

    const effectCtx: TEffectCtx = {
      get path() {
        return ctx.path;
      },
      addIssue(issue) {
        ctx.addIssue(issue, issue.message);
        return this;
      },
    };

    effectCtx.addIssue = effectCtx.addIssue.bind(effectCtx);

    if (effect.kind === "refinement") {
      if (ctx.common.async) {
        return underlying._parseAsync(ctx.child(underlying, ctx.data)).then(async (underlyingRes) => {
          if (!underlyingRes.ok) {
            return underlyingRes;
          }

          const result = await effect.refine(underlyingRes.data, effectCtx);

          if (result) {
            return ctx.return(underlyingRes.data);
          }

          return ctx.return();
        });
      }
      const underlyingRes = underlying._parseSync(ctx.child(underlying, ctx.data));
      if (!underlyingRes.ok) {
        return underlyingRes;
      }

      const result = effect.refine(underlyingRes.data, effectCtx);

      if (isKindOf(result, ValueKind.Promise)) {
        throw new Error(
          "Async refinement encountered during synchronous parse operation. Use `.parseAsync()` instead."
        );
      }

      if (result) {
        return ctx.return(underlyingRes.data);
      }

      return ctx.return();
    }

    if (effect.kind === "transform") {
      if (ctx.common.async) {
        return underlying._parseAsync(ctx.child(underlying, ctx.data)).then((baseRes) => {
          if (!baseRes.ok) {
            return baseRes;
          }

          return Promise.resolve(effect.transform(baseRes.data, effectCtx)).then((finalRes) =>
            ctx.return(finalRes as Out)
          );
        });
      }
      const baseRes = underlying._parseSync(ctx.child(underlying, ctx.data));
      if (!baseRes.ok) {
        return baseRes;
      }

      const finalRes = effect.transform(baseRes.data, effectCtx);

      if (isKindOf(finalRes, ValueKind.Promise)) {
        throw new Error("Async transform encountered during synchronous parse operation. Use `.parseAsync()` instead.");
      }

      return ctx.return(finalRes as Out);
    }

    assertNever(effect);
  }

  get underlying(): T {
    return this.props.underlying;
  }

  get effect(): TEffect<T> {
    return this.props.effect;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TEffects"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Effects]);
  }
}

export type AnyTEffects = TEffects<AnyTType, unknown, unknown>;

/* --------------------------------------------------- TPreprocess -------------------------------------------------- */

export class TPreprocess<T extends AnyTType, U extends InputOf<T>> extends TEffects<T, OutputOf<T>, U> {
  static create<T extends AnyTType, U extends InputOf<T>>(
    type: T,
    preprocess: (data: unknown) => U,
    options?: TOptions
  ): TPreprocess<T, U> {
    return new TPreprocess({
      typeName: TTypeName.Effects,
      props: { underlying: type, effect: { kind: TEffectKind.Preprocess, preprocess } },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTPreprocess = TPreprocess<AnyTType, unknown>;

/* --------------------------------------------------- TRefinement -------------------------------------------------- */

export type TRefinementCustomIssueParams = {
  readonly fatal?: boolean;
  readonly message?: string;
  readonly params?: Record<string, unknown>;
  readonly path?: TParseContextPath;
};

export type TRefinementData<T extends AnyTType> = utils.Simplify<
  | string
  | TEffectIssueData
  | TRefinementCustomIssueParams
  | ((data: OutputOf<T>, ctx: TEffectCtx) => string | TEffectIssueData | TRefinementCustomIssueParams)
  | undefined
>;

function getRefinementIssueProps<T extends AnyTType>(
  data: OutputOf<T>,
  ctx: TEffectCtx,
  refinementData: TRefinementData<T>
): TParseContextIssueData & { readonly message: string | undefined } {
  const refinementData_: TEffectIssueData | TRefinementCustomIssueParams = (() => {
    if (!refinementData || isKindOf(refinementData, ValueKind.String)) {
      return { message: refinementData };
    }
    if (isKindOf(refinementData, ValueKind.Function)) {
      const result = refinementData(data, ctx);
      if (isKindOf(result, ValueKind.String)) {
        return { message: result };
      }
      return result;
    }
    return refinementData;
  })();

  if (!("kind" in refinementData_)) {
    return {
      kind: TIssueKind.Custom.Invalid,
      message: refinementData_.message,
      ...(refinementData_.path && { path: refinementData_.path }),
      ...(refinementData_.fatal && { fatal: refinementData_.fatal }),
      ...(refinementData_.params && { payload: { params: refinementData_.params } }),
    };
  }

  return {
    ...(refinementData_ as TEffectIssueData),
    message: refinementData_.message,
  };
}

export class TRefinement<T extends AnyTType, U extends OutputOf<T>> extends TEffects<T, U, InputOf<T>> {
  static create<T extends AnyTType, U extends OutputOf<T>>(
    type: T,
    refinement: (data: OutputOf<T>, ctx: TEffectCtx) => unknown,
    refinementData?: TRefinementData<T>,
    options?: TOptions
  ): TRefinement<T, U> {
    return new TRefinement({
      typeName: TTypeName.Effects,
      props: {
        underlying: type,
        effect: {
          kind: TEffectKind.Refinement,
          refine(data, ctx) {
            const result = refinement(data, ctx);
            if (isKindOf(result, ValueKind.Promise)) {
              return result.then((res) => {
                if (!res) {
                  ctx.addIssue(getRefinementIssueProps(data, ctx, refinementData));
                  return false;
                }
                return true;
              });
            }
            if (!result) {
              ctx.addIssue(getRefinementIssueProps(data, ctx, refinementData));
              return false;
            }
            return true;
          },
        },
      },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTRefinement = TRefinement<AnyTType, any>;

/* --------------------------------------------------- TTransform --------------------------------------------------- */

export class TTransform<T extends AnyTType, U> extends TEffects<T, U, InputOf<T>> {
  static create<T extends AnyTType, U>(
    type: T,
    transform: (data: OutputOf<T>, ctx: TEffectCtx) => U,
    options?: TOptions
  ): TTransform<T, U> {
    return new TTransform({
      typeName: TTypeName.Effects,
      props: { underlying: type, effect: { kind: TEffectKind.Transform, transform } },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTTransform = TTransform<AnyTType, any>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TCustom                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TCustomDef<Out, In = Out> = MakeTDef<{
  $Out: Out;
  $In: In;
  $TypeName: "TCustom";
  $Props: { readonly parser: (ctx: TParseContext<TCustom<Out, In>>) => TParseResult<Out, In> };
}>;

export class TCustom<Out, In = Out> extends TType<TCustomDef<Out, In>> {
  _parse(ctx: TParseContext<this>): TParseResultOf<this> {
    return this.props.parser(ctx);
  }

  static create<Out, In = Out>(
    parser: (ctx: TParseContext<TCustom<Out, In>>) => TParseResult<Out, In>,
    options?: TOptions
  ): TCustom<Out, In> {
    return new TCustom<Out, In>({
      typeName: TTypeName.Custom,
      props: { parser },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTCustom = TCustom<any, any>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                         TIf                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TIfIO<
  C extends AnyTType,
  T extends AnyTType | null,
  E extends AnyTType | null,
  IO extends "$O" | "$I" = "$O"
> = T extends AnyTType ? (E extends AnyTType ? T[IO] | E[IO] : T[IO]) : E extends AnyTType ? E[IO] : C[IO];

export type TIfDef<C extends AnyTType, T extends AnyTType | null, E extends AnyTType | null> = MakeTDef<{
  $Out: TIfIO<C, T, E>;
  $In: TIfIO<C, T, E, "$I">;
  $TypeName: "TIf";
  $Props: { readonly condition: C; readonly then: T; readonly else: E };
}>;

export class TIf<C extends AnyTType, T extends AnyTType | null, E extends AnyTType | null> extends TType<
  TIfDef<C, T, E>
> {
  _parse(ctx: TParseContext<this>) {
    const { condition, then: tThen, else: tElse } = this.props;

    if (ctx.common.async) {
      return condition._parseAsync(ctx.clone(condition, ctx.data)).then((res) => {
        res.warnings?.forEach((w) => ctx.addWarning(w));
        if (res.ok) {
          if (tThen) {
            return tThen._parseAsync(ctx.child(tThen, ctx.data));
          }
          return ctx.return();
        }
        if (tElse) {
          return tElse._parseAsync(ctx.child(tElse, ctx.data));
        }
        return ctx.return();
      });
    }

    const res = condition._parseSync(ctx.clone(condition, ctx.data));
    res.warnings?.forEach((w) => ctx.addWarning(w));
    if (res.ok) {
      if (tThen) {
        return tThen._parseSync(ctx.child(tThen, ctx.data));
      }
      return ctx.return();
    }
    if (tElse) {
      return tElse._parseSync(ctx.child(tElse, ctx.data));
    }
    return ctx.return();
  }

  get condition(): C {
    return this.props.condition;
  }

  get then(): T {
    return this.props.then;
  }

  get else(): E {
    return this.props.else;
  }

  static create<C extends AnyTType, T extends TType<Merge<AnyTDef, { $In: OutputOf<C> }>>, E extends AnyTType>(
    condition: C,
    resolution: { then: T; else: E },
    options?: TOptions
  ): TIf<C, T, E>;
  static create<C extends AnyTType, T extends TType<Merge<AnyTDef, { $In: OutputOf<C> }>>>(
    condition: C,
    resolution: { then: T },
    options?: TOptions
  ): TIf<C, T, null>;
  static create<C extends AnyTType, E extends AnyTType>(
    condition: C,
    resolution: { else: E },
    options?: TOptions
  ): TIf<C, null, E>;
  static create<C extends AnyTType, T extends TType<Merge<AnyTDef, { $In: OutputOf<C> }>>, E extends AnyTType>(
    condition: C,
    resolution: { then?: T; else?: E },
    options?: TOptions
  ): TIf<C, T | null, E | null> {
    return new TIf({
      typeName: TTypeName.If,
      props: { condition, then: resolution.then ?? null, else: resolution.else ?? null },
      options: processCreateOptions(options),
    });
  }
}

export type AnyTIf = TIf<AnyTType, AnyTType | null, AnyTType | null>;

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

export type MaybeWithTOverride<T extends readonly unknown[]> = T | [TOverrideMarker, ...T] extends infer X ? X : never;

export const TMarkers = {
  override: TOverrideMarker,
} as const;

/* ------------------------------------------------------------------------------------------------------------------ */

export const anyType = TAny.create.bind(TAny);
export const arrayType = TArray.create.bind(TArray);
export const bigintType = TBigInt.create.bind(TBigInt);
export const booleanType = TBoolean.create.bind(TBoolean);
export const brandType = TBrand.create.bind(TBrand);
export const bufferType = TBuffer.create.bind(TBuffer);
export const castType = TCast;
export const catchType = TCatch.create.bind(TCatch);
export const coerceType = TCoerce;
export const customType = TCustom.create.bind(TCustom);
export const dateType = TDate.create.bind(TDate);
export const defaultType = TDefault.create.bind(TDefault);
export const definedType = TDefined.create.bind(TDefined);
export const enumType = TEnum.create.bind(TEnum);
export const falseType = TFalse.create.bind(TFalse);
export const ifType = TIf.create.bind(TIf);
export const instanceofType = TInstanceOf.create.bind(TInstanceOf);
export const intersectionType = TIntersection.create.bind(TIntersection);
export const lazyType = TLazy.create.bind(TLazy);
export const literalType = TLiteral.create.bind(TLiteral);
export const mapType = TMap.create.bind(TMap);
export const nanType = TNaN.create.bind(TNaN);
export const nativeEnumType = TNativeEnum.create.bind(TNativeEnum);
export const neverType = TNever.create.bind(TNever);
export const nonnullableType = TNonNullable.create.bind(TNonNullable);
export const nullableType = TNullable.create.bind(TNullable);
export const nullType = TNull.create.bind(TNull);
export const numberType = TNumber.create.bind(TNumber);
export const objectType = TObject.create.bind(TObject);
export const optionalType = TOptional.create.bind(TOptional);
export const pipelineType = TPipeline.create.bind(TPipeline);
export const preprocessType = TPreprocess.create.bind(TPreprocess);
export const promiseType = TPromise.create.bind(TPromise);
export const readonlyType = TReadonly.create.bind(TReadonly);
export const recordType = TRecord.create.bind(TRecord);
export const refinementType = TRefinement.create.bind(TRefinement);
export const setType = TSet.create.bind(TSet);
export const stringType = TString.create.bind(TString);
export const symbolType = TSymbol.create.bind(TSymbol);
export const transformType = TTransform.create.bind(TTransform);
export const trueType = TTrue.create.bind(TTrue);
export const tupleType = TTuple.create.bind(TTuple);
export const undefinedType = TUndefined.create.bind(TUndefined);
export const unionType = TUnion.create.bind(TUnion);
export const unknownType = TUnknown.create.bind(TUnknown);
export const voidType = TVoid.create.bind(TVoid);

export const markers = TMarkers;
export const overrideMarker: typeof TOverrideMarker = TMarkers.override;

export const global = () => TGlobal;

export {
  anyType as any,
  arrayType as array,
  bigintType as bigint,
  booleanType as boolean,
  brandType as brand,
  brandType as branded,
  bufferType as binary,
  bufferType as buffer,
  castType as cast,
  catchType as catch,
  coerceType as coerce,
  customType as custom,
  dateType as date,
  defaultType as def,
  definedType as defined,
  definedType as required,
  enumType as enum,
  falseType as false,
  ifType as conditional,
  ifType as if,
  instanceofType as instanceof,
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
  objectType as object,
  optionalType as optional,
  overrideMarker as override,
  pipelineType as pipe,
  pipelineType as pipeline,
  preprocessType as preprocess,
  promiseType as promise,
  readonlyType as readonly,
  recordType as record,
  refinementType as refine,
  refinementType as refinement,
  setType as set,
  stringType as string,
  symbolType as symbol,
  transformType as transform,
  trueType as true,
  tupleType as tuple,
  undefinedType as undefined,
  unionType as or,
  unionType as union,
  unknownType as unknown,
  voidType as void,
};

export type output<T extends AnyTType> = utils.SimplifyDeep<T["$O"]>;
export type input<T extends AnyTType> = utils.SimplifyDeep<T["$I"]>;
export type infer<T extends AnyTType> = output<T>;

export type inferFormattedError<T extends AnyTType> = TFormattedErrorOf<T>;
export type inferFlattenedError<T extends AnyTType> = TFlattenedErrorOf<T>;

export type paths<T extends AnyTType> = PathsOf<output<T>>;

export * from "./checks";
export * from "./error";
export * from "./issues";
export * from "./options";

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

export type UnwrapUntil<T extends AnyTType, TN extends TTypeName> = T extends {
  readonly typeName: TN;
}
  ? T
  : T extends { unwrap(): infer U }
  ? U extends AnyTType
    ? UnwrapUntil<U, TN>
    : T
  : T;

export function handleUnwrapUntil<T extends AnyTType, TN extends [TTypeName, ...TTypeName[]]>(
  t: T,
  tns: TN
): UnwrapUntil<T, TN[number]>;
export function handleUnwrapUntil<T extends AnyTType, TN extends [TTypeName, ...TTypeName[]]>(t: T, tns: TN) {
  let unwrapped: AnyTType = t;

  while (!tns.includes(unwrapped.typeName) && "unwrap" in unwrapped && typeof unwrapped.unwrap === "function") {
    unwrapped = unwrapped.unwrap() as AnyTType;
  }

  return unwrapped;
}

/* ------------------------------------------------------------------------------------------------------------------ */

type _DeepPartial<T extends AnyTType> = T extends AnyTOptional
  ? T
  : T extends TUnion<infer U>
  ? TOptional<TUnion<{ [K in keyof U]: _DeepPartial<U[K]> }>>
  : T extends TIntersection<infer U>
  ? TOptional<TIntersection<{ [K in keyof U]: _DeepPartial<U[K]> }>>
  : T extends TTuple<infer U, infer R>
  ? TOptional<TTuple<{ [K in keyof U]: _DeepPartial<U[K]> }, R extends AnyTType ? _DeepPartial<R> : R>>
  : T extends TMap<infer K, infer V>
  ? TOptional<TMap<_DeepPartial<K>, _DeepPartial<V>>>
  : T extends TArray<infer U, infer Card>
  ? TOptional<TArray<_DeepPartial<U>, Card>>
  : T extends TSet<infer U>
  ? TOptional<TSet<_DeepPartial<U>>>
  : T extends TRecord<infer K, infer V>
  ? TOptional<TRecord<K, _DeepPartial<V>>>
  : T extends TObject<infer S, infer U, infer C>
  ? TOptional<TObject<{ [K in keyof S]: _DeepPartial<S[K]> }, U, C>>
  : TOptional<T>;

export type DeepPartial<T extends AnyTType> = _DeepPartial<T>["underlying"];

function deepPartialify(t: AnyTType): AnyTOptional {
  if (t.isT(TTypeName.Optional)) {
    return t;
  }

  return (() => {
    if (t.isT(TTypeName.Array, TTypeName.Set, TTypeName.Union, TTypeName.Intersection)) {
      return t.map((v) => deepPartialify(v));
    }

    if (t.isT(TTypeName.Tuple)) {
      const deepPartialTuple = t.map((i) => deepPartialify(i));
      return t.restType ? deepPartialTuple.rest(deepPartialify(t.restType)) : deepPartialTuple;
    }

    if (t.isT(TTypeName.Record)) {
      return t.mapValues((v) => deepPartialify(v));
    }

    if (t.isT(TTypeName.Map)) {
      return t.mapKeys((k) => deepPartialify(k)).mapValues((v) => deepPartialify(v));
    }

    if (t.isT(TTypeName.Object)) {
      const deepPartialObject = TObject.create(
        Object.fromEntries(Object.entries<AnyTOptional>(t.props.shape).map(([k, v]) => [k, deepPartialify(v)] as const))
      );
      return t.props.unknownKeys
        ? deepPartialObject[t.props.unknownKeys]()
        : t.props.catchall
        ? deepPartialObject.catchall(t.props.catchall)
        : deepPartialObject;
    }

    return t;
  })().optional();
}

/* ------------------------------------------------------------------------------------------------------------------ */

type PathsOfArrayElement<T> =
  | `[${number}]`
  | (T extends utils.BuiltIn
      ? never
      : T extends readonly [unknown, ...unknown[]]
      ? `[${number}]${PathsOfTuple<T>}`
      : T extends ReadonlyArray<infer U>
      ? `[${number}]${PathsOfArrayElement<U>}`
      : T extends object
      ? `[${number}].${PathsOfObject<T>}`
      : never);

type PathsOfTuple<T extends readonly unknown[], _Acc extends readonly string[] = []> = T extends readonly []
  ? _Acc[number]
  : T extends readonly [infer H, ...infer R]
  ?
      | PathsOfTuple<R, [..._Acc, `[${_Acc["length"]}]`]>
      | (H extends utils.BuiltIn
          ? never
          : H extends readonly [unknown, ...unknown[]]
          ? `[${_Acc["length"]}]${PathsOfTuple<H>}`
          : H extends ReadonlyArray<infer U>
          ? `[${_Acc["length"]}]${PathsOfArrayElement<U>}`
          : H extends object
          ? `[${_Acc["length"]}].${PathsOfObject<H>}`
          : never)
  : PathsOfArrayElement<T[number]>;

type PathsOfObject<T extends object> = {
  [K in keyof T]:
    | K
    | (K extends string | number
        ? T[K] extends utils.BuiltIn
          ? never
          : T[K] extends readonly [unknown, ...unknown[]]
          ? `${K}${PathsOfTuple<T[K]>}`
          : T[K] extends ReadonlyArray<infer U>
          ? `${K}${PathsOfArrayElement<U>}`
          : T[K] extends object
          ? `${K}.${PathsOfObject<T[K]>}`
          : never
        : never);
}[keyof T] &
  string;

type PathsOf<T> = T extends unknown
  ? (
      T extends readonly [unknown, ...unknown[]]
        ? PathsOfTuple<T>
        : T extends ReadonlyArray<infer U>
        ? PathsOfArrayElement<U>
        : T extends object
        ? PathsOfObject<T>
        : never
    ) extends infer U
    ? U & {}
    : never
  : never;
