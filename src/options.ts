import type * as tb from "ts-toolbelt";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TOptions                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TOptions {
  readonly label?: string;
}

export type TCreateOptions<T extends TOptions = TOptions> = tb.A.Compute<T> & {};
