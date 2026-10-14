import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, DART, isDartProject, PUBSPEC } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["codegen", "code generation", "build_runner", "freezed", "freezed_annotation", "json_serializable", "json_annotation", "auto_route_generator", "injectable_generator"]);
    }
  },
});

// Fires when the agent writes codegen machinery: the dependency lines, an
// annotation, a part directive. A legacy generated setup it read past cannot
// be un-adopted by an injected paragraph.
onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["build_runner", "freezed", "freezed_annotation", "json_serializable", "json_annotation", "auto_route_generator", "injectable_generator"])) {
        yield { line: written.line };
      }
    }
  },
});

// The annotations, and the part directive naming a generated file. The text
// keeps string literals visible, so `part 'x.g.dart';` counts too.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      if (/JsonSerializable|freezed|JsonKey|\.g\.dart/i.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
