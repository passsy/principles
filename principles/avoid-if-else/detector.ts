import { onWrite } from "@wellactually/sdk/v3";
import { buildMethodRanges, DART, isComment } from "dart-kit";

/**
 * No prompt handler: nobody says "if-else" in conversation. Fires only on an
 * `else` the agent just wrote; a whole-file scan would fire on every legacy
 * branch it walked past.
 *
 * Inside a build method the Flutter-specific remedy (a Builder with early
 * returns) speaks instead.
 */
onWrite({
  globs: DART,
  *detect(event) {
    const buildMethods = buildMethodRanges(event.lines);
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (!written.text.includes("} else")) {
        continue;
      }
      const inBuildMethod = buildMethods.some(([start, end]) => written.line >= start && written.line <= end);
      if (!inBuildMethod) {
        yield { line: written.line };
      }
    }
  },
});
