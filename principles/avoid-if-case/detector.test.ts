import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const match = source`
  void f(Object x) {
    if (x case int n) {}
    if (x == 1) {}
  }
`;

test("fires on an if-case, not on a plain if", () => {
  expect(detect(write("lib/match.dart", match))).toEqual([{ line: 2 }]);
});

test("fires on a pattern written tight against the keyword", () => {
  expect(detect(write("lib/tight.dart", "void f(Object x) {\n  if (x case[1, 2]) {}\n}\n"))).toEqual([{ line: 2 }]);
});

test("stays quiet on an if-case that was already there", () => {
  expect(detect(edit("lib/match.dart", match, { written: "  if (x == 1) {}" }))).toEqual([]);
  expect(detect(read("lib/match.dart", match))).toEqual([]);
});

test("stays quiet on an identifier beginning with case and on if-case in a comment", () => {
  const code = source`
    bool f(String name, bool caseSensitive) {
      if (caseSensitive) {
        return true;
      }
      // if (name case 'x') was here before.
      if (name == 'here') {
        return false;
      }
      return false;
    }
  `;
  expect(detect(write("lib/search.dart", code))).toEqual([]);
});

test("stays quiet on a switch case", () => {
  const code = source`
    String f(int x) {
      switch (x) {
        case 1:
          return 'one';
      }
      return 'many';
    }
  `;
  expect(detect(write("lib/switch.dart", code))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions pattern matching in a Dart project", () => {
  expect(detect(prompt("Could we use pattern matching to unpack the pair?"), dartApp)).toEqual([{ match: "pattern matching", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Could we use pattern matching to unpack the pair?"))).toEqual([]);
});
