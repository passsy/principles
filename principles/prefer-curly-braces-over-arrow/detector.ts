import { onWrite } from "@wellactually/detector-sdk/v3";
import { DART, isComment } from "dart-kit";

/**
 * No word list: nobody discusses arrow bodies in prose. An arrow whose body
 * starts on the next line, or opens a bracket it does not close on this line,
 * is exactly the multi-line arrow the rule replaces with braces.
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
      if (!spansLines(written.text)) {
        continue;
      }
      const inSwitch = enclosingOpener(event.lines, written.line - 1)?.includes("switch");
      if (!inSwitch) {
        yield { line: written.line };
      }
    }
  },
});

/**
 * Whether the body after the line's last `=>` continues on the next line: it is
 * empty, or it opens a bracket that the line does not close before the body
 * ends at a `,`, `;` or the bracket around the lambda. A body that is a switch
 * expression is fine, as the advice says.
 */
function spansLines(text: string): boolean {
  const code = text.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  const arrow = code.lastIndexOf("=>");
  if (arrow === -1) {
    return false;
  }
  const body = code.slice(arrow + 2).trim();
  if (body === "") {
    return true;
  }
  if (body.startsWith("switch")) {
    return false;
  }
  let depth = 0;
  for (const char of body) {
    if (char === "(" || char === "[" || char === "{") {
      depth++;
    } else if (char === ")" || char === "]" || char === "}") {
      depth--;
      if (depth < 0) {
        return false;
      }
    } else if ((char === "," || char === ";") && depth === 0) {
      return false;
    }
  }
  return depth > 0;
}

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
