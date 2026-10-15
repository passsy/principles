import { onWrite } from "@wellactually/sdk/v3";
import { calls, DART, DART_TESTS, isComment } from "dart-kit";

// Only a DateTime.now() the agent writes. Legacy calls are not this change's business.
onWrite({
  globs: DART,
  *detect(event) {
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (isComment(written.text)) {
        continue;
      }
      if (written.text.includes("DateTime.now(")) {
        yield { line: written.line };
      }
    }
  },
});

// A test that controls the time only works when the code under test reads it
// through clock.now(), so point at the principle where a test starts doing so.
onWrite({
  globs: DART_TESTS,
  *detect(event) {
    for (const written of event.written) {
      if (isComment(written.text)) {
        continue;
      }
      if (calls(written.text, ["fakeAsync"])) {
        yield { line: written.line, match: "fakeAsync", depth: "pointer" };
      }
      if (calls(written.text, ["withClock"])) {
        yield { line: written.line, match: "withClock", depth: "pointer" };
      }
    }
  },
});
