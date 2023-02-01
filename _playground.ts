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

type Person = t.infer<typeof Person>;

// console.log(Person.show({ colors: true }), Person.safeParse({ a: "2", 2: "3" }));

const a = t.tuple([
  t.string().transform(
    async (val) =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(val + "a");
        }, 4000);
      })
  ),
  t.string().transform(
    async (val) =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(val + "b");
        }, 1000);
      })
  ),
]);
type a = t.infer<typeof a>;

console.log(a.parseAsync(["a", "b"]).then(console.log));
