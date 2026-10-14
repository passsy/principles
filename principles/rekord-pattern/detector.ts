import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["rekord", "fromJson", "data model", "data models"]);
    }
  },
});

onWrite({
  globs: DART,
  *detect(event) {
    // A file that already uses Rekord made its choice; the eager fromJson left
    // in it is usually a bridge, not an adoption.
    if (event.lines.some((line) => line.includes("Rekord"))) {
      return;
    }
    // A generated-model file belongs to the avoid-code-generation principle:
    // firing both on the same class would spend two injections on one decision.
    if (event.lines.some((line) => /\.g\.dart|@JsonSerializable|json_annotation/.test(line))) {
      return;
    }
    for (const written of event.written) {
      if (!/\w+\.fromJson\(/.test(written.text)) {
        continue;
      }
      // Declaring the constructor is the adoption; calling one that already
      // exists elsewhere is not.
      const declares = written.text.includes("factory ") || /^\s*\w+\.fromJson\(Map/.test(written.text);
      if (declares) {
        yield { line: written.line };
      }
    }
  },
});
