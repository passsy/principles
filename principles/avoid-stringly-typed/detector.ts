import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { DART, isDartProject } from "dart-kit";

onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["stringly", "magic string", "magic strings", "extension type", "extension types"]);
    }
  },
});

/**
 * A String is fine for a name and wrong for a status. The difference is what
 * the identifier calls itself, so the trigger is the discrete-value
 * vocabulary in a declaration the agent just wrote.
 */
onWrite({
  globs: DART,
  *detect(event) {
    const boundary = isApiBoundary(event.file.relativePath);
    for (const written of event.written) {
      const discreteValue = /\bString\??\s+(?:get\s+)?(status|state|mode|role|category|kind|variant|severity|level|theme)\b/i.test(written.text);
      const discreteValues = /\bList<String>\??\s+(?:get\s+)?(statuses|states|modes|roles|categories|kinds|variants|severities|levels)\b/i.test(written.text);
      // A machine identifier: id, uuid, userId, apiKey, authToken.
      const machineIdentifier = boundary && /\bString\??\s+(?:get\s+)?(?:id|uuid|[a-z_]\w*(?:Id|ID|Uuid|UUID|Key|Token))\b/.test(written.text);
      if (discreteValue || discreteValues || machineIdentifier) {
        yield { line: written.line };
      }
    }
  },
});

/**
 * IDs become dangerous when raw wire values enter typed application code.
 * Limit the automatic trigger to API/model boundaries: a local display-only
 * `String id` is too ambiguous for a low-noise detector, while these paths
 * establish that the declaration transports or stores an external value.
 */
function isApiBoundary(relativePath: string): boolean {
  const normalized = `/${relativePath.replaceAll("\\", "/").toLowerCase()}`;
  return /\/(?:api|models?|repositories|datasources?)\//.test(normalized) || /(?:api_client|data_source|repository)\.dart$/.test(normalized);
}
