import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

test("fires on an rxdart dependency the agent writes", () => {
  const pubspec = source`
    name: demo
    dependencies:
      flutter:
        sdk: flutter
      rxdart: ^0.27.0
  `;
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 5 }]);
});

test("stays quiet on a commented out dependency", () => {
  expect(detect(write("pubspec.yaml", "name: demo\ndependencies:\n  # rxdart: ^0.27.0\n"))).toEqual([]);
});

const store = source`
  import 'package:rxdart/rxdart.dart';

  final user = BehaviorSubject<User?>();
`;

test("fires on an rxdart import the agent writes", () => {
  expect(detect(write("lib/store.dart", store))).toEqual([{ line: 1 }]);
});

test("stays quiet on a legacy import when the agent edits another line", () => {
  expect(detect(edit("lib/store.dart", store, { written: "final user = BehaviorSubject<User?>();" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/store.dart", store))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test.each(["rxdart", "rx_dart", "rx-dart", "RxDart", "RXDART"])("points at the principle when the user writes %s", (spelling) => {
  expect(detect(prompt(`does this project depend on ${spelling}`), dartApp)).toEqual([{ match: spelling, depth: "pointer" }]);
});

test("points at the principle when the user names BehaviorSubject", () => {
  expect(detect(prompt("Keep the user in a BehaviorSubject"), dartApp)).toEqual([{ match: "BehaviorSubject", depth: "pointer" }]);
});

test("stays quiet on a longer word that starts with rxdart", () => {
  expect(detect(prompt("the rxdartboard package"), dartApp)).toEqual([]);
});

test("stays quiet outside a Dart project", () => {
  expect(detect(prompt("we should use rxdart for this stream"))).toEqual([]);
});
