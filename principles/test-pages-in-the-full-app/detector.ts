import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { calls, DART_TESTS, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["pumpWidget", "widget test", "widget tests"]);
    }
  },
});

/**
 * An app wrapper in a test is only a problem when a page is inside it.
 *
 * Pumping a leaf widget needs a MaterialApp too, for Directionality, theme and
 * localizations, so the wrapper alone says nothing. The page is the
 * discriminator. `*Screen` counts as well: it is the name name-page-widgets
 * retires, and a codebase still using it is the one most likely to test
 * destinations in isolation.
 *
 * Scoped to the whole file rather than the written line: the wrapper and the
 * page under test are usually a screenful apart.
 */
onWrite({
  globs: DART_TESTS,
  *detect(event) {
    // A page being constructed, e.g. `const CameraPage()` or `SettingsScreen(id: x)`.
    if (!event.lines.some((code) => /\b[A-Z]\w*(?:Page|Screen)\s*\(/.test(code))) {
      return;
    }
    for (const written of event.written) {
      if (calls(written.text, ["MaterialApp", "CupertinoApp", "WidgetsApp"])) {
        yield { line: written.line };
      }
    }
  },
});
