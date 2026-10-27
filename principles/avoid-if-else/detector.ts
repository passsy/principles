import { onWrite } from "@wellactually/sdk/v3";
import { buildMethodRanges, dartCode, DART } from "dart-kit";

type Branch = { start: number; end: number; line: number; indent: number; alternatives: number; arms: [number, number][]; atFunctionEnd: boolean; scope: number };

// Match delimiters, not Dart syntax. Strings and comments have already been
// masked. Incomplete/unbraced constructs are deliberately left alone.
function pairs(code: string): Map<number, number> {
  const result = new Map<number, number>();
  const stack: number[] = [];
  for (let i = 0; i < code.length; i++) {
    const char = code[i]!;
    if ("({[".includes(char)) {
      stack.push(i);
    } else if (")}]".includes(char)) {
      const start = stack.pop();
      if (start !== undefined && "({[".indexOf(code[start]!) === ")}]".indexOf(char)) {
        result.set(start, i);
        result.set(i, start);
      }
    }
  }
  return result;
}

function next(code: string, at: number): number {
  while (/\s/.test(code[at] ?? "") && at < code.length) {
    at++;
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
  const matched = pairs(code);
  const scopes = [...matched].filter(([open, close]) => {
    if (open >= close || code[open] !== "{") return false;
    const prefix = code.slice(Math.max(0, open - 80), open).trimEnd();
    if (!/\)\s*(?:async\*?|sync\*)?$/.test(prefix)) return false;
    const closeArgs = code.lastIndexOf(")", open - 1);
    const openArgs = matched.get(closeArgs);
    if (openArgs === undefined) return false;
    const word = /([\w$]+)\s*$/.exec(code.slice(Math.max(0, openArgs - 80), openArgs))?.[1];
    return !["if", "for", "while", "switch", "catch"].includes(word ?? "");
  }).sort(([a], [b]) => a - b);
  const offsets = [0];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === "\n") offsets.push(i + 1);
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
      if (/^if\s*\(/.test(code.slice(body))) {
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
    const scope = scopes.filter(([open, close]) => open < start && close > end).at(-1);
    out.push({ start, end, line, indent: prefix.replace(/\t/g, "    ").length, alternatives, arms, atFunctionEnd: scope !== undefined && next(code, end + 1) === scope[1], scope: scope?.[0] ?? -1 });
  }
  return out;
}

onWrite({
  globs: DART,
  *detect(event) {
    // Most files have no candidate; avoid masking large data/localization files.
    if (!/\bif\s*\(/.test(event.file.content) || !/\belse\b/.test(event.file.content)) return;
    const code = dartCode(event.file.content);
    const lines = code.split("\n");
    const regions = branches(code);
    const builds = buildMethodRanges(lines);
    let covered = -1;
    for (const region of regions) {
      if (region.start <= covered || builds.some(([a, b]) => region.line >= a && region.line <= b)) continue;
      const counts = region.arms.map((arm) => workLines(code, arm));
      // Nesting alone is common in parsers and state updates. Look for the
      // shape of a guard: a short alternative beside meaningful nested work.
      // Without an existing exit, only suggest it at the end of a callable;
      // shared follow-up work is a reason to keep ordinary alternatives.
      const children = regions.filter((child) => child.start > region.start && child.end < region.end && child.indent > region.indent && child.scope === region.scope);
      // A returning default on an otherwise non-returning multi-way dispatch
      // often just rejects missing data; it need not make the dispatch flatter.
      const hasShortExit = region.arms.some((arm, i) => (region.arms.length === 2 || i < region.arms.length - 1) && counts[i]! <= 2 && exits(code, arm));
      const hasNestedWork = region.arms.some((arm, i) => counts[i]! >= 4 && !exits(code, arm) && children.some((child) => child.start > arm[0] && child.end < arm[1]));
      // Also recognize the article's validation funnel: nested success paths,
      // each with a short rejecting else, at the actual end of a callable.
      const funnel = region.atFunctionEnd && region.arms.length === 2 && counts[0]! >= 4 && counts[1]! <= 2 && children.some((child) => child.arms.length === 2 && next(code, child.end + 1) === region.arms[0]![1] && workLines(code, child.arms[0]!) >= 2 && workLines(code, child.arms[1]!) <= 2);
      const nested = region.alternatives > 0 && ((hasShortExit && hasNestedWork) || funnel);
      if (!nested) continue;
      const endLine = region.line + code.slice(region.start, region.end).split("\n").length - 1;
      if (!event.written.some((written) => written.line >= region.line && written.line <= endLine && /\S/.test(lines[written.line - 1] ?? ""))) continue;
      covered = region.end;
      yield { line: region.line, endLine };
    }
  },
});
