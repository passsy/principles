import { onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS } from "dart-kit";

/**
 * A file whose only top-level declarations are enums is an enum that moved out
 * of the file of the class that uses it. A class or even a top-level function
 * beside the enum means the file has its own reason to exist.
 *
 * Fires when the agent writes an enum into such a file, on the first enum of
 * the file.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    if (!event.written.some((line) => /^enum\s+[A-Z]/.test(line.text))) {
      return;
    }
    const hasOtherDeclaration = event.lines.some(
      (code) => /^(?:abstract\s+|base\s+|final\s+|sealed\s+)*class\s|^mixin\s|^extension\s/.test(code) || /^[A-Za-z_][\w<>, ?]*\??\s+\w+\(/.test(code),
    );
    if (hasOtherDeclaration) {
      return;
    }
    yield { line: event.lines.findIndex((code) => /^enum\s+[A-Z]/.test(code)) + 1 };
  },
});
