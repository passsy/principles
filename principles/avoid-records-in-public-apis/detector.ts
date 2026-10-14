import { onWrite } from "@wellactually/sdk/v3";
import { DART_LIB } from "dart-kit";

/**
 * A named record type annotation reads `({String id, int count})`: an opening
 * `({` with `Type name` pairs inside, and nothing glued in front of the `(`.
 * A function's named parameter list is `name({...})`, identifier first, so
 * the lookbehind is what tells `({int width}) measure()` apart from
 * `measure({int width})`.
 */
const NAMED_RECORD_TYPE = /(?<![\w)])\(\{\s*[A-Za-z_][\w<>, ?]*\s+[a-z]\w*\s*[,}]/;

/**
 * No word list: "record" in conversation is a database row or an audio file
 * far more often than a Dart record. The signal is a record type the agent
 * just wrote into lib/, where the rule permits locals and privates but a
 * single line cannot tell them apart; the path carries the public half.
 */
onWrite({
  globs: DART_LIB,
  *detect(event) {
    for (const written of event.written) {
      if (NAMED_RECORD_TYPE.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
