import { defaultErrorFormatter, type TErrorFormatter, type TErrorMap } from "./error";
import type { TLocale } from "./locales/_base";
import enUS from "./locales/en-us";

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       TGlobal                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export class TGlobal {
  private static _locale: TLocale = enUS;
  private static _errorMap: TErrorMap = this._locale.map;
  private static _errorFormatter: TErrorFormatter = defaultErrorFormatter;

  static getLocale() {
    return this._locale;
  }

  static setLocale(locale: TLocale) {
    this._locale = locale;
  }

  static getErrorMap() {
    return this._errorMap;
  }

  static setErrorMap(map: TErrorMap) {
    this._errorMap = map;
  }

  static getErrorFormatter() {
    return this._errorFormatter;
  }

  static setErrorFormatter(formatter: TErrorFormatter) {
    this._errorFormatter = formatter;
  }
}
