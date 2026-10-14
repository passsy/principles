import { onWrite } from "@wellactually/sdk/v3";
import { buildMethodRanges, DART_WITHOUT_TESTS } from "dart-kit";

/**
 * Conditional forks the agent writes inside a build method: an `} else`, or a
 * ternary spread over several lines. Outside build methods other principles
 * speak.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    if (!event.text.includes("Widget build(")) {
      return;
    }

    const ranges: [number, number][] = [];
    for (const range of buildMethodRanges(event.lines)) {
      // A one-line arrow build has no body to brace-match; the helper would run on into the next method.
      if (!/=>.*;\s*$/.test(event.lines[range[0] - 1] ?? "")) {
        ranges.push(range);
      }
    }

    let openTernary = false;
    for (const written of event.written) {
      const trimmed = written.text.trim();
      const fork = trimmed.includes("} else");
      const opens = / \?$/.test(trimmed);
      const continues = trimmed.startsWith("? ");
      const branches: boolean = openTernary && trimmed.startsWith(": ");

      if (fork || opens || continues || branches) {
        openTernary = opens || continues || branches;
        const inBuild = ranges.some(([start, end]) => written.line >= start && written.line <= end);
        if (inBuild) {
          yield { line: written.line };
        }
        continue;
      }
      if (trimmed.endsWith(";") || trimmed.endsWith(",")) {
        openTernary = false;
      }
    }
  },
});
