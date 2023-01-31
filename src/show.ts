import {
  TEffectKind,
  TTypeName,
  type AnyTArray,
  type AnyTEffects,
  type AnyTTuple,
  type AnyTType,
  type AnyValidTType,
  type TObjectShape,
} from "./types";
import { assertNever, printValue } from "./utils";

export function show(t: AnyValidTType, needsParens = false, readonly = false): string {
  if (t.isT(TTypeName.Any)) return "any";
  if (t.isT(TTypeName.Array)) return showTArray(t, readonly);
  if (t.isT(TTypeName.BigInt)) return "bigint";
  if (t.isT(TTypeName.Boolean)) return "boolean";
  if (t.isT(TTypeName.Brand)) return `t.BRANDED<${show(t.underlying)}, ${printValue(t.brandValue)}>`;
  if (t.isT(TTypeName.Buffer)) return "Buffer";
  if (t.isT(TTypeName.Catch)) return `Caught<${show(t.underlying)}, ${printValue(t.catchValue)}>`;
  if (t.isT(TTypeName.Custom)) return "TCustom";
  if (t.isT(TTypeName.Date)) return "Date";
  if (t.isT(TTypeName.Default)) return `Defaulted<${show(t.underlying)}, ${printValue(t.defaultValue)}>`;
  if (t.isT(TTypeName.Defined)) return `Defined<${show(t.unwrapDeep())}>`;
  if (t.isT(TTypeName.Effects)) return showTEffects(t);
  if (t.isT(TTypeName.Enum)) return showTEnum(t.values, needsParens);
  if (t.isT(TTypeName.False)) return "false";
  if (t.isT(TTypeName.If))
    return `If<${show(t.condition)}, ${t.then ? show(t.then) : "null"}, ${t.else ? show(t.else) : "null"}>`;
  if (t.isT(TTypeName.InstanceOf)) return `instanceof ${t.ctor.name}`;
  if (t.isT(TTypeName.Intersection)) return showTIntersection(t.flatten().types, needsParens);
  if (t.isT(TTypeName.Lazy)) return `Lazy<${show(t.unwrapDeep())}>`;
  if (t.isT(TTypeName.Literal)) return printValue(t.value);
  if (t.isT(TTypeName.Map)) return `${readonly ? "Readonly" : ""}Map<${show(t.keys)}, ${show(t.values)}>`;
  if (t.isT(TTypeName.NaN)) return "NaN";
  if (t.isT(TTypeName.NativeEnum)) return showTEnum(t.values, needsParens);
  if (t.isT(TTypeName.Never)) return "never";
  if (t.isT(TTypeName.NonNullable)) return `NonNullable<${show(t.unwrapDeep())}>`;
  if (t.isT(TTypeName.Null)) return "null";
  if (t.isT(TTypeName.Nullable)) return unionize([show(t.unwrapDeep()), "null"], needsParens);
  if (t.isT(TTypeName.Number)) return t.isInteger ? "integer" : "number";
  if (t.isT(TTypeName.Object)) return showTObject(t.shape, readonly);
  if (t.isT(TTypeName.Optional)) return unionize([show(t.unwrapDeep()), "undefined"], needsParens);
  if (t.isT(TTypeName.Pipeline)) return `Pipeline<${show(t.from)}, ${show(t.to)}>`;
  if (t.isT(TTypeName.Promise)) return `Promise<${show(t.unwrapDeep())}>`;
  if (t.isT(TTypeName.Readonly)) return show(t.unwrapDeep(), needsParens, true);
  if (t.isT(TTypeName.Record)) return `Record<${show(t.keys as AnyValidTType)}, ${show(t.values)}>`;
  if (t.isT(TTypeName.Set)) return `${readonly ? "Readonly" : ""}Set<${show(t.element)}>`;
  if (t.isT(TTypeName.String)) return "string";
  if (t.isT(TTypeName.Symbol)) return "symbol";
  if (t.isT(TTypeName.True)) return "true";
  if (t.isT(TTypeName.Tuple)) return showTTuple(t, readonly);
  if (t.isT(TTypeName.Undefined)) return "undefined";
  if (t.isT(TTypeName.Union)) return showTUnion(t.flatten().types, needsParens);
  if (t.isT(TTypeName.Unknown)) return "unknown";
  if (t.isT(TTypeName.Void)) return "void";

  assertNever(t);
}

function showTArray(t: AnyTArray, readonly: boolean) {
  if (t.isNonEmpty) {
    return `${readonly ? "readonly " : ""}[${show(t.element)}, ...${show(t.element, true)}[]]`;
  }
  return `${readonly ? "readonly " : ""}${show(t.element, true)}[]`;
}

function showTEffects(t: AnyTEffects) {
  return `with${
    {
      [TEffectKind.Preprocess]: "Preprocessor",
      [TEffectKind.Refinement]: "Refinement",
      [TEffectKind.Transform]: "Transform",
    }[t.effect.kind]
  }<${show(t.underlying)}>`;
}

function showTEnum(values: ReadonlyArray<string | number>, needsParens: boolean) {
  return unionize(
    values.map((v) => printValue(v)),
    needsParens
  );
}

function showTObject(shape: TObjectShape, readonly: boolean) {
  return `{ ${Object.entries(shape)
    .map(([k, v]) => `${readonly ? "readonly " : ""}${k}${v.isOptional ? "?" : ""}: ${show(v)}`)
    .join(", ")} }`;
}

function showTTuple(t: AnyTTuple, readonly: boolean) {
  return `${readonly ? "readonly " : ""}[${t.items.map((e) => show(e)).join(", ")}${
    t.restType ? `, ...${show(t.restType, true)}[]` : ""
  }]`;
}

function showTUnion(values: readonly AnyTType[], needsParens: boolean) {
  return unionize(
    values.map((v) => show(v)),
    needsParens
  );
}

function showTIntersection(values: readonly AnyTType[], needsParens: boolean) {
  return intersectionize(
    values.map((v) => show(v)),
    needsParens
  );
}

function unionize(values: string[] | Set<string>, needsParens: boolean): string {
  const unique = new Set(values);

  if (unique.size === 1) {
    const head = [...unique][0];
    if (head) return head;
  }

  if (unique.has("any")) return "any";
  if (unique.has("unknown")) return "unknown";

  if (unique.has("never")) {
    unique.delete("never");
    return unionize(unique, needsParens);
  }

  const finalArr = [...unique];

  if (needsParens) return `(${finalArr.join(" | ")})`;

  return finalArr.join(" | ");
}

function intersectionize(values: string[] | Set<string>, needsParens: boolean): string {
  const unique = new Set(values);

  if (unique.size === 1) {
    const head = [...unique][0];
    if (head) return head;
  }

  if (unique.has("any")) return "any";
  if (unique.has("never")) return "never";

  if (unique.has("unknown")) {
    unique.delete("unknown");
    return unionize(unique, needsParens);
  }

  const finalArr = [...unique];

  if (needsParens) return `(${finalArr.join(" & ")})`;

  return finalArr.join(" & ");
}
