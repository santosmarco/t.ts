import { useForm as useFormOriginal, type UseFormProps, type UseFormReturn } from "react-hook-form";
import type t from "../../index";
import type { utils } from "../../utils";
import { resolver } from "./resolver";

export function useForm<T extends t.AnyTType>(
  schema: T,
  options?: {
    readonly schemaOptions?: Partial<T["options"]>;
    readonly resolverOptions?: {
      readonly mode?: "async" | "sync";
      readonly rawValues?: boolean;
    };
    readonly props?: utils.Except<UseFormProps<t.input<T>, Record<string, never>>, "resolver">;
  }
) {
  const form: UseFormReturn<t.output<T>, Record<string, never>> = useFormOriginal<t.input<T>, Record<string, never>>({
    ...options?.props,
    resolver: resolver(schema, options?.schemaOptions, options?.resolverOptions),
  });

  return form;
}
