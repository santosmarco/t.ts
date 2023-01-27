import { describe, expect, it } from "vitest";

import t from "../src";
import { assertEqual } from "./_utils";

const testTuple = t.tuple([t.string(), t.object({ name: t.literal("foo") }), t.array(t.literal("bar"))]);
const goodData = ["baz", { name: "foo" }, ["bar"]];
const badData = [123, { name: "bar" }, ["foo", "baz"]];

describe("TTuple", () => {
  it("parses", () => {
    const result = testTuple.parse(goodData);
    expect(result).toEqual(["baz", { name: "foo" }, ["bar"]]);
  });

  it("parses async", async () => {
    const result = await testTuple.parseAsync(goodData);
    expect(result).toEqual(["baz", { name: "foo" }, ["bar"]]);
  });

  // it("parses optional elements", () => {
  //   const result = t.tuple([t.string(), t.number().optional()]).safeParse(["foo"]);
  //   expect(result).toEqual(["foo"]);
  // });

  it("fails", () => {
    const result = testTuple.safeParse(badData);
    expect(result.ok).toEqual(false);
    expect(result.error?.issues).toStrictEqual([
      {
        data: 123,
        kind: "base.invalid_type",
        label: "value[0]",
        message: "Expected string, received number",
        path: [0],
        payload: { expected: "string", received: "number" },
      },
      {
        data: "bar",
        kind: "literal.invalid",
        label: "value[1].name",
        message: 'Expected the literal value `"foo"`, received `"bar"`',
        path: [1, "name"],
        payload: { expected: "foo", received: { value: "bar" } },
      },
      {
        data: "foo",
        kind: "literal.invalid",
        label: "value[2][0]",
        message: 'Expected the literal value `"bar"`, received `"foo"`',
        path: [2, 0],
        payload: { expected: "bar", received: { value: "foo" } },
      },
      {
        data: "baz",
        kind: "literal.invalid",
        label: "value[2][1]",
        message: 'Expected the literal value `"bar"`, received `"baz"`',
        path: [2, 1],
        payload: { expected: "bar", received: { value: "baz" } },
      },
    ]);
  });

  it("fails async", async () => {
    const result = await testTuple.safeParseAsync(badData);
    expect(result.ok).toEqual(false);
    expect(result.error?.issues).toStrictEqual([
      {
        data: 123,
        kind: "base.invalid_type",
        label: "value[0]",
        message: "Expected string, received number",
        path: [0],
        payload: { expected: "string", received: "number" },
      },
      {
        data: "bar",
        kind: "literal.invalid",
        label: "value[1].name",
        message: 'Expected the literal value `"foo"`, received `"bar"`',
        path: [1, "name"],
        payload: { expected: "foo", received: { value: "bar" } },
      },
      {
        data: "foo",
        kind: "literal.invalid",
        label: "value[2][0]",
        message: 'Expected the literal value `"bar"`, received `"foo"`',
        path: [2, 0],
        payload: { expected: "bar", received: { value: "foo" } },
      },
      {
        data: "baz",
        kind: "literal.invalid",
        label: "value[2][1]",
        message: 'Expected the literal value `"bar"`, received `"baz"`',
        path: [2, 1],
        payload: { expected: "bar", received: { value: "baz" } },
      },
    ]);
  });

  it("fails given sparse arrays", () => {
    const result = testTuple.safeParse(new Array(3));
    expect(result.error?.issues).toStrictEqual([
      {
        data: undefined,
        kind: "base.required",
        label: "value[0]",
        message: "Required",
        path: [0],
      },
      {
        data: undefined,
        kind: "base.required",
        label: "value[1]",
        message: "Required",
        path: [1],
      },
      {
        data: undefined,
        kind: "base.required",
        label: "value[2]",
        message: "Required",
        path: [2],
      },
    ]);
  });

  it("with transformers", () => {
    const stringToNumber = t.string().transform((x) => x.length);
    const schema = t.tuple([stringToNumber]);
    expect(schema.parse(["foo"])).toEqual([3]);
    assertEqual<t.input<typeof schema>, [string]>(true);
    assertEqual<t.output<typeof schema>, [number]>(true);
  });

  it("with rest", () => {
    const schema = t.tuple([t.string(), t.number()]).rest(t.boolean());
    expect(schema.parse(["foo", 123, true, false, true])).toEqual(["foo", 123, true, false, true]);
    expect(schema.parse(["foo", 123])).toEqual(["foo", 123]);
    expect(() => schema.parse(["foo", 123, "foo"])).toThrow();
    assertEqual<t.output<typeof schema>, [string, number, ...boolean[]]>(true);
  });

  it("inference", () => {
    // const args1 = t.tuple([t.string()]);
    // const returns1 = t.number();
    // const func1 = t.function(args1, returns1);
    // type func1 = t.TypeOf<typeof func1>;
    // util.assertEqual<func1, (k: string) => number>(true);
  });
});
