import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, calls, DART, isComment, isDartProject, PUBSPEC } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["deep_pick", "deeppick", "jsonDecode", "json parsing"]);
    }
  },
});

/**
 * The codegen packages (json_serializable and friends) belong to the
 * avoid-code-generation principle. This one owns the other route to bad JSON
 * handling: decoding by hand.
 */
onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["built_value"])) {
        yield { line: written.line };
      }
    }
  },
});

onWrite({
  globs: DART,
  *detect(event) {
    // A file that imports deep_pick has already been converted.
    if (event.text.includes("deep_pick")) {
      return;
    }
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      // A call to jsonDecode, not a method of that name on something else.
      const decodes = calls(written.text, ["jsonDecode"]) || written.text.includes("json.decode(");
      // A cast is the "manual Map handling" the rule is about, but only when
      // the line is actually about JSON.
      const castsJson = written.text.includes("as Map<String, dynamic>") && /json/i.test(written.text);
      if (decodes || castsJson) {
        yield { line: written.line };
      }
    }
  },
});
