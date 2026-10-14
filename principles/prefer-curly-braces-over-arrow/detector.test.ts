import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const dangling = source`
  final result = items.map((item) =>
      item.name
          .trim()
          .toLowerCase());
`;

test("fires on an arrow whose body starts on the next line", () => {
  expect(detect(write("lib/names.dart", dangling))).toEqual([{ line: 1 }]);
});

test("fires on a dangling arrow inside a method", () => {
  const code = source`
    class Names {
      List<Model> build(List<Item> data) {
        return data.map(
          (item) =>
              Model(id: item.id),
        ).toList();
      }
    }
  `;
  expect(detect(write("lib/names.dart", code))).toEqual([{ line: 4 }]);
});

test("stays quiet on single-line arrows and curly bodies", () => {
  const code = source`
    final doubled = numbers.map((n) => n * 2);
    final result = items.map((item) {
      return item.name.trim();
    });
  `;
  expect(detect(write("lib/names.dart", code))).toEqual([]);
});

test("stays quiet on switch expression arms", () => {
  const code = source`
    String label(Status status) {
      return switch (status) {
        Status.active =>
          'Active',
        Status.done => 'Done',
      };
    }
  `;
  expect(detect(write("lib/status.dart", code))).toEqual([]);
});

test("stays quiet on a dangling arrow the agent did not write", () => {
  expect(detect(edit("lib/names.dart", dangling, { written: "          .trim()" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/names.dart", dangling))).toEqual([]);
});
