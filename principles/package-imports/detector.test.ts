import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const relative = source`
  import 'package:flutter/material.dart';
  import '../models/user.dart';
`;

test("fires on a relative import the agent writes in lib", () => {
  expect(detect(write("lib/pages/profile.dart", relative))).toEqual([{ line: 2 }]);
});

test("fires on a test importing lib relatively", () => {
  const code = "import '../lib/models/user.dart';";
  expect(detect(write("test/user_test.dart", code))).toEqual([{ line: 1 }]);
});

test("stays quiet on a relative import between test files", () => {
  expect(detect(write("test/user_test.dart", "import 'helpers/fake_api.dart';"))).toEqual([]);
});

test("stays quiet on package and dart imports", () => {
  const code = source`
    import 'dart:async';
    import 'package:demo/models/user.dart';
  `;
  expect(detect(write("lib/pages/profile.dart", code))).toEqual([]);
});

test("stays quiet on a relative export in a barrel", () => {
  expect(detect(write("lib/demo.dart", "export 'src/logger.dart' show Logger;"))).toEqual([]);
});

test("stays quiet on a legacy relative import the agent did not write", () => {
  expect(detect(edit("lib/pages/profile.dart", relative, { written: "import 'package:flutter/material.dart';" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/pages/profile.dart", relative))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions relative imports", () => {
  expect(detect(prompt("Switch these to relative imports please"), dartApp)).toEqual([{ match: "relative imports", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Switch these to relative imports please"))).toEqual([]);
});
