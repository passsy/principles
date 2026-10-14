import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const measure = source`
  ({int width, int height}) measure() {
    return (width: 1, height: 2);
  }
`;

test("fires on a named record return type in lib", () => {
  expect(detect(write("lib/measure.dart", measure))).toEqual([{ line: 1 }]);
});

test("fires on a named record parameter type in lib", () => {
  expect(detect(write("lib/deploy.dart", "void deploy(({String version, String channel}) config) {}"))).toEqual([
    { line: 1 },
  ]);
});

test("stays quiet on a named parameter list", () => {
  expect(detect(write("lib/measure.dart", "int measure({int width = 0, int height = 0}) => width * height;"))).toEqual([]);
});

test("stays quiet on a record literal", () => {
  const code = source`
    void main2() {
      final pair = (left: 1, right: 2);
      pair.left;
    }
  `;
  expect(detect(write("lib/pair.dart", code))).toEqual([]);
});

test("stays quiet outside lib and in tests", () => {
  expect(detect(write("tool/measure.dart", measure))).toEqual([]);
  expect(detect(write("test/measure_test.dart", measure))).toEqual([]);
});

test("stays quiet on a legacy record when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/measure.dart", measure, { written: "  return (width: 1, height: 2);" }))).toEqual([]);
  expect(detect(read("lib/measure.dart", measure))).toEqual([]);
});
