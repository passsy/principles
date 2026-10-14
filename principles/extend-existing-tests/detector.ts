import { onWrite } from "@wellactually/sdk/v3";
import { DART_TESTS } from "dart-kit";

/**
 * Two moments where "did you check for an existing one?" is still cheap to
 * act on:
 *
 * - the agent created a new `_test.dart` file with this write
 * - the agent edited an existing test file and wrote a class declaration
 *   into it
 *
 * The host reports the write after it happened, so the old file content is
 * gone. A class that merely moved inside an edit cannot be told apart from a
 * new one, and a full rewrite of an existing test file stays quiet, since
 * every class in it would count as written.
 */
onWrite({
  globs: DART_TESTS,
  *detect(event) {
    if (event.file.isNew) {
      // The whole file is new, so every class in it is too; the file-level
      // question subsumes the per-class one, and the finding points at the file.
      if (event.file.name.endsWith("_test.dart")) {
        yield {};
      }
      return;
    }
    if (event.written.length >= event.lines.length) {
      return;
    }
    for (const written of event.written) {
      if (/^(?:abstract\s+|base\s+|final\s+|sealed\s+|interface\s+|mixin\s+)*class\s+([A-Za-z_$]\w*)/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
