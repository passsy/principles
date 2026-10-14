import { onWrite } from "@wellactually/sdk/v3";
import { DART } from "dart-kit";

/**
 * No word list. `.toUpperCase()` only breaks this rule when what it uppercases
 * is on its way to the screen, so a written line needs a display sink or a
 * localization lookup next to the conversion.
 */
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      const uppercased = /\.toUpperCase\s*\(\s*\)/.test(written.text);
      const localized = /\b(?:l10n|localizations?|translations?)\b|\bAppLocalizations\s*\.\s*of\s*\(/.test(written.text);
      const displayed = /\b(?:Text|TextSpan|SelectableText|RichText)\s*\(|\b(?:label|title|subtitle|tooltip|message|semanticLabel|hintText|helperText|errorText|caption)\s*:/.test(written.text);
      if (uppercased && (localized || displayed)) {
        yield { line: written.line };
      }
    }
  },
});
