# TTypes documentation

## Schemas

- `t.any()` - Parses every value; infers `any`.
- `t.unknown()` - Parses every value as well, but infers `unknown` instead.
- `t.never()` - **Fails** every time, infers `never`.
- `t.undefined()`/`t.void()` - Both parse `undefined` _only_, the difference is what each of them infers.
- `t.null()` - Parses and infers `null`.
- `t.string()`

  - `.coerce(value?: boolean): TString`
    - Enables/disables coercion of the input value. All `TType`s start without any coercion or casting set up. Some allow for configuring a coercion strategy, others a casting strategy, but many allow for defining both independently.
    - `value` - Whether the schema should coerce the input value or not. _Defaults to_ `true`_._
  - `.[min/max](value: number, options?: { inclusive?: boolean; message?: string } | string): TString`

    - Sets a minimum/maximum length for the input value to be checked against. Especially useful for disallowing empty strings (with `.min(1)`).
    - Consecutive checks will accumulate, possibly causing the input value to fail multiple times. Example:

    ```ts
    const myStringSchema = t.string().min(5).min(10).min(15);

    myStringSchema.parse("foo"); // => fails 3 times
    ```

    - `inclusive` controls whether the check value should be considered inclusively or exclusively, e.g. `t.string().min(3, { inclusive: true })` will parse `foo` but not `fo`; similarly, `t.string().min(3, { inclusive: false })` will parse `fooz` but not `foo`. `max` works just like `min` when `inclusive` is `true`, and the other way around when it is set to `false`. For example, `t.string().max(3, { inclusive: false })` will parse `fo` but not `foo`. _Defaults to_ `true`_._
    - You can always define a `message` to a check on any `TType`, either by passing a `{ message: string }` object or a `string` directly to `options`. Default messages for all checks are also configurable via the global error map, the schema error map, or the contextual error map (passed as a parse option).

  - `.length(value: number, options?: { message?: string } | string): TString`
    - Sets a fixed length for the input value to be checked against. Works similarly to `min`/`max`, except that `length` checks do not allow for changing the inclusivity of the value since they work by checking the input length _exactly_.
  - `.[range|between](min: number, max: number, options?: { inclusive?: '[]' | '[)' | '(]' | '()'; message?: string } | string): TString`
    - Sets a range consisting of a minimum and a maximum length for the input value to be checked against.
    - `inclusive`
      - `[` = _inclusive;_ `(` = _exclusive._ That is, `[]` means _both inclusive_, while `[)` (the default) means _inclusive min but exclusive max_.
