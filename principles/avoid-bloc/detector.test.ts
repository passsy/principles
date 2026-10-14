import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const pubspec = source`
  name: demo
  dependencies:
    flutter:
      sdk: flutter
    bloc: ^8.0.0
    provider: ^6.0.0
`;

test("fires on a bloc dependency the agent writes", () => {
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 5 }]);
});

test("stays quiet on a commented out dependency", () => {
  expect(detect(write("pubspec.yaml", "name: demo\ndependencies:\n  # bloc: ^8.0.0\n  # flutter_bloc: ^8.0.0\n"))).toEqual([]);
});

const counter = source`
  import 'package:flutter_bloc/flutter_bloc.dart';

  class CounterCubit extends Cubit<int> {
    CounterCubit() : super(0);
  }
`;

test("fires on bloc code the agent writes", () => {
  expect(detect(write("lib/counter.dart", counter))).toEqual([
    { line: 1 },
    { line: 3 },
    { line: 4 },
  ]);
});

test("stays quiet on legacy bloc code when the agent edits another line", () => {
  const code = `${counter}\nint answer = 42;\n`;
  expect(detect(edit("lib/counter.dart", code, { written: "int answer = 42;" }))).toEqual([]);
});

test("stays quiet when the agent only reads a bloc file", () => {
  expect(detect(read("lib/counter.dart", counter))).toEqual([]);
});

test("stays quiet in generated code", () => {
  expect(detect(write("lib/counter.g.dart", "class _$CounterCubit extends Cubit<int> {}"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for a cubit in a Dart project", () => {
  expect(detect(prompt("Can you move the login state into a Cubit?"), dartApp)).toEqual([{ match: "Cubit", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Can you move the login state into a Cubit?"))).toEqual([]);
});

test("stays quiet on a word that only contains bloc", () => {
  expect(detect(prompt("The blockchain view needs a refresh button"), dartApp)).toEqual([]);
});
