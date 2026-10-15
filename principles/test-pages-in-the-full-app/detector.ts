import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { calls, DART_TESTS } from "dart-kit";

onPrompt({
  *detect(event) {
    // Flutter's own words, so the prompt is about Flutter without a pubspec.yaml to say so.
    yield* mentioned(event, ["pumpWidget", "widget test", "widget tests"]);
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
 *
 * Any other tester.pumpWidget in a widget test only points at the principle:
 * it may pump a leaf widget, which is fine, or a page the detector cannot see.
 */
onWrite({
  globs: DART_TESTS,
  *detect(event) {
    // A page being constructed, e.g. `const CameraPage()` or `SettingsScreen(id: x)`.
    const constructsPage = event.lines.some((code) => /\b[A-Z]\w*(?:Page|Screen)\s*\(/.test(code));
    const hasWidgetTest = event.lines.some((code) => calls(code, ["testWidgets"]));
    for (const written of event.written) {
      if (constructsPage) {
        if (calls(written.text, ["MaterialApp", "CupertinoApp", "WidgetsApp"])) {
          yield { line: written.line };
          continue;
        }
      }
      if (hasWidgetTest) {
        if (written.text.includes("tester.pumpWidget(")) {
          yield { line: written.line, match: "tester.pumpWidget", depth: "pointer" };
        }
      }
    }
  },
});
