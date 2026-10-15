import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const session = source`
  class Session {
    bool get expired => DateTime.now().isAfter(validUntil);
    int retries = 3;
  }
`;

test("fires on a DateTime.now() the agent writes", () => {
  expect(detect(write("lib/session.dart", session))).toEqual([{ line: 2 }]);
});

test("stays quiet on a DateTime.now() that was already there", () => {
  expect(detect(edit("lib/session.dart", session, { written: "  int retries = 3;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/session.dart", session))).toEqual([]);
});

test("stays quiet on DateTime.now in a comment", () => {
  const code = source`
    // Do not call DateTime.now() here.
    final now = clock.now();
  `;
  expect(detect(write("lib/hint.dart", code))).toEqual([]);
});

test("stays quiet in generated code", () => {
  expect(detect(write("lib/session.g.dart", "final created = DateTime.now();"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions fakeAsync in a Dart project", () => {
  expect(detect(prompt("The expiry test is flaky, can you wrap it in fakeAsync?"), dartApp)).toEqual([{ match: "fakeAsync", depth: "pointer" }]);
});

test("points at the principle on the same words without a pubspec.yaml", () => {
  expect(detect(prompt("The expiry test is flaky, can you wrap it in fakeAsync?"))).toEqual([{ match: "fakeAsync", depth: "pointer" }]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("What time zone does the server log in?"), dartApp)).toEqual([]);
});
