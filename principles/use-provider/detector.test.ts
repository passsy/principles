import { expect, test } from "vitest";
import { detect, edit, prompt, read, write } from "@wellactually/sdk/v3/test";

const imports = "import 'package:flutter_riverpod/flutter_riverpod.dart';\nimport 'package:provider/provider.dart';\n";

test("fires on a rival package the agent imports", () => {
  expect(detect(write("lib/main.dart", imports))).toEqual([{ line: 1 }]);
});

test("fires on a rival dependency added to the pubspec", () => {
  const pubspec = "name: demo\ndependencies:\n  provider: ^6.0.0\n  get_it: ^7.0.0\n";
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 4 }]);
});

test("stays quiet on provider itself", () => {
  expect(detect(write("lib/main.dart", "import 'package:provider/provider.dart';\nfinal cart = context.watch<Cart>();\n"))).toEqual([]);
});

test("stays quiet on a rival import the edit did not touch", () => {
  expect(detect(edit("lib/main.dart", imports, { written: "import 'package:provider/provider.dart';" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/main.dart", imports))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions riverpod in a Dart project", () => {
  expect(detect(prompt("Should we move the cart to Riverpod?"), dartApp)).toEqual([{ match: "Riverpod", depth: "pointer" }]);
});

test("stays quiet on an auth provider", () => {
  expect(detect(prompt("Add Google as a sign-in provider"), dartApp)).toEqual([]);
});

test("stays quiet outside a Dart project", () => {
  expect(detect(prompt("Should we move the cart to Riverpod?"))).toEqual([]);
});
