import { expect, test } from "vitest";
import { detect, prompt } from "@wellactually/sdk/v3/test";

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions a breakpoint in a Dart project", () => {
  expect(detect(prompt("I can't set a breakpoint on that expression"), dartApp)).toEqual([{ match: "breakpoint", depth: "pointer" }]);
});

test("points at the principle when the user asks for debuggable code", () => {
  expect(detect(prompt("Make this more debuggable"), dartApp)).toEqual([{ match: "debuggable", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("I can't set a breakpoint on that expression"))).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Fix the layout breaks on tablets"), dartApp)).toEqual([]);
});
