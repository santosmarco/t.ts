import type * as tf from "type-fest";
import type { TError } from "../error";
import { TIssueKind } from "../issues";
import { assertNever } from "../utils";
import type { TLocale } from "./_base";

const enUS: TLocale = {
  name: "en-US",
  map(issue) {
    switch (issue.kind) {
      // Base
      case TIssueKind.Base.Required:
        return "Required";
      case TIssueKind.Base.InvalidType:
        return `Expected ${issue.payload.expected}, received ${issue.payload.received}`;
      case TIssueKind.Base.Forbidden:
        return "Forbidden";

      // Literal
      case TIssueKind.Literal.Invalid:
        return `Expected the literal value ${printValue(issue.payload.expected, true)}, received ${
          "value" in issue.payload.received
            ? printValue(issue.payload.received.value, true)
            : issue.payload.received.type
        }`;

      // Enum
      case TIssueKind.Enum.Invalid:
        return `Expected one of ${issue.payload.expected.map((v) => printValue(v)).join(" | ")}, received ${
          "value" in issue.payload.received ? printValue(issue.payload.received.value) : issue.payload.received.type
        }`;

      // Number
      case TIssueKind.Number.Integer:
        return "Expected integer, received float";
      case TIssueKind.Number.Precision:
        return `Expected ${issue.payload.inclusive ? "at most" : "under"} ${humanizeNum(
          issue.payload.value
        )} decimal ${pluralize(issue.payload.value, "place", "places")}, received ${humanizeNum(
          issue.payload.received
        )}`;
      case TIssueKind.Number.Min:
        return `Expected number to be ${
          issue.payload.inclusive ? "greater than or equal to" : "greater than"
        } ${humanizeNum(issue.payload.value)}`;
      case TIssueKind.Number.Max:
        return `Expected number to be ${issue.payload.inclusive ? "less than or equal to" : "less than"} ${humanizeNum(
          issue.payload.value
        )}`;
      case TIssueKind.Number.Range:
        return `Expected number to be between ${humanizeNum(issue.payload.min)} (${
          issue.payload.inclusive.startsWith("[") ? "inclusive" : "exclusive"
        }) and ${humanizeNum(issue.payload.max)} (${
          issue.payload.inclusive.endsWith("]") ? "inclusive" : "exclusive"
        })`;
      case TIssueKind.Number.Multiple:
        return `Expected a multiple of ${issue.payload.value}`;
      case TIssueKind.Number.Port:
        return "Expected a valid port number (0-65535)";
      case TIssueKind.Number.Safe:
        return "Expected a safe number (Number.MIN_SAFE_INTEGER < x < Number.MAX_SAFE_INTEGER)";
      case TIssueKind.Number.Finite:
        return "Expected a finite number";

      // Array + Set
      case TIssueKind.Array.Min:
      case TIssueKind.Set.Min:
        return `Expected ${issue.payload.inclusive ? "at least" : "over"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "item", "items")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Array.Max:
      case TIssueKind.Set.Max:
        return `Expected ${issue.payload.inclusive ? "at most" : "under"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "item", "items")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Array.Length:
      case TIssueKind.Set.Size:
        return `Expected exactly ${humanizeNum(issue.payload.value)} ${pluralize(
          issue.payload.value,
          "item",
          "items"
        )}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Array.Range:
      case TIssueKind.Set.Range:
        return `Expected between ${humanizeNum(issue.payload.min)} (${
          issue.payload.inclusive.startsWith("[") ? "inclusive" : "exclusive"
        }) and ${humanizeNum(issue.payload.max)} (${
          issue.payload.inclusive.endsWith("]") ? "inclusive" : "exclusive"
        }) ${pluralize(issue.payload.min, "item", "items")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Array.Unique:
        return `Expected unique items, received ${humanizeNum(issue.payload.duplicates.length)} ${pluralize(
          issue.payload.duplicates.length,
          "duplicate",
          "duplicates"
        )}`;
      case TIssueKind.Array.Sort:
        return "Expected Array to be sorted";

      // Buffer
      case TIssueKind.Buffer.Min:
        return `Expected ${issue.payload.inclusive ? "at least" : "over"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "byte", "bytes")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Buffer.Max:
        return `Expected ${issue.payload.inclusive ? "at most" : "under"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "byte", "bytes")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Buffer.Length:
        return `Expected exactly ${humanizeNum(issue.payload.value)} ${pluralize(
          issue.payload.value,
          "byte",
          "bytes"
        )}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Buffer.Range:
        return `Expected between ${humanizeNum(issue.payload.min)} (${
          issue.payload.inclusive.startsWith("[") ? "inclusive" : "exclusive"
        }) and ${humanizeNum(issue.payload.max)} (${
          issue.payload.inclusive.endsWith("]") ? "inclusive" : "exclusive"
        }) ${pluralize(issue.payload.min, "byte", "bytes")}, received ${humanizeNum(issue.payload.received)}`;

      // Record
      case TIssueKind.Record.InvalidKey:
        return `Invalid key [ ${printValue(issue.payload.key)} ] in object: ${printIssues(issue.payload.error)}`;
      case TIssueKind.Record.MinKeys:
        return `Expected ${issue.payload.inclusive ? "at least" : "over"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "key", "keys")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Record.MaxKeys:
        return `Expected ${issue.payload.inclusive ? "at most" : "under"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "key", "keys")}, received ${humanizeNum(issue.payload.received)}`;

      default:
        assertNever(issue);
    }
  },
  defaultLabel: "data",
};

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function humanizeNum(n: number): string {
  return (
    { 0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine" }[
      n
    ] ?? n.toString()
  );
}

function printValue(x: tf.Primitive, backticks?: boolean): string {
  let printed;

  if (x === null || x === undefined || typeof x === "boolean" || typeof x === "number" || typeof x === "symbol") {
    printed = String(x);
  } else if (typeof x === "bigint") {
    printed = `${x}n`;
  } else {
    printed = `"${x}"`;
  }

  return backticks ? `\`${printed}\`` : printed;
}

function printIssues(err: TError) {
  return err.issues.map((iss) => iss.message).join("; ");
}

export default enUS;
