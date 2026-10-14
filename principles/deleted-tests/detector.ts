import { onWrite, type WrittenLine } from "@wellactually/sdk/v3";
import { DART_TESTS, isComment } from "dart-kit";

/**
 * Read off the lines the agent wrote: a commented-out test, or a skip without
 * a tracking issue. Legacy commented tests elsewhere in the file are review
 * material, not this change's.
 */
onWrite({
  globs: DART_TESTS,
  *detect(event) {
    for (const written of event.written) {
      const commentedOut = /^\s*\/\/+\s*(test|testWidgets|group)\(/.test(written.text);
      if (commentedOut || untrackedSkip(written)) {
        yield { line: written.line };
      }
    }
  },
});

function untrackedSkip({ text }: WrittenLine): boolean {
  // The skip argument has to be code, not a comment that mentions it.
  if (isComment(text)) {
    return false;
  }
  // `skip: true`, or a skip with a reason in quotes.
  const match = /\bskip:\s*(?:true\b|(['"])((?:(?!\1).)*)\1)/.exec(text);
  if (!match) {
    return false;
  }
  // A reason is fine when it names a tracking issue like `#456`.
  const reason = match[2];
  return reason === undefined || !/#\d+|issues\/\d+/.test(reason);
}
