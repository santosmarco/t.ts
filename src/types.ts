import type * as tf from "type-fest";
import type { AnyBrandedTDef, CtorTDef, MakeTDef, RuntimeTDef } from "./def";
import type { DescriptiveWithValue, TRetrievableManifest } from "./manifest";
import type { TCreateOptions } from "./options";
import { ValueKind, cloneDeep, isKindOf } from "./utils";

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
  False: "TFalse",
  Intersection: "TIntersection",
  Lazy: "TLazy",
  NaN: "TNaN",
  Never: "TNever",
  NonNullable: "TNonNullable",
  Null: "TNull",
  Nullable: "TNullable",
  Number: "TNumber",
  Optional: "TOptional",
  Promise: "TPromise",
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

  protected readonly _def: RuntimeTDef<D>;

  protected constructor(def: CtorTDef<D>) {
    const { typeName, props = null, options, manifest = {} } = def;

    this._def = cloneDeep({ typeName, props, options, manifest });

    this.clone = this.clone.bind(this);
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
    this.label = this.label.bind(this);
    // Manifest
    this.title = this.title.bind(this);
    this.summary = this.summary.bind(this);
    this.description = this.description.bind(this);
    this.examples = this.examples.bind(this);
    this.tags = this.tags.bind(this);
    this.notes = this.notes.bind(this);
    this.unit = this.unit.bind(this);
    this.meta = this.meta.bind(this);
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

  get manifest(): TRetrievableManifest<D> {
    return { ...this.manifest, label: this.options.label };
  }

  clone(): this {
    return this._construct();
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  optional(): TOptional<this> {
    return TOptional.create(this, this.options);
  }

  nullable(): TNullable<this> {
    return TNullable.create(this, this.options);
  }

  nullish(): TOptional<TNullable<this>> {
    return this.nullable().optional();
  }

  defined(): TDefined<this> {
    return TDefined.create(this, this.options);
  }

  nonnullable(): TNonNullable<this> {
    return TNonNullable.create(this, this.options);
  }

  array(): TArray<this> {
    return TArray.create(this, this.options);
  }

  promise(): TPromise<this> {
    return TPromise.create(this, this.options);
  }

  promisable(): TUnion<[this, TPromise<this>]> {
    return this.or(this.promise());
  }

  or<T extends [AnyTType, ...AnyTType[]]>(...types: T): TUnion<[this, ...T]> {
    return TUnion._create([this, ...types], this.options);
  }

  and<T extends [AnyTType, ...AnyTType[]]>(...types: T): TIntersection<[this, ...T]> {
    return TIntersection._create([this, ...types], this.options);
  }

  default<D extends Exclude<this["$I"], undefined>>(getDefault: () => D): TDefault<this, D>;
  default<D extends Exclude<this["$I"], undefined>>(defaultValue: D): TDefault<this, D>;
  default<D extends Exclude<this["$I"], undefined>>(defaultValueOrGetter: D | (() => D)): TDefault<this, D> {
    return TDefault.create(this, defaultValueOrGetter, this.options);
  }

  catch<C extends this["$O"]>(getCatch: () => C): TCatch<this, C>;
  catch<C extends this["$O"]>(catchValue: C): TCatch<this, C>;
  catch<C extends this["$O"]>(catchValueOrGetter: C | (() => C)): TCatch<this, C> {
    return TCatch.create(this, catchValueOrGetter, this.options);
  }

  lazy(): TLazy<this> {
    return TLazy.create(() => this, this.options);
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  label(label: string): this {
    return this._construct({ ...this._def, options: { ...this.options, label } });
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  title(title: string): this {
    return this._construct({ ...this._def, manifest: { ...this.manifest, title } });
  }

  summary(summary: string): this {
    return this._construct({ ...this._def, manifest: { ...this.manifest, summary } });
  }

  description(description: string): this {
    return this._construct({ ...this._def, manifest: { ...this.manifest, description } });
  }

  examples(
    examples: tf.RequireAtLeastOne<{ in: DescriptiveWithValue<D["$In"]>[]; out: DescriptiveWithValue<D["$Out"]>[] }>
  ): this {
    return this._construct({
      ...this._def,
      manifest: {
        ...this.manifest,
        examples: {
          ...this.manifest.examples,
          ...(examples.in && { in: [...(this.manifest.examples?.in ?? []), ...examples.in] }),
          ...(examples.out && { out: [...(this.manifest.examples?.out ?? []), ...examples.out] }),
        },
      },
    });
  }

  tags(...tags: (string | DescriptiveWithValue<string>)[]) {
    return this._construct({
      ...this._def,
      manifest: {
        ...this.manifest,
        tags: [...(this.manifest.tags ?? []), ...tags.map((tag) => (typeof tag === "string" ? { value: tag } : tag))],
      },
    });
  }

  notes(...notes: (string | DescriptiveWithValue<string>)[]) {
    return this._construct({
      ...this._def,
      manifest: {
        ...this.manifest,
        notes: [
          ...(this.manifest.notes ?? []),
          ...notes.map((tag) => (typeof tag === "string" ? { value: tag } : tag)),
        ],
      },
    });
  }

  unit(unit: string | DescriptiveWithValue<string>) {
    return this._construct({
      ...this._def,
      manifest: { ...this.manifest, unit: typeof unit === "string" ? { value: unit } : unit },
    });
  }

  meta(meta: Record<string, unknown>, options = { overwrite: false }) {
    return this._construct({
      ...this._def,
      manifest: { ...this.manifest, meta: options.overwrite ? meta : { ...this.manifest.meta, ...meta } },
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  protected _construct(def?: tf.Except<RuntimeTDef<D>, "typeName">): this {
    return Reflect.construct<[def: RuntimeTDef<D>], this>(this.constructor as new (def: RuntimeTDef<D>) => this, [
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
  static create(options?: TCreateOptions): TAny {
    return new TAny({
      typeName: TTypeName.Any,
      options: { ...options },
    });
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
  static create(options?: TCreateOptions): TUnknown {
    return new TUnknown({
      typeName: TTypeName.Unknown,
      options: { ...options },
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNever                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNeverDef = MakeTDef<{
  $Out: never;
  $TypeName: "TNever";
}>;

export class TNever extends TType<TNeverDef> {
  static create(options?: TCreateOptions): TNever {
    return new TNever({
      typeName: TTypeName.Never,
      options: { ...options },
    });
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
  static create(options?: TCreateOptions): TUndefined {
    return new TUndefined({
      typeName: TTypeName.Undefined,
      options: { ...options },
    });
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
  static create(options?: TCreateOptions): TVoid {
    return new TVoid({
      typeName: TTypeName.Void,
      options: { ...options },
    });
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
  static create(options?: TCreateOptions): TNull {
    return new TNull({
      typeName: TTypeName.Null,
      options: { ...options },
    });
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
  coerce<C extends TStringCoercion = true>(value = true as C): TString<C> {
    return new TString<C>({
      ...this._def,
      props: { ...this.props, coercion: value },
    });
  }

  static create(options?: TCreateOptions): TString {
    return new TString({
      typeName: TTypeName.String,
      props: { coercion: false },
      options: { ...options },
    });
  }
}

export type AnyTString = TString<TStringCoercion>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNumberCoercion = boolean | "string" | "bigint";
export type TNumberCasting = false | "string" | "bigint";

export type TNumberDef<Co extends TNumberCoercion, Ca extends TNumberCasting> = MakeTDef<{
  $Out: Ca extends "string" ? string : Ca extends "bigint" ? bigint : number;
  $In: Co extends true ? any : Co extends "string" ? string | number : Co extends "bigint" ? bigint | number : number;
  $TypeName: "TNumber";
  $Props: { readonly coercion: Co; readonly casting: Ca };
}>;

export class TNumber<Co extends TNumberCoercion = false, Ca extends TNumberCasting = false> extends TType<
  TNumberDef<Co, Ca>
> {
  coerce<C extends TNumberCoercion = true>(value = true as C): TNumber<C, Ca> {
    return new TNumber<C, Ca>({
      ...this._def,
      props: { ...this.props, coercion: value },
    });
  }

  cast<C extends TNumberCasting = "string">(value = "string" as C): TNumber<Co, C> {
    return new TNumber<Co, C>({
      ...this._def,
      props: { ...this.props, casting: value },
    });
  }

  static create(options?: TCreateOptions): TNumber {
    return new TNumber({
      typeName: TTypeName.Number,
      props: { coercion: false, casting: false },
      options: { ...options },
    });
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
  static create(options?: TCreateOptions): TNaN {
    return new TNaN({
      typeName: TTypeName.NaN,
      options: { ...options },
    });
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
  static create(options?: TCreateOptions): TBigInt {
    return new TBigInt({
      typeName: TTypeName.BigInt,
      options: { ...options },
    });
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
  true(): TTrue {
    return TTrue.create(this.options);
  }

  false(): TFalse {
    return TFalse.create(this.options);
  }

  static create(options?: TCreateOptions): TBoolean {
    return new TBoolean({
      typeName: TTypeName.Boolean,
      options: { ...options },
    });
  }
}

/* ------------------------------------------------------ TTrue ----------------------------------------------------- */

export type TTrueDef = MakeTDef<{
  $Out: true;
  $TypeName: "TTrue";
}>;

export class TTrue extends TType<TTrueDef> {
  static create(options?: TCreateOptions): TTrue {
    return new TTrue({
      typeName: TTypeName.True,
      options: { ...options },
    });
  }
}

/* ----------------------------------------------------- TFalse ----------------------------------------------------- */

export type TFalseDef = MakeTDef<{
  $Out: false;
  $TypeName: "TFalse";
}>;

export class TFalse extends TType<TFalseDef> {
  static create(options?: TCreateOptions): TFalse {
    return new TFalse({
      typeName: TTypeName.False,
      options: { ...options },
    });
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
  static create(options?: TCreateOptions): TDate {
    return new TDate({
      typeName: TTypeName.Date,
      options: { ...options },
    });
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
  static create(options?: TCreateOptions): TSymbol {
    return new TSymbol({
      typeName: TTypeName.Symbol,
      options: { ...options },
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TArray                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TArrayCardinality = "many" | "atleastone";

export type TArrayIO<T extends AnyTType, Card extends TArrayCardinality, IO extends "$O" | "$I" = "$O"> = tf.Simplify<
  { many: T[IO][]; atleastone: [T[IO], ...T[IO][]] }[Card]
>;

export type TArrayDef<T extends AnyTType, Card extends TArrayCardinality> = MakeTDef<{
  $Out: TArrayIO<T, Card>;
  $In: TArrayIO<T, Card, "$I">;
  $TypeName: "TArray";
  $Props: { readonly element: T };
}>;

export class TArray<T extends AnyTType, Card extends TArrayCardinality = "many"> extends TType<TArrayDef<T, Card>> {
  get element(): T {
    return this.props.element;
  }

  unwrap(): T {
    return this.element;
  }

  map<U extends AnyTType>(fn: (element: T) => U): TArray<U, Card> {
    return new TArray<U, Card>({
      ...this._def,
      props: { ...this.props, element: fn(this.element) },
    });
  }

  sparse(enabled?: true): TArray<TOptional<T>, Card>;
  sparse(enabled: false): TArray<TDefined<T>, Card>;
  sparse(enabled?: boolean) {
    return this.map((e) => (enabled ? e.optional() : e.defined()));
  }

  partial(): TArray<TOptional<T>, Card> {
    return this.sparse(true);
  }

  required(): TArray<TDefined<T>, Card> {
    return this.sparse(false);
  }

  concat<U extends AnyTArray>(other: U): TArray<TUnion<[T, U["element"]]>, Card> {
    return this.map((e) => e.or(other.unwrap()));
  }

  static create = Object.assign(TArray._create, {
    of<T extends AnyTType>(element: T): TArray<T> {
      return TArray._create(element);
    },
  });

  private static _create<T extends AnyTType>(element: T, options?: TCreateOptions): TArray<T> {
    return new TArray({
      typeName: TTypeName.Array,
      props: { element },
      options: { ...options },
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
}>;

export class TSet<T extends AnyTType> extends TType<TSetDef<T>> {
  get element(): T {
    return this.props.element;
  }

  unwrap(): T {
    return this.element;
  }

  map<U extends AnyTType>(fn: (element: T) => U): TSet<U> {
    return new TSet<U>({
      ...this._def,
      props: { ...this.props, element: fn(this.element) },
    });
  }

  sparse(enabled?: true): TSet<TOptional<T>>;
  sparse(enabled: false): TSet<TDefined<T>>;
  sparse(enabled?: boolean) {
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

  private static _create<T extends AnyTType>(element: T, options?: TCreateOptions): TSet<T> {
    return new TSet({
      typeName: TTypeName.Set,
      props: { element },
      options: { ...options },
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
}>;

export class TBuffer extends TType<TBufferDef> {
  static create(options?: TCreateOptions): TBuffer {
    return new TBuffer({
      typeName: TTypeName.Buffer,
      options: { ...options },
    });
  }
}

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

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TPromise<T> {
    return new TPromise({
      typeName: TTypeName.Promise,
      props: { underlying },
      options: { ...options },
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

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TOptional<T> {
    return new TOptional({
      typeName: TTypeName.Optional,
      props: { underlying },
      options: { ...options },
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

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TNullable<T> {
    return new TNullable({
      typeName: TTypeName.Nullable,
      props: { underlying },
      options: { ...options },
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
  get underlying(): T {
    return this.props.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TDefined"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Defined]);
  }

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TDefined<T> {
    return new TDefined({
      typeName: TTypeName.Defined,
      props: { underlying },
      options: { ...options },
    });
  }
}

export type AnyTDefined = TDefined<AnyTType>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TNonNullable                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNonNullableDef<T extends AnyTType> = MakeTDef<{
  $Out: Exclude<OutputOf<T>, null | undefined>;
  $In: Exclude<InputOf<T>, null | undefined>;
  $TypeName: "TNonNullable";
  $Props: { readonly underlying: T };
}>;

export class TNonNullable<T extends AnyTType> extends TType<TNonNullableDef<T>> {
  get underlying(): T {
    return this.props.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TNonNullable"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.NonNullable]);
  }

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TNonNullable<T> {
    return new TNonNullable({
      typeName: TTypeName.NonNullable,
      props: { underlying },
      options: { ...options },
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
  $Props: { readonly getUnderlying: () => T };
}>;

export class TLazy<T extends AnyTType> extends TType<TLazyDef<T>> {
  get underlying(): T {
    return this.props.getUnderlying();
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, "TLazy"> {
    return handleUnwrapDeep(this.underlying, [TTypeName.Lazy]);
  }

  static create<T extends AnyTType>(getType: () => T, options?: TCreateOptions): TLazy<T> {
    return new TLazy({
      typeName: TTypeName.Lazy,
      props: { getUnderlying: getType },
      options: { ...options },
    });
  }
}

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
    options?: TCreateOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValue: D,
    options?: TCreateOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: TCreateOptions
  ): TDefault<T, D>;
  static create<T extends AnyTType, D extends Exclude<InputOf<T>, undefined>>(
    underlying: T,
    defaultValueOrGetter: D | (() => D),
    options?: TCreateOptions
  ): TDefault<T, D> {
    return new TDefault({
      typeName: TTypeName.Default,
      props: {
        underlying,
        getDefault: isKindOf(defaultValueOrGetter, ValueKind.Function)
          ? defaultValueOrGetter
          : () => defaultValueOrGetter,
      },
      options: { ...options },
    });
  }
}

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
    options?: TCreateOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValue: C,
    options?: TCreateOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: TCreateOptions
  ): TCatch<T, C>;
  static create<T extends AnyTType, C extends OutputOf<T>>(
    underlying: T,
    catchValueOrGetter: C | (() => C),
    options?: TCreateOptions
  ): TCatch<T, C> {
    return new TCatch({
      typeName: TTypeName.Catch,
      props: {
        underlying,
        getCatch: isKindOf(catchValueOrGetter, ValueKind.Function) ? catchValueOrGetter : () => catchValueOrGetter,
      },
      options: { ...options },
    });
  }
}

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

  static create<T extends [AnyTType, AnyTType, ...AnyTType[]]>(types: T, options?: TCreateOptions): TUnion<T> {
    return this._create(types, options);
  }

  static _create<T extends AnyTType[]>(types: T, options: TCreateOptions | undefined): TUnion<T> {
    return new TUnion({
      typeName: TTypeName.Union,
      props: { types },
      options: { ...options },
    });
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

  static create<T extends [AnyTType, AnyTType, ...AnyTType[]]>(types: T, options?: TCreateOptions): TIntersection<T> {
    return this._create(types, options);
  }

  static _create<T extends AnyTType[]>(types: T, options: TCreateOptions | undefined): TIntersection<T> {
    return new TIntersection({
      typeName: TTypeName.Intersection,
      props: { types },
      options: { ...options },
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
export const falseType = TFalse.create;
export const intersectionType = TIntersection.create;
export const lazyType = TLazy.create;
export const nanType = TNaN.create;
export const neverType = TNever.create;
export const nonnullableType = TNonNullable.create;
export const nullableType = TNullable.create;
export const nullType = TNull.create;
export const numberType = TNumber.create;
export const optionalType = TOptional.create;
export const promiseType = TPromise.create;
export const setType = TSet.create;
export const stringType = TString.create;
export const symbolType = TSymbol.create;
export const trueType = TTrue.create;
export const undefinedType = TUndefined.create;
export const unionType = TUnion.create;
export const unknownType = TUnknown.create;
export const voidType = TVoid.create;

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
  falseType as false,
  intersectionType as and,
  intersectionType as intersection,
  lazyType as lazy,
  nanType as nan,
  neverType as never,
  nonnullableType as nonnullable,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  optionalType as optional,
  promiseType as promise,
  setType as set,
  stringType as string,
  symbolType as symbol,
  trueType as true,
  undefinedType as undefined,
  unionType as or,
  unionType as union,
  unknownType as unknown,
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
  let unwrapped = t;

  while (tns.includes(unwrapped.typeName) && "unwrap" in unwrapped && typeof unwrapped.unwrap === "function") {
    unwrapped = unwrapped.unwrap();
  }

  return unwrapped as UnwrapDeep<T, TN[number]>;
}
