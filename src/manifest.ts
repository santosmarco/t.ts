import type * as tf from "type-fest";
import type { AnyBrandedTDef } from "./def";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TManifest                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type Descriptive = {
  readonly title?: string;
  readonly summary?: string;
  readonly description?: string;
};

export type DescriptiveWithValue<T> = tf.Simplify<
  Descriptive & {
    readonly value: T;
  }
>;

export type TManifest<O, I = O> = {
  readonly examples?: {
    readonly in?: ReadonlyArray<DescriptiveWithValue<I>>;
    readonly out?: ReadonlyArray<DescriptiveWithValue<O>>;
  };
  readonly tags?: ReadonlyArray<DescriptiveWithValue<string>>;
  readonly notes?: ReadonlyArray<DescriptiveWithValue<string>>;
  readonly unit?: DescriptiveWithValue<string>;
  readonly meta?: Readonly<Record<string, unknown>>;
} & Descriptive;

export type TRetrievableManifest<D extends AnyBrandedTDef> = D["$Manifest"] & {
  readonly label?: string;
};

export type AnyTManifest = TManifest<any, any>;
