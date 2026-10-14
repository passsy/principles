import { onWrite } from "@wellactually/sdk/v3";
import { DART, isComment } from "dart-kit";

/**
 * No word list: nobody discusses arrow bodies in prose. A written line ending
 * in `=>` is a lambda whose body starts on the next line, which is exactly the
 * multi-line arrow the rule replaces with braces.
 *
 * A switch-expression arm also breaks after `=>`, and arms cannot take
 * braces. Only lambdas and function bodies are this rule's business.
 */
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (!written.text.trim().endsWith("=>")) {
        continue;
      }
      const inSwitch = enclosingOpener(event.lines, written.line - 1)?.includes("switch");
      if (!inSwitch) {
        yield { line: written.line };
      }
    }
  },
});

/** The nearest unmatched `{` above `index`: the block this line lives in. */
function enclosingOpener(lines: readonly string[], index: number): string | null {
  let depth = 0;
  for (let at = index; at >= 0; at--) {
    const line = lines[at] ?? "";
    for (let i = line.length - 1; i >= 0; i--) {
      const char = line[i];
      if (char === "}") {
        depth++;
      } else if (char === "{") {
        if (depth === 0) {
          return line;
        }
        depth--;
      }
    }
  }
  return null;
}
