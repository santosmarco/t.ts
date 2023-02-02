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

Person.safeParse(
  {},
  {
    hooks: {
      onIssue(issue, ctx, _ctx) {
        console.log({ issue, ctx, _ctx });
      },
    },
    context: {
      a: 1,
    },
  }
);
