import { describe, expect, it } from "vitest";
import t from "../src";

const schema = t.nan();

describe("TNaN", () => {
  it("parses", () => {
    schema.parse(NaN);
    schema.parse(Number("Not a number"));
  });

  it("fails", () => {
    expect(() => schema.parse(123)).toThrow();
    expect(() => schema.parse("foo")).toThrow();
    expect(() => schema.parse(true)).toThrow();
    expect(() => schema.parse(null)).toThrow();
    expect(() => schema.parse(undefined)).toThrow();
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse([])).toThrow();
  });
});
