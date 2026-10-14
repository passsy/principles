import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["global state", "global variable", "global variables"]);
    }
  },
});

// A top-level declaration that can be reassigned. Top-level `final` and
// `const` are fine; reassignable state is not.
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    for (const written of event.written) {
      const declaresVariable = /^(?:var|int|double|num|bool|String|List<|Map<|Set<|DateTime)\S*\s+\w+\s*=/.test(written.text);
      const reassignable = !/\b(?:final|const)\b/.test(written.text);
      if (declaresVariable && reassignable) {
        yield { line: written.line };
      }
    }
  },
});
