import { onWrite } from "@wellactually/sdk/v3";

/**
 * String-building around a url variable: `'...' + url`, `baseUrl + ...`, or
 * `$baseUrl/...` interpolation. Deliberately narrow; a plain `url` variable
 * being passed around is fine, and so is interpolating one into a log line.
 * Only gluing a path onto it hides the full address from search.
 */
const GLUED_URL = /['"`]\s*\+\s*\w*[uU]rl\b|\b\w*[bB]ase[uU]rl\w*\s*\+|\$\{?\w*[bB]ase[uU]rl\}?\//;

// Any language. Generated clients and route tables are exempt, nobody greps them by hand.
onWrite({
  globs: ["!**/*.{g,freezed,gr,config,mocks}.dart"],
  *detect(event) {
    for (const written of event.written) {
      // `Uri.https(` is Dart's host+path split constructor, the canonical assembled URL.
      const assembled = /Uri\.https?\(/.test(written.text) || GLUED_URL.test(written.text);
      // A complete literal with nothing glued on is what the rule asks for.
      const completeLiteral = /https?:\/\//.test(written.text) && !/\+|\$\{|\$\w/.test(written.text);
      if (assembled && !completeLiteral) {
        yield { line: written.line };
      }
    }
  },
});
