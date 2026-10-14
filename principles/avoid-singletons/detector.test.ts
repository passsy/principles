import { expect, test } from "vitest";
import { detect, edit, prompt, source, write } from "@wellactually/sdk/v3/test";

const database = source`
  /// The one database connection.
  class AppDatabase {
    static final AppDatabase instance = AppDatabase._internal();

    AppDatabase._internal();

    int queries = 0;
  }
`;

test("a static instance with a private constructor fires", () => {
  expect(detect(write("lib/app_database.dart", database))).toEqual([
    { line: 3 },
    { line: 5 },
  ]);
});

test("a nullable _instance field fires", () => {
  expect(detect(write("lib/cache.dart", "class Cache {\n  static Cache? _instance;\n}"))).toEqual([{ line: 2 }]);
});

test("a singleton that was already there stays quiet", () => {
  expect(detect(edit("lib/app_database.dart", database, { written: "  int queries = 0;" }))).toEqual([]);
});

test("static const configuration stays quiet", () => {
  expect(detect(write("lib/retry_policy.dart", "class RetryPolicy {\n  static const int maxAttempts = 3;\n}"))).toEqual([]);
});

test("a field merely containing instance in its name stays quiet", () => {
  expect(detect(write("lib/client_registry.dart", "class ClientRegistry {\n  static final int instanceCount = 0;\n}"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for a singleton in a Dart project", () => {
  expect(detect(prompt("Make the API client a singleton"), dartApp)).toEqual([{ match: "singleton", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Make the API client a singleton"))).toEqual([]);
});
