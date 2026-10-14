import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, DART, isDartProject, PUBSPEC } from "dart-kit";

// Deliberately not "either": too common in prose to be a signal.
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["dartz", "fpdart"]);
    }
  },
});

onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["dartz", "fpdart"])) {
        yield { line: written.line };
      }
    }
  },
});

// `Either<` at a word start, so `MyEither<` stays invisible.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      if (/(?<![A-Za-z0-9_$])Either</.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
