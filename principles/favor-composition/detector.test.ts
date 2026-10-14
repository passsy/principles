import { expect, test } from "vitest";
import { detect, prompt } from "@wellactually/sdk/v3/test";

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user talks about a subclass in a Dart project", () => {
  expect(detect(prompt("should this be a subclass of the engine"), dartApp)).toEqual([{ match: "subclass", depth: "pointer" }]);
});

test("points at the principle on a base class", () => {
  expect(detect(prompt("Add a base class for all repositories"), dartApp)).toEqual([{ match: "base class", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("should this be a subclass of the engine"))).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Rename the engine class"), dartApp)).toEqual([]);
});
