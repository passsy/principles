import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["singleton", "singletons"]);
    }
  },
});

// The static instance field and the private constructor that feeds it.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      if (/static\s+final\s+\w+\s+instance\b|static\s+\w+\??\s+_instance\b|\w+\._internal\(/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
