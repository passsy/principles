import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const newTest = source`
  void main() {
    test('adds', () {});
  }
`;

test("fires when the agent creates a new test file", () => {
  expect(detect(write("test/price_test.dart", newTest, { isNew: true }))).toEqual([{}]);
});

test("asks the file question once for a new file full of classes", () => {
  const code = `class ClockHarness {}\n\n${newTest}`;
  expect(detect(write("test/clock_test.dart", code, { isNew: true }))).toEqual([{}]);
});

test("stays quiet on a write over an existing test file", () => {
  expect(detect(write("test/price_test.dart", `class PriceHarness {}\n\n${newTest}`))).toEqual([]);
});

test("stays quiet on a new lib file", () => {
  expect(detect(write("lib/price.dart", "int price() => 1;\n", { isNew: true }))).toEqual([]);
});

test("fires when an edit adds a class to an existing test file", () => {
  const after = `class AuthHarness {}\n\n${newTest}`;
  expect(detect(edit("test/auth_test.dart", after, { written: "class AuthHarness {}\n\n" }))).toEqual([{ line: 1 }]);
});

test("stays quiet on an edit inside a test without a new class", () => {
  const after = `class AuthHarness {}\n\n${newTest}`;
  expect(detect(edit("test/auth_test.dart", after, { written: "  test('adds', () {});" }))).toEqual([]);
});

test("stays quiet on a class added to a lib file and on reads", () => {
  const code = "class AuthService {}\nint price() => 1;\n";
  expect(detect(edit("lib/auth.dart", code, { written: "class AuthService {}" }))).toEqual([]);
  expect(detect(read("test/auth_test.dart", `class AuthHarness {}\n${newTest}`))).toEqual([]);
});
