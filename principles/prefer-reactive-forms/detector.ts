import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { addsDependency, DART_WITHOUT_TESTS, isDartProject, PUBSPEC } from "dart-kit";

// Not the bare "form": "in the form of" says it too. The plural and the
// concrete tokens carry the topic.
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["forms", "reactive_forms", "TextEditingController"]);
    }
  },
});

onWrite({
  globs: PUBSPEC,
  *detect(event) {
    for (const written of event.written) {
      if (addsDependency(written.text, ["flutter_form_builder"])) {
        yield { line: written.line };
      }
    }
  },
});

onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    // A file that mentions reactive_forms, its import included, already uses it.
    if (/reactive_forms/i.test(event.text)) {
      return;
    }
    // A TextEditingController drives any text input, search bars and chat boxes
    // included, so alone it only counts in a file that actually builds a Form.
    const buildsForm = /(?<!\w)Form\(|FormState/.test(event.text);
    for (const written of event.written) {
      // Hand-rolled form plumbing that is unambiguously about a form.
      const isFormPlumbing = written.text.includes("TextFormField(") || written.text.includes("GlobalKey<FormState>");
      const isFormController = written.text.includes("TextEditingController(") && buildsForm;
      if (isFormPlumbing || isFormController) {
        yield { line: written.line };
      }
    }
  },
});
