import { mentioned, onPrompt } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

/**
 * Words only. Method chains and inline expressions are idiomatic Dart;
 * whether an intermediate value deserves a name is exactly the judgment call
 * the rule text teaches, not a shape a regex can convict.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["debuggable", "breakpoint", "breakpoints"]);
    }
  },
});
