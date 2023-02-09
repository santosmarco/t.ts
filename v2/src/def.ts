import type { TOptions, TProcessedOptions } from "./options";
import type { TTypeName } from "./typeNames";
import { _ } from "./utils";

export interface TDef<T extends TTypeName> {
  readonly typeName: T;
  readonly options: TOptions;
}

export type AnyTDef = TDef<TTypeName>;

export type TDefInput<T extends AnyTDef> = {
  readonly typeName: T["typeName"];
  readonly options: TProcessedOptions<T["options"]>;
} & _.Except<T, "typeName" | "options">;

export type InternalTDef<T extends AnyTDef> = TDefInput<T> & {
  readonly id: string;
};
