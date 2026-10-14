import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART_LIB, isComment, isDartProject } from "dart-kit";

// Sealed classes and exhaustiveness are genuinely discussed by name.
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["sealed", "exhaustive", "exhaustiveness"]);
    }
  },
});

// The rule allows sealed classes in app code and privates; what it protects
// is a package's public surface, which lives in lib/.
onWrite({
  globs: DART_LIB,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (/\bsealed\s+class\s+[A-Z]/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
