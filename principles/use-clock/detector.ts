import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isComment } from "dart-kit";

onPrompt({
  *detect(event) {
    // Names only Dart has, so the prompt is about Dart without a pubspec.yaml to say so.
    yield* mentioned(event, ["DateTime.now", "fakeAsync", "withClock"]);
  },
});

// Only a DateTime.now() the agent writes. Legacy calls are not this change's business.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (written.text.includes("DateTime.now(")) {
        yield { line: written.line };
      }
    }
  },
});
