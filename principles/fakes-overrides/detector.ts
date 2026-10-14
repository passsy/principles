import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["fake", "fakes"]);
    }
  },
});

/**
 * The moment someone writes a fake is when the override pattern is relevant.
 * A file that already carries override fields has applied it.
 */
onWrite({
  globs: DART,
  *detect(event) {
    if (/Function\([^)]*\)\?\s+override/.test(event.text)) {
      return;
    }
    for (const written of event.written) {
      if (/class\s+Fake[A-Z]\w*/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
