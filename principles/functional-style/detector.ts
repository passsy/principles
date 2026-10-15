import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isComment } from "dart-kit";

onPrompt({
  *detect(event) {
    // Names only Dart has, so the prompt is about Dart without a pubspec.yaml to say so.
    yield* mentioned(event, ["dartx"]);
  },
});

/**
 * The accumulate-into-a-list loop, in the code the agent just wrote: declare
 * an empty collection, loop, add. That shape is `.map()`/`.where()`/`.fold()`
 * written by hand. Legacy loops elsewhere in the file stay unjudged.
 */
onWrite({
  globs: DART,
  *detect(event) {
    const written = event.written;
    for (let i = 0; i < written.length; i++) {
      const text = written[i]?.text ?? "";
      // A comment is not code the agent wrote.
      if (isComment(text)) {
        continue;
      }
      if (!declaresEmptyCollection(text)) {
        continue;
      }
      // The loop and its add have to follow within six written lines.
      const end = Math.min(written.length, i + 7);
      const following = written.slice(i + 1, end).map(({ text }) => text);
      const loops = following.some((code) => /\bfor\s*\(/.test(code));
      if (loops && following.some(accumulates)) {
        yield { line: written[i]?.line };
        // One finding per loop, not one per add.
        i = end - 1;
      }
    }
  },
});

/** An empty growable collection about to be filled by hand. */
function declaresEmptyCollection(code: string): boolean {
  if (/=\s*(<[^=;]*>\s*)?\[\]\s*;/.test(code)) {
    return true;
  }
  if (/=\s*<[^=;]*>\s*\{\}\s*;/.test(code)) {
    return true;
  }
  // A bare `{}` is ambiguous; a List/Map/Set type on the line settles it.
  return /=\s*\{\}\s*;/.test(code) && /\b(?:List|Map|Set)</.test(code);
}

/** A line that pushes into the collection. */
function accumulates(code: string): boolean {
  return code.includes(".add(") || code.includes(".addAll(") || /\w\[[^\]]*\]\s*=[^=]/.test(code);
}
