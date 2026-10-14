import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const loaderTest = source`
  import 'package:test/test.dart';

  void main() {
    late Loader loader;

    setUp(() {
      loader = Loader();
    });

    tearDown(() {
      loader.close();
    });

    test('loads', () {
      expect(loader.load(), isNotNull);
    });
  }
`;

test("fires on setUp and tearDown the agent writes in a test", () => {
  expect(detect(write("test/loader_test.dart", loaderTest))).toEqual([
    { line: 6 },
    { line: 10 },
  ]);
});

test("stays quiet on addTearDown", () => {
  const code = source`
    test('loads', () {
      final loader = Loader();
      addTearDown(loader.close);
      expect(loader.load(), isNotNull);
    });
  `;
  expect(detect(write("test/loader_test.dart", code))).toEqual([]);
});

test("stays quiet outside a test file", () => {
  expect(detect(write("lib/harness.dart", "void configure() {\n  setUp(() {});\n}\n"))).toEqual([]);
});

test("stays quiet on a legacy setUp when the agent edits elsewhere or reads", () => {
  expect(detect(edit("test/loader_test.dart", loaderTest, { written: "      expect(loader.load(), isNotNull);" }))).toEqual([]);
  expect(detect(read("test/loader_test.dart", loaderTest))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions tearDown in a Dart project", () => {
  expect(detect(prompt("Move the cleanup into a tearDown please"), dartApp)).toEqual([{ match: "tearDown", depth: "pointer" }]);
});

test("stays quiet on an everyday setup", () => {
  expect(detect(prompt("What is the setup for the staging server?"), dartApp)).toEqual([]);
});
