import { TIssueKind } from "../issues";
import { assertNever } from "../utils";
import type { TLocale } from "./_base";

const enUS: TLocale = {
  name: "en-US",
  map(issue) {
    switch (issue.kind) {
      case TIssueKind.Base.Required:
        return "Required";
      case TIssueKind.Base.InvalidType:
        return `Expected ${issue.payload.expected}, received ${issue.payload.received}`;
      case TIssueKind.Base.Forbidden:
        return "Forbidden";

      case TIssueKind.Array.Min:
        return `Expected ${issue.payload.inclusive ? "at least" : "over"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "item", "items")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Array.Max:
        return `Expected ${issue.payload.inclusive ? "at most" : "under"} ${humanizeNum(
          issue.payload.value
        )} ${pluralize(issue.payload.value, "item", "items")}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Array.Length:
        return `Expected exactly ${humanizeNum(issue.payload.value)} ${pluralize(
          issue.payload.value,
          "item",
          "items"
        )}, received ${humanizeNum(issue.payload.received)}`;
      case TIssueKind.Array.Unique:
        return `Expected unique items, received ${humanizeNum(issue.payload.duplicates.length)} ${pluralize(
          issue.payload.duplicates.length,
          "duplicate",
          "duplicates"
        )}`;
      case TIssueKind.Array.Sort:
        return "Expected Array to be sorted";

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

export default enUS;
