import { TTypeName, type AnyTType } from "./types";

export type TSpec = {
  readonly optional: boolean;
  readonly nullable: boolean;
  readonly readonly: boolean;
};

export function isOptional(t: AnyTType): boolean {
  if (t.isT(TTypeName.Brand, TTypeName.Lazy, TTypeName.Nullable, TTypeName.Readonly)) {
    return isOptional(t.unwrapDeep());
  }

  if (
    t.isT(
      TTypeName.Any,
      TTypeName.Catch,
      TTypeName.Default,
      TTypeName.Optional,
      TTypeName.Undefined,
      TTypeName.Unknown,
      TTypeName.Void
    )
  ) {
    return true;
  }

  if (t.isT(TTypeName.String, TTypeName.Number) && t.props.coercion === true) {
    return true;
  }

  if (t.isT(TTypeName.Union) && t.flatten().types.some((t_) => isOptional(t_))) {
    return true;
  }

  if (t.isT(TTypeName.Intersection) && t.flatten().types.every((t_) => isOptional(t_))) {
    return true;
  }

  return false;
}

export function isNullable(t: AnyTType): boolean {
  if (t.isT(TTypeName.Brand, TTypeName.Default, TTypeName.Lazy, TTypeName.Optional, TTypeName.Readonly)) {
    return isNullable(t.unwrapDeep());
  }

  if (t.isT(TTypeName.Any, TTypeName.Catch, TTypeName.Null, TTypeName.Nullable, TTypeName.Unknown)) {
    return true;
  }

  if (t.isT(TTypeName.String, TTypeName.Number) && t.props.coercion === true) {
    return true;
  }

  if (t.isT(TTypeName.Union) && t.flatten().types.some((t_) => isNullable(t_))) {
    return true;
  }

  if (t.isT(TTypeName.Intersection) && t.flatten().types.every((t_) => isNullable(t_))) {
    return true;
  }

  return false;
}

export function isReadonly(t: AnyTType): boolean {
  if (t.isT(TTypeName.Brand, TTypeName.Default, TTypeName.Lazy, TTypeName.Nullable, TTypeName.Optional)) {
    return isReadonly(t.unwrapDeep());
  }

  if (t.isT(TTypeName.Union) && t.flatten().types.some((t_) => isReadonly(t_))) {
    return true;
  }

  if (t.isT(TTypeName.Intersection) && t.flatten().types.every((t_) => isReadonly(t_))) {
    return true;
  }

  return Boolean(t.isT(TTypeName.Readonly));
}
