import { expect, test } from "vitest";
import { detect, edit, prompt, source, write } from "@wellactually/sdk/v3/test";

const helper = source`
  /// Formats report labels.
  String formatHelper(String input) {
    return input.trim();
  }
`;

test("a Helper-suffixed function fires", () => {
  expect(detect(write("lib/report_formatting.dart", helper))).toEqual([{ line: 2 }]);
});

test("an Impl class and a scaffolding call fire", () => {
  const code = source`
    class StorageImpl {
      void save() => newImplSave();
    }
  `;
  expect(detect(write("lib/storage.dart", code))).toEqual([
    { line: 1 },
    { line: 2 },
  ]);
});

test("a helper the agent did not write stays quiet", () => {
  expect(detect(edit("lib/report_formatting.dart", helper, { written: "    return input.trim();" }))).toEqual([]);
});

test("a domain-named function stays quiet", () => {
  expect(detect(write("lib/label_formatting.dart", helper.replace("formatHelper", "formatLabel")))).toEqual([]);
});

test("a Helper-named variable or a returned call stays quiet", () => {
  const code = source`
    final labelHelper = formatLabel('reading');
    String label() {
      return formatHelper('x');
    }
  `;
  expect(detect(write("lib/label_cache.dart", code))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for a helper in a Dart project", () => {
  expect(detect(prompt("Pull this into a helper"), dartApp)).toEqual([{ match: "helper", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Pull this into a helper"))).toEqual([]);
});
