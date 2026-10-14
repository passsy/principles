import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["globals", "global constant", "global constants"]);
    }
  },
});

// The name alone is the signal, but only when the agent writes to it:
// creating one or appending the next constant is the moment to redirect.
// The finding points at the file.
onWrite({
  globs: ["**/{globals,global,constants,consts}.dart"],
  *detect(event) {
    yield {};
  },
});
