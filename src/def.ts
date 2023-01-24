import type * as tf from "type-fest";
import type { TCheckBase } from "./checks";
import type { AnyTManifest, TManifest } from "./manifest";
import type { TOptions, ProcessedTOptions } from "./options";
import type { TTypeName } from "./types";
import type { Branded, HasKey } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface TDef {
  $Out: unknown;
  $In: unknown;
  $TypeName: TTypeName;
  $Props: Record<string, unknown> | null;
  $Options: TOptions;
  $Manifest: TManifest<this["$Out"], this["$In"]>;
  $Checks: ReadonlyArray<TCheckBase & Record<string, unknown>> | null;
}

export type MakeTDef<
  T extends tf.Exact<tf.SetOptional<TDef, "$In" | "$Props" | "$Options" | "$Manifest" | "$Checks">, T>
> = [{ 0: T["$Out"]; 1: T["$In"] }[HasKey<T, "$In">]] extends [infer In]
  ? Branded<
      {
        $Out: T["$Out"];
        $In: In;
        $TypeName: T["$TypeName"];
        $Props: { 0: null; 1: T["$Props"] }[HasKey<T, "$Props">];
        $Options: ProcessedTOptions<Exclude<{ 0: TOptions; 1: T["$Options"] }[HasKey<T, "$Options">], undefined>>;
        $Manifest: { 0: TManifest<T["$Out"], In>; 1: T["$Manifest"] }[HasKey<T, "$Manifest">];
        $Checks: { 0: null; 1: T["$Checks"] }[HasKey<T, "$Checks">];
      },
      "TDef"
    >
  : never;

export type AnyBrandedTDef = Branded<TDef, "TDef">;

export type TCtorDef<T extends AnyBrandedTDef> = {
  readonly typeName: T["$TypeName"];
  readonly options: T["$Options"];
  readonly manifest?: AnyTManifest;
} & (T["$Props"] extends null ? { readonly props?: null } : { readonly props: T["$Props"] }) &
  (T["$Checks"] extends null ? { readonly checks?: null } : { readonly checks: T["$Checks"] });

export type TRuntimeDef<T extends AnyBrandedTDef> = Branded<
  {
    readonly typeName: T["$TypeName"];
    readonly props: T["$Props"];
    readonly options: T["$Options"];
    readonly manifest: T["$Manifest"];
    readonly checks: T["$Checks"];
  },
  "__deepCloned"
>;
