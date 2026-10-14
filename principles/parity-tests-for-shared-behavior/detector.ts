import { mentioned, onPrompt } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

/**
 * The handbook ships this rule without a detector: noticing that two paths
 * drift needs the diff and both files at once. What is honest is a name that
 * can only mean this topic, so the rule points at itself when the user asks
 * for a parity test, and stays silent otherwise.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["parity test", "parity tests"]);
    }
  },
});
