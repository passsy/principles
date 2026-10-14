import { onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS } from "dart-kit";

/** A call on something named analytics: `analytics.track(`, `widget.analytics?.logEvent(`, `ref.analytics.screen (`. */
const ANALYTICS_CALL = /\b(?:[A-Za-z_$][\w$]*\.)*analytics\??\.[A-Za-z_$][\w$]*\s*\(/i;

/**
 * Analytics calls that execute while Flutter evaluates build are render-time
 * side effects. Calls declared inside onTap/onPressed-style callbacks are
 * deliberately excluded: build constructs those callbacks, while the user
 * invokes them later.
 *
 * No text trigger: nobody announces that they are about to track from build.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    if (!event.text.includes("Widget build(") || !/\banalytics\b/i.test(event.text)) {
      return;
    }
    const builds = buildMethodRanges(event.lines);
    const callbacks = eventCallbackRanges(event.lines, builds);
    const forwarders = analyticsForwarders(event.lines);
    for (const written of event.written) {
      if (!inside(written.line, builds) || inside(written.line, callbacks)) {
        continue;
      }
      if (/\bon[A-Z][A-Za-z0-9_$]*\s*:/.test(written.text)) {
        continue;
      }
      // Either the analytics call itself, or a call to a method of this file that makes one.
      const called = /^\s*([A-Za-z_$][\w$]*)\s*\(/.exec(written.text)?.[1];
      const callsForwarder = called !== undefined && forwarders.has(called);
      if (ANALYTICS_CALL.test(written.text) || callsForwarder) {
        yield { line: written.line };
      }
    }
  },
});

/** The 1-based line ranges of `Widget build(` method bodies. */
function buildMethodRanges(lines: string[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (let line = 1; line <= lines.length; line++) {
    if (!(lines[line - 1] ?? "").includes("Widget build(")) {
      continue;
    }
    const close = closingBraceLine(lines, line);
    if (close !== null) {
      ranges.push([line, close]);
    }
  }
  return ranges;
}

/** Ranges of onTap/onPressed-style callback bodies inside build methods. */
function eventCallbackRanges(lines: string[], builds: [number, number][]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const [start, end] of builds) {
    for (let line = start; line <= end; line++) {
      const code = lines[line - 1] ?? "";
      if (!/\bon[A-Z][A-Za-z0-9_$]*\s*:/.test(code) || !code.includes("{")) {
        continue;
      }
      const close = closingBraceLine(lines, line);
      if (close !== null) {
        ranges.push([line, close]);
        line = close;
      }
    }
  }
  return ranges;
}

/** Methods in this file whose body invokes an analytics object. */
function analyticsForwarders(lines: string[]): Set<string> {
  const names = new Set<string>();
  for (let index = 0; index < lines.length; index++) {
    const declaration = /^\s*(?:static\s+)?(?:Future(?:<[^>]+>)?|void|bool|int|double|String|Widget|[A-Z][\w<>{}?,.]*)\s+([a-z_$][\w$]*)\s*\(/.exec(lines[index] ?? "");
    const name = declaration?.[1];
    // `if (` and friends look like a declaration when a type happens to stand in front.
    if (name === undefined || ["if", "for", "while", "switch", "catch", "build"].includes(name)) {
      continue;
    }
    const end = bodyEndLine(lines, index + 1);
    if (end === null) {
      continue;
    }
    if (ANALYTICS_CALL.test(lines.slice(index, end).join("\n"))) {
      names.add(name);
    }
    index = end - 1;
  }
  return names;
}

/** The 1-based line on which the body of the declaration at `start` ends, or null. An arrow body ends on the line of its `=>`. */
function bodyEndLine(lines: string[], start: number): number | null {
  let depth = 0;
  let opened = false;
  for (let line = start; line <= lines.length; line++) {
    const code = lines[line - 1] ?? "";
    if (!opened && code.includes("=>")) {
      return line;
    }
    for (const char of code) {
      if (char === "{") {
        depth++;
        opened = true;
      } else if (char === "}") {
        depth--;
      }
    }
    if (opened && depth <= 0) {
      return line;
    }
  }
  return null;
}

/** The 1-based line on which the first brace opened at or after `start` closes, or null. */
function closingBraceLine(lines: string[], start: number): number | null {
  let depth = 0;
  let opened = false;
  for (let line = start; line <= lines.length; line++) {
    for (const char of lines[line - 1] ?? "") {
      if (char === "{") {
        depth++;
        opened = true;
      } else if (char === "}") {
        depth--;
      }
    }
    if (opened && depth <= 0) {
      return line;
    }
  }
  return null;
}

function inside(line: number, ranges: [number, number][]): boolean {
  return ranges.some(([start, end]) => line >= start && line <= end);
}
