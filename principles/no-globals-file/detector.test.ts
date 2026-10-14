import { expect, test } from "vitest";
import { detect, edit, prompt, read, write } from "@wellactually/sdk/v3/test";

test.each(["lib/globals.dart", "lib/src/constants.dart", "lib/consts.dart"])("fires when the agent writes %s", (path) => {
  expect(detect(write(path, "const timeout = 30;\n"))).toEqual([{}]);
});

test("points at the file when the agent appends a constant", () => {
  const code = "const timeout = 30;\nconst retries = 3;\n";
  expect(detect(edit("lib/globals.dart", code, { written: "const retries = 3;" }))).toEqual([{}]);
});

test("stays quiet when the agent only reads a legacy globals file", () => {
  expect(detect(read("lib/globals.dart", "const timeout = 30;\n"))).toEqual([]);
});

test("stays quiet on a constant in the file that uses it", () => {
  expect(detect(write("lib/sync_engine.dart", "const timeout = 30;\n"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for globals in a Dart project", () => {
  expect(detect(prompt("Move the timeouts into globals"), dartApp)).toEqual([{ match: "globals", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Move the timeouts into globals"))).toEqual([]);
});
