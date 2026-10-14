import { onPrompt, onRead, onWrite, type TextFinding } from "@wellactually/sdk/v3";

/**
 * The diagnostic itself is enough context: in a prompt, or in a file the
 * agent writes or reads, such as saved analyzer output. Not tied to a Dart
 * project, because the name can only mean this Dart lint.
 */
onPrompt({
  *detect(event) {
    yield* namesDiagnostic(event.text);
  },
});

onWrite({
  *detect(event) {
    yield* namesDiagnostic(event.text);
  },
});

onRead({
  *detect(event) {
    yield* namesDiagnostic(event.text);
  },
});

function* namesDiagnostic(text: string): Generator<TextFinding> {
  const match = /(?<![\w$])async_return_with_no_await(?![\w$])/.exec(text);
  if (match) {
    yield { match: match[0], depth: "pointer" };
  }
}
