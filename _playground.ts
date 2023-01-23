import { t } from "./src";

console.log(t.bigint().promise().defined().parseAsync(undefined).then(console.log));
