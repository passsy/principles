import { onWrite } from "@wellactually/sdk/v3";
import { DART, isComment } from "dart-kit";

/**
 * No prompt handler: nobody calls their closures lambdas in conversation. Fires on
 * a single untyped parameter of eight or more characters that the agent just
 * wrote: `(currentItem) =>` where `(it) =>` would do.
 */
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      const name = (/\((\w{8,})\)\s*=>/.exec(written.text) ?? /[(,:]\s*\((\w{8,})\)\s*\{/.exec(written.text))?.[1];
      if (name === undefined) {
        continue;
      }
      // Flutter callback conventions the rule has no quarrel with.
      if (!["context", "snapshot", "details", "controller", "constraints"].includes(name)) {
        yield { line: written.line };
      }
    }
  },
});
