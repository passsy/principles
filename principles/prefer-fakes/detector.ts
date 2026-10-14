import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, DART, isDartProject, PUBSPEC } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["mock", "mocks", "mockito", "mocktail"]);
    }
  },
});

onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["mockito", "mocktail"])) {
        yield { line: written.line };
      }
    }
  },
});

// Imports are string literals, so they only exist in the text. In the code,
// `extends Mock` is mocktail's pattern and `@GenerateMocks` is mockito's.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      if (/package:(?:mockito|mocktail)/.test(written.text) || /extends\s+Mock\b|@GenerateMocks\b/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
