import type { AnyTType } from "./types";
import { ValueKind, isKindOf, type utils } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TManifest                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export type Descriptive = utils.Simplify<{
  readonly title?: string;
  readonly summary?: string;
  readonly description?: string;
}>;

export type DescriptiveWithValue<T> = utils.Simplify<
  Descriptive & {
    readonly value: T;
  }
>;

export type TManifestExamples<$O, $I> = utils.Simplify<{
  readonly in?: ReadonlyArray<DescriptiveWithValue<$I>>;
  readonly out?: ReadonlyArray<DescriptiveWithValue<$O>>;
}>;

export type TManifest<$O, $I> = utils.Simplify<
  Descriptive & {
    readonly examples?: TManifestExamples<$O, $I>;
    readonly tags?: ReadonlyArray<DescriptiveWithValue<string>>;
    readonly notes?: ReadonlyArray<DescriptiveWithValue<string>>;
    readonly unit?: DescriptiveWithValue<string>;
    readonly meta?: Readonly<Record<string, unknown>>;
  }
>;

export type AnyTManifest = TManifest<any, any>;

export type TManifestOf<T extends AnyTType> = TManifest<T["$O"], T["$I"]>;

export function parseMaybeDescriptive(maybeDescriptive: string | DescriptiveWithValue<string>) {
  if (isKindOf(maybeDescriptive, ValueKind.String)) {
    return { value: maybeDescriptive };
  }

  return maybeDescriptive;
}
