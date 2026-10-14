import { expect, test } from "vitest";
import { detect, prompt, read, source, write } from "@wellactually/sdk/v3/test";

test("fires on a competing lint package in the pubspec", () => {
  const pubspec = source`
    name: demo
    dev_dependencies:
      flutter_lints: ^4.0.0
  `;
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 3 }]);
});

test("fires on an include of another lint package", () => {
  const options = "include: package:very_good_analysis/analysis_options.yaml";
  expect(detect(write("analysis_options.yaml", options))).toEqual([{ line: 1 }]);
});

test("points at the file when the include is missing", () => {
  const options = source`
    linter:
      rules:
        - avoid_print
  `;
  expect(detect(write("analysis_options.yaml", options))).toEqual([{}]);
});

test("stays quiet on a plain pubspec", () => {
  const pubspec = source`
    name: demo
    dependencies:
      meta: ^1.0.0
  `;
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([]);
});

test("stays quiet on an include of package:lint", () => {
  expect(detect(write("analysis_options.yaml", "include: package:lint/strict.yaml"))).toEqual([]);
});

test("stays quiet when the agent only reads the lint setup", () => {
  expect(detect(read("analysis_options.yaml", "include: package:very_good_analysis/analysis_options.yaml"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions very_good_analysis", () => {
  expect(detect(prompt("Add very_good_analysis to the project"), dartApp)).toEqual([{ match: "very_good_analysis", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Add very_good_analysis to the project"))).toEqual([]);
});
