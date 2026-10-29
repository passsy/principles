import { onWrite } from "@wellactually/sdk/v3";
import { DART_TESTS, dartCode } from "dart-kit";

/**
 * A `find.` from flutter_test in a widget test, e.g. `find.byType(SaveButton)`.
 *
 * The lookbehind keeps out `finder.find.` and `_find.`, and `dartCode` blanks
 * comments and strings, so a `find.text` in a test name does not count. Only
 * files with a `testWidgets` are judged: a helper file in `test/` may build
 * finders for code the agent cannot change.
 */
onWrite({
  globs: DART_TESTS,
  *detect(event) {
    const code = dartCode(event.file.content).split("\n");
    const hasWidgetTest = code.some((line) => /\btestWidgets\s*\(/.test(line));
    if (!hasWidgetTest) {
      return;
    }
    for (const written of event.written) {
      const line = code[written.line - 1];
      if (line === undefined) {
        continue;
      }
      const finder = /(?<![\w.$])find\.\w+/.exec(line);
      if (finder) {
        yield { line: written.line, match: finder[0] };
      }
    }
  },
});
