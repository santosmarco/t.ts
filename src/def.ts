import type * as tf from "type-fest";
import type { AnyTManifest, TManifest } from "./manifest";
import type { TOptions } from "./options";
import type { TTypeName } from "./types";
import type { tu } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        TDef                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDef {
  $Out: unknown;
  $In: unknown;
  $TypeName: TTypeName;
  $Props: Record<string, unknown> | null;
  $Options: TOptions;
  $Manifest: TManifest<this["$Out"], this["$In"]>;
}

export type MakeTDef<T extends tf.Exact<tf.SetOptional<TDef, "$In" | "$Props" | "$Options" | "$Manifest">, T>> = [
  { 0: T["$Out"]; 1: T["$In"] }[tu.HasKey<T, "$In">]
] extends [infer In]
  ? tf.Opaque<
      {
        $Out: T["$Out"];
        $In: In;
        $TypeName: T["$TypeName"];
        $Props: { 0: null; 1: T["$Props"] }[tu.HasKey<T, "$Props">];
        $Options: { 0: TOptions; 1: T["$Options"] }[tu.HasKey<T, "$Options">];
        $Manifest: { 0: TManifest<T["$Out"], In>; 1: T["$Manifest"] }[tu.HasKey<T, "$Manifest">];
      },
      "TDef"
    >
  : never;

export type AnyBrandedTDef = tf.Opaque<TDef, "TDef">;

export type CtorTDef<T extends AnyBrandedTDef> = {
  readonly typeName: T["$TypeName"];
  readonly options: T["$Options"];
  readonly manifest?: AnyTManifest;
} & (T["$Props"] extends null ? { readonly props?: null } : { readonly props: T["$Props"] });

export type RuntimeTDef<T extends AnyBrandedTDef> = tf.Opaque<
  {
    readonly typeName: T["$TypeName"];
    readonly props: Record<string, unknown> | null;
    readonly options: TOptions;
    readonly manifest: AnyTManifest;
  },
  "__deepCloned"
>;
