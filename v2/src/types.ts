import { nanoid } from "nanoid";
import { AnyTDef, InternalTDef, TDef, TDefInput } from "./def";
import { TIssueKind } from "./error";
import { THint } from "./hint";
import {
  TCreateOptions,
  TOptions,
  TParseOptions,
  TProcessedOptions,
  processCreateOptions,
  processParseOptions,
} from "./options";
import { TParseContext, TParseContextOf, TParseResultOf, TParseResultSyncOf } from "./parse";
import { TSpec } from "./spec";
import { TTypeName } from "./typeNames";
import { ValueKind, _ } from "./utils";

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
  }

  get hint(): this["_hint"] {
    return this._hint;
  }

  get spec(): this["_spec"] {
    return this._spec;
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

  nullish() {
    return this.nullable().optional();
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

export type AnyTType<Out = unknown, In = Out> = TType<Out, any, In>;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TAny                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TAnyDef extends TDef<TTypeName.Any> {}

export class TAny extends TType<any, TAnyDef> {
  get _hint() {
    return THint().Any;
  }

  get _spec() {
    return TSpec().Nullish;
  }

  _parse(ctx: TParseContextOf<this>) {
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
    return THint().Unknown;
  }

  get _spec() {
    return TSpec().Nullish;
  }

  _parse(ctx: TParseContextOf<this>) {
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
    return THint().Never;
  }

  get _spec() {
    return TSpec().Never;
  }

  _parse(ctx: TParseContextOf<this>) {
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
    return THint().Null;
  }

  get _spec() {
    return TSpec().Nullable;
  }

  _parse(ctx: TParseContextOf<this>) {
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
    return THint().Undefined;
  }

  get _spec() {
    return TSpec().Optional;
  }

  _parse(ctx: TParseContextOf<this>) {
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
    return THint().Void;
  }

  get _spec() {
    return TSpec().Optional;
  }

  _parse(ctx: TParseContextOf<this>) {
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

export type UnwrapDeep<T extends AnyTType, TN extends TTypeName = TTypeName> = T extends {
  readonly typeName: TN;
  readonly underlying: infer U extends AnyTType;
}
  ? UnwrapDeep<U, TN>
  : T;

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptional                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TOptionalDef<T extends AnyTType> extends TDef<TTypeName.Optional> {
  readonly underlying: T;
}

export class TOptional<T extends AnyTType> extends TType<T["$O"] | undefined, TOptionalDef<T>, T["$I"] | undefined> {
  get _hint() {
    return THint().Unionize(this.underlying.hint, THint().Undefined);
  }

  get _spec() {
    return TSpec().MakeOptional(this.underlying.spec);
  }

  _parse(ctx: TParseContext<T["$O"] | undefined, T["$I"] | undefined>) {
    return ctx.data === undefined ? ctx.return(ctx.data) : this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying() {
    return this._def.underlying;
  }

  unwrap() {
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

export class TNullable<T extends AnyTType> extends TType<T["$O"] | null, TNullableDef<T>, T["$I"] | null> {
  get _hint() {
    return THint().Unionize(this.underlying.hint, THint().Null);
  }

  get _spec() {
    return TSpec().MakeNullable(this.underlying.spec);
  }

  _parse(ctx: TParseContext<T["$O"] | null, T["$I"] | null>) {
    return ctx.data === null ? ctx.return(ctx.data) : this.underlying._parse(ctx.child(this.underlying, ctx.data));
  }

  get underlying() {
    return this._def.underlying;
  }

  unwrap() {
    return this.underlying;
  }

  unwrapDeep(): UnwrapDeep<T, TTypeName.Nullable> {
    const unwrapped = this.unwrap();
    return unwrapped instanceof TNullable ? unwrapped.unwrapDeep() : unwrapped;
  }

  static create<T extends AnyTType>(underlying: T, options?: TCreateOptions): TNullable<T> {
    return new TNullable({
      typeName: TTypeName.Nullable,
      options: processCreateOptions(options),
      underlying,
    });
  }
}

export const anyType = TAny.create.bind(TAny);
export const unknownType = TUnknown.create.bind(TUnknown);
export const neverType = TNever.create.bind(TNever);
export const nullType = TNull.create.bind(TNull);
export const undefinedType = TUndefined.create.bind(TUndefined);
export const voidType = TVoid.create.bind(TVoid);
export const optionalType = TOptional.create.bind(TOptional);
export const nullableType = TNullable.create.bind(TNullable);

export {
  anyType as any,
  unknownType as unknown,
  neverType as never,
  nullType as null,
  undefinedType as undefined,
  voidType as void,
  optionalType as optional,
  nullableType as nullable,
};
