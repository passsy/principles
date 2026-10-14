import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isComment, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["forEach"]);
    }
  },
});

// Only a forEach the agent just wrote; legacy ones are not this change's business.
// A call to forEach, on a receiver or bare, but not to a longer name ending in it.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (/(?<![\p{L}\p{N}_$])forEach\(/u.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
