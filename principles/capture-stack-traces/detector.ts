import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isComment, isDartProject } from "dart-kit";

/**
 * "catch" is out of the word list: in conversation it is idiom ("there's a
 * catch") and meta-talk about errors far more often than a clause about to
 * be written.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["stacktrace", "stacktraces", "stack trace", "stack traces", "rethrow", "rethrows"]);
    }
  },
});

// Only catches the agent writes. Legacy catch blocks it walked past are
// not this change's business, and the fix (add the second parameter) is
// a one-line follow-up edit right after the finding arrives.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (dropsStackTrace(written.text)) {
        yield { line: written.line };
      }
    }
  },
});

/** A catch clause with a single parameter throws away the stack trace. */
function dropsStackTrace(code: string): boolean {
  const at = code.indexOf("catch (");
  if (at === -1) {
    return false;
  }
  const open = code.indexOf("(", at);
  // Walk to the parenthesis that closes the clause. One that closes on a later line is left alone.
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "(") {
      depth++;
    } else if (code[i] === ")" && --depth === 0) {
      return !code.slice(open + 1, i).includes(",");
    }
  }
  return false;
}
