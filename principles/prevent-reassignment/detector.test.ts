import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const total = source`
  int total(List<int> values) {
    var count = values.length;
    var sum = 0;
    for (var i = 0; i < count; i++) {
      sum += values[i];
    }
    return sum;
  }
`;

test("fires on a var that is never reassigned", () => {
  expect(detect(write("lib/total.dart", total))).toEqual([{ line: 2 }]);
});

test("stays quiet on a var that is reassigned later", () => {
  const code = source`
    String label(bool done) {
      var text = 'open';
      if (done) {
        text = 'done';
      }
      return text;
    }
  `;
  expect(detect(write("lib/label.dart", code))).toEqual([]);
});

test("stays quiet on a var in a for-loop header", () => {
  const code = source`
    void count() {
      for (var i = 0; i < 3; i++) {
        print(i);
      }
    }
  `;
  expect(detect(write("lib/count.dart", code))).toEqual([]);
});

test("stays quiet on final", () => {
  expect(detect(write("lib/total.dart", "final count = values.length;"))).toEqual([]);
});

test("stays quiet on a var the agent did not write", () => {
  expect(detect(edit("lib/total.dart", total, { written: "  return sum;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/total.dart", total))).toEqual([]);
});
