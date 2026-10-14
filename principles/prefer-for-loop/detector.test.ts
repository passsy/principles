import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const loop = source`
  void notifyAll(List<Listener> listeners) {
    listeners.forEach((it) => it.notify());
  }
`;

test("fires on a forEach the agent writes", () => {
  expect(detect(write("lib/notify.dart", loop))).toEqual([{ line: 2 }]);
});

test("stays quiet on a for loop", () => {
  const code = source`
    void notifyAll(List<Listener> listeners) {
      for (final it in listeners) {
        it.notify();
      }
    }
  `;
  expect(detect(write("lib/notify.dart", code))).toEqual([]);
});

test("stays quiet on forEach in a comment", () => {
  const code = source`
    // Do not use .forEach( here.
    final hint = 'use a for loop';
  `;
  expect(detect(write("lib/hint.dart", code))).toEqual([]);
});

test("stays quiet on a forEach the agent did not write", () => {
  expect(detect(edit("lib/notify.dart", loop, { written: "void notifyAll(List<Listener> listeners) {" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/notify.dart", loop))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions forEach", () => {
  expect(detect(prompt("Use forEach to notify the listeners"), dartApp)).toEqual([{ match: "forEach", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Use forEach to notify the listeners"))).toEqual([]);
});
