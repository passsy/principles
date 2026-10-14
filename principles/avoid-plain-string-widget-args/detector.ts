import { onWrite } from "@wellactually/sdk/v3";
import { DART } from "dart-kit";

onWrite({
  globs: DART,
  *detect(event) {
    // Only widgets take display text through their constructor.
    const isWidgetFile = event.lines.some((line) => line.includes("extends StatelessWidget") || line.includes("extends StatefulWidget"));
    if (!isWidgetFile) {
      return;
    }
    for (const written of event.written) {
      // Field names that carry text a user will read. Identifiers like productId or
      // routeName are logic, not display, and the rule explicitly leaves them alone.
      if (/final\s+String\??\s+(title|subtitle|label|message|text|caption|description|hint|heading|body)\s*;/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
