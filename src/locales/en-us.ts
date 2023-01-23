import { TIssueKind } from "../issues";
import type { TLocale } from "./_base";

const enUS: TLocale = {
  name: "en-US",
  map: (error) => {
    switch (error.kind) {
      case TIssueKind.Base.Required:
        return "Required";
      case TIssueKind.Base.InvalidType:
        return `Expected ${error.payload.expected}, received ${error.payload.received}`;
      case TIssueKind.Base.Forbidden:
        return "Forbidden";
    }
  },
  defaultLabel: "value",
};

export default enUS;
