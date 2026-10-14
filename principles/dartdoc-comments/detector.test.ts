import { expect, test } from "vitest";
import { detect, prompt } from "@wellactually/sdk/v3/test";

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for a doc comment", () => {
  expect(detect(prompt("write a doc comment for this class"), dartApp)).toEqual([{ match: "doc comment", depth: "pointer" }]);
});

test("points at the principle when the user mentions dartdoc", () => {
  expect(detect(prompt("Run dartdoc and fix the warnings"), dartApp)).toEqual([{ match: "dartdoc", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("write a doc comment for this class"))).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Rename the Plain class to Simple"), dartApp)).toEqual([]);
});
