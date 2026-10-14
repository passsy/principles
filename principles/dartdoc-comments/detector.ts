import { mentioned, onPrompt } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

/**
 * Words only. How to write good dartdoc needs judgment about the code it
 * documents; there is no line-shaped violation to catch, and both
 * absence-of-docs and presence-of-docs heuristics fired on essentially every
 * file.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["dartdoc", "doc comment", "doc comments"]);
    }
  },
});
