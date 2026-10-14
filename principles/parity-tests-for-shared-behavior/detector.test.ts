import { expect, test } from "vitest";
import { detect, prompt } from "@wellactually/sdk/v3/test";

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for a parity test in a Dart project", () => {
  expect(detect(prompt("Add a parity test for validate and isValid"), dartApp)).toEqual([{ match: "parity test", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Add a parity test for validate and isValid"))).toEqual([]);
});

test("stays quiet on parity that is not about tests", () => {
  expect(detect(prompt("Check feature parity with the iOS app"), dartApp)).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Add a test for the expired token"), dartApp)).toEqual([]);
});
