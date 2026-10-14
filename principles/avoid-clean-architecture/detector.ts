import { mentioned, onPrompt, onRead, onWrite, type File } from "@wellactually/sdk/v3";
import { DART, isDartProject } from "dart-kit";

// "repository" stays out of the word list, in conversation it almost always
// means git.
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["clean architecture", "usecase", "usecases"]);
    }
  },
});

// The path convicts the structure even on a read: touching any file of a
// layered tree is the moment to hear about the alternative. No line is to
// blame for where a file lives, so the finding points at the file.
onRead({
  globs: DART,
  *detect(event) {
    if (inLayer(event.file)) {
      yield {};
    }
  },
});

onWrite({
  globs: DART,
  *detect(event) {
    if (inLayer(event.file)) {
      yield {};
    }
  },
});

// Outside a layered tree it takes a UseCase or Repository class the agent
// wrote. Repository is the loudest signal: most repositories forward one call
// and add nothing.
onWrite({
  globs: DART,
  *detect(event) {
    if (inLayer(event.file)) {
      return;
    }
    for (const written of event.written) {
      if (/class\s+\w+(?:UseCase|Repository)\b/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});

/** Whether a directory of the path betrays a layer-first structure. */
function inLayer(file: File): boolean {
  return ["/usecases/", "/use_cases/", "/repositories/", "/domain/entities/"].some((dir) => `/${file.relativePath}`.includes(dir));
}
