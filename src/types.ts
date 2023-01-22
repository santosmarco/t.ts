import type * as tf from "type-fest";
import type { AnyBrandedTDef, CtorTDef, MakeTDef, RuntimeTDef } from "./def";
import { DescriptiveWithValue, TRetrievableManifest } from "./manifest";
import type { TCreateOptions } from "./options";
import { cu } from "./utils";

export const TTypeName = {
  Array: "TArray",
  Defined: "TDefined",
  Intersection: "TIntersection",
  NonNullable: "TNonNullable",
  Nullable: "TNullable",
  Optional: "TOptional",
  String: "TString",
  Union: "TUnion",
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

    this._def = cu.cloneDeep({ typeName, props, options, manifest });

    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.defined = this.defined.bind(this);
    this.nonnullable = this.nonnullable.bind(this);
    this.array = this.array.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    // Options
    this.label = this.label.bind(this);
    // Manifest
    this.title = this.title.bind(this);
    this.summary = this.summary.bind(this);
    this.description = this.description.bind(this);
    this.examples = this.examples.bind(this);
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
    return { ...this._def.manifest, label: this._def.options.label };
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  optional(): TOptional<this> {
    return TOptional.create(this, this._def.options);
  }

  nullable(): TNullable<this> {
    return TNullable.create(this, this._def.options);
  }

  nullish(): TOptional<TNullable<this>> {
    return this.nullable().optional();
  }

  defined(): TDefined<this> {
    return TDefined.create(this, this._def.options);
  }

  nonnullable(): TNonNullable<this> {
    return TNonNullable.create(this, this._def.options);
  }

  array(): TArray<this> {
    return TArray.create(this, this._def.options);
  }

  or<T extends [AnyTType, ...AnyTType[]]>(...types: T): TUnion<[this, ...T]> {
    return TUnion._create([this, ...types], this._def.options);
  }

  and<T extends [AnyTType, ...AnyTType[]]>(...types: T): TIntersection<[this, ...T]> {
    return TIntersection._create([this, ...types], this._def.options);
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  label(label: string): this {
    return this._construct({ ...this._def, options: { ...this._def.options, label } });
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
    examples: tf.RequireAtLeastOne<{ in: DescriptiveWithValue<D["$In"]>[]; out: DescriptiveWithValue<D["$Out"]>[] }>
  ): this {
    return this._construct({
      ...this._def,
      manifest: { ...this._def.manifest, examples: { ...this._def.manifest.examples, ...examples } },
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------- */

  protected _construct(def: tf.Except<RuntimeTDef<D>, "typeName">): this {
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
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TStringDef = MakeTDef<{
  $Out: string;
  $TypeName: "TString";
}>;

export class TString extends TType<TStringDef> {
  static create(options?: TCreateOptions): TString {
    return new TString({
      typeName: TTypeName.String,
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

/* ------------------------------------------------------------------------------------------------------------------ */

export const arrayType = TArray.create;
export const definedType = TDefined.create;
export const intersectionType = TIntersection.create;
export const nonnullableType = TNonNullable.create;
export const nullableType = TNullable.create;
export const optionalType = TOptional.create;
export const stringType = TString.create;
export const unionType = TUnion.create;

export {
  arrayType as array,
  definedType as defined,
  intersectionType as and,
  intersectionType as intersection,
  nonnullableType as nonnullable,
  nullableType as nullable,
  optionalType as optional,
  stringType as string,
  unionType as or,
  unionType as union,
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
