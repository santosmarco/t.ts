import type { TOptions, TProcessedOptions } from "./options";
import type { TTypeName } from "./typeNames";
import type { _ } from "./utils";

export interface TDef<T extends TTypeName> {
  readonly typeName: T;
  readonly options: TOptions;
}

export type AnyTDef = TDef<TTypeName>;

export type TCtorDef<T extends AnyTDef> = {
  readonly typeName: T["typeName"];
  readonly options: TProcessedOptions<T["options"]>;
} & _.Except<T, keyof AnyTDef>;

export type TInternalDef<T extends AnyTDef> = TCtorDef<T> & {
  readonly id: string;
};
