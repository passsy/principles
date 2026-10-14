import { mentioned, onPrompt } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

/**
 * Words only. A copied implementation and a legitimate test helper look
 * identical to a single-file heuristic (a plain class in a test file is
 * usually an in-memory store, not a mirror of lib/), so a code trigger here
 * fired on ordinary scaffolding far more often than on the sin. Catching the
 * copy needs the diff and lib/ side by side, which is review territory.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["reference implementation", "reimplement", "reimplementation"]);
    }
  },
});
