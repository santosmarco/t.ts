import { describe, expect, it } from "vitest";
import t from "../src";

describe("TUnion", () => {
  it("fails", () => {
    const result1 = t.union([t.string().refine(() => false), t.number().refine(() => false)]).safeParse("foo");
    expect(result1.ok).toEqual(false);

    const result2 = t.union([t.number(), t.string().refine(() => false)]).safeParse("bar");
    expect(result2.ok).toEqual(false);
  });

  it("returns valid over invalid", () => {
    const schema = t.union([
      t.object({
        email: t.string().email(),
      }),
      t.string(),
    ]);
    expect(schema.parse("foo")).toEqual("foo");
    expect(schema.parse({ email: "foo@bar.com" })).toEqual({ email: "foo@bar.com" });
  });

  it("options getter", async () => {
    const schema = t.union([t.string(), t.number()]);
    schema.types[0].parse("foo");
    schema.types[1].parse(123);
    await schema.types[0].parseAsync("bar");
    await schema.types[1].parseAsync(456);
  });

  it("readonly union options", async () => {
    const options = [t.string(), t.number()] as const;
    const schema = t.union(options);
    schema.parse("foo");
    schema.parse(123);
  });
});
