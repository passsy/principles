import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isComment, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["guard clause", "guard clauses", "inline return", "inline returns", "early exit", "early exits"]);
    }
  },
});

// `if (cond) return;` on a single line, in code the agent just wrote. Legacy
// inline guards are not this change's business. Mapper-style blocks may keep
// multiple small condition-result pairs inline.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      const exit = /^(return|throw)(?:;$| )/.exec(afterIfCondition(written.text))?.[1];
      if (!exit) {
        continue;
      }
      if (exit === "return" && isMapperStyleReturn(event.lines, written.line - 1)) {
        continue;
      }
      yield { line: written.line };
    }
  },
});

/** What follows the condition of an `if (...)` on the same line, trimmed. Empty when the line has no such `if`. */
function afterIfCondition(line: string): string {
  const at = /(?<![\p{L}\p{N}_$.])if(?![\p{L}\p{N}_$])/u.exec(line)?.index;
  if (at === undefined) {
    return "";
  }
  const open = line.indexOf("(", at);
  if (open === -1) {
    return "";
  }
  // The `)` that closes the condition. A condition that closes on a later line is no inline exit.
  let depth = 0;
  for (let i = open; i < line.length; i++) {
    if (line[i] === "(") {
      depth++;
    } else if (line[i] === ")") {
      depth--;
      if (depth === 0) {
        return line.slice(i + 1).trim();
      }
    }
  }
  return "";
}

function isInlineValueReturn(line: string): boolean {
  return /^return\s+.+;\s*$/.test(afterIfCondition(line));
}

/** Index of the line that opens the block around `findingLine`, or -1. */
function enclosingBlockStart(lines: readonly string[], findingLine: number): number {
  let nestedBlocks = 0;
  for (let line = findingLine - 1; line >= 0; line -= 1) {
    const source = lines[line] ?? "";
    for (let column = source.length - 1; column >= 0; column -= 1) {
      if (source[column] === "}") {
        nestedBlocks += 1;
      } else if (source[column] === "{") {
        if (nestedBlocks === 0) {
          return line;
        }
        nestedBlocks -= 1;
      }
    }
  }
  return -1;
}

/**
 * Allow multiple condition-result pairs in the same mapper-style block.
 * Supporting statements such as logging and a fallback return are irrelevant.
 */
function isMapperStyleReturn(lines: readonly string[], findingLine: number): boolean {
  if (!isInlineValueReturn(lines[findingLine] ?? "")) {
    return false;
  }
  const start = enclosingBlockStart(lines, findingLine);
  if (start === -1) {
    return false;
  }
  let depth = 1;
  let mappings = 0;
  for (let line = start + 1; line < lines.length; line += 1) {
    const source = lines[line] ?? "";
    if (depth === 1 && isInlineValueReturn(source)) {
      mappings += 1;
    }
    for (const char of source) {
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return mappings >= 2;
        }
      }
    }
  }
  return false;
}
