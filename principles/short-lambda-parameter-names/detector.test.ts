import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const names = source`
  Iterable<String> names(Iterable<String> rawNames) {
    return rawNames.map((currentName) {
      return currentName.trim();
    });
  }
`;

test("fires on a long single parameter name", () => {
  expect(detect(write("lib/names.dart", names))).toEqual([{ line: 2 }]);
});

test("fires on a long name in an arrow lambda", () => {
  const code = "final active = users.where((userModel) => userModel.isActive);";
  expect(detect(write("lib/users.dart", code))).toEqual([{ line: 1 }]);
});

test("stays quiet on a short name", () => {
  const code = source`
    Iterable<String> names(Iterable<String> rawNames) {
      return rawNames.map((it) {
        return it.trim();
      });
    }
  `;
  expect(detect(write("lib/names.dart", code))).toEqual([]);
});

test("stays quiet on Flutter callback conventions", () => {
  const code = source`
    void listen(Stream<int> values, void Function(int) handle) {
      values.listen((snapshot) {
        handle(snapshot);
      });
    }
  `;
  expect(detect(write("lib/listen.dart", code))).toEqual([]);
});

test("stays quiet on multi-parameter lambdas", () => {
  const code = "final total = items.fold<int>(0, (totalCount, item) => totalCount + item.quantity);";
  expect(detect(write("lib/total.dart", code))).toEqual([]);
});

test("stays quiet on a condition, which is not a lambda", () => {
  const code = source`
    void gate(bool isLoading) {
      if (isLoading) {
        return;
      }
    }
  `;
  expect(detect(write("lib/gate.dart", code))).toEqual([]);
});

test("stays quiet on a lambda the agent did not write", () => {
  expect(detect(edit("lib/names.dart", names, { written: "    return currentName.trim();" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/names.dart", names))).toEqual([]);
});
