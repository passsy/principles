import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const pubspec = source`
  name: demo
  dependencies:
    flutter:
      sdk: flutter
  dev_dependencies:
    build_runner: ^2.4.0
`;

test("fires on a build_runner dependency the agent writes", () => {
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 6 }]);
});

test("stays quiet on a dependency that was already there", () => {
  expect(detect(edit("pubspec.yaml", pubspec, { written: "name: demo" }))).toEqual([]);
});

test("stays quiet on a commented out dependency", () => {
  expect(detect(write("pubspec.yaml", "name: demo\ndev_dependencies:\n  # build_runner: ^2.4.0\n"))).toEqual([]);
});

test("fires on a codegen annotation and part directive in Dart", () => {
  const code = source`
    import 'package:json_annotation/json_annotation.dart';

    part 'user.g.dart';

    @JsonSerializable()
    class User {
      final String name;
      User(this.name);
    }
  `;
  expect(detect(write("lib/user.dart", code))).toEqual([
    { line: 3 },
    { line: 5 },
  ]);
});

test("stays quiet in generated code and on reads", () => {
  expect(detect(write("lib/user.g.dart", "@JsonKey(name: 'x')\nfinal x = 1;"))).toEqual([]);
  expect(detect(read("lib/user.dart", "part 'user.g.dart';"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for freezed in a Dart project", () => {
  expect(detect(prompt("Can we use freezed for the models?"), dartApp)).toEqual([{ match: "freezed", depth: "pointer" }]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Add a name field to the User model"), dartApp)).toEqual([]);
});
