import type * as tf from "type-fest";

export namespace stringUtils {
  export function join<T extends readonly string[], D extends string = " ">(x: T, delimiter?: D): tf.Join<T, D>;
  export function join(x: readonly string[], delimiter = " ") {
    return x.join(delimiter);
  }
}
