export namespace t {
  export const BRAND = Symbol('t.brand')
  export type BRAND = typeof BRAND

  export const PROCESSED_OPTIONS = Symbol('t.processed_options')
  export type PROCESSED_OPTIONS = typeof PROCESSED_OPTIONS

  export const PROCESSED_PARSE_OPTIONS = Symbol('t.processed_parse_options')
  export type PROCESSED_PARSE_OPTIONS = typeof PROCESSED_PARSE_OPTIONS
}
