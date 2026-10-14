import { onWrite } from "@wellactually/sdk/v3";
import { DART, isComment } from "dart-kit";

/**
 * Fires on every `if` the agent wrote or touched whose condition joins
 * clauses with `&&`.
 *
 * Whether the clauses are one question is a reading of meaning, which no
 * scanner has. So this does not try to convict: it reminds at the moment the
 * choice between joining and nesting is being made, and leaves the answer to
 * the writer.
 *
 * A condition is read from the file, from its opening parenthesis to the
 * matching one, over as many lines as it takes, so it does not matter where
 * the formatter put the `&&`. An edit that only adds `&& isVisible` on a
 * continuation line still finds the `if` it belongs to, a line above what was
 * written. It has no word trigger: nobody announces that they are about to
 * join two conditions.
 */
onWrite({
  globs: DART,
  *detect(event) {
    // A comment line is left out, so an if that is commented out is not read.
    const code: string[] = [];
    for (const line of event.lines) {
      if (isComment(line)) {
        code.push("");
      } else {
        code.push(line);
      }
    }
    for (let start = 0; start < code.length; start++) {
      // An `if (`, up to and including its opening parenthesis.
      for (const open of (code[start] ?? "").matchAll(/(?:^|[^\w$.])if\s*\(/g)) {
        const end = joinedConditionEnd(code, start, open.index + open[0].length);
        if (end === null) {
          continue;
        }
        const touched = event.written.some(({ line }) => line >= start + 1 && line <= end + 1);
        if (touched) {
          yield { line: start + 1 };
        }
      }
    }
  },
});

/**
 * The index of the line on which the condition opened at `line`, `column`
 * closes, when that condition contains an `&&`. Null when it has none or never
 * closes. Comment lines are already empty in `lines`. A parenthesis or an
 * `&&` inside a string is read as code.
 */
function joinedConditionEnd(lines: readonly string[], line: number, column: number): number | null {
  let depth = 0;
  let joined = false;
  for (let index = line; index < lines.length; index++) {
    const code = lines[index] ?? "";
    let from = 0;
    if (index === line) {
      from = column;
    }
    for (let at = from; at < code.length; at++) {
      const char = code[at];
      if (char === "(") {
        depth++;
        continue;
      }
      if (char === ")") {
        if (depth === 0) {
          if (joined) {
            return index;
          }
          return null;
        }
        depth--;
        continue;
      }
      if (char === "&" && code[at + 1] === "&") {
        joined = true;
      }
    }
  }
  return null;
}
