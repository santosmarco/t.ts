import type * as tf from "type-fest";
import type { TCheckBase } from "./checks";
import type { AnyTOptions, TOptions } from "./options";
import type { TTypeName } from "./types";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface TDef {
  $Out: unknown;
  $In: unknown;
  $TypeName: TTypeName;
  $Props: Record<string, unknown> | null;
  $Options: AnyTOptions;
  $Checks: ReadonlyArray<TCheckBase & Record<string, unknown>> | null;
}

export type MakeTDef<T extends tf.Exact<tf.SetOptional<TDef, "$In" | "$Props" | "$Options" | "$Checks">, T>> = {
  $Out: T["$Out"];
  $In: "$In" extends keyof T ? T["$In"] : T["$Out"];
  $TypeName: T["$TypeName"];
  $Props: "$Props" extends keyof T ? T["$Props"] : null;
  $Options: "$Options" extends keyof T ? T["$Options"] : TOptions;
  $Checks: "$Checks" extends keyof T ? T["$Checks"] : null;
};

export type AnyTDef = MakeTDef<TDef>;
