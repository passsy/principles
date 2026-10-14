import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, DART, isDartProject, PUBSPEC } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["rxdart", "behaviorsubject", "behaviorsubjects"]);
    }
  },
});

/**
 * Fires when the agent writes rxdart usage or the dependency line, the moments
 * adoption is still cheap to reverse. One name is enough for code: it is in the
 * import path, which is where adoption is.
 */
onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["rxdart"])) {
        yield { line: written.line };
      }
    }
  },
});

onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      if (/rxdart/i.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
