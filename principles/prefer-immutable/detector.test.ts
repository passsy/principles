import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const item = source`
  class Item {
    Item(this.name);

    final String name;
    bool checked = false;
  }
`;

test("fires on a public mutable field the agent writes on a model", () => {
  expect(detect(write("lib/item.dart", item))).toEqual([{ line: 5 }]);
});

test("reports at most three fields", () => {
  const code = source`
    class Form {
      String name;
      String email;
      int age;
      bool accepted;
    }
  `;
  expect(detect(write("lib/form.dart", code))).toHaveLength(3);
});

test("stays quiet on final, private and late fields", () => {
  const code = source`
    class Item {
      final String name;
      int _retries = 0;
      late final int size;
      static int count = 0;
    }
  `;
  expect(detect(write("lib/item.dart", code))).toEqual([]);
});

test("stays quiet in a State class", () => {
  const code = source`
    class _PageState extends State<Page> {
      bool expanded = false;
    }
  `;
  expect(detect(write("lib/page.dart", code))).toEqual([]);
});

test("stays quiet in tests", () => {
  expect(detect(write("test/item_test.dart", item))).toEqual([]);
});

test("stays quiet on a field the agent did not write", () => {
  expect(detect(edit("lib/item.dart", item, { written: "  final String name;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/item.dart", item))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions mutable state", () => {
  expect(detect(prompt("Make the item mutable so we can toggle it"), dartApp)).toEqual([{ match: "mutable", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Make the item mutable so we can toggle it"))).toEqual([]);
});
