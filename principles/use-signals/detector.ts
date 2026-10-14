import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS, isComment, isDartProject } from "dart-kit";

// Not the bare "signal": a stream "emits a signal" and processes receive
// them. The plural is how people name the concept, and the concrete
// classes carry the rest.
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["signals", "state_beacon", "ValueNotifier", "ChangeNotifier"]);
    }
  },
});

// Manual listenable plumbing that a signal replaces.
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    // A file that already uses state_beacon somewhere, an import included, is left alone.
    if (/beacon/i.test(event.text)) {
      return;
    }
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (/extends ChangeNotifier|ValueNotifier</.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
