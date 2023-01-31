import { ValueKind, kindOf } from "./kind-of";

export function printValue(x: unknown, backticks?: boolean): string {
  const printer = printerMap[kindOf(x)];
  const printed = typeof printer === "string" ? printer : printer(x);
  return backticks ? `\`${printed}\`` : printed;
}

export function literalBool(x: boolean): "true" | "false" {
  return x ? "true" : "false";
}

function stringify(x: unknown) {
  return String(x);
}

function printSymbol(x: unknown) {
  const { description } = x as symbol;
  return `Symbol(${description ? printValue(description) : ""})`;
}

function printFunctionName(x: unknown) {
  return (x as Function).name ?? "anonymous";
}

function printArray(x: unknown) {
  return `[${Array.prototype.map.call(x, (y) => printValue(y)).join(", ")}]`;
}

function printDate(x: unknown) {
  return `Date: ${Number.isNaN(Date.prototype.getTime.call(x)) ? "Invalid Date" : Date.prototype.toISOString.call(x)}`;
}

function printError(x: unknown) {
  if (!x || typeof x !== "object" || !("name" in x) || !("message" in x)) {
    return Error.prototype.toString.call(x);
  }
  return `${x.name as string}: ${printValue(x.message)}`;
}

function printMap(x: unknown) {
  return `Map(${(x as Map<unknown, unknown>).size}) { ${[...Map.prototype.entries.call(x)]
    .map(([k, v]) => `${printValue(k)} => ${printValue(v)}`)
    .join(", ")} }`;
}

function printObject(x: unknown) {
  return `{ ${Object.entries(x as object)
    .map(([k, v]) => `${k}: ${printValue(v)}`)
    .join(", ")} }`;
}

function printSet(x: unknown) {
  return `Set(${(x as Set<unknown>).size}) { ${[...Set.prototype.values.call(x)]
    .map((v) => printValue(v))
    .join(", ")} }`;
}

const printerMap: Record<ValueKind, ((x: unknown) => string) | string> = {
  [ValueKind.Arguments]: ValueKind.Arguments,
  [ValueKind.Array]: printArray,
  [ValueKind.ArrayIterator]: ValueKind.ArrayIterator,
  [ValueKind.BigInt]: (x) => `${x as bigint}n`,
  [ValueKind.Boolean]: stringify,
  [ValueKind.Buffer]: ValueKind.Buffer,
  [ValueKind.Date]: printDate,
  [ValueKind.Error]: printError,
  [ValueKind.False]: ValueKind.False,
  [ValueKind.Float32Array]: ValueKind.Float32Array,
  [ValueKind.Float64Array]: ValueKind.Float64Array,
  [ValueKind.Function]: (x) => `[Function ${printFunctionName(x)}]`,
  [ValueKind.Generator]: ValueKind.Generator,
  [ValueKind.GeneratorFunction]: (x) => `[GeneratorFunction ${printFunctionName(x)}]`,
  [ValueKind.Int16Array]: ValueKind.Int16Array,
  [ValueKind.Int32Array]: ValueKind.Int32Array,
  [ValueKind.Int8Array]: ValueKind.Int8Array,
  [ValueKind.Map]: printMap,
  [ValueKind.MapIterator]: ValueKind.MapIterator,
  [ValueKind.NaN]: stringify,
  [ValueKind.Null]: stringify,
  [ValueKind.Number]: stringify,
  [ValueKind.Object]: printObject,
  [ValueKind.Promise]: ValueKind.Promise,
  [ValueKind.RegExp]: stringify,
  [ValueKind.Set]: printSet,
  [ValueKind.SetIterator]: ValueKind.SetIterator,
  [ValueKind.String]: (x) => `"${x as string}"`,
  [ValueKind.StringIterator]: ValueKind.StringIterator,
  [ValueKind.Symbol]: printSymbol,
  [ValueKind.True]: ValueKind.True,
  [ValueKind.Uint16Array]: ValueKind.Uint16Array,
  [ValueKind.Uint32Array]: ValueKind.Uint32Array,
  [ValueKind.Uint8Array]: ValueKind.Uint8Array,
  [ValueKind.Uint8ClampedArray]: ValueKind.Uint8ClampedArray,
  [ValueKind.Undefined]: stringify,
  [ValueKind.Unknown]: (x) => JSON.stringify(x, null, 2),
  [ValueKind.Void]: ValueKind.Void,
  [ValueKind.WeakMap]: ValueKind.WeakMap,
  [ValueKind.WeakSet]: ValueKind.WeakSet,
  // [ValueKind.ArrayBuffer]: ValueKind.ArrayBuffer,
  // [ValueKind.Atomics]: ValueKind.Atomics,
  // [ValueKind.BigInt64Array]: ValueKind.BigInt64Array,
  // [ValueKind.BigUint64Array]: ValueKind.BigUint64Array,
  // [ValueKind.DataView]: ValueKind.DataView,
  // [ValueKind.SharedArrayBuffer]: ValueKind.SharedArrayBuffer,
};
