import { t } from "./src";

const a = t
  .not(t.string().optional(), "a")
  .or(t.string().optional(), t.undefined(), t.null(), t.void(), t.union([t.promise(t.nullable(t.string())), t.null()]));
type a = t.infer<typeof a>;
console.log(a.parse({}));

const form = t.useForm(
  t.object({
    a: a,
  }),
  {
    formProps: {
      defaultValues: {},
    },
  }
);

form.setValue("a");
