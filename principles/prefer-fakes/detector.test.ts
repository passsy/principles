import { expect, test } from "vitest";
import { detect, edit, prompt, source, write } from "@wellactually/sdk/v3/test";

test("a mocktail import and a Mock subclass fire", () => {
  const code = source`
    import 'package:mocktail/mocktail.dart';

    class MockApi extends Mock implements Api {}
  `;
  expect(detect(write("test/api_test.dart", code))).toEqual([
    { line: 1 },
    { line: 3 },
  ]);
});

test("a @GenerateMocks annotation fires", () => {
  expect(detect(write("test/repo_test.dart", "@GenerateMocks([Repo])\nvoid main() {}"))).toEqual([{ line: 1 }]);
});

const pubspec = source`
  name: demo
  dev_dependencies:
    test: ^1.25.0
    mockito: ^5.4.4
`;

test("adding mockito to the pubspec fires", () => {
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 4 }]);
});

test("a mockito dependency that was already there stays quiet", () => {
  expect(detect(edit("pubspec.yaml", pubspec, { written: "  test: ^1.25.0" }))).toEqual([]);
});

test("a hand-written fake stays quiet", () => {
  const code = source`
    class FakeApi implements Api {
      final List<String> calls = [];
    }
  `;
  expect(detect(write("test/api_test.dart", code))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for a mock in a Dart project", () => {
  expect(detect(prompt("Mock the API in this test"), dartApp)).toEqual([{ match: "Mock", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Mock the API in this test"))).toEqual([]);
});
