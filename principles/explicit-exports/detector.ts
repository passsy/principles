import { onWrite } from "@wellactually/sdk/v3";
import { DART_LIB } from "dart-kit";

/**
 * Fires when the agent writes an export line without `show` in a package's
 * public API file, the lib/ file that is not under src/. Everything such a
 * line fails to `show` leaks, and `hide` leaks everything it forgot to name.
 *
 * The text, not the code: the path of an export is inside a string.
 */
onWrite({
  globs: DART_LIB,
  *detect(event) {
    if (event.file.path.includes("/src/")) {
      return;
    }
    for (const written of event.written) {
      if (/^\s*export\s+['"]/.test(written.text) && !/\bshow\s+\w/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
