import type * as tf from "type-fest";

export function opacify<T, U extends string>(x: T, _: U) {
  return x as tf.Opaque<T, U>;
}
