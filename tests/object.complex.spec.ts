import { describe, expect, it } from "vitest";
import t from "../src";
import { assertEqual } from "./_utils";

describe("TObject > complex", () => {
  const schema = t.object({
    any: t.any(),
    array: t.array(t.string().or(t.bigint(), t.symbol())),
    bigint: t.bigint(),
    boolean: t.boolean(),
    true: t.true(),
    false: t.false(),
    buffer: t.buffer(),
    brandedBuffer: t.buffer().brand("buf"),
    caughtNumber: t.number().catch(123),
    date: t.date(),
    defaultedDate: t.date().default(() => new Date()),
    definedNullish: t.undefined().or(t.null()).defined(),
    stringEnum: t.enum(["a", "b", "c"]),
    numberEnum: t.enum([1, 2, 3]),
    mixedEnum: t.enum(["a", 2, "c"]),
    string: t.string(),
    stringWithCoercion: t.string().coerce(true),
  });

  it("parses", () => {
    expect(
      schema.safeParse({
        any: "foo",
        array: ["bar"],
        bigint: BigInt(1),
        boolean: true,
        true: true,
        false: false,
      })
    ).toStrictEqual({
      any: "foo",
      array: ["bar"],
      bigint: BigInt(1),
      boolean: true,
      true: true,
      false: false,
    });
  });

  it("inference", () => {
    assertEqual<
      t.input<typeof schema>,
      {
        any?: any;
        array: Array<string | bigint | symbol>;
        bigint: bigint;
        boolean: boolean;
        true: true;
        false: false;
        buffer: Buffer;
        brandedBuffer: Buffer;
        caughtNumber?: any;
        date: Date;
        defaultedDate?: Date | undefined;
        definedNullish: null;
        stringEnum: "a" | "b" | "c";
        numberEnum: 1 | 2 | 3;
        mixedEnum: "a" | 2 | "c";
        string: string;
        stringWithCoercion?: any;
      }
    >(true);

    assertEqual<
      t.output<typeof schema>,
      {
        any?: any;
        array: Array<string | bigint | symbol>;
        bigint: bigint;
        boolean: boolean;
        true: true;
        false: false;
        buffer: Buffer;
        brandedBuffer: t.BRANDED<Buffer, "buf">;
        caughtNumber: number;
        date: Date;
        defaultedDate: Date;
        definedNullish: null;
        stringEnum: "a" | "b" | "c";
        numberEnum: 1 | 2 | 3;
        mixedEnum: "a" | 2 | "c";
        string: string;
        stringWithCoercion: string;
      }
    >(true);
  });
});
