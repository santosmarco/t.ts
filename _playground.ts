// Import util from "util";

import { handleUnwrapUntil, t } from "./src";

const Person = t
  .object({
    name: t.string().optional().nullable(),
    age: t.undefined().array().nonempty().readonly(),
  })
  .strictPresence("aaa")
  // .strict()
  .or(t.string().array().readonly(), t.number(), t.never().or(t.never()));

console.log(
  Person.safeParse(
    {},
    {
      hooks: {
        onIssue(issue, ctx, _ctx) {
          console.log({ issue });
          if (ctx.a === 1) {
            return {
              prevent: true,
            };
          }
        },
      },
      context: {
        a: 1,
      },
    }
  )
);
