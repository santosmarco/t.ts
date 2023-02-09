import { nanoid } from "nanoid";
import { AnyTDef, InternalTDef, TDef, TDefInput } from "./def";
import { TIssueKind } from "./error";
import {
  TCreateOptions,
  TOptions,
  TParseOptions,
  TProcessedOptions,
  processCreateOptions,
  processParseOptions,
} from "./options";
import { TParseContext, TParseContextOf, TParseResult, TParseResultOf, TParseResultSyncOf } from "./parse";
import { TSpec } from "./spec";
import { TTypeName } from "./typeNames";
import { ValueKind, _, kindOf, printValue } from "./utils";

export const tt = Symbol("tt");
export type tt = typeof tt;

export abstract class TType<Out, Def extends AnyTDef, In = Out> {
  declare readonly $O: Out;
  declare readonly $I: In;

  protected readonly _def: InternalTDef<Def>;

  abstract get _hint(): string;
  abstract get _spec(): TSpec;

  abstract _parse(ctx: TParseContextOf<this>): TParseResultOf<this>;

  constructor(def: TDefInput<Def>) {
    this._def = { ...def, id: nanoid() };

    this.clone = this.clone.bind(this);
    this._parse = this._parse.bind(this);
    this._parseSync = this._parseSync.bind(this);
    this._parseAsync = this._parseAsync.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parse = this.parse.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.defined = this.defined.bind(this);
    this.nonnullable = this.nonnullable.bind(this);
    this.or = this.or.bind(this);
    this.promise = this.promise.bind(this);
    this.promisable = this.promisable.bind(this);
  }

  get id(): string {
    return this._def.id;
  }

  get typeName(): Def["typeName"] {
    return this._def.typeName;
  }

  get options(): _.Simplify<_.UNBRANDED<TProcessedOptions<Def["options"]>>> {
    return this._def.options;
  }

  get hint(): string {
    return this._hint;
  }

  get spec(): TSpec {
    return this._spec;
  }

  clone(): this {
    return this._construct();
  }

  _parseSync(ctx: TParseContextOf<this>): TParseResultSyncOf<this> {
    const result = this._parse(ctx);

    if (result instanceof Promise) {
      throw new Error("Synchronous parse encountered Promise. Use `.parseAsync()`/`.safeParseAsync()` instead.");
    }

    return result;
  }

  async _parseAsync(ctx: TParseContextOf<this>): Promise<TParseResultSyncOf<this>> {
    return Promise.resolve(this._parse(ctx));
  }

  safeParse<Ctx extends Record<string, unknown> = never>(
    data: unknown,
    options?: TParseOptions<Ctx>
  ): TParseResultSyncOf<this> {
    const result = this._parseSync(
      TParseContext.createSync(this, data, processParseOptions(this._def.options, options))
    );

    return result;
  }

  parse<Ctx extends Record<string, unknown> = never>(data: unknown, options?: TParseOptions<Ctx>): this["$O"] {
    const result = this.safeParse(data, options);

    if (!result.ok) {
      throw result.error;
    }

    return result.data;
  }

  async safeParseAsync<Ctx extends Record<string, unknown> = never>(
    data: unknown,
    options?: TParseOptions<Ctx>
  ): Promise<TParseResultSyncOf<this>> {
    const result = this._parseAsync(
      TParseContext.createAsync(this, data, processParseOptions(this._def.options, options))
    );

    return result;
  }

  async parseAsync<Ctx extends Record<string, unknown> = never>(
    data: unknown,
    options?: TParseOptions<Ctx>
  ): Promise<this["$O"]> {
    const result = await this.safeParseAsync(data, options);

    if (!result.ok) {
      throw result.error;
    }

    return result.data;
  }

  optional(): TOptional<this> {
    return TOptional.create(this);
  }

  nullable(): TNullable<this> {
    return TNullable.create(this);
  }

  nullish(): TOptional<TNullable<this>> {
    return this.nullable().optional();
  }

  defined(): TDefined<this> {
    return TDefined.create(this);
  }

  nonnullable(options?: TCreateOptions<TNonNullableOptions>): TNonNullable<this> {
    return TNonNullable.create(this, options);
  }

  not<T extends this["$I"], Forbidden extends T | readonly [T, ...T[]]>(
    values: _.Narrow<Forbidden>,
    options?: TCreateOptions<TNotOptions>
  ): TNot<this, Forbidden> {
    return TNot.create(this, values, options);
  }

  or<T extends readonly [AnyTType, ...AnyTType[]]>(...alternatives: T): TUnion<[this, ...T]> {
    return TUnion._create([this, ...alternatives], undefined);
  }

  promise(): TPromise<this> {
    return TPromise.create(this);
  }

  promisable(): TUnion<[this, TPromise<this>]> {
    return this.or(this.promise());
  }

  get isOptional() {
    return this.spec.optional;
  }

  get isNullable() {
    return this.spec.nullable;
  }

  get isNullish() {
    return this.isOptional && this.isNullable;
  }

  get isRequired() {
    return !this.isOptional;
  }

  get isReadonly() {
    return "readonly" in this.spec && this.spec["readonly"];
  }

  protected _construct(def?: Partial<TDefInput<Def>>) {
    return Reflect.construct<[def: TDefInput<Def>], this>(this.constructor as new (def: TDefInput<Def>) => this, [
      { ...this._def, ...def },
    ]);
  }

  get [tt]() {
    return _.asConst(true);
  }
}

export type AnyTType<Out = unknown, In = unknown> = TType<Out, any, In>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TAnyDef extends TDef<TTypeName.Any> {}

export class TAny extends TType<any, TAnyDef> {
  get _hint() {
    return "any";
  }

  get _spec() {
    return {
      optional: true,
      nullable: true,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.return(ctx.data);
  }

  static create(options?: TCreateOptions): TAny {
    return new TAny({
      typeName: TTypeName.Any,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TUnknown                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUnknownDef extends TDef<TTypeName.Unknown> {}

export class TUnknown extends TType<unknown, TUnknownDef> {
  get _hint() {
    return "unknown";
  }

  get _spec() {
    return {
      optional: true,
      nullable: true,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.return(ctx.data);
  }

  static create(options?: TCreateOptions): TUnknown {
    return new TUnknown({
      typeName: TTypeName.Unknown,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNever                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNeverOptions = TOptions<[TIssueKind.Base.Forbidden]>;

export interface TNeverDef extends TDef<TTypeName.Never> {
  readonly options: TNeverOptions;
}

export class TNever extends TType<never, TNeverDef> {
  get _hint() {
    return "never";
  }

  get _spec() {
    return {
      forbidden: true,
      optional: false,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx
      .addIssue({ kind: TIssueKind.Base.Forbidden, payload: {} }, this.options.messages[TIssueKind.Base.Forbidden])
      .return();
  }

  static create(options?: TCreateOptions<TNeverOptions>): TNever {
    return new TNever({
      typeName: TTypeName.Never,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNull                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNullDef extends TDef<TTypeName.Null> {}

export class TNull extends TType<null, TNullDef> {
  get _hint() {
    return "null";
  }

  get _spec() {
    return {
      optional: false,
      nullable: true,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.data === null ? ctx.return(ctx.data) : ctx.invalidType({ expected: ValueKind.Null }).return();
  }

  static create(options?: TCreateOptions): TNull {
    return new TNull({
      typeName: TTypeName.Null,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     TUndefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUndefinedDef extends TDef<TTypeName.Undefined> {}

export class TUndefined extends TType<undefined, TUndefinedDef> {
  get _hint() {
    return "undefined";
  }

  get _spec() {
    return {
      optional: true,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.data === undefined ? ctx.return(ctx.data) : ctx.invalidType({ expected: ValueKind.Undefined }).return();
  }

  static create(options?: TCreateOptions): TUndefined {
    return new TUndefined({
      typeName: TTypeName.Undefined,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TVoid                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TVoidDef extends TDef<TTypeName.Void> {}

export class TVoid extends TType<void, TVoidDef> {
  get _hint() {
    return "void";
  }

  get _spec() {
    return {
      optional: true,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.data === undefined ? ctx.return(ctx.data) : ctx.invalidType({ expected: ValueKind.Void }).return();
  }

  static create(options?: TCreateOptions): TVoid {
    return new TVoid({
      typeName: TTypeName.Void,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TString                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TStringDef extends TDef<TTypeName.String> {}

export class TString extends TType<string, TStringDef> {
  get _hint() {
    return "string";
  }

  get _spec() {
    return {
      optional: false,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    if (typeof ctx.data !== "string") {
      return ctx.invalidType({ expected: ValueKind.String }).return();
    }

    return ctx.return(ctx.data);
  }

  static create(options?: TCreateOptions): TString {
    return new TString({
      typeName: TTypeName.String,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TNumber                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNumberDef extends TDef<TTypeName.Number> {}

export class TNumber extends TType<number, TNumberDef> {
  get _hint() {
    return "number";
  }

  get _spec() {
    return {
      optional: false,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    if (typeof ctx.data !== "number") {
      return ctx.invalidType({ expected: ValueKind.Number }).return();
    }

    return ctx.return(ctx.data);
  }

  static create(options?: TCreateOptions): TNumber {
    return new TNumber({
      typeName: TTypeName.Number,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNaNDef extends TDef<TTypeName.NaN> {}

export class TNaN extends TType<number, TNaNDef> {
  get _hint() {
    return "NaN";
  }

  get _spec() {
    return {
      optional: false,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return typeof ctx.data === "number" && kindOf(ctx.data) === ValueKind.NaN
      ? ctx.return(ctx.data)
      : ctx.invalidType({ expected: ValueKind.NaN }).return();
  }

  static create(options?: TCreateOptions): TNaN {
    return new TNaN({
      typeName: TTypeName.NaN,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TBigInt                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBigIntDef extends TDef<TTypeName.BigInt> {}

export class TBigInt extends TType<bigint, TBigIntDef> {
  get _hint() {
    return "bigint";
  }

  get _spec() {
    return {
      optional: false,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    if (typeof ctx.data !== "bigint") {
      return ctx.invalidType({ expected: ValueKind.BigInt }).return();
    }

    return ctx.return(ctx.data);
  }

  static create(options?: TCreateOptions): TBigInt {
    return new TBigInt({
      typeName: TTypeName.BigInt,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TBoolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBooleanDef extends TDef<TTypeName.Boolean> {}

export class TBoolean extends TType<boolean, TBooleanDef> {
  get _hint() {
    return "boolean";
  }

  get _spec() {
    return {
      optional: false,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    if (typeof ctx.data !== "boolean") {
      return ctx.invalidType({ expected: ValueKind.Boolean }).return();
    }

    return ctx.return(ctx.data);
  }

  static create(options?: TCreateOptions): TBoolean {
    return new TBoolean({
      typeName: TTypeName.Boolean,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TSymbol                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSymbolDef extends TDef<TTypeName.Symbol> {}

export class TSymbol extends TType<symbol, TSymbolDef> {
  get _hint() {
    return "symbol";
  }

  get _spec() {
    return {
      optional: false,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return typeof ctx.data === "symbol"
      ? ctx.return(ctx.data)
      : ctx.invalidType({ expected: ValueKind.Symbol }).return();
  }

  static create(options?: TCreateOptions): TSymbol {
    return new TSymbol({
      typeName: TTypeName.Symbol,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TObject                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TObjectShape = Record<string, AnyTType>;
export type TObjectUnknownKeys = "passthrough" | "strict" | "strip";
export type TObjectKnownKeys = "passthrough" | "strict";

export type TObjectIO<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | null,
  KK extends TObjectKnownKeys,
  C extends AnyTType | null,
  IO extends "$O" | "$I" = "$O"
> = _.SimplifyDeep<
  _.EnforceOptional<{ [K in keyof S]: S[K][IO] }> &
    (C extends AnyTType
      ? Record<string, C[IO]>
      : UK extends "passthrough"
      ? Record<string, unknown>
      : UK extends "strict"
      ? Record<string, never>
      : unknown)
>;

export interface TObjectDef<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | null,
  KK extends TObjectKnownKeys,
  C extends AnyTType | null
> extends TDef<TTypeName.Object> {
  readonly shape: S;
  readonly unknownKeys: UK;
  readonly knownKeys: KK;
  readonly catchall: C;
}

export class TObject<
  S extends TObjectShape,
  UK extends TObjectUnknownKeys | null,
  KK extends TObjectKnownKeys,
  C extends AnyTType | null
> extends TType<TObjectIO<S, UK, KK, C, "$O">, TObjectDef<S, UK, KK, C>, TObjectIO<S, UK, KK, C, "$I">> {
  get _hint() {
    return `{ ${Object.entries(this.shape)
      .map(([k, v]) => {
        const hasQuestionMark =
          this._def.knownKeys === "strict"
            ? handleUnwrapUntil(v, [TTypeName.Optional]).isT(TTypeName.Optional)
            : v.isOptional;
        return `${v.isReadonly ? "readonly " : ""}${k}${hasQuestionMark ? "?" : ""}: ${v.hint}`;
      })
      .join("; ")}${
      this._def.catchall
        ? `; [x: string]: ${this._def.catchall.hint}`
        : this._def.unknownKeys === "passthrough"
        ? "; [x: string]: unknown"
        : this._def.unknownKeys === "strict"
        ? "; [x: string]: never"
        : ""
    } }`;
  }

  get shape() {
    return this._def.shape;
  }

  static readonly create = Object.freeze(
    Object.assign(TObject._makeCreate("strip"), {
      passthrough: TObject._makeCreate("passthrough"),
      strict: TObject._makeCreate("strict"),
      lazy: <S extends TObjectShape>(shape: () => S, options?: TCreateOptions) =>
        TObject._makeCreate("strip")(shape(), options),
    })
  );

  private static _makeCreate<UK extends TObjectUnknownKeys>(unknownKeys: UK) {
    return <S extends TObjectShape>(shape: S, options?: TCreateOptions): TObject<S, UK, "passthrough", null> =>
      new TObject({
        typeName: TTypeName.Object,
        options: processCreateOptions(options),
        shape,
        unknownKeys,
        knownKeys: "passthrough",
        catchall: null,
      });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */

export type UnwrapDeep<T extends AnyTType, TN extends TTypeName = TTypeName> = T extends {
  readonly typeName: TN;
  readonly underlying: infer U extends AnyTType;
}
  ? UnwrapDeep<U, TN>
  : T;

export interface TWrapper<T extends AnyTType, TN extends TTypeName> {
  readonly underlying: T;
  unwrap(): T;
  unwrapDeep(): UnwrapDeep<T, TN>;
  modify<U extends AnyTType>(fn: (underlying: T) => U): TWrapper<U, TN>;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptional                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TOptionalDef<T extends AnyTType> extends TDef<TTypeName.Optional> {
  readonly underlying: T;
}

export class TOptional<T extends AnyTType>
  extends TType<T["$O"] | undefined, TOptionalDef<T>, T["$I"] | undefined>
  implements TWrapper<T, TTypeName.Optional>
{
  get _hint() {
    if (this.isOptional && !(this.underlying instanceof TVoid)) {
      return this.underlying.hint;
    }

    return `${this.underlying.hint} | undefined`;
  }

  get _spec() {
    return {
      ...this.underlying.spec,
      optional: true,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.data === undefined ? ctx.return(ctx.data) : this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying(): T {
    return this._def.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Optional> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TOptional ? unwrapped.unwrapDeep() : unwrapped;
  }

  unwrapNullishDeep(): UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TOptional || unwrapped instanceof TNullable ? unwrapped.unwrapNullishDeep() : unwrapped;
  }

  modify<U extends AnyTType>(fn: (underlying: T) => U): TOptional<U> {
    return TOptional.create(fn(this.underlying), this.options);
  }

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TOptional<T> {
    return new TOptional({
      typeName: TTypeName.Optional,
      options: processCreateOptions(options),
      underlying,
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TNullable                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNullableDef<T extends AnyTType> extends TDef<TTypeName.Nullable> {
  readonly underlying: T;
}

export class TNullable<T extends AnyTType>
  extends TType<T["$O"] | null, TNullableDef<T>, T["$I"] | null>
  implements TWrapper<T, TTypeName.Nullable>
{
  get _hint() {
    if (this.isNullable) {
      return this.underlying.hint;
    }

    return `${this.underlying.hint} | null`;
  }

  get _spec() {
    return {
      ...this.underlying.spec,
      nullable: true,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.data === null ? ctx.return(ctx.data) : this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying(): T {
    return this._def.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Nullable> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TNullable ? unwrapped.unwrapDeep() : unwrapped;
  }

  unwrapNullishDeep(): UnwrapDeep<T, TTypeName.Optional | TTypeName.Nullable> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TOptional || unwrapped instanceof TNullable ? unwrapped.unwrapNullishDeep() : unwrapped;
  }

  modify<U extends AnyTType>(fn: (underlying: T) => U): TNullable<U> {
    return TNullable.create(fn(this.underlying), this.options);
  }

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TNullable<T> {
    return new TNullable({
      typeName: TTypeName.Nullable,
      options: processCreateOptions(options),
      underlying,
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TDefined                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDefinedDef<T extends AnyTType> extends TDef<TTypeName.Defined> {
  readonly underlying: T;
}

export class TDefined<T extends AnyTType>
  extends TType<Exclude<T["$O"], undefined>, TDefinedDef<T>, Exclude<T["$I"], undefined>>
  implements TWrapper<T, TTypeName.Defined>
{
  get _hint() {
    return `Defined<${this.underlying.hint}>`;
  }

  get _spec() {
    return {
      ...this.underlying.spec,
      optional: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.data === undefined
      ? ctx.addIssue({ kind: TIssueKind.Base.Required }, this.options.messages[TIssueKind.Base.Required]).return()
      : (this.underlying._parse(ctx.child(this.underlying, ctx.data)) as TParseResult<
          Exclude<T["$O"], undefined>,
          Exclude<T["$I"], undefined>
        >);
  }

  get underlying(): T {
    return this._def.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Defined> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TDefined ? unwrapped.unwrapDeep() : unwrapped;
  }

  modify<U extends AnyTType>(fn: (underlying: T) => U): TDefined<U> {
    return TDefined.create(fn(this.underlying), this.options);
  }

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TDefined<T> {
    return new TDefined({
      typeName: TTypeName.Defined,
      options: processCreateOptions(options),
      underlying,
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    TNonNullable                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNonNullableOptions = TOptions<[TIssueKind.Base.Forbidden]>;

export interface TNonNullableDef<T extends AnyTType> extends TDef<TTypeName.NonNullable> {
  readonly options: TNonNullableOptions;
  readonly underlying: T;
}

export class TNonNullable<T extends AnyTType>
  extends TType<NonNullable<T["$O"]>, TNonNullableDef<T>, NonNullable<T["$I"]>>
  implements TWrapper<T, TTypeName.NonNullable>
{
  get _hint() {
    return `NonNullable<${this.underlying.hint}>`;
  }

  get _spec() {
    return {
      ...this.underlying.spec,
      optional: false,
      nullable: false,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    return ctx.data === undefined
      ? ctx.addIssue({ kind: TIssueKind.Base.Required }, this.options.messages[TIssueKind.Base.Required]).return()
      : ctx.data === null
      ? ctx
          .addIssue(
            { kind: TIssueKind.Base.Forbidden, payload: { types: [ValueKind.Undefined, ValueKind.Null] } },
            this.options.messages[TIssueKind.Base.Forbidden]
          )
          .return()
      : (this.underlying._parse(ctx.child(this.underlying, ctx.data)) as TParseResult<
          NonNullable<T["$O"]>,
          NonNullable<T["$I"]>
        >);
  }

  get underlying(): T {
    return this._def.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.NonNullable> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TNonNullable ? unwrapped.unwrapDeep() : unwrapped;
  }

  modify<U extends AnyTType>(fn: (underlying: T) => U): TNonNullable<U> {
    return TNonNullable.create(fn(this.underlying), this.options);
  }

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions<TNonNullableOptions>): TNonNullable<T> {
    return new TNonNullable({
      typeName: TTypeName.NonNullable,
      options: processCreateOptions(options),
      underlying,
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TNot                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TNotOptions = TOptions<[TIssueKind.Base.Forbidden]>;

export interface TNotDef<T extends AnyTType, Forbidden extends readonly T["$I"][]> extends TDef<TTypeName.Not> {
  readonly options: TNotOptions;
  readonly underlying: T;
  readonly forbidden: Forbidden;
}

export class TNot<T extends AnyTType, Forbidden extends T["$I"] | readonly T["$I"][]> extends TType<
  Exclude<T["$O"], _.AssertArray<Forbidden>[number]>,
  TNotDef<T, _.AssertArray<Forbidden>>,
  Exclude<T["$I"], _.AssertArray<Forbidden>[number]>
> {
  get _hint() {
    const uniqForbidden = _.uniq(this.forbidden);
    const forbiddenHint = uniqForbidden.length === 1 ? printValue(uniqForbidden[0]) : printValue(uniqForbidden);
    return `Not<${this.underlying.hint}, ${forbiddenHint}>`;
  }

  get _spec() {
    return {
      ...this.underlying.spec,
      forbidden: this.forbidden.map((f) => printValue(f)),
      optional: this.underlying.spec.optional && !this.forbidden.includes(undefined),
      nullable: this.underlying.spec.nullable && !this.forbidden.includes(null),
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    if (this.forbidden.includes(ctx.data)) {
      return ctx
        .addIssue(
          {
            kind: TIssueKind.Base.Forbidden,
            payload: { values: _.uniq(this.forbidden.map((f) => printValue(f))) },
          },
          this.options.messages[TIssueKind.Base.Forbidden]
        )
        .return();
    }

    return this.underlying._parse(ctx.child(this.underlying, ctx.data)) as TParseResultOf<this>;
  }

  get underlying(): T {
    return this._def.underlying;
  }

  get forbidden(): _.AssertArray<Forbidden> {
    return this._def.forbidden;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Not> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TNot ? unwrapped.unwrapDeep() : unwrapped;
  }

  static create<T extends AnyTType, Forbidden extends T["$I"] | readonly [T["$I"], ...T["$I"][]]>(
    underlying: T,
    forbidden: _.Narrow<Forbidden>,
    options?: TCreateOptions<TNotOptions>
  ): TNot<T, Forbidden> {
    return new TNot({
      typeName: TTypeName.Not,
      underlying,
      forbidden: _.assertArray(_.widen(forbidden)),
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPromiseDef<T extends AnyTType> extends TDef<TTypeName.Promise> {
  readonly underlying: T;
}

export class TPromise<T extends AnyTType>
  extends TType<Promise<T["$O"]>, TPromiseDef<T>, Promise<T["$I"]>>
  implements TWrapper<T, TTypeName.Promise>
{
  get _hint() {
    return `Promise<${this.underlying.hint}>`;
  }

  get _spec() {
    return {
      ...this.underlying.spec,
      promise: true,
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {
    if (kindOf(ctx.data) !== ValueKind.Promise && !ctx.common.async) {
      return ctx.invalidType({ expected: ValueKind.Promise }).return();
    }

    return ctx.return(
      (ctx.data instanceof Promise ? ctx.data : Promise.resolve(ctx.data)).then(async (awaited) =>
        this.underlying.parseAsync(awaited, ctx.common)
      )
    );
  }

  get underlying(): T {
    return this._def.underlying;
  }

  get awaited(): T {
    return this.underlying;
  }

  unwrap(): T {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Promise> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TPromise ? unwrapped.unwrapDeep() : unwrapped;
  }

  modify<U extends AnyTType>(fn: (underlying: T) => U): TPromise<U> {
    return TPromise.create(fn(this.underlying), this.options);
  }

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TPromise<T> {
    return new TPromise({
      typeName: TTypeName.Promise,
      underlying,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TUnion                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

type _FlattenMembers<
  T extends readonly AnyTType[],
  TN extends TTypeName.Union | TTypeName.Intersection
> = T extends readonly []
  ? []
  : T extends readonly [infer H extends AnyTType, ...infer R extends readonly AnyTType[]]
  ? H extends { readonly typeName: TN; readonly members: infer U extends readonly AnyTType[] }
    ? [..._FlattenMembers<U, TN>, ..._FlattenMembers<R, TN>]
    : [H, ..._FlattenMembers<R, TN>]
  : T;

export type FlattenMembers<
  T extends readonly AnyTType[],
  TN extends TTypeName.Union | TTypeName.Intersection
> = _FlattenMembers<T, TN> extends infer U extends readonly AnyTType[] ? U : readonly AnyTType[];

function flattenMembers<T extends readonly AnyTType[], TN extends TTypeName.Union | TTypeName.Intersection>(
  members: T,
  typeName: TN
): FlattenMembers<T, TN>;
function flattenMembers(members: readonly AnyTType[], typeName: TTypeName) {
  return members.flatMap(
    (member) =>
      typeName === TTypeName.Union && member instanceof TUnion ? flattenMembers(member.members, typeName) : [member],
    []
  );
}

export interface TUnionDef<T extends readonly AnyTType[]> extends TDef<TTypeName.Union> {
  readonly members: T;
}

export class TUnion<T extends readonly AnyTType[]> extends TType<T[number]["$O"], TUnionDef<T>, T[number]["$I"]> {
  get _hint(): string {
    const flattenedMembers = flattenMembers(this.members, TTypeName.Union);
    return _.uniq(flattenedMembers.map((alt) => alt.hint)).join(" | ");
  }

  get _spec() {
    const flattenedMembers = flattenMembers(this.members, TTypeName.Union);
    return {
      alternatives: flattenedMembers.map((alt) => alt.spec),
      optional: flattenedMembers.some((alt) => alt.isOptional),
      nullable: flattenedMembers.some((alt) => alt.isNullable),
    };
  }

  _parse(ctx: TParseContextOf<this>): TParseResultOf<this> {}

  get members(): T {
    return this._def.members;
  }

  get alternatives(): T {
    return this.members;
  }

  flatten(): TUnion<FlattenMembers<T, TTypeName.Union>> {
    return TUnion._create(flattenMembers(this.members, TTypeName.Union), this.options);
  }

  static create<T extends readonly [AnyTType, AnyTType, ...AnyTType[]]>(
    alternatives: T,
    options?: TCreateOptions
  ): TUnion<T> {
    return TUnion._create(alternatives, options);
  }

  static _create<T extends readonly AnyTType[]>(alternatives: T, options: TCreateOptions | undefined): TUnion<T> {
    return new TUnion({
      typeName: TTypeName.Union,
      members: alternatives,
      options: processCreateOptions(options),
    });
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */

export const anyType = TAny.create.bind(TAny);
export const bigintType = TBigInt.create.bind(TBigInt);
export const booleanType = TBoolean.create.bind(TBoolean);
export const definedType = TDefined.create.bind(TDefined);
export const nanType = TNaN.create.bind(TNaN);
export const neverType = TNever.create.bind(TNever);
export const nonnullableType = TNonNullable.create.bind(TNonNullable);
export const notType = TNot.create.bind(TNot);
export const nullableType = TNullable.create.bind(TNullable);
export const nullType = TNull.create.bind(TNull);
export const numberType = TNumber.create.bind(TNumber);
export const optionalType = TOptional.create.bind(TOptional);
export const promiseType = TPromise.create.bind(TPromise);
export const stringType = TString.create.bind(TString);
export const symbolType = TSymbol.create.bind(TSymbol);
export const undefinedType = TUndefined.create.bind(TUndefined);
export const unionType = TUnion.create.bind(TUnion);
export const unknownType = TUnknown.create.bind(TUnknown);
export const voidType = TVoid.create.bind(TVoid);
export const objectType = TObject.create.bind(TObject);

export {
  anyType as any,
  bigintType as bigint,
  booleanType as boolean,
  definedType as defined,
  definedType as required,
  nanType as nan,
  neverType as never,
  nonnullableType as nonnullable,
  notType as nope,
  notType as not,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  optionalType as optional,
  promiseType as promise,
  stringType as string,
  symbolType as symbol,
  undefinedType as undefined,
  unionType as or,
  unionType as union,
  unknownType as unknown,
  voidType as void,
  objectType as object,
};

export type output<T extends AnyTType> = _.SimplifyDeep<T["$O"]>;
export type input<T extends AnyTType> = _.SimplifyDeep<T["$I"]>;
export type infer<T extends AnyTType> = output<T>;
