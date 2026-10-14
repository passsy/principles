import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS, isDartProject } from "dart-kit";

/**
 * One of three alternative state-management preferences. The triggers are
 * disjoint from use-provider and use-signals so one conversation never
 * brings in two contradicting recommendations.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["context_plus", "InheritedWidget", "dependency injection"]);
    }
  },
});

onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    for (const written of event.written) {
      if (written.text.includes("extends InheritedWidget")) {
        yield { line: written.line };
      }
    }
  },
});
