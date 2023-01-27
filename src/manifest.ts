import type * as tf from "type-fest";
import type { AnyBrandedTDef } from "./def";
import { ValueKind, isKindOf } from "./utils";

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

export type AnyTManifest = TManifest<any, any>;

export type MetaManifest = {
  readonly optional: boolean;
  readonly nullable: boolean;
};

export function parseMaybeDescriptive(maybeDescriptive: string | DescriptiveWithValue<string>) {
  if (isKindOf(maybeDescriptive, ValueKind.String)) {
    return { value: maybeDescriptive };
  }

  return maybeDescriptive;
}
