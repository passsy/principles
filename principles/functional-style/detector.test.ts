import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const loop = source`
  List<String> activeNames(List<User> users) {
    final names = <String>[];
    for (final user in users) {
      if (user.isActive) {
        names.add(user.name);
      }
    }
    return names;
  }
`;

test("fires on an empty list filled in a for loop", () => {
  expect(detect(write("lib/users.dart", loop))).toEqual([{ line: 2 }]);
});

test("fires on a map filled by index assignment", () => {
  const code = source`
    Map<String, int> byId(List<User> users) {
      final Map<String, int> ages = {};
      for (final user in users) {
        ages[user.id] = user.age;
      }
      return ages;
    }
  `;
  expect(detect(write("lib/ages.dart", code))).toEqual([{ line: 2 }]);
});

test("stays quiet on the functional version", () => {
  const code = source`
    List<String> activeNames(List<User> users) {
      return users.where((it) => it.isActive).map((it) => it.name).toList();
    }
  `;
  expect(detect(write("lib/users.dart", code))).toEqual([]);
});

test("stays quiet on an empty list that is never filled in a loop", () => {
  const code = source`
    List<String> names() {
      final names = <String>[];
      names.add('a');
      return names;
    }
  `;
  expect(detect(write("lib/names.dart", code))).toEqual([]);
});

test("stays quiet on a legacy loop the agent did not write", () => {
  expect(detect(edit("lib/users.dart", loop, { written: "    return names;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/users.dart", loop))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions dartx", () => {
  expect(detect(prompt("Can we add dartx for sortedBy?"), dartApp)).toEqual([{ match: "dartx", depth: "pointer" }]);
});

test("points at the principle on the same words without a pubspec.yaml", () => {
  expect(detect(prompt("Can we add dartx for sortedBy?"))).toEqual([{ match: "dartx", depth: "pointer" }]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Sort the users by name"), dartApp)).toEqual([]);
});
