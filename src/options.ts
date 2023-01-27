import type { TErrorMap } from "./error";
import type { TIssueKind } from "./issues";
import { enbrand, pick, type BRANDED, type __ } from "./utils";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TColor = {
  Black: "black",
  Red: "red",
  Green: "green",
  Yellow: "yellow",
  Blue: "blue",
  Magenta: "magenta",
  Cyan: "cyan",
  White: "white",
  Gray: "gray",
  BlackBright: "blackBright",
  RedBright: "redBright",
  GreenBright: "greenBright",
  YellowBright: "yellowBright",
  BlueBright: "blueBright",
  MagentaBright: "magentaBright",
  CyanBright: "cyanBright",
  WhiteBright: "whiteBright",
} as const;

export type TColor = typeof TColor[keyof typeof TColor];

export type TOptionsOpts = {
  readonly issueKinds?: ReadonlyArray<Exclude<TIssueKind, "base.required" | "base.invalid_type">>;
};

export type TOptions<T extends TOptionsOpts | null = null> = __<{
  readonly abortEarly?: boolean;
  readonly color?: TColor;
  readonly label?: string;
  readonly schemaErrorMap?: TErrorMap;
  readonly warnOnly?: boolean;
  readonly messages?: {
    readonly [K in
      | "base.required"
      | "base.invalid_type"
      | (T extends { readonly issueKinds: ReadonlyArray<infer U extends string> } ? U : never)]?: string;
  };
}>;

export type AnyTOptions = TOptions<Required<TOptionsOpts>>;

export type ProcessedTOptions<T extends TOptions> = T extends infer U extends Record<string, unknown>
  ? BRANDED<
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

export function pickTransferrableOptions(options: AnyTOptions) {
  return pick(options, ["abortEarly", "schemaErrorMap", "warnOnly", "messages"]);
}
