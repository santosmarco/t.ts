import type { TLocale } from "./locale";
import type { TErrorMap, TErrorFormatter } from "./error";

export class TGlobal {
  private static _locale: TLocale = { map: () => "a" };
  private static _errorMap: TErrorMap = this._locale.map;
  private static _errorFormatter: TErrorFormatter = console.log;

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
