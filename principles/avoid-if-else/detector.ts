import { onWrite } from "@wellactually/detector-sdk/v3";
import { buildMethodRanges, dartCode, DART } from "dart-kit";

type Branch = { start: number; end: number; line: number; endLine: number; indent: number; alternatives: number; arms: [number, number][]; scope: () => [number, number] | undefined };

// Match delimiters, not Dart syntax. Strings and comments have already been
// masked. Incomplete/unbraced constructs are deliberately left alone.
// `braces` lists every `{` in source order.
function pairs(code: string): { matched: Map<number, number>; braces: number[] } {
  const result = new Map<number, number>();
  const braces: number[] = [];
  const stack: number[] = [];
  // Jumping between delimiters with a regex beats visiting every character in QuickJS.
  const delimiter = /[(){}[\]]/g;
  while (delimiter.exec(code) !== null) {
    const i = delimiter.lastIndex - 1;
    const char = code.charCodeAt(i);
    // ( 40, ) 41, [ 91, ] 93, { 123, } 125
    if (char === 40 || char === 91 || char === 123) {
      stack.push(i);
      if (char === 123) braces.push(i);
    } else {
      const start = stack.pop();
      const gap = start === undefined ? 0 : char - code.charCodeAt(start);
      // A closer is one or two code points after its opener.
      if (start !== undefined && (gap === 1 || gap === 2)) {
        result.set(start, i);
        result.set(i, start);
      }
    }
  }
  return { matched: result, braces };
}

function next(code: string, at: number): number {
  // Space, tab, newline and carriage return: all whitespace masked Dart has.
  let char = code.charCodeAt(at);
  while (char === 32 || char === 10 || char === 9 || char === 13) {
    char = code.charCodeAt(++at);
  }
  return at;
}

function workLines(code: string, [open, close]: [number, number]): number {
  return code.slice(open + 1, close).split("\n").filter((line) => /[\p{L}\p{N}_]/u.test(line)).length;
}

function exits(code: string, [open, close]: [number, number]): boolean {
  // A conditional single-line `if (...) return` is not an unconditional exit.
  return /(?:^|\n)[ \t]*(?:return|throw)\b[^;{}]*;\s*$/.test(code.slice(open + 1, close));
}

function branches(code: string): Branch[] {
  const { matched, braces } = pairs(code);
  // The braces that open a function body. Asked lazily: only the branches
  // near what was written need their scope, and a large file has many braces.
  const opens: [number, number][] = [];
  for (const open of braces) {
    const close = matched.get(open);
    if (close !== undefined) opens.push([open, close]);
  }
  const callable = new Map<number, boolean>();
  const isCallable = (open: number): boolean => {
    let known = callable.get(open);
    if (known === undefined) {
      known = opensFunction(open);
      callable.set(open, known);
    }
    return known;
  };
  const opensFunction = (open: number): boolean => {
    const prefix = code.slice(Math.max(0, open - 80), open).trimEnd();
    if (!/\)\s*(?:async\*?|sync\*)?$/.test(prefix)) return false;
    const closeArgs = code.lastIndexOf(")", open - 1);
    const openArgs = matched.get(closeArgs);
    if (openArgs === undefined) return false;
    const word = /([\w$]+)\s*$/.exec(code.slice(Math.max(0, openArgs - 80), openArgs))?.[1];
    return !["if", "for", "while", "switch", "catch"].includes(word ?? "");
  };
  // The innermost function body around [start, end].
  const scopeOf = (start: number, end: number): [number, number] | undefined => {
    let low = 0;
    let high = opens.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (opens[mid]![0] < start) low = mid + 1;
      else high = mid;
    }
    for (let i = low - 1; i >= 0; i--) {
      const [open, close] = opens[i]!;
      if (close > end && isCallable(open)) return opens[i];
    }
    return undefined;
  };
  const offsets = [0];
  for (const newline of code.matchAll(/\n/g)) {
    offsets.push(newline.index + 1);
  }
  const lineAt = (at: number): number => {
    let low = 0;
    let high = offsets.length;
    while (low + 1 < high) {
      const mid = (low + high) >>> 1;
      if (offsets[mid]! <= at) low = mid;
      else high = mid;
    }
    return low + 1;
  };
  const out: Branch[] = [];
  for (const match of code.matchAll(/\bif\s*\(/g)) {
    const start = match.index;
    const line = lineAt(start);
    const prefix = code.slice(offsets[line - 1], start);
    // A line-leading if is a root; else-if is part of its existing ladder.
    if (!/^\s*$/.test(prefix)) continue;
    const condition = start + match[0].lastIndexOf("(");
    const close = matched.get(condition);
    if (close === undefined) continue;
    const open = next(code, close + 1);
    let end = matched.get(open);
    if (code[open] !== "{" || end === undefined) continue;
    const arms: [number, number][] = [[open, end]];
    let alternatives = 0;
    while (true) {
      const after = next(code, end + 1);
      if (!/^else\b/.test(code.slice(after, after + 5))) break;
      let body = next(code, after + 4);
      if (/^if\s*\(/.test(code.slice(body, body + 80))) {
        const condition = code.indexOf("(", body);
        const close = matched.get(condition);
        if (close === undefined) break;
        body = next(code, close + 1);
      }
      const closeBody = matched.get(body);
      if (code[body] !== "{" || closeBody === undefined) break;
      alternatives++;
      end = closeBody;
      arms.push([body, end]);
    }
    let scope: [number, number] | undefined | null = null;
    const last = end;
    out.push({ start, end, line, endLine: lineAt(end), indent: prefix.replace(/\t/g, "    ").length, alternatives, arms, scope: () => (scope === null ? (scope = scopeOf(start, last)) : scope) });
  }
  return out;
}

// Formatted Dart starts a top-level declaration at column 0 and a member of a
// type at column 2; its body and closing brace never do.
// A regex per line is slow in the isolate, so these look at character codes.
function startsName(line: string, at: number): boolean {
  const char = line.charCodeAt(at);
  // A-Z, a-z, _ and @.
  return (char >= 65 && char <= 90) || (char >= 97 && char <= 122) || char === 95 || char === 64;
}
const isTop = (line: string): boolean => startsName(line, 0);
const isMember = (line: string): boolean => line.startsWith("  ") && startsName(line, 2);
const TYPE = /^(?:[a-z]+\s+)*(?:class|mixin|extension|enum)\b/;

/**
 * The 1-based lines that start inside a string in triple quotes, where a line
 * at column 0 is text and not a declaration.
 */
function multilineStrings(content: string): Set<number> {
  const inside = new Set<number>();
  // Jumps from quote to quote: a loop over every line is slow in the isolate.
  let at = 0;
  let line = 1;
  const lineOf = (to: number): number => {
    line += content.slice(at, to).split("\n").length - 1;
    at = to;
    return line;
  };
  while (true) {
    const single = content.indexOf("'''", at);
    const double = content.indexOf('"""', at);
    if (single === -1 && double === -1) break;
    const open = single === -1 || (double !== -1 && double < single) ? double : single;
    const first = lineOf(open);
    const close = content.indexOf(content.slice(open, open + 3), open + 3);
    if (close === -1) break;
    const last = lineOf(close);
    for (let next = first + 1; next <= last; next++) inside.add(next);
    at = close + 3;
  }
  return inside;
}

/**
 * The 1-based line ranges of the declarations that hold the written lines, given in order:
 * the member of a type, or else the top-level declaration. A branch never
 * reaches outside its declaration, so the rest of the file is not read.
 * Assumes formatted Dart.
 */
function windows(lines: string[], written: number[], quoted: Set<number>): [number, number][] {
  const out: [number, number][] = [];
  const isTopAt = (line: number): boolean => !quoted.has(line) && isTop(lines[line - 1]!);
  const isMemberAt = (line: number): boolean => !quoted.has(line) && isMember(lines[line - 1]!);
  // Where the last window ended and the top-level line above it: the next
  // scan up stops there instead of walking a long class again.
  let scanned = 0;
  let lastTop = 1;
  for (const line of written) {
    if (line > lines.length || line <= scanned) continue;
    let top = line;
    while (top > scanned + 1 && !isTopAt(top)) top--;
    if (top === scanned + 1 && !isTopAt(top) && scanned > 0) top = lastTop;
    lastTop = top;
    const inType = TYPE.test(lines[top - 1]!);
    let from = line;
    while (from > top && !(inType && isMemberAt(from))) from--;
    let to = line + 1;
    while (to <= lines.length && !isTopAt(to) && !(inType && isMemberAt(to))) to++;
    scanned = to - 1;
    out.push([from, to - 1]);
  }
  return out;
}

function* judge(source: string, offset: number, written: number[]): Generator<{ line: number; endLine: number }> {
  // Every shape this flags nests one if in another and has an else, so a
  // declaration without two ifs and an else is not parsed. Plain string search is cheap in the isolate.
  const first = source.indexOf("if");
  if (first === -1 || source.indexOf("if", first + 2) === -1 || !source.includes("else")) return;
  const code = dartCode(source);
  const lines = code.split("\n");
  const regions = branches(code);
  const builds = buildMethodRanges(lines);
  // How many non-blank written lines lie up to each line, to ask in one step whether a branch was touched.
  const touched = new Array<number>(lines.length + 2).fill(0);
  for (const line of written) {
    const at = line - offset;
    if (at >= 1 && /\S/.test(lines[at - 1] ?? "")) touched[at] = 1;
  }
  for (let line = 1; line < touched.length; line++) {
    touched[line]! += touched[line - 1]!;
  }
  let covered = -1;
  for (const [index, region] of regions.entries()) {
    if (region.start <= covered || builds.some(([a, b]) => region.line >= a && region.line <= b)) continue;
    if (touched[Math.min(region.endLine, lines.length)]! === touched[region.line - 1]!) continue;
    const counts = region.arms.map((arm) => workLines(code, arm));
    // Nesting alone is common in parsers and state updates. Look for the
    // shape of a guard: a short alternative beside meaningful nested work.
    // Without an existing exit, only suggest it at the end of a callable;
    // shared follow-up work is a reason to keep ordinary alternatives.
    const children: Branch[] = [];
    // Regions come in source order, so the ones inside this one follow it directly.
    for (let i = index + 1; i < regions.length && regions[i]!.start < region.end; i++) {
      const child = regions[i]!;
      if (child.end < region.end && child.indent > region.indent && child.scope() === region.scope()) children.push(child);
    }
    // A returning default on an otherwise non-returning multi-way dispatch
    // often just rejects missing data; it need not make the dispatch flatter.
    const hasShortExit = region.arms.some((arm, i) => (region.arms.length === 2 || i < region.arms.length - 1) && counts[i]! <= 2 && exits(code, arm));
    const hasNestedWork = region.arms.some((arm, i) => counts[i]! >= 4 && !exits(code, arm) && children.some((child) => child.start > arm[0] && child.end < arm[1]));
    // Also recognize the article's validation funnel: nested success paths,
    // each with a short rejecting else, at the actual end of a callable.
    const funnel = region.arms.length === 2 && counts[0]! >= 4 && counts[1]! <= 2 && next(code, region.end + 1) === region.scope()?.[1] && children.some((child) => child.arms.length === 2 && next(code, child.end + 1) === region.arms[0]![1] && workLines(code, child.arms[0]!) >= 2 && workLines(code, child.arms[1]!) <= 2);
    const nested = region.alternatives > 0 && ((hasShortExit && hasNestedWork) || funnel);
    if (!nested) continue;
    covered = region.end;
    yield { line: region.line + offset, endLine: region.endLine + offset };
  }
}

onWrite({
  globs: DART,
  *detect(event) {
    const lines = event.file.lines;
    const written = event.written.map((w) => w.line);
    // The host sends them in order; sorting a full write with a comparator is slow in the isolate.
    if (written.some((line, i) => i > 0 && line < written[i - 1]!)) written.sort((a, b) => a - b);
    let first = 0;
    for (const [from, to] of windows(lines, written, multilineStrings(event.file.content))) {
      // Windows and written lines are both in order, so each window takes the next run of lines.
      let end = first;
      while (end < written.length && written[end]! <= to) end++;
      yield* judge(lines.slice(from - 1, to).join("\n"), from - 1, written.slice(first, end));
      first = end;
    }
  },
});
