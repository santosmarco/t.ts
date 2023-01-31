import type * as tf from "type-fest";
import type { AnyTType, InputOf, OutputOf } from "./types";
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

export type TManifest<$O, $I = $O> = Descriptive & {
  readonly examples?: {
    readonly in?: ReadonlyArray<DescriptiveWithValue<$I>>;
    readonly out?: ReadonlyArray<DescriptiveWithValue<$O>>;
  };
  readonly tags?: ReadonlyArray<DescriptiveWithValue<string>>;
  readonly notes?: ReadonlyArray<DescriptiveWithValue<string>>;
  readonly unit?: DescriptiveWithValue<string>;
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type AnyTManifest = TManifest<any>;

export type TManifestOf<T extends AnyTType> = TManifest<OutputOf<T>, InputOf<T>>;

export function parseMaybeDescriptive(maybeDescriptive: string | DescriptiveWithValue<string>) {
  if (isKindOf(maybeDescriptive, ValueKind.String)) {
    return { value: maybeDescriptive };
  }

  return maybeDescriptive;
}
