import { expect, test } from "vitest";
import { detect, prompt, source, write } from "@wellactually/sdk/v3/test";

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks to reimplement logic in a test", () => {
  expect(detect(prompt("just reimplement the discount logic inside the test"), dartApp)).toEqual([{ match: "reimplement", depth: "pointer" }]);
});

test("points at the principle on a reference implementation", () => {
  expect(detect(prompt("Write a reference implementation in the test and compare"), dartApp)).toEqual([{ match: "reference implementation", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("just reimplement the discount logic inside the test"))).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Add a test for the discount"), dartApp)).toEqual([]);
});

test("stays quiet on a helper function in a test file", () => {
  const code = source`
    import 'package:test/test.dart';

    int applyDiscount(int cents, int percent) {
      return cents - cents * percent ~/ 100;
    }

    void main() {
      test('applies discount', () {
        expect(applyDiscount(1000, 10), 900);
      });
    }
  `;
  expect(detect(write("test/price_test.dart", code))).toEqual([]);
});
