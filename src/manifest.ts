import type * as tf from "type-fest";
import type { AnyBrandedTDef } from "./def";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TManifest                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface Descriptive {
  readonly title?: string;
  readonly summary?: string;
  readonly description?: string;
}

export type DescriptiveWithValue<T> = tf.Simplify<
  Descriptive & {
    readonly value: T;
  }
>;

export interface TManifest<O, I = O> extends Descriptive {
  readonly examples?: {
    readonly in?: readonly DescriptiveWithValue<I>[];
    readonly out?: readonly DescriptiveWithValue<O>[];
  };
}

export type TRetrievableManifest<D extends AnyBrandedTDef> = D["$Manifest"] & {
  readonly label?: string;
};

export type AnyTManifest = TManifest<any, any>;
