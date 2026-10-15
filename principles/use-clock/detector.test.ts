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

const expiry = source`
  void main() {
    test('expires after an hour', () {
      fakeAsync((async) {
        final session = Session.start();
        async.elapse(const Duration(hours: 1));
        expect(session.expired, isTrue);
      });
    });
  }
`;

test("points at the principle on a fakeAsync the agent writes into a test", () => {
  expect(detect(write("test/session_test.dart", expiry))).toEqual([{ line: 3, match: "fakeAsync", depth: "pointer" }]);
});

test("points at the principle on a withClock the agent writes into a test", () => {
  const code = "  withClock(Clock.fixed(DateTime(2026)), () => expect(session.expired, isFalse));";
  expect(detect(write("test/session_test.dart", code))).toEqual([{ line: 1, match: "withClock", depth: "pointer" }]);
});

test("stays quiet on a fakeAsync outside a test", () => {
  expect(detect(write("lib/clock_helpers.dart", "final run = fakeAsync;\nvoid go() => fakeAsync((async) {});"))).toEqual([]);
});

test("stays quiet on a fakeAsync that was already in the test", () => {
  expect(detect(edit("test/session_test.dart", expiry, { written: "        expect(session.expired, isTrue);" }))).toEqual([]);
});

test("stays quiet when the user only mentions fakeAsync", () => {
  expect(detect(prompt("The expiry test is flaky, can you wrap it in fakeAsync?"), { project: "fixtures/dart_app" })).toEqual([]);
});
