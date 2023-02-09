import { _ } from "./utils";

export type TSpec = {
  readonly optional: boolean;
  readonly nullable: boolean;
} & Record<string, unknown>;

export function TSpec() {
  const defaultSpec = _.asConst({
    optional: false,
    nullable: false,
  }) satisfies TSpec;

  return _.asConst({
    Default: defaultSpec,
    Optional: {
      ...defaultSpec,
      optional: true,
    },
    Nullable: {
      ...defaultSpec,
      nullable: true,
    },
    Nullish: {
      optional: true,
      nullable: true,
    },
    Never: {
      ...defaultSpec,
      forbidden: true,
    },
    MakeOptional<T extends TSpec>(spec: T) {
      return _.merge(
        spec,
        _.asConst({
          optional: true,
          nullable: _.extractProp(spec, "nullable"),
        })
      );
    },
    MakeNullable<T extends TSpec>(spec: T) {
      return _.merge(
        spec,
        _.asConst({
          nullable: true,
          optional: _.extractProp(spec, "optional"),
        })
      );
    },
  });
}
