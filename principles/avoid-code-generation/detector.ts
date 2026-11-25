import { mentioned, onPrompt, onWrite } from "@wellactually/detector-sdk/v3";
import { addsDependency, DART, isDartProject, PUBSPEC } from "dart-kit";

const NAMES = ["codegen", "code generation", "build_runner", "freezed", "freezed_annotation", "json_serializable", "json_annotation", "auto_route_generator", "injectable_generator"];

// `mentioned` runs one Unicode regex per name over the whole prompt, which
// is slow in the isolate for a long one. Each name, separators dropped, has
// to appear in the prompt with its separators dropped, so most prompts end here.
const STEMS = [...new Set(NAMES.map((name) => name.replace(/[_\-.]/g, "").split(" ").at(-1)!))];

onPrompt({
  *detect(event) {
    const plain = event.text.toLowerCase().replace(/[_\-.]/g, "");
    if (STEMS.some((stem) => plain.includes(stem)) && isDartProject(event)) {
      yield* mentioned(event, NAMES);
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

const CODEGEN = /JsonSerializable|freezed|JsonKey|\.g\.dart/i;

// The annotations, and the part directive naming a generated file. The text
// keeps string literals visible, so `part 'x.g.dart';` counts too.
onWrite({
  globs: DART,
  *detect(event) {
    // The isolate's regex engine walks every character; plain string search does not.
    const text = event.written.map((written) => written.text).join("\n").toLowerCase();
    if (!["jsonserializable", "freezed", "jsonkey", ".g.dart"].some((needle) => text.includes(needle))) {
      return;
    }
    for (const written of event.written) {
      if (CODEGEN.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
