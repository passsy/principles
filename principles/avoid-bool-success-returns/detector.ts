import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["Future<bool>", "success flag", "success indicator", "success boolean"]);
    }
  },
});

/**
 * The swallow-into-false shape, written in this event: a `Future<bool>`
 * declaration, then a `catch`, then a `return false;`. A sync bool that
 * try-catches is usually a tryParse-style validity check and stays
 * invisible; the `Future<bool>` variant is almost always an operation
 * reporting "did it work".
 */
onWrite({
  globs: DART,
  *detect(event) {
    let declaration: number | null = null;
    let sawCatch = false;
    for (const written of event.written) {
      if (written.text.includes("Future<bool>")) {
        declaration = written.line;
        sawCatch = false;
        continue;
      }
      if (declaration === null) {
        continue;
      }
      if (/\bcatch\s*\(/.test(written.text)) {
        sawCatch = true;
        continue;
      }
      if (sawCatch && /\breturn\s+false\s*;/.test(written.text)) {
        yield { line: declaration };
        declaration = null;
        sawCatch = false;
      }
    }
  },
});
