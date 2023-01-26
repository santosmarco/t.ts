import type * as tf from "type-fest";
import type { TErrorMap } from "./error";
import type { TIssueKind } from "./issues";
import { BRAND, enbrand, pick, type Branded } from "./utils";
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TOptionsOpts = {
  readonly issueKinds?: ReadonlyArray<Exclude<TIssueKind, "base.required" | "base.invalid_type">>;
};

export type TOptions<T extends TOptionsOpts | null = null> = tf.Simplify<{
  readonly abortEarly?: boolean;
  readonly label?: string;
  readonly schemaErrorMap?: TErrorMap;
  readonly warnOnly?: boolean;
  readonly messages?: {
    readonly [K in
      | "base.required"
      | "base.invalid_type"
      | (T extends { readonly issueKinds: ReadonlyArray<infer U extends string> } ? U : never)]?: string;
  };
}> & {};

export type AnyTOptions = TOptions<Required<TOptionsOpts>>;

export type TParseOptions = {
  readonly abortEarly?: boolean;
  readonly label?: string;
  readonly contextualErrorMap?: TErrorMap;
  readonly warnOnly?: boolean;
};

export type ProcessedTOptions<T extends TOptions> = T extends infer U extends Record<string, unknown>
  ? Branded<
      { [K in keyof U]-?: (K extends "label" | "schemaErrorMap" ? undefined : never) | U[K] },
      "__ProcessedTOptions"
    >
  : never;

export function processCreateOptions<T extends TOptions>(opts: T | undefined): ProcessedTOptions<T> {
  return enbrand(
    {
      abortEarly: opts?.abortEarly ?? false,
      label: opts?.label,
      schemaErrorMap: opts?.schemaErrorMap,
      warnOnly: opts?.warnOnly ?? false,
      messages: { ...opts?.messages },
    },
    "__ProcessedTOptions"
  ) as ProcessedTOptions<T>;
}

export function isProcessedTOptions<T extends TOptions>(opts: T | ProcessedTOptions<T>): opts is ProcessedTOptions<T> {
  return BRAND in opts && opts[BRAND] === "__ProcessedTOptions";
}

export type ProcessedTParseOptions<T extends AnyTOptions> = ReturnType<typeof processParseOptions<T>>;

export function processParseOptions<T extends AnyTOptions>(
  schemaOpts: T | ProcessedTOptions<T>,
  parseOpts: TParseOptions | undefined
) {
  const processedSchemaOpts = isProcessedTOptions(schemaOpts) ? schemaOpts : processCreateOptions(schemaOpts);
  return {
    abortEarly: parseOpts?.abortEarly ?? processedSchemaOpts.abortEarly,
    label: parseOpts?.label ?? processedSchemaOpts.label,
    schemaErrorMap: processedSchemaOpts.schemaErrorMap,
    contextualErrorMap: parseOpts?.contextualErrorMap ?? undefined,
    warnOnly: parseOpts?.warnOnly ?? processedSchemaOpts.warnOnly,
    messages: processedSchemaOpts.messages,
  };
}

export function pickTransferrableOptions(options: AnyTOptions) {
  return pick(options, ["abortEarly", "schemaErrorMap", "warnOnly", "messages"]);
}
