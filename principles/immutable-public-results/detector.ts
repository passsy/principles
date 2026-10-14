import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART_LIB, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["unmodifiable", "List.unmodifiable"]);
    }
  },
});

/**
 * A collection field the agent wrote into a result class whose constructor
 * assigns fields directly, in a file that never says unmodifiable. Any
 * unmodifiable in the file means the author knows the pattern; the remaining
 * fields are their call.
 */
onWrite({
  globs: DART_LIB,
  *detect(event) {
    // Class names that promise a report handed to a caller.
    const hasResultClass = event.lines.some((line) => /class\s+\w+(?:Result|Report|Outcome|Response|Summary)\b/.test(line));
    const knowsThePattern = /unmodifiable/i.test(event.text);
    // A constructor that assigns fields directly, rather than copying, is what
    // lets the caller's list leak in. `this.` anywhere is a cheap stand-in.
    const assignsDirectly = event.lines.some((line) => line.includes("this."));
    if (!hasResultClass || knowsThePattern || !assignsDirectly) {
      return;
    }
    for (const written of event.written) {
      if (/\bfinal\s+(?:List|Map|Set)</.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
