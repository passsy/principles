import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, DART_WITHOUT_TESTS, isDartProject, PUBSPEC } from "dart-kit";

// Not "provider": in conversation that is an auth or cloud provider far
// more often than the package.
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["riverpod", "get_it", "state management"]);
    }
  },
});

// The packages this principle recommends provider over.
onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["riverpod", "flutter_riverpod", "hooks_riverpod", "get_it"])) {
        yield { line: written.line };
      }
    }
  },
});

// Adoption happens in the change: writing an import or usage of a rival
// package is the moment the recommendation is worth reading.
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    for (const written of event.written) {
      if (/riverpod|get_it/i.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
