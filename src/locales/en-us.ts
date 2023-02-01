import { TIssueKind, type TIssue } from "../issues";
import { ValueKind, assertNever } from "../utils";
import { printValue } from "../utils/print-value";
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

      // String
      case TIssueKind.String.Min:
        return `Expected ${issue.payload.inclusive ? "at least" : "over"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "character", "characters")}, received ${humanizeNum(
          issue.payload.received
        )}`;
      case TIssueKind.String.Max:
        return `Expected ${issue.payload.inclusive ? "at most" : "under"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "character", "characters")}, received ${humanizeNum(
          issue.payload.received
        )}`;
      case TIssueKind.String.Length:
        return `Expected exactly ${humanizeNum(issue.payload.value)} ${pluralize(
          issue.payload.value,
          "character",
          "characters"
        )}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.String.Range:
        return `Expected between ${humanizeNum(issue.payload.min)} (${
          issue.payload.inclusive.startsWith("[") ? "inclusive" : "exclusive"
        }) and ${humanizeNum(issue.payload.max)} (${
          issue.payload.inclusive.endsWith("]") ? "inclusive" : "exclusive"
        }) ${pluralize(issue.payload.min, "character", "characters")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.String.Pattern:
        return `Expected a string ${issue.payload.type === "enforce" ? "matching" : "not matching"} the pattern ${
          issue.payload.name
        }`;
      case TIssueKind.String.Alphanum:
        return "Expected an alphanumeric string";
      case TIssueKind.String.Email:
        return "Expected a valid email address";
      case TIssueKind.String.Url:
        return "Expected a valid URL";
      case TIssueKind.String.Cuid:
        return "Expected a valid CUID";
      case TIssueKind.String.Uuid:
        return "Expected a valid UUID";
      case TIssueKind.String.Hex:
        return "Expected a valid hexadecimal string";
      case TIssueKind.String.Base64:
        return "Expected a valid base64 string";

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
        return `Expected a number ${
          issue.payload.inclusive ? "greater than or equal to" : "greater than"
        } ${humanizeNum(issue.payload.value)}`;
      case TIssueKind.Number.Max:
        return `Expected a number ${issue.payload.inclusive ? "less than or equal to" : "less than"} ${humanizeNum(
          issue.payload.value
        )}`;
      case TIssueKind.Number.Range:
        return `Expected a number between ${humanizeNum(issue.payload.min)} (${
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

      // Array/Set
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
        return `Expected ${ValueKind.Array} to be sorted`;

      // Tuple
      case TIssueKind.Tuple.Length:
        return `Expected ${
          issue.payload.max === null || issue.payload.min === issue.payload.max
            ? `${issue.payload.max ? "exactly" : "at least"} ${humanizeNum(issue.payload.min)}`
            : `between ${humanizeNum(issue.payload.min)} and ${humanizeNum(issue.payload.max)}`
        } ${pluralize(issue.payload.min, "item", "items")}, received ${humanizeNum(issue.payload.received)}`;

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
        return `Invalid key ${printValue(issue.payload.key, true)} in object: ${printIssues(
          issue.payload.error.issues
        )}`;
      case TIssueKind.Record.MinKeys:
        return `Expected ${issue.payload.inclusive ? "at least" : "over"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "key", "keys")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Record.MaxKeys:
        return `Expected ${issue.payload.inclusive ? "at most" : "under"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "key", "keys")}, received ${humanizeNum(issue.payload.received)}`;

      // Map
      case TIssueKind.Map.InvalidKey:
        return `Invalid key ${printValue(issue.payload.key, true)} in Map: ${printIssues(issue.payload.error.issues)}`;

      // Object
      case TIssueKind.Object.UnknownKeys:
        return `Unknown keys found in object: ${issue.payload.keys.map((k) => printValue(k)).join(", ")}`;
      case TIssueKind.Object.MissingKeys:
        return `Required keys not found in object: ${issue.payload.keys.map((k) => printValue(k)).join(", ")}`;

      // Function
      case TIssueKind.Function.InvalidThisType:
        return `Invalid \`this\` parameter type: ${printIssues(issue.payload.error.issues)}`;
      case TIssueKind.Function.InvalidArguments:
        return `Invalid arguments: ${printIssues(issue.payload.error.issues)}`;
      case TIssueKind.Function.InvalidReturnType:
        return `Invalid return type: ${printIssues(issue.payload.error.issues)}`;

      // Union
      case TIssueKind.Union.Invalid:
        return `{ Invalid union } ${printIssues(
          issue.payload.errors.flatMap((err) => err.issues),
          true
        )}`;

      // Intersection
      case TIssueKind.Intersection.Invalid:
        return `{ Invalid intersection } ${printIssues(
          issue.payload.errors.flatMap((err) => err.issues),
          true
        )}`;

      // Custom
      case TIssueKind.Custom.Invalid:
        return `Custom validation failed${issue.payload?.params ? `: ${printValue(issue.payload.params)}` : ""}`;

      default:
        assertNever(issue);
    }
  },
  defaultLabel: "value",
} as const;

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

function printIssues(issues: readonly TIssue[], includeLabel?: boolean) {
  return issues.map((iss) => `${includeLabel ? `${iss.label}: ` : ""}${iss.message}`).join("; ");
}

export default enUS;
