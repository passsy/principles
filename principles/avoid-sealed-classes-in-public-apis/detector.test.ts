import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const outcome = source`
  sealed class Outcome {}

  class Ok extends Outcome {}
`;

test("fires on a public sealed class the agent writes in lib", () => {
  expect(detect(write("lib/outcome.dart", outcome))).toEqual([{ line: 1 }]);
});

test("stays quiet on a private sealed class", () => {
  expect(detect(write("lib/outcome.dart", "sealed class _Outcome {}"))).toEqual([]);
});

test("stays quiet outside lib and in tests", () => {
  expect(detect(write("bin/outcome.dart", outcome))).toEqual([]);
  expect(detect(write("test/outcome_test.dart", outcome))).toEqual([]);
});

test("stays quiet on a legacy sealed class when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/outcome.dart", outcome, { written: "class Ok extends Outcome {}" }))).toEqual([]);
  expect(detect(read("lib/outcome.dart", outcome))).toEqual([]);
});

test("stays quiet on sealed in a comment", () => {
  expect(detect(write("lib/outcome.dart", "// Not a sealed class Outcome on purpose.\nclass Outcome {}"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks about exhaustiveness", () => {
  expect(detect(prompt("should this switch be exhaustive"), dartApp)).toEqual([{ match: "exhaustive", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("should this switch be exhaustive"))).toEqual([]);
});
