import cd from "clone-deep";
import { opacify } from "./objects";

export function cloneDeep<T>(x: T) {
  return opacify(cd(x), "__deepCloned");
}
