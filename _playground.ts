import { t } from "./src";

// console.log(t.bigint().promise().defined().parseAsync(undefined).then(console.log));

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

const a = t.string().tags("a", "b");
const b = a.tags("c");
const c = b.tags(t.override, "d");

console.log(a.manifest, b.manifest, c.options);
