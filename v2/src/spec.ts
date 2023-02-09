import type { _ } from "./utils";

export type TSpec = _.Simplify<
  _.ReadonlyDeep<
    {
      optional: boolean;
      nullable: boolean;
    } & Record<string, unknown>
  >
>;
