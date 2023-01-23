/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TLocale                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

import type { TErrorMapFn } from "../error";

export type TLocale = {
  readonly name: string;
  readonly map: TErrorMapFn;
  readonly defaultLabel: string;
};
