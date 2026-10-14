import { mentioned, onPrompt } from "@wellactually/sdk/v3";
import { isDartProject } from "dart-kit";

/**
 * Words only. Whether an `extends` is a framework requirement, an interface,
 * or a subclass "enhancing" a base needs the whole hierarchy to judge; a
 * line-level allowlist of blessed base classes misfires on every app-local
 * base. The vocabulary is genuinely used when the topic is live.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["inheritance", "subclass", "subclasses", "superclass", "base class"]);
    }
  },
});
