import { onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS } from "dart-kit";

/**
 * No text trigger. "Screen" is an ordinary English word: screen size, screen
 * reader, the screenshot someone just took. The only honest signal is the
 * declaration itself.
 *
 * The base class is matched by its suffix, because ConsumerStatefulWidget,
 * HookConsumerWidget and every other flavour end the same way. `State<` covers
 * the other half of a StatefulWidget pair.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    for (const written of event.written) {
      if (/class\s+\w*Screen\b[^{]*\bextends\s+(?:\w*Widget|State<)/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
