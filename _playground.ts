import joi from "joi";
import { t } from "./src";
import { kindOf } from "./src/utils";

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
// // Console.log(joi.object().pattern(/aaa/, joi.string()).validate({ a: 2 }, { stripUnknown: false }).error.details);

// console.log(t.literal(true).warnOnly().safeParse(false));
function a() {}
console.log(
  t
    .map(t.string().optional(), t.number())
    .array()
    .safeParse([new Map([[new Set(["a"]), 1]])]),
  kindOf(() => "a"),
  new WeakMap([[{ b: 3 }, { a: 2 }]]),
  new Set(["a"]),
  new Error("a").toString(),
  String(/abc/),
  String(Number("b")),
  String(Buffer.from("a"))
);
