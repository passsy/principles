import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS } from "dart-kit";

onPrompt({
  *detect(event) {
    // Names only Dart has, so the prompt is about Dart without a pubspec.yaml to say so.
    yield* mentioned(event, ["Future.delayed"]);
  },
});

// Future.delayed cannot be cancelled, which only matters where something
// can be disposed out from under it. Pure Dart keeps it, so only files
// with a widget lifecycle fire.
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    const hasWidgetLifecycle = event.file.content.includes("extends State<") || event.file.content.includes("extends StatefulWidget");
    if (!hasWidgetLifecycle) {
      return;
    }
    for (const written of event.written) {
      if (written.text.includes("Future.delayed(")) {
        yield { line: written.line };
      }
    }
  },
});
