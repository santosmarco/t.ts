import chalk from "chalk";
import util from "util";
import { TError } from "../error";
import type { TParseContext, TParseContextPath } from "../parse";
import type { AnyTType } from "../types";

// export type ParseDebug<T extends AnyTType> = ReturnType<typeof initParseDebug<T>>;

export function initParseDebug(ctx: TParseContext<AnyTType>) {
  return {
    get prefix() {
      return this.printPath(ctx.path);
    },

    printPath(path: TParseContextPath) {
      const head = "$root";

      if (path.length === 0) {
        return head;
      }

      const last = path[path.length - 1];

      return `${[head, ...path]
        .slice(0, [head, ...path].length - 1)
        .filter(Boolean)
        .map((x) => this.dim(x))
        .join(".")}.${this.bold(last)}`;
    },

    log(msg: string, data?: Record<string, unknown>) {
      console.log(chalk[ctx.common.color](`[${this.prefix}] ${msg}`));
      if (data) {
        console.log(
          util.inspect(
            Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof TError ? v.issues : v])),
            { depth: Infinity, compact: false, colors: true }
          )
        );
      }
      console.log();
      return this;
    },

    italic: chalk.italic,
    bold: chalk.bold,
    underline: chalk.underline,
    dim: chalk.dim,
    green: chalk.green,
    red: chalk.red,
  };
}
