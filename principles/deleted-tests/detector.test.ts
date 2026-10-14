import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const commented = source`
  void main() {
    // test('should handle edge case', () {
    //   expect(result, equals(expected));
    // });
    test('applies discount', () {});
  }
`;

test("fires on a test the agent comments out", () => {
  expect(detect(write("test/price_test.dart", commented))).toEqual([{ line: 2 }]);
});

test("stays quiet on a commented test that was already there", () => {
  expect(detect(edit("test/price_test.dart", commented, { written: "  test('applies discount', () {});" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("test/price_test.dart", commented))).toEqual([]);
});

test("stays quiet outside test files", () => {
  expect(detect(write("lib/price.dart", "// group('legacy', () {});"))).toEqual([]);
});

test.each([
  "  test('flaky test', () {}, skip: true);",
  "  test('flaky test', () {}, skip: 'Temporarily disabled');",
])("fires on a skip without a tracking issue: %s", (line) => {
  expect(detect(write("test/sync_test.dart", `void main() {\n${line}\n}`))).toEqual([{ line: 2 }]);
});

test("stays quiet on a skip with a tracking issue", () => {
  const code = "void main() {\n  test('flaky test', () {}, skip: 'Issue #456 - Flaky on CI, needs investigation');\n}";
  expect(detect(write("test/sync_test.dart", code))).toEqual([]);
});
