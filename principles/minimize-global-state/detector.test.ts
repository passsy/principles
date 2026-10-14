import { expect, test } from "vitest";
import { detect, edit, prompt, source, write } from "@wellactually/sdk/v3/test";

const counter = source`
  int activeSessionCount = 0;

  /// Resets the counter between runs.
  void resetSessions() {
    activeSessionCount = 0;
  }
`;

test("a reassignable top-level variable fires", () => {
  expect(detect(write("lib/session_state.dart", counter))).toEqual([{ line: 1 }]);
});

test("a global the agent did not write stays quiet", () => {
  expect(detect(edit("lib/session_state.dart", counter, { written: "    activeSessionCount = 0;" }))).toEqual([]);
});

test("top-level const and final stay quiet", () => {
  expect(detect(write("lib/session_limits.dart", "const int maxSessions = 5;\nfinal List<int> ids = [];"))).toEqual([]);
});

test("mutable state inside a function is local, not global", () => {
  const code = source`
    int countSessions(List<int> sessions) {
      var total = 0;
      return total;
    }
  `;
  expect(detect(write("lib/session_counter.dart", code))).toEqual([]);
});

test("a top-level variable in a test stays quiet", () => {
  expect(detect(write("test/session_test.dart", "var calls = 0;"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions global state in a Dart project", () => {
  expect(detect(prompt("Keep the token in a global variable"), dartApp)).toEqual([{ match: "global variable", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Keep the token in a global variable"))).toEqual([]);
});
