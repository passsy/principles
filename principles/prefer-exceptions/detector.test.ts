import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const either = source`
  class UserRepository {
    Future<Either<Failure, User>> load(String id) async {
      return Right(await api.user(id));
    }
  }
`;

test("fires on an Either the agent writes", () => {
  expect(detect(write("lib/user_repository.dart", either))).toEqual([{ line: 2 }]);
});

test("stays quiet on a plain Future", () => {
  const code = source`
    class UserRepository {
      Future<User> load(String id) async {
        return await api.user(id);
      }
    }
  `;
  expect(detect(write("lib/user_repository.dart", code))).toEqual([]);
});

test("stays quiet on a type that only ends in Either", () => {
  expect(detect(write("lib/choice.dart", "final MyEither<int> choice = pick();"))).toEqual([]);
});

test("stays quiet on an Either the agent did not write", () => {
  expect(detect(edit("lib/user_repository.dart", either, { written: "    return Right(await api.user(id));" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/user_repository.dart", either))).toEqual([]);
});

test("fires on fpdart added to the pubspec", () => {
  const pubspec = source`
    name: demo
    dependencies:
      fpdart: ^1.1.0
  `;
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 3 }]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions dartz", () => {
  expect(detect(prompt("Let's use dartz for error handling"), dartApp)).toEqual([{ match: "dartz", depth: "pointer" }]);
});

test("stays quiet on the word either", () => {
  expect(detect(prompt("Either approach works for me"), dartApp)).toEqual([]);
});
