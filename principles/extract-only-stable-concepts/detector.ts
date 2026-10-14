import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["helper", "helpers"]);
    }
  },
});

/**
 * Names that describe refactor state instead of a domain concept,
 * declarations only. Calling an existing helper is not extracting one, and a
 * call-site suffix match convicts real APIs (`dir.createTemp(` is dart:io).
 */
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      if (/\b(?:class|mixin|extension)\s+\w+(?:Helper|Impl)\b/.test(written.text) || /\b(newImpl|oldImpl|simpleVersion)\w*\s*\(/.test(written.text)) {
        yield { line: written.line };
        continue;
      }
      // A function declaration: a return type, then the suffixed name, then `(`.
      const returnType = /^\s*(?:static\s+)?(\w[\w<>, ?]*?)\s+_?\w+(?:Helper|Impl)\s*\(/.exec(written.text)?.[1];
      if (returnType === undefined) {
        continue;
      }
      // These words put an expression, not a type, before the name.
      if (!["return", "await", "yield", "throw", "case", "else", "in", "new"].includes(returnType)) {
        yield { line: written.line };
      }
    }
  },
});
