import { describe, expect, it } from "vitest";
import { TCheckKind, validateMax, validateMin, validateRange } from "../src/checks";

describe("TChecks", () => {
  describe("validateMin", () => {
    it("validates inclusive min", () => {
      const value = 1;
      const check = { kind: TCheckKind.Min, value: 1, inclusive: true, message: undefined };
      const result = validateMin(value, check);
      expect(result).toBe(true);
    });

    it("validates exclusive min", () => {
      const value = 1;
      const check = { kind: TCheckKind.Min, value: 1, inclusive: false, message: undefined };
      const result = validateMin(value, check);
      expect(result).toBe(false);
    });
  });

  describe("validateMax", () => {
    it("validates inclusive max", () => {
      const value = 1;
      const check = { kind: TCheckKind.Max, value: 1, inclusive: true, message: undefined };
      const result = validateMax(value, check);
      expect(result).toBe(true);
    });

    it("validates exclusive max", () => {
      const value = 1;
      const check = { kind: TCheckKind.Max, value: 1, inclusive: false, message: undefined };
      const result = validateMax(value, check);
      expect(result).toBe(false);
    });
  });

  describe("validateRange", () => {
    it("validates inclusive min, exclusive max range", () => {
      const goodValue = 1;
      const badValue = 3;
      const check = { kind: TCheckKind.Range, min: 1, max: 3, inclusive: "[)" as const, message: undefined };
      const goodResult = validateRange(goodValue, check);
      const badResult = validateRange(badValue, check);
      expect(goodResult).toBe(true);
      expect(badResult).toBe(false);
    });

    it("validates exclusive min, inclusive max range", () => {
      const goodValue = 3;
      const badValue = 1;
      const check = { kind: TCheckKind.Range, min: 1, max: 3, inclusive: "(]" as const, message: undefined };
      const goodResult = validateRange(goodValue, check);
      const badResult = validateRange(badValue, check);
      expect(goodResult).toBe(true);
      expect(badResult).toBe(false);
    });

    it("validates inclusive min, inclusive max range", () => {
      const goodValue1 = 1;
      const goodValue2 = 3;
      const badValue1 = 0;
      const badValue2 = 4;
      const check = { kind: TCheckKind.Range, min: 1, max: 3, inclusive: "[]" as const, message: undefined };
      const goodResult1 = validateRange(goodValue1, check);
      const goodResult2 = validateRange(goodValue2, check);
      const badResult1 = validateRange(badValue1, check);
      const badResult2 = validateRange(badValue2, check);
      expect(goodResult1).toBe(true);
      expect(goodResult2).toBe(true);
      expect(badResult1).toBe(false);
      expect(badResult2).toBe(false);
    });

    it("validates exclusive min, exclusive max range", () => {
      const goodValue = 2;
      const badValue1 = 1;
      const badValue2 = 3;
      const check = { kind: TCheckKind.Range, min: 1, max: 3, inclusive: "()" as const, message: undefined };
      const goodResult = validateRange(goodValue, check);
      const badResult1 = validateRange(badValue1, check);
      const badResult2 = validateRange(badValue2, check);
      expect(goodResult).toBe(true);
      expect(badResult1).toBe(false);
      expect(badResult2).toBe(false);
    });
  });
});
