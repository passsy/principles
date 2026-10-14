import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const user = source`
  /// A user of the demo app.
  class User {
    final String id;

    User.fromJson(Map<String, dynamic> json) : id = json['id'] as String;
  }
`;

test("fires on a declared fromJson constructor", () => {
  expect(detect(write("lib/user.dart", user))).toEqual([{ line: 5 }]);
});

test("fires on a fromJson factory", () => {
  const code = source`
    class Team {
      factory Team.fromJson(Map<String, dynamic> json) {
        return Team(json['name'] as String);
      }
    }
  `;
  expect(detect(write("lib/team.dart", code))).toEqual([{ line: 2 }]);
});

test("stays quiet on a call to an existing fromJson", () => {
  const code = source`
    User load(Map<String, Object?> data) {
      return User.fromJson(data);
    }
  `;
  expect(detect(write("lib/loader.dart", code))).toEqual([]);
});

test("stays quiet in a file already on Rekord", () => {
  const code = source`
    /// A user of the demo app.
    class User with RekordMixin {
      User.fromData(Map<String, Object?> data) : rekord = Rekord(data);

      factory User.fromJson(Map<String, Object?> json) {
        return User.fromData(json);
      }
    }
  `;
  expect(detect(write("lib/user.dart", code))).toEqual([]);
});

test("stays quiet in a json_serializable model", () => {
  const code = source`
    part 'user.g.dart';

    @JsonSerializable()
    class User {
      factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
    }
  `;
  expect(detect(write("lib/user.dart", code))).toEqual([]);
});

test("stays quiet on a fromJson the agent did not write", () => {
  expect(detect(edit("lib/user.dart", user, { written: "  final String id;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/user.dart", user))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user talks about a data model", () => {
  expect(detect(prompt("add a data model for the profile endpoint"), dartApp)).toEqual([{ match: "data model", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("add a data model for the profile endpoint"))).toEqual([]);
});
