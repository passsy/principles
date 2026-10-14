import { type Finding, onWrite, type WrittenLine } from "@wellactually/sdk/v3";
import { matchParen } from "dart-kit";

/**
 * Written lines that substitute a value for a failure or an absence. Only
 * the lines the agent wrote are read: a legacy catch it walked past is not
 * this change's business.
 *
 * The globs are the languages whose error handling and null-coalescing shapes
 * read the same way, so one scanner is precise for all of them. Python's
 * except blocks are indentation, not braces, and are left out rather than
 * guessed. Generated code is nobody's decision, and a fallback in a test
 * cannot reach a user.
 *
 * No prompt handler: the decision shows up in the file, and "fallback" in
 * conversation is as often a font, a route, or a config default.
 */
onWrite({
  globs: ["**/*.{dart,ts,tsx,mts,cts,js,jsx,mjs,cjs,kt,kts,swift,java,cs,php,scala}", "!**/*.{g,freezed,gr,config,mocks}.dart", "!**/test/**", "!**/*_test.dart"],
  *detect(event) {
    for (const [at, written] of event.written.entries()) {
      const returned = returnedFrom(event.written, at);
      if (returned) {
        yield returned;
        continue;
      }
      if (handsBackValue(written.text) || coalescesToLiteral(written, event.file.ext)) {
        yield { line: written.line };
      }
    }
  },
});

/**
 * A return carrying a substitute. A bare `return` or `return null` hands
 * back absence, which the caller has to handle, and a bool is an answer to
 * a question rather than a stand-in for a result. Anything else replaces
 * the result that failed.
 */
const RETURNS_VALUE = /\breturn\s+(?!(?:null|nil|undefined|true|false)\s*;?\s*$)\S/;

/** The first `return <value>` inside the block a catch opens at `from`. */
function returnedFrom(lines: WrittenLine[], from: number): Finding | null {
  const first = lines[from]?.text ?? "";
  // A catch clause opening a block.
  const brace = /\bcatch\b[^{]*\{/.exec(first);
  if (!brace) {
    return null;
  }
  const opensAt = first.indexOf("{", brace.index);
  let depth = 0;
  for (let at = from; at < lines.length; at++) {
    const line = lines[at]!;
    let text = line.text;
    if (at === from) {
      text = line.text.slice(opensAt);
    }
    if (RETURNS_VALUE.test(text)) {
      return { line: line.line };
    }
    depth += braceDelta(text);
    if (depth <= 0) {
      return null;
    }
  }
  return null;
}

function braceDelta(code: string): number {
  let depth = 0;
  for (const char of code) {
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
    }
  }
  return depth;
}

/** `.catch((e) => cached)`: the handler hands back a plain value. */
function handsBackValue(code: string): boolean {
  const argument = handlerArgument(code);
  if (argument === null) {
    return false;
  }
  const arrow = /^\s*(?:\([^)]*\)|\w+)\s*=>\s*(.*)$/.exec(argument);
  return arrow !== null && isPlainValue(arrow[1] ?? "");
}

/** The handler argument text, when a handler opens on this line. */
function handlerArgument(code: string): string | null {
  // A promise or future error handler written as an expression: `.catch(`,
  // `.catchError(`, Dart's `onError:` and `onTimeout:` parameters.
  const at = /\.catch(?:Error)?\(|\b(?:onError|onTimeout):\s*/.exec(code);
  if (!at) {
    return null;
  }
  const open = code.indexOf("(", at.index);
  if (at[0].startsWith(".")) {
    const close = matchParen(code, open);
    if (close === -1) {
      return code.slice(open + 1);
    }
    return code.slice(open + 1, close);
  }
  return code.slice(at.index + at[0].length);
}

/**
 * What a substitute looks like as an arrow body: a name, a literal, a
 * collection. Anything with a call in it is handling the error rather than
 * replacing the result, and a throw is not a fallback at all.
 */
function isPlainValue(body: string): boolean {
  const value = body.trim().replace(/[,;)\s]+$/, "");
  if (value === "" || value.includes("(")) {
    return false;
  }
  return !/^(?:\{|null\b|undefined\b|nil\b|throw\b|rethrow\b)/.test(value);
}

/**
 * `user.name ?? "Hans"`: a null-coalescing default that is a non-empty
 * string literal, which is made-up data about to be shown as real. An
 * empty string is a blank, not a claim, and a name on the right is a
 * value somebody chose, so neither counts. Kotlin spells the operator
 * `?:`, which in TypeScript is an optional property, so it is only read
 * in Kotlin files.
 *
 * The literal is blanked in `code`, so the operator is found there and the
 * quote is read from `text` at the same position.
 */
function coalescesToLiteral(line: WrittenLine, ext: string): boolean {
  let operator = /\?\?/g;
  if (ext === ".kt" || ext === ".kts") {
    operator = /\?[?:]/g;
  }
  for (const match of line.text.matchAll(operator)) {
    const after = line.text.slice(match.index + match[0].length);
    if (/^\s*r?(['"])(?!\1)/.test(after)) {
      return true;
    }
  }
  return false;
}
