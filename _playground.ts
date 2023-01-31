// Import util from "util";

import { never, t } from "./src";

const Person = t.object({
  name: t.string().min(1, { message: "Name is required" }),
  age: t.number().min(0, { message: "Age must be positive" }).max(100, { message: "Age must be less than 100" }),
  test: t
    .set(
      t
        .array(
          t.object({
            a: t.string(),
          })
        )
        .or(t.string().pipe(t.literal("a")))
    )
    .deepPartial(),
});

type Person = t.infer<typeof Person>;

console.log(
  Person.safeParse({ name: "a", age: 1, test: new Set([undefined]) }),
  Person.shape.test.element.underlying.types
);
