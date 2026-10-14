import { onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS } from "dart-kit";

/**
 * An indented private static method: a top-level function wearing a class
 * qualifier. Whether it reads the class's own static state, the exception the
 * rule allows, is not decidable from one line; the advice explains it.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    for (const written of event.written) {
      if (/^\s+static\s+[\w<>, ?]+\s+_\w+\(/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
