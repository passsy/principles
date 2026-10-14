import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, isDartProject, PUBSPEC } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["very_good_analysis", "flutter_lints", "analysis_options", "lint rules"]);
    }
  },
});

// The lint packages people reach for instead of package:lint.
onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["very_good_analysis", "flutter_lints", "lints", "pedantic"])) {
        yield { line: written.line };
      }
    }
  },
});

/**
 * Fires when the agent writes an analysis_options.yaml that does not include
 * package:lint. Whether the include is present is a whole-file question, but
 * the write is the moment: reading someone's lint setup is not an invitation
 * to change it.
 *
 * The code has yaml comments blanked, so a commented-out include counts as
 * absent.
 */
onWrite({
  globs: ["**/analysis_options.yaml"],
  *detect(event) {
    let includes = 0;
    for (const [index, code] of event.lines.entries()) {
      if (!/^\s*include:/.test(code)) {
        continue;
      }
      includes++;
      if (!code.includes("package:lint/")) {
        yield { line: index + 1 };
      }
    }
    if (includes === 0) {
      // A missing include has no line, so the finding points at the file.
      yield {};
    }
  },
});
