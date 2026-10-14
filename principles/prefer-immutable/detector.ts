import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART_LIB, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["immutable", "mutable", "immutability"]);
    }
  },
});

/**
 * An indented public field of a common type, e.g. `  bool checked = false;`.
 * Private mutable fields are ordinary internal state: a service counting its
 * retries is not the mutation-under-the-UI the rule is about. A public
 * reassignable field on a model is.
 */
const MUTABLE_FIELD = /^\s+(?:bool|int|double|num|String\??|List<|Map<|Set<|DateTime\??)\S*\s+[a-zA-Z]\w*\s*(=.*)?;\s*$/;

// Mutable state in tests or tools is not what the rule is about; it exists
// to keep model classes in lib/ from mutating under the UI.
onWrite({
  globs: DART_LIB,
  *detect(event) {
    // Fields need a class to live in, and mutable fields inside a State class
    // are the setState pattern rather than a model leaking mutability.
    const hasClass = event.lines.some((code) => /\bclass\s+[A-Z]/.test(code));
    if (!hasClass || event.text.includes("extends State<")) {
      return;
    }
    let examples = 0;
    for (const written of event.written) {
      if (!MUTABLE_FIELD.test(written.text) || /\b(?:final|const|static|late)\b/.test(written.text)) {
        continue;
      }
      yield { line: written.line };
      // A few examples, not an inventory.
      examples++;
      if (examples === 3) {
        return;
      }
    }
  },
});
