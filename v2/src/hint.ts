import { AnyTType } from "./types";
import { _ } from "./utils";

export function THint() {
  const Base = {
    Any: "any",
    BigInt: "bigint",
    Boolean: "boolean",
    Never: "never",
    Null: "null",
    Number: "number",
    String: "string",
    Symbol: "symbol",
    Undefined: "undefined",
    Unknown: "unknown",
    Void: "void",
  } as const;

  return {
    ...Base,
    Unionize,
  };
}

export type UnionizeHints<T extends readonly string[]> = "never" extends T[number] ? "never" : _.FilterOutDuplicates<T>;

function Unionize<T extends string, U extends readonly [T, ...T[]]>(...hints: U) {
  return _.join(_.filterOutDuplicates(hints), " | ");
}
