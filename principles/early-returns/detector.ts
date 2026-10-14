import { mentioned, onPrompt } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

/**
 * Words only. Telling a guard from a symmetric fork needs reading the
 * branches, and an indentation-depth heuristic fired on every nested loop
 * and widget tree: depth is not the sin, hidden guards are.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["early return", "early returns", "nested if", "deep nesting"]);
    }
  },
});
