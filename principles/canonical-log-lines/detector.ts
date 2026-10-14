import { onWrite } from "@wellactually/sdk/v3";

/** A log call: a logger-ish receiver, a level, an open paren. */
const LOG_CALL = /\b(?:_?log(?:ger|ging)?|console|slog|chirp|timber|developer)\w*\s*\.\s*(?:log|trace|debug|info|warn|warning|error|fatal|severe|fine[rst]*|shout|config|print)\s*\(/i;

/**
 * A request identifier threaded into that call by hand. This is the shape the
 * rule replaces: an id repeated at every call site exists only so a reader can
 * join the fragments back together later.
 *
 * The trailing separator is what makes it a field rather than prose: a key
 * (`requestId:`), a string key (`"request_id",`), or an interpolation into a
 * message (`reqId=`). A sentence that merely says "requestId" is not a field.
 *
 * `span_id` is deliberately absent: putting one on a log line means the code
 * already has a span carrying the context, which is the rule's own advice.
 */
const THREADED_ID = /\b(?:request|correlation|req|trace)[_-]?id\b['"`]?\s*[:=,]/i;

// The globs are the languages whose log calls read as `receiver.level(...)`,
// so one scanner is precise for all of them. Markdown and JSON are left out:
// a code sample in a doc is not code being written.
//
// The call shape is read from the code, so a commented-out or quoted example
// cannot fire. The field name is read from the text, because in Dart, Go and
// Ruby it is a string key that the code no longer shows.
onWrite({
  globs: ["**/*.{dart,ts,tsx,mts,cts,js,jsx,mjs,cjs,kt,kts,swift,java,cs,go,py,rb,php,scala,rs}", "!**/*.{g,freezed,gr,config,mocks}.dart", "!**/test/**", "!**/*_test.dart"],
  *detect(event) {
    for (const written of event.written) {
      if (LOG_CALL.test(written.text) && THREADED_ID.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
