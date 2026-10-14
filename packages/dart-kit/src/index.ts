/**
 * What detectors for Dart and Flutter share.
 *
 * Everything in here answers a question about Dart that more than one
 * principle asks: which files are Dart, is this line a comment, does this
 * line call that function, where does the build method end. The question a
 * principle asks about its own rule stays in its detector.
 */
import { findUp } from "@wellactually/sdk/v3";

/** Every Dart file a person wrote. Generated files are nobody's decision. */
export const DART: string[] = ["**/*.dart", "!**/*.{g,freezed,gr,config,mocks}.dart"];

/** Dart outside of tests, for rules that tests are allowed to break. */
export const DART_WITHOUT_TESTS: string[] = ["**/*.dart", "!**/*.{g,freezed,gr,config,mocks}.dart", "!**/test/**", "!**/*_test.dart"];

/** Dart below `lib/`, which is the public surface of a package. */
export const DART_LIB: string[] = ["**/lib/**/*.dart", "!**/*.{g,freezed,gr,config,mocks}.dart", "!**/test/**", "!**/*_test.dart"];

/** Dart tests. */
export const DART_TESTS: string[] = ["**/test/**/*.dart", "**/*_test.dart", "!**/*.{g,freezed,gr,config,mocks}.dart"];

/** The pubspec of a package, where its dependencies are written. */
export const PUBSPEC: string[] = ["**/pubspec.yaml"];

/**
 * Whether the session works in a Dart project: a `pubspec.yaml` in the
 * folder it runs in, or in one above. A prompt says nothing about its
 * language, so this is how a prompt handler keeps to Dart.
 */
export function isDartProject(event: { cwd: string }): boolean {
  return findUp("pubspec.yaml", event.cwd) !== null;
}

/** Whether a line is a comment from its first character on: `//` and `///`. */
export function isComment(line: string): boolean {
  return line.trim().startsWith("//");
}

/**
 * Whether a line of a pubspec adds one of the named packages as a dependency:
 * the name as a key, indented below `dependencies:` or `dev_dependencies:`.
 */
export function addsDependency(line: string, names: readonly string[]): boolean {
  const match = /^\s+([A-Za-z0-9_]+):/.exec(line);
  if (match === null) {
    return false;
  }
  return names.includes(match[1] ?? "");
}

/**
 * Whether a line calls one of the named functions or constructors:
 * `print(`, but not `debugPrint(` and not `logger.print(`.
 */
export function calls(line: string, names: readonly string[]): boolean {
  for (const name of names) {
    let at = line.indexOf(`${name}(`);
    while (at !== -1) {
      const before = line[at - 1] ?? "";
      if (!/[\p{L}\p{N}_$.]/u.test(before)) {
        return true;
      }
      at = line.indexOf(`${name}(`, at + 1);
    }
  }
  return false;
}

/** Index of the `)` matching the `(` at `open`, or -1 when it closes on a later line. */
export function matchParen(line: string, open: number): number {
  let depth = 0;
  for (let i = open; i < line.length; i++) {
    if (line[i] === "(") {
      depth++;
    } else if (line[i] === ")") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/** The 1-based line ranges of `Widget build(` method bodies, by brace matching. */
export function buildMethodRanges(lines: string[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!(lines[i] ?? "").includes("Widget build(")) {
      continue;
    }
    let depth = 0;
    let opened = false;
    for (let j = i; j < lines.length; j++) {
      for (const char of lines[j] ?? "") {
        if (char === "{") {
          depth++;
          opened = true;
        } else if (char === "}") {
          depth--;
        }
      }
      if (opened && depth <= 0) {
        ranges.push([i + 1, j + 1]);
        break;
      }
    }
  }
  return ranges;
}

/**
 * Dart source with comments and whole string literals replaced by spaces.
 *
 * Positions and line breaks stay where they are, so a line or a column found
 * in the result is the same place in the file. Block comments nest, a raw
 * string has no escapes, and a string in triple quotes spans lines.
 */
export function dartCode(source: string): string {
  const out = source.split("");
  const n = source.length;
  const blank = (from: number, to: number): void => {
    for (let k = from; k < to && k < n; k++) {
      if (out[k] !== "\n") {
        out[k] = " ";
      }
    }
  };

  let i = 0;
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    if (c === "/" && next === "/") {
      let j = i;
      while (j < n && source[j] !== "\n") {
        j++;
      }
      blank(i, j);
      i = j;
      continue;
    }
    if (c === "/" && next === "*") {
      // Dart block comments nest.
      let depth = 1;
      let j = i + 2;
      while (j < n && depth > 0) {
        if (source[j] === "/" && source[j + 1] === "*") {
          depth++;
          j += 2;
          continue;
        }
        if (source[j] === "*" && source[j + 1] === "/") {
          depth--;
          j += 2;
          continue;
        }
        j++;
      }
      blank(i, j);
      i = j;
      continue;
    }
    if (c === "r" && (next === "'" || next === '"') && !isIdentChar(source[i - 1])) {
      const j = skipString(source, i + 1, true);
      blank(i, j);
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      const j = skipString(source, i, false);
      blank(i, j);
      i = j;
      continue;
    }
    i++;
  }
  return out.join("");
}

/** Index just past the end of the string literal starting at `start`. */
function skipString(source: string, start: number, raw: boolean): number {
  const n = source.length;
  const quote = source[start];
  if (quote === undefined) {
    return n;
  }
  const triple = source[start + 1] === quote && source[start + 2] === quote;
  const delim = triple ? quote.repeat(3) : quote;
  let i = start + delim.length;
  while (i < n) {
    const c = source[i];
    if (!raw && c === "\\") {
      i += 2;
      continue;
    }
    if (!triple && c === "\n") {
      // An unterminated single-line string stops at the newline rather than blanking the rest of the file.
      return i;
    }
    if (source.startsWith(delim, i)) {
      return i + delim.length;
    }
    i++;
  }
  return n;
}
function isIdentChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}_$]/u.test(char);
}
