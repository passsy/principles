import { mentioned, onPrompt, onWrite } from "@wellactually/sdk/v3";
import { calls, DART_TESTS, isDartProject } from "dart-kit";

/**
 * Word matching is case-insensitive, so bare "setUp" would match every
 * everyday "setup" in conversation. Only the spellings that are
 * unambiguously about the test hooks are listed. "tearDown" stays: outside
 * tests nobody says teardown as one word.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["setUp()", "setUpAll", "tearDown", "tearDownAll"]);
    }
  },
});

// A setUp/tearDown call the agent writes into a test. addTearDown() is the
// recommended replacement; the lookbehind keeps it and `foo.setUp(` apart.
onWrite({
  globs: DART_TESTS,
  *detect(event) {
    for (const written of event.written) {
      if (calls(written.text, ["setUp", "setUpAll", "tearDown", "tearDownAll"])) {
        yield { line: written.line };
      }
    }
  },
});
