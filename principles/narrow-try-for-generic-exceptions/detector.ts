import { type Finding, onWrite, type WrittenLine } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS, isComment } from "dart-kit";

/**
 * Typed `on` clauses whose try block holds more than the one call expected
 * to throw. No prompt handler: nobody announces how wide a try block will be.
 *
 * Only what the agent wrote is read, and only a try statement written whole
 * in that fragment: a clause whose try block lies outside it cannot be
 * judged without guessing.
 *
 * Not in tests: a test wrapping the act in `try`, then `fail()`, then a typed
 * clause is asserting the throw, which is the one place a wide typed catch is
 * meant.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    yield* wideTypedCatches(event.written);
  },
});

function* wideTypedCatches(lines: WrittenLine[]): Generator<Finding> {
  if (lines.length === 0) {
    return;
  }
  // A comment line is left out, so a try that is commented out is not read.
  const texts: string[] = [];
  for (const line of lines) {
    if (isComment(line.text)) {
      texts.push("");
    } else {
      texts.push(line.text);
    }
  }
  const code = texts.join("\n");
  const lineAt = (offset: number): WrittenLine | undefined => lines[code.slice(0, offset).split("\n").length - 1];

  for (const match of code.matchAll(/\btry\s*\{/g)) {
    const open = match.index + match[0].length - 1;
    const close = matchBrace(code, open);
    if (close === -1) {
      continue;
    }
    const body = code.slice(open + 1, close);
    for (const clause of onClauses(code, close + 1)) {
      if (!tooWide(clause.type, body)) {
        continue;
      }
      const line = lineAt(clause.at);
      if (line) {
        yield { line: line.line };
      }
    }
  }
}

/**
 * Whether `body` holds more than the one call that throws `type`.
 *
 * A `TimeoutException` can come from every await, so two awaits are already
 * two candidates. The other types are thrown by sync and async calls alike,
 * so two statements that call anything are two candidates. Calls nested in
 * one statement, `Firmware(Version.parse(text))`, still wrap one call site.
 */
function tooWide(type: string, body: string): boolean {
  if (type === "TimeoutException") {
    return (body.match(/\bawait\b/g)?.length ?? 0) >= 2;
  }
  // Exception types pure Dart and the SDK throw from many places, so a clause
  // catching one cannot tell which statement threw it. A broad `on Exception`
  // or a plain `catch` is meant to catch everything and is not this rule's
  // business.
  if (!["FormatException", "StateError", "ArgumentError", "RangeError", "TypeError", "AssertionError", "UnsupportedError"].includes(type)) {
    return false;
  }
  return statements(body).filter(hasCall).length >= 2;
}

/** The body split at semicolons outside parentheses and brackets, nested blocks included. */
function statements(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === "(" || char === "[") {
      depth += 1;
    }
    if (char === ")" || char === "]") {
      depth -= 1;
    }
    if (char === ";" && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  return parts;
}

function hasCall(statement: string): boolean {
  for (const match of statement.matchAll(/\b([A-Za-z_$][\w$]*)\s*(?:<[^()]*>)?\s*\(/g)) {
    // Words followed by `(` that are not calls.
    if (!["if", "for", "while", "switch", "catch", "return", "throw", "await", "yield"].includes(match[1] ?? "")) {
      return true;
    }
  }
  return false;
}

interface OnClause {
  type: string;
  /** Offset of the `on` keyword. */
  at: number;
}

/**
 * The `on Type` clauses following a try block that closes just before
 * `from`, walking `on`, `catch` and `finally` blocks until something else
 * starts.
 */
function onClauses(code: string, from: number): OnClause[] {
  const clauses: OnClause[] = [];
  const clause = /^\s*(?:on\s+([A-Za-z_$][\w$.]*)(?:<[^{]*?>)?\s*)?(?:catch\s*\([^)]*\)\s*)?\{|^\s*finally\s*\{/;
  let at = from;
  for (;;) {
    const rest = code.slice(at);
    const match = clause.exec(rest);
    if (!match || match[0].trim() === "{") {
      return clauses;
    }
    const type = match[1];
    if (type !== undefined) {
      // A prefixed type, `async.TimeoutException`, is still the same type.
      const indent = match[0].length - match[0].trimStart().length;
      clauses.push({ type: type.split(".").at(-1) ?? type, at: at + indent });
    }
    const close = matchBrace(code, at + match[0].length - 1);
    if (close === -1) {
      return clauses;
    }
    at = close + 1;
  }
}

/** Index of the `}` matching the `{` at `open`, or -1 when it never closes. */
function matchBrace(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") {
      depth++;
    } else if (code[i] === "}") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}
