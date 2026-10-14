import { onWrite } from "@wellactually/sdk/v3";
import { buildMethodRanges, DART } from "dart-kit";

/**
 * No prompt handler: nobody mentions ternaries in conversation. Fires only on
 * a ternary the agent just wrote across lines; legacy ones elsewhere in the
 * file are not this change's business.
 *
 * After dart format a spanning ternary shows as a condition ending in ` ?`,
 * or branches starting continuation lines with `? ` and `: `. Ternaries
 * inside a build method are left to the Flutter-specific principle about
 * builders with early returns.
 */
onWrite({
  globs: DART,
  *detect(event) {
    const buildMethods = buildMethodRanges(event.lines);
    let openTernary = false;
    for (const written of event.written) {
      const trimmed = written.text.trim();

      const opens = / \?$/.test(trimmed);
      const continues = trimmed.startsWith("? ");
      // `: ` continuation lines also follow named arguments and initializer
      // lists, so they only count while a ternary is already open.
      const branches = openTernary && trimmed.startsWith(": ");

      if (opens || continues || branches) {
        openTernary = true;
        const inBuildMethod = buildMethods.some(([start, end]) => written.line >= start && written.line <= end);
        if (!inBuildMethod) {
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
