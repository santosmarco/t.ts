import {
  AnyTArray,
  AnyTEffects,
  AnyTTuple,
  AnyTType,
  TAny,
  TArray,
  TBigInt,
  TBoolean,
  TBrand,
  TBuffer,
  TCatch,
  TCustom,
  TDate,
  TDefault,
  TDefined,
  TEffectKind,
  TEffects,
  TEnum,
  TFalse,
  TInstanceOf,
  TLazy,
  TLiteral,
  TMap,
  TNaN,
  TNativeEnum,
  TNever,
  TNonNullable,
  TNull,
  TNullable,
  TNumber,
  TObject,
  TObjectShape,
  TOptional,
  TPipeline,
  TPromise,
  TRecord,
  TSet,
  TString,
  TSymbol,
  TTrue,
  TTuple,
  TUndefined,
  TUnion,
  TUnknown,
  TVoid,
} from "./types";
import { printValue } from "./utils/print-value";

export function TShow(t: AnyTType, needsParens = false): string {
  if (t instanceof TAny) return "any";
  if (t instanceof TArray) return showTArray(t);
  if (t instanceof TBigInt) return "bigint";
  if (t instanceof TBoolean) return "boolean";
  if (t instanceof TBrand) return `t.BRANDED<${TShow(t.underlying)}, ${printValue(t.brandValue)}>`;
  if (t instanceof TBuffer) return "Buffer";
  if (t instanceof TCatch) return `Caught<${TShow(t.underlying)}, ${printValue(t.catchValue)}>`;
  if (t instanceof TCustom) return "TCustom";
  if (t instanceof TDate) return "Date";
  if (t instanceof TDefault) return `Defaulted<${TShow(t.underlying)}, ${printValue(t.defaultValue)}>`;
  if (t instanceof TDefined) return `Defined<${TShow(t.unwrapDeep())}>`;
  if (t instanceof TEffects) return showTEffects(t);
  if (t instanceof TEnum) return showTEnum(t.values, needsParens);
  if (t instanceof TFalse) return "false";
  if (t instanceof TInstanceOf) return `instanceof ${t.ctor.name}`;
  if (t instanceof TLazy) return `Lazy<${TShow(t.unwrapDeep())}>`;
  if (t instanceof TLiteral) return printValue(t.value);
  if (t instanceof TMap) return `Map<${TShow(t.keys)}, ${TShow(t.values)}>`;
  if (t instanceof TNaN) return "NaN";
  if (t instanceof TNativeEnum) return showTEnum(t.values, needsParens);
  if (t instanceof TNever) return "never";
  if (t instanceof TNonNullable) return `NonNullable<${TShow(t.unwrapDeep())}>`;
  if (t instanceof TNull) return "null";
  if (t instanceof TNullable) return unionize([TShow(t.unwrapDeep()), "null"], needsParens);
  if (t instanceof TNumber) return t.isInteger ? "integer" : "number";
  if (t instanceof TObject) return showTObject(t.shape);
  if (t instanceof TOptional) return unionize([TShow(t.unwrapDeep()), "undefined"], needsParens);
  if (t instanceof TPipeline) return `Pipeline<${TShow(t.from)}, ${TShow(t.to)}>`;
  if (t instanceof TPromise) return `Promise<${TShow(t.unwrapDeep())}>`;
  if (t instanceof TRecord) return `Record<${TShow(t.keys)}, ${TShow(t.values)}>`;
  if (t instanceof TSet) return `Set<${TShow(t.element)}>`;
  if (t instanceof TString) return "string";
  if (t instanceof TSymbol) return "symbol";
  if (t instanceof TTrue) return "true";
  if (t instanceof TTuple) return showTTuple(t);
  if (t instanceof TUndefined) return "undefined";
  if (t instanceof TUnion) return showTUnion(t.flatten().types, needsParens);
  if (t instanceof TUnknown) return "unknown";
  if (t instanceof TVoid) return "void";
}

function showTArray(t: AnyTArray) {
  if (t.isNonEmpty) {
    return `[${TShow(t.element)}, ...${TShow(t.element, true)}[]]`;
  }
  return `${TShow(t.element, true)}[]`;
}

function showTEffects(t: AnyTEffects) {
  return `with${
    {
      [TEffectKind.Preprocess]: "Preprocessor",
      [TEffectKind.Refinement]: "Refinement",
      [TEffectKind.Transform]: "Transform",
    }[t.effect.kind]
  }<${TShow(t.unwrapDeep())}>`;
}

function showTEnum(values: readonly (string | number)[], needsParens: boolean) {
  return unionize(
    values.map((v) => printValue(v)),
    needsParens
  );
}

function showTObject(shape: TObjectShape) {
  return `{ ${Object.entries(shape)
    .map(([k, v]) => `${k}: ${TShow(v)}`)
    .join(", ")} }`;
}

function showTTuple(t: AnyTTuple) {
  return `[${t.items.map((e) => TShow(e)).join(", ")}${t.restType ? `, ...${TShow(t.restType, true)}[]` : ""}]`;
}

function showTUnion(values: readonly AnyTType[], needsParens: boolean) {
  return unionize(
    values.map((v) => TShow(v)),
    needsParens
  );
}

function unionize(values: string[] | Set<string>, needsParens: boolean): string {
  // const betweenBrackets = [...values]
  //   .map((v) => v.match(/<([^<]*[^>]*)>/))
  //   .filter((v): v is NonNullable<typeof v> => !!v);

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
