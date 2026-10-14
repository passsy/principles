import { onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS, isComment } from "dart-kit";

/**
 * A reminder to check behavior, not proof of a missing handler: dismissal may
 * already be supplied by a shared widget or an ancestor.
 *
 * The identifier counts, including custom and generic fields, even when the
 * constructor arguments start on another line.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (/(?<![\w$])[\w$]*Text(?:Form)?Field(?![\w$])/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
