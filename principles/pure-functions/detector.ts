import { mentioned, onPrompt } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

/**
 * Purity is a property of a whole function, not of any one line, so there is
 * no file heuristic. The rule speaks up when the topic does.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["side effect", "side effects", "pure function", "pure functions"]);
    }
  },
});
