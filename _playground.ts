import util from "util";

import { t } from "./src";

const Person = t
  .object({
    name: t.string().min(1).max(30),
    age: t.number().min(0).max(120).transform(String),
    email: t.string().email(),
    website: t
      .string()
      .url()
      .optional()
      .refine((v): v is NonNullable<typeof v> => !!v, {
        params: {
          message: "Website is required",
        },
      }),
    // id: t.string().cuid(),
    address: t.object({
      street: t.string().min(1).max(30),
      city: t.string().min(1).max(30),
      state: t.string().min(1).max(30),
      zip: t
        .string()
        .min(1)
        .max(30)
        .transform((v) => v.toUpperCase()),
      country: t.enum(["US", "CA", "MX"]),
    }),
    phone: t.string().pattern(/^(\d{3})-(\d{3})-(\d{4})$/),
    a: t
      .map(t.tuple([t.string(), t.bigint(), t.literal("a")], t.number()).readonly(), t.date().readonly())
      .readonly()
      .promise()
      .promise()
      .readonly(),
    b: t.tuple([t.string(), t.bigint(), t.literal("a")], t.number()),
  })
  .deepPartial()
  .or(t.object({ asdasd: t.string() }));

type PersonOut = t.inferFlattenedError<typeof Person>;
type PersonIn = t.input<typeof Person>;

console.log(
  Person.safeParse({
    name: "marco",
    age: 30,
    email: "marco@gmail.com",
    id: "11",
    website: "https://www.marco.com.br",
    address: {
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip: "12345",
      country: "US",
    },
    phone: "123-456-7890",
  })
);

const rr = t.record(t.enum(["a", "b", "c"]), t.number());

const RR: t.infer<typeof rr> = {};

console.log(
  util.inspect(
    Object.values(Person.shape).map((v) => v.typeName),
    { depth: null }
  ),
  Person.shape.a.underlying.underlying
);
