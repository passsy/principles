import { onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS } from "dart-kit";

/**
 * No word list: nobody says they are about to spell one presentation choice out
 * property by property. The trigger is the shape.
 *
 * The shape is one condition asked more than once inside a single widget
 * constructor. Repetition is what makes it convictable. A constructor whose
 * properties each test a different flag is the rule's own exception: those
 * choices are independent, and one branch per permutation would be worse than
 * the ternaries. Asking the *same* question at icon, at title and at subtitle
 * is a single presentation choice spelled out property by property, which is
 * exactly what the rule tells you to hoist into one branch.
 *
 * One finding per call, not per condition. A widget that repeats two different
 * conditions has one thing wrong with it, and the loudest repetition is enough
 * to point at.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    // Only in a file that assembles widgets: a widget class, a build method, or
    // a plain function returning one. Elsewhere an uppercase call is a value
    // object, and `Duration(seconds: fast ? 1 : 2, milliseconds: fast ? 0 : 5)`
    // is nobody's presentation choice.
    if (!/extends\s+\w*Widget\b|Widget\s+build\s*\(|\bWidget\??\s+_?[a-z]\w*\s*\(/.test(event.text)) {
      return;
    }

    // The written lines rejoined, so a constructor that spans ten lines is one
    // string to walk. Line i of the join is `event.written[i]`.
    const source = event.written.map((line) => line.text).join("\n");
    const calls = [...constructorCalls(source)];

    const loudest = new Map<number, { call: Call; asked: number }>();
    for (const marks of byCondition(source).values()) {
      if (marks.length < 2) {
        continue;
      }
      const around = innermostAround(calls, marks);
      if (around === null) {
        continue;
      }
      // A conditional inside a callback decides what happens when the user acts,
      // not which widget is built. `onChanged: (v) { ... v ? a : b ... }` twice is
      // two closures that happen to name their parameter the same.
      const direct = marks.filter((mark) => !throughClosure(source, around.open, mark));
      if (direct.length < 2) {
        continue;
      }

      const call = innermostAround(calls, direct) ?? around;
      const standing = loudest.get(call.open);
      if (standing === undefined || direct.length > standing.asked) {
        loudest.set(call.open, { call, asked: direct.length });
      }
    }

    // The finding names the line that opens the call.
    for (const { call } of loudest.values()) {
      const opened = event.written[source.slice(0, call.open).split("\n").length - 1];
      if (opened !== undefined && opened.text.trim() !== "") {
        yield { line: opened.line };
      }
    }
  },
});

/** A constructor call and the span of its argument list. */
interface Call {
  /** Offset of the `(`. */
  open: number;
  /** Offset of the matching `)`. */
  close: number;
}

/**
 * Calls that look like a constructor: an uppercase name, optionally a named
 * constructor after it, then an argument list. A class declaration matches
 * too, which is harmless: a parameter list holds no ternaries.
 */
function* constructorCalls(source: string): Generator<Call> {
  for (const match of source.matchAll(/(?<![\w$.])[A-Z][A-Za-z0-9_]*(?:\.[a-z][A-Za-z0-9_]*)?\s*\(/g)) {
    const open = match.index + match[0].length - 1;
    const close = closingParen(source, open);
    if (close !== -1) {
      yield { open, close };
    }
  }
}

/** Offset of the `)` matching the `(` at `open`, or -1 when it never closes. */
function closingParen(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "(") {
      depth++;
      continue;
    }
    if (source[i] === ")") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/** Where each ternary condition is asked, keyed by the condition. */
function byCondition(source: string): Map<string, number[]> {
  const marks = new Map<string, number[]>();
  for (let i = 0; i < source.length; i++) {
    if (!isConditional(source, i)) {
      continue;
    }
    const condition = conditionBefore(source, i);
    if (condition === "") {
      continue;
    }
    marks.set(condition, [...(marks.get(condition) ?? []), i]);
  }
  return marks;
}

/**
 * Whether the `?` at `at` opens a conditional expression.
 *
 * `??`, `?.` and `?..` are operators, and `String?` is a type: those attach to
 * what precedes them. A conditional's `?` has whitespace in front of it, or
 * the bracket that closed its condition.
 */
function isConditional(source: string, at: number): boolean {
  if (source[at] !== "?") {
    return false;
  }
  const before = source[at - 1] ?? "";
  const after = source[at + 1] ?? "";
  const operator = before === "?" || after === "?" || after === ".";
  if (operator) {
    return false;
  }
  return /[\s)\]]/.test(before);
}

/**
 * The condition of the conditional whose `?` sits at `mark`, normalized.
 *
 * It runs back to whatever opened this expression (an argument separator, a
 * bracket, an assignment, the end of the previous statement) with nested
 * brackets skipped so a comma inside `foo(a, b)` does not end it early. The
 * argument label is dropped, whitespace is collapsed so a condition wrapped
 * across lines matches the same condition written inline, and a leading `!` is
 * dropped because `ready` and `!ready` are one question asked from two sides.
 */
function conditionBefore(source: string, mark: number): string {
  let depth = 0;
  let start = 0;
  for (let i = mark - 1; i >= 0; i--) {
    const char = source[i] ?? "";
    if (")]}".includes(char)) {
      depth++;
      continue;
    }
    if ("([{".includes(char)) {
      depth--;
      if (depth < 0) {
        start = i + 1;
        break;
      }
      continue;
    }
    const assignment = char === "=" && assigns(source, i);
    const separator = char === "," || char === ";" || assignment;
    if (depth === 0 && separator) {
      start = i + 1;
      break;
    }
  }

  return source
    .slice(start, mark)
    .trim()
    .replace(/^[A-Za-z_$][\w$]*\s*:\s*/, "")
    .replace(/^!+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a function body stands between the call at `open` and the
 * conditional at `mark`: a `{` block, or an `=>` at the level being walked.
 *
 * The walk steps outwards one bracket at a time, so a conditional nested three
 * widgets deep still reads as an argument of the outer call. It is the kind of
 * bracket that decides: `[` and `(` are the widget tree, `{` is a body.
 */
function throughClosure(source: string, open: number, mark: number): boolean {
  let depth = 0;
  for (let i = mark - 1; i > open; i--) {
    const char = source[i] ?? "";
    if (")]}".includes(char)) {
      depth++;
      continue;
    }
    if ("([{".includes(char)) {
      depth--;
      if (depth < 0) {
        if (char === "{") {
          return true;
        }
        depth = 0;
      }
      continue;
    }
    const arrow = char === ">" && source[i - 1] === "=";
    if (depth === 0 && arrow) {
      return true;
    }
  }
  return false;
}

/**
 * Whether the `=` at `at` assigns, rather than comparing or arrowing.
 *
 * This matters more than it looks. Treating the `=` of `==` as the start of an
 * expression truncates `axis == Axis.vertical` to `Axis.vertical` and
 * `error == null` to `null`, and then every unrelated null check in one
 * constructor counts as the same question.
 */
function assigns(source: string, at: number): boolean {
  const before = source[at - 1] ?? "";
  const after = source[at + 1] ?? "";
  return after !== "=" && after !== ">" && !"=!<>".includes(before);
}

/**
 * The tightest constructor call that holds every one of `marks`, or null when
 * no single one does: two ternaries in two sibling statements are not this
 * rule. Reporting the innermost is what keeps `Padding(Column(...))` from
 * being convicted of what `Column` alone is doing.
 */
function innermostAround(calls: Call[], marks: number[]): Call | null {
  const first = Math.min(...marks);
  const last = Math.max(...marks);

  let innermost: Call | null = null;
  for (const call of calls) {
    if (call.open > first || call.close < last) {
      continue;
    }
    if (innermost === null || call.open > innermost.open) {
      innermost = call;
    }
  }
  return innermost;
}
