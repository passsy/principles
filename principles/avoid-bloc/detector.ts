import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, DART, isDartProject, PUBSPEC } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["bloc", "blocs", "cubit", "cubits", "flutter_bloc", "hydrated_bloc"]);
    }
  },
});

// Adoption is the agent writing bloc code: the dependency line, an import, a
// new Cubit. A legacy bloc file it merely read stays unjudged.
onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["bloc", "flutter_bloc", "hydrated_bloc"])) {
        yield { line: written.line };
      }
    }
  },
});

onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // The text, not the code: the package name of an import is inside a string.
      if (/package:bloc\/|flutter_bloc|hydrated_bloc|cubit/i.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
