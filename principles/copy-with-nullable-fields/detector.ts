import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART } from "dart-kit";

onPrompt({
  *detect(event) {
    // Names only Dart has, so the prompt is about Dart without a pubspec.yaml to say so.
    yield* mentioned(event, ["copyWith"]);
  },
});

onWrite({
  globs: DART,
  *detect(event) {
    // A copyWith beside a nullable field, in a file that has not applied the
    // `defaultArgument` sentinel yet. Without a nullable field the naive shape
    // works fine; with the sentinel the pattern is already applied.
    const hasCopyWith = event.text.includes("copyWith");
    const hasSentinel = event.text.includes("defaultArgument");
    const hasNullableField = /\w+\?\s+\w+;/.test(event.text);
    if (!hasCopyWith || hasSentinel || !hasNullableField) {
      return;
    }
    for (const written of event.written) {
      // The naive copyWith betrays itself with `?? this.`: an omitted argument
      // and a passed `null` collapse into the same branch, so nullable fields
      // can never be cleared. Fires when the agent writes that fallback.
      if (written.text.includes("?? this.")) {
        yield { line: written.line };
      }
    }
  },
});
