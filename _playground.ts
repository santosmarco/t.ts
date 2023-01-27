import util from "util";

import { t } from "./src";

const Person = t.object({
  name: t.string({
    messages: {
      "base.required": "Name is required",
    },
  }),
  age: t.number({
    messages: {
      "base.invalid_type": "Age must be a number",
    },
  }),
});

console.log(t.null().isNullish);
