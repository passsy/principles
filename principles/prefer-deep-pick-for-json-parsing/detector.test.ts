import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const manual = source`
  import 'dart:convert';

  User parseUser(String body) {
    final json = jsonDecode(body) as Map<String, dynamic>;
    return User(name: json['name'] as String);
  }
`;

test("fires on a jsonDecode the agent writes", () => {
  expect(detect(write("lib/user_api.dart", manual))).toEqual([{ line: 4 }]);
});

test("fires on a Map cast of json", () => {
  const code = "final user = User.parse(json as Map<String, dynamic>);";
  expect(detect(write("lib/user_api.dart", code))).toEqual([{ line: 1 }]);
});

test("stays quiet in a file that already uses deep_pick", () => {
  const code = source`
    import 'package:deep_pick/deep_pick.dart';

    User parseUser(String body) {
      final json = jsonDecode(body);
      return User(name: pick(json, 'name').asStringOrThrow());
    }
  `;
  expect(detect(write("lib/user_api.dart", code))).toEqual([]);
});

test("stays quiet on a Map cast that is not about json", () => {
  expect(detect(write("lib/args.dart", "final args = settings.arguments as Map<String, dynamic>;"))).toEqual([]);
});

test("stays quiet on a jsonDecode the agent did not write", () => {
  expect(detect(edit("lib/user_api.dart", manual, { written: "import 'dart:convert';" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/user_api.dart", manual))).toEqual([]);
});

test("fires on built_value added to the pubspec", () => {
  const pubspec = source`
    name: demo
    dependencies:
      built_value: ^8.9.0
  `;
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 3 }]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions jsonDecode", () => {
  expect(detect(prompt("Parse the response with jsonDecode and build a User"), dartApp)).toEqual([{ match: "jsonDecode", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Parse the response with jsonDecode and build a User"))).toEqual([]);
});
