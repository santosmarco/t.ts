import { toNestError, validateFieldsNatively } from '@hookform/resolvers'
import {
  appendErrors,
  type FieldError,
  type FieldErrors,
  type FieldValues,
  type ResolverOptions,
  type ResolverResult,
} from 'react-hook-form'
import t from '../../index'

export type Resolver = <T extends t.AnyTType>(
  schema: T,
  schemaOptions?: t.TOptions,
  resolverOptions?: {
    readonly mode?: 'async' | 'sync'
    readonly rawValues?: boolean
  }
) => <TFieldValues extends FieldValues, TContext>(
  values: TFieldValues,
  _ctx: TContext | undefined,
  options: ResolverOptions<TFieldValues>
) => Promise<ResolverResult<TFieldValues>>

export const resolver: Resolver =
  (schema, schemaOptions, resolverOptions) => async (values, _ctx, options) => {
    const res = await schema[
      resolverOptions?.mode === 'sync' ? 'safeParse' : 'safeParseAsync'
    ](values, schemaOptions)

    if (options.shouldUseNativeValidation) {
      validateFieldsNatively({}, options)
    }

    if (res.ok) {
      return {
        errors: {} as FieldErrors,
        values: resolverOptions?.rawValues ? values : res.data,
      }
    }

    return {
      values: {},
      errors: toNestError(
        parseIssues(
          [...res.error.issues],
          !options.shouldUseNativeValidation && options.criteriaMode === 'all'
        ),
        options
      ),
    }
  }

function parseIssues(issues: t.TIssue[], validateAllFieldCriteria: boolean) {
  const errors: Record<string, FieldError> = {}
  for (; issues.length; ) {
    const iss = issues[0]

    if (!iss) {
      break
    }

    const path = iss.path.join('.')

    if (!errors[path]) {
      if (iss.kind === t.TIssueKind.Union.Invalid) {
        const firstUnionIssue = iss.payload.errors[0]?.issues[0]

        if (!firstUnionIssue) {
          break
        }

        errors[path] = {
          type: firstUnionIssue.kind,
          message: firstUnionIssue.message,
        }
      } else {
        errors[path] = {
          type: iss.kind,
          message: iss.message,
        }
      }
    }

    if (iss.kind === t.TIssueKind.Union.Invalid) {
      iss.payload.errors.forEach(unionError => {
        unionError.issues.forEach(iss_ => issues.push(iss_))
      })
    }

    if (validateAllFieldCriteria) {
      const { types } = errors[path] ?? {}
      const message = types?.[iss.kind]

      errors[path] = appendErrors(
        path,
        validateAllFieldCriteria,
        errors,
        iss.kind,
        message ? message : iss.message
      ) as FieldError
    }

    issues.shift()
  }

  return errors
}
