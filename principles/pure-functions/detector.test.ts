import { expect, test } from "vitest";
import { detect, prompt } from "@wellactually/sdk/v3/test";

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions side effects in a Dart project", () => {
  expect(detect(prompt("The getter has a side effect, it writes to the cache"), dartApp)).toEqual([{ match: "side effect", depth: "pointer" }]);
});

test("points at the principle on pure functions", () => {
  expect(detect(prompt("Turn the parser into pure functions"), dartApp)).toEqual([{ match: "pure functions", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("The getter has a side effect, it writes to the cache"))).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Add a function that parses the date"), dartApp)).toEqual([]);
});
