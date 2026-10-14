import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isComment, isDartProject, matchParen } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["if-case", "pattern matching", "destructuring"]);
    }
  },
});

// Only an if-case the agent writes; legacy ones stay unjudged.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (isIfCase(written.text)) {
        yield { line: written.line };
      }
    }
  },
});

/** `case` as its own word inside the parenthesized condition of an `if`. */
function isIfCase(code: string): boolean {
  const at = /(?<![\p{L}\p{N}_$.])if(?![\p{L}\p{N}_$])/u.exec(code)?.index;
  if (at === undefined) {
    return false;
  }
  const open = code.indexOf("(", at);
  if (open === -1) {
    return false;
  }
  const close = matchParen(code, open);
  if (close === -1) {
    return false;
  }
  return /(?<![\p{L}\p{N}_$.])case(?![\p{L}\p{N}_$])/u.test(code.slice(open + 1, close));
}
