import { onWrite } from "@wellactually/sdk/v3";
import { DART, isComment } from "dart-kit";

/**
 * A `var` the agent just declared and never reassigns anywhere in the file
 * should have been `final`. Only the change's own declarations are judged; a
 * genuine accumulator is what `var` is for, and legacy vars are not this
 * change's business. No word list: nobody announces a var.
 */
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      // The rule itself exempts for-loop headers from `final`.
      if (written.text.includes("for (") || written.text.includes("for(")) {
        continue;
      }
      for (const [, name] of written.text.matchAll(/\bvar\s+(\w+)/g)) {
        // Anything that writes to the variable again: `=`, `+=`, `++`, `??=` and the like.
        const reassigns = new RegExp(`(?<![\\w.])${name}\\s*(=[^=]|\\+=|-=|\\*=|~\\/=|\\/=|\\+\\+|--|\\?\\?=)`);
        // Reassignment can live outside the change, so the whole file answers.
        const reassigned = event.lines.some((other, index) => index !== written.line - 1 && reassigns.test(other));
        if (!reassigned) {
          yield { line: written.line };
        }
      }
    }
  },
});
