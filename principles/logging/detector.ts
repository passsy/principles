import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { calls, DART, isComment, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["logger", "loggers", "logging", "chirp", "print", "prints"]);
    }
  },
});

// Only a print() the agent writes, the debugging reflex the rule exists
// for, not legacy prints in a file it merely opened. A call of its own:
// debugPrint( and logger.print( are something else.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (calls(written.text, ["print"])) {
        yield { line: written.line };
      }
    }
  },
});
