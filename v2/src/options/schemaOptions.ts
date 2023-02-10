import type { TErrorMap, TIssueKind } from "../error";
import { tokens } from "../tokens";
import { _ } from "../utils";

export type TOptions<AddtlIssues extends readonly TIssueKind[] = []> = _.ReadonlyDeep<{
  abortEarly?: boolean;
  label?: string;
  schemaErrorMap?: TErrorMap;
  warnOnly?: boolean;
  messages?: { [K in TIssueKind.Base.Required | TIssueKind.Base.InvalidType | AddtlIssues[number]]?: string };
}>;

export type AnyTOptions = TOptions<readonly TIssueKind[]>;

export type TCreateOptions<T extends AnyTOptions = TOptions> = _.Simplify<T>;

export type TProcessedOptions<T extends AnyTOptions> = _.BRANDED<
  _.ReadonlyDeep<{
    abortEarly: boolean;
    label: string | undefined;
    schemaErrorMap: TErrorMap | undefined;
    warnOnly: boolean;
    messages: NonNullable<T["messages"]>;
  }>,
  tokens.PROCESSED_OPTIONS
>;

export type AnyTProcessedOptions = TProcessedOptions<AnyTOptions>;

export function processCreateOptions<T extends AnyTOptions>({
  abortEarly = false,
  label,
  schemaErrorMap,
  warnOnly = false,
  messages = {},
}: T = {}): TProcessedOptions<T> {
  return _.enbrand(
    {
      abortEarly,
      label,
      schemaErrorMap,
      warnOnly,
      messages,
    },
    tokens.PROCESSED_OPTIONS
  );
}
