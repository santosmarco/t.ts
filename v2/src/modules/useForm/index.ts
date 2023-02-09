import {
  Field,
  FieldError,
  FieldErrors,
  Ref,
  Resolver,
  ResolverOptions,
  UseFormProps,
  appendErrors,
  get,
  set,
  useForm as useFormOriginal,
  type FieldValues,
} from "react-hook-form";
import { TIssue, TIssueKind } from "../../error";
import { TParseOptions } from "../../options";
import { AnyTType } from "../../types";
import { _ } from "../../utils";

type PartialDeep<T> = T extends _.BuiltIn | FileList | File
  ? T
  : _.Equals<T, unknown> extends 1
  ? T
  : { [K in keyof T]?: PartialDeep<T[K]> };

export type TFormProps<T extends AnyTType<FieldValues, FieldValues>, Ctx extends Record<string, unknown>> = _.Simplify<
  Readonly<
    _.Except<UseFormProps<T["$O"], Ctx>, "defaultValues" | "resolver"> & {
      defaultValues?: PartialDeep<T["$I"]>;
    }
  >
>;

export type TFormResolverProps<T extends AnyTType<FieldValues, FieldValues>, Ctx extends Record<string, unknown>> = {
  readonly formProps?: TFormProps<T, Ctx>;
  readonly mode?: "sync" | "async";
  readonly parseOptions?: _.Except<TParseOptions<Ctx>, "context">;
};

export function useForm<T extends AnyTType<FieldValues, FieldValues>, Ctx extends Record<string, unknown> = never>(
  schema: T,
  props?: TFormResolverProps<T, Ctx>
) {
  return useFormOriginal({
    ...props?.formProps,
    resolver: createResolver(schema, props),
  });
}

function createResolver<T extends AnyTType<FieldValues, FieldValues>, Ctx extends Record<string, unknown>>(
  schema: T,
  { mode = "async", parseOptions = {} }: _.Except<TFormResolverProps<T, Ctx>, "formProps"> = {}
): Resolver<T["$O"], Ctx> {
  return async (values, context, options) => {
    const res = await schema[mode === "sync" ? "safeParse" : "safeParseAsync"](values, {
      ...parseOptions,
      context,
    });

    if (options.shouldUseNativeValidation) {
      validateFieldsNatively({}, options);
    }

    if (res.ok) {
      return {
        errors: {},
        values: res.data,
      };
    }

    return {
      values: {},
      errors: toNestError(
        parseIssues([...res.error.issues], !options.shouldUseNativeValidation && options.criteriaMode === "all"),
        options
      ),
    };
  };
}

function setCustomValidity<T extends FieldValues>(ref: Ref | undefined, fieldPath: string, errors: FieldErrors<T>) {
  if (ref && "reportValidity" in ref) {
    const error = get(errors, fieldPath) as FieldError | undefined;

    ref.setCustomValidity(error?.message ?? "");
    ref.reportValidity();
  }
}

function validateFieldsNatively<T extends FieldValues>(errors: FieldErrors<T>, options: ResolverOptions<T>) {
  for (const fieldPath in options.fields) {
    const field = options.fields[fieldPath];

    if (field && field.ref && "reportValidity" in field.ref) {
      setCustomValidity(field.ref, fieldPath, errors);
    } else if (field?.refs) {
      field.refs.forEach((ref) => setCustomValidity(ref, fieldPath, errors));
    }
  }
}

function toNestError<T extends FieldValues>(errors: FieldErrors<T>, options: ResolverOptions<T>): FieldErrors<T> {
  options.shouldUseNativeValidation && validateFieldsNatively(errors, options);

  const fieldErrors: FieldErrors<T> = {};

  for (const path in errors) {
    const field = get(options.fields, path) as Field["_f"] | undefined;
    const error = errors[path];

    if (error) {
      set(fieldErrors, path, Object.assign(error, { ref: field?.ref }));
    }
  }

  return fieldErrors;
}

function parseIssues<T extends FieldValues>(issues: readonly TIssue[], validateAllFieldCriteria: boolean) {
  const issues_ = [...issues];
  const errors: Record<string, FieldError> = {};

  for (; issues_.length; ) {
    const issue = issues_[0];

    if (!issue) {
      break;
    }

    const path = issue.path.join(".");

    if (!errors[path]) {
      if (issue.kind === TIssueKind.Union.Invalid) {
        const firstUnionIssue = issue.payload.errors[0]?.issues[0];

        if (!firstUnionIssue) {
          continue;
        }

        errors[path] = {
          type: firstUnionIssue.kind,
          message: firstUnionIssue.message,
        };
      } else {
        errors[path] = {
          type: issue.kind,
          message: issue.message,
        };
      }
    }

    if (issue.kind === TIssueKind.Union.Invalid) {
      issue.payload.errors.forEach((unionError) => {
        unionError.issues.forEach((iss) => issues_.push(iss));
      });
    }

    if (validateAllFieldCriteria) {
      const { types } = errors[path] ?? {};
      const message = types?.[issue.kind];

      errors[path] = appendErrors(
        path,
        validateAllFieldCriteria,
        errors,
        issue.kind,
        message || issue.message
      ) as FieldError;
    }

    issues_.shift();
  }

  return errors as FieldErrors<T>;
}
