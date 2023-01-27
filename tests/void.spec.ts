import { describe, expect, it } from "vitest";
import t from "../src";
import { assertEqual } from "./_utils";

describe("TVoid", () => {
  it("works", () => {
    const s = t.void();

    // Parses
    s.parse(undefined);

    // Fails
    expect(() => s.parse(null)).toThrow();
    expect(() => s.parse("")).toThrow();

    // Inference
    assertEqual<t.infer<typeof s>, void>(true);
  });
});
