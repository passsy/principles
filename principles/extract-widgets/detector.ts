import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["build method", "build methods"]);
    }
  },
});

onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    for (const written of event.written) {
      if (/Widget\s+_build\w*\(/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
