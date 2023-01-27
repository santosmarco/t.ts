import { t } from "./src";

// Console.log(t.bigint().promise().defined().parseAsync(undefined).then(console.log));

// const arr = console.log(
//   t
//     .never()
//     .warnOnly()
//     .label("number")
//     .messages({
//       "base.required": "required asasd ",
//     })
//     .defined()
//     .nonnullable()
//     .array()
//     .label("aa")
//     .tags("a")
//     .safeParse(["2", undefined], {})
// );

// // type arr = t.infer<typeof arr>;

// console.log(
//   [40, 1, 5, 200].sort(),
//   ["Blue", "Humpback", "Beluga"].sort(),

//   [40, 1, 5, 200].sort((a, b) => (String(a) > String(b) ? 1 : -1)),
//   ["Blue", "Humpback", "Beluga"].sort((a, b) => (String(a) > String(b) ? 1 : -1))
// );

// const a = t.string().tags("a", "b");
// const b = a.tags("c");
// const c = b.tags(t.override, "d");

// console.log(a.manifest, b.manifest, c.options);

// t.record(t.number(), t.number().array())
//   .maxKeys(2)
//   .parseAsync(
//     { 1: [1, "2", 3, 4n], b: [1, "2", 3, 4n], c: [1, "2", 3, 4n], d: [1, "2", 3, 4n], e: Symbol(), [Symbol()]: [1] },
//     { abortEarly: false }
//   )
//   .catch(console.log);
// // // Console.log(joi.object().pattern(/aaa/, joi.string()).validate({ a: 2 }, { stripUnknown: false }).error.details);

// // console.log(t.literal(true).warnOnly().safeParse(false));
// const Person = t
//   .object({
//     name: t.string(),
//     age: t.number(),
//     address: t
//       .object({
//         street: t.string(),
//         city: t.string().promise(),
//       })
//       .partial(["street"]),
//   })
//   .strict();

// type Person = t.infer<typeof Person>;

// console.log(
//   // Person.or(t.union([t.string(), t.number()])).safeParse({
//   //   name: "marco",
//   //   age: 30,
//   //   address: { city: "2" },
//   //   zz: 2n,
//   //   ele: undefined,
//   // })
//   // t
//   //   .object({ a: t.string() })
//   //   .strict()
//   //   .and(t.object({ b: t.string() }))
//   //   .safeParse({ a: "1", b: "2", c: "3" }),
//   t.array(t.bigint()).and(t.array(t.string())).warnOnly().safeParse([1n, 2n, 3n, 5n])
// );

// const c = t.tuple([t.string(), t.bigint(), t.nan()]);
// type c = t.infer<typeof c>;
// type d = bigint[] & string[];

// console.log(c.safeParse(["1", 2n, NaN]));

const tt = t
  .tuple([t.string()], t.buffer())
  .concat(t.tuple([t.number()], t.bigint()))
  .last();
const tt2 = t.tuple([]).last();
console.log(tt, tt.safeParse(["1", 2, Buffer.from("a")]).error);

const a = t.if(t.bigint(), { then: t.bigint(), else: t.number() });
type a = t.infer<typeof a>;

class A extends t.TBuffer {}

console.log(A.create());
