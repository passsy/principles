import { expect, test } from "vitest";
import { detect, prompt } from "@wellactually/sdk/v3/test";

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user talks about nesting in a Dart project", () => {
  expect(detect(prompt("flatten this nested if pyramid"), dartApp)).toEqual([{ match: "nested if", depth: "pointer" }]);
});

test("points at the principle when the user asks for early returns", () => {
  expect(detect(prompt("Use an early return for the null case"), dartApp)).toEqual([{ match: "early return", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("flatten this nested if pyramid"))).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Return the user list sorted by name"), dartApp)).toEqual([]);
});
