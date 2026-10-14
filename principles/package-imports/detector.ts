import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["relative import", "relative imports", "package import", "package imports"]);
    }
  },
});

/**
 * Relative imports are banned in lib/. In test/ they are fine, except when
 * they reach into lib/. Imports only: a barrel file writing
 * `export 'src/logger.dart' show Logger` is the idiom, not a violation.
 *
 * Only imports the agent writes: fixing the one it just added is a one-line
 * edit, while legacy relative imports are a refactor nobody asked for.
 */
onWrite({
  globs: ["**/lib/**/*.dart", "**/test/**/*.dart", "**/*_test.dart", "!**/*.{g,freezed,gr,config,mocks}.dart"],
  *detect(event) {
    const inTest = event.file.relativePath.split("/").slice(0, -1).includes("test") || event.file.name.endsWith("_test.dart");
    for (const written of event.written) {
      if (!written.text.trim().startsWith("import ")) {
        continue;
      }
      // Strings are blanked in code, so the path is read off the text.
      const target = (/'([^']*)'/.exec(written.text) ?? /"([^"]*)"/.exec(written.text))?.[1];
      if (target === undefined) {
        continue;
      }
      if (target.startsWith("package:") || target.startsWith("dart:")) {
        continue;
      }
      if (!inTest || target.includes("lib/")) {
        yield { line: written.line };
      }
    }
  },
});
