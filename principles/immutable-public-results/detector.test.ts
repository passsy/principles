import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const leaky = source`
  /// What a scan found.
  class ScanResult {
    ScanResult(this.issues);

    final List<String> issues;
  }
`;

test("fires on a result class assigning a caller's list", () => {
  expect(detect(write("lib/scan_result.dart", leaky))).toEqual([{ line: 5 }]);
});

test("stays quiet on a class not named like a result", () => {
  const code = source`
    /// The items on hand.
    class Inventory {
      Inventory(this.items);

      final List<String> items;
    }
  `;
  expect(detect(write("lib/inventory.dart", code))).toEqual([]);
});

test("stays quiet on a result using unmodifiable", () => {
  const code = source`
    /// What a scan found.
    class ScanResult {
      ScanResult(List<String> issues) : issues = List.unmodifiable(issues);

      final List<String> issues;
    }
  `;
  expect(detect(write("lib/scan_result.dart", code))).toEqual([]);
});

test("stays quiet outside lib", () => {
  expect(detect(write("test/scan_result_test.dart", leaky))).toEqual([]);
});

test("stays quiet when the agent did not write the field", () => {
  expect(detect(edit("lib/scan_result.dart", leaky, { written: "  ScanResult(this.issues);" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/scan_result.dart", leaky))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions List.unmodifiable", () => {
  expect(detect(prompt("Should the result wrap issues in List.unmodifiable?"), dartApp)).toEqual([{ match: "List.unmodifiable", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Should the result wrap issues in List.unmodifiable?"))).toEqual([]);
});
