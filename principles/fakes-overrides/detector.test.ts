import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const fake = source`
  class FakeApi implements Api {
    @override
    Future<void> addPhoto(String uuid, double lat, double lon) async {}
  }
`;

test("fires on a fake class without override fields", () => {
  expect(detect(write("test/fakes/fake_api.dart", fake))).toEqual([{ line: 1 }]);
});

test("stays quiet on a fake that already uses the override pattern", () => {
  const code = source`
    class FakeApi implements Api {
      Future<void> Function(String uuid, double lat, double lon)? overrideAddPhoto;

      @override
      Future<void> addPhoto(String uuid, double lat, double lon) async {
        if (overrideAddPhoto != null) {
          return overrideAddPhoto!(uuid, lat, lon);
        }
      }
    }
  `;
  expect(detect(write("test/fakes/fake_api.dart", code))).toEqual([]);
});

test("stays quiet on a class that is not a fake", () => {
  expect(detect(write("lib/api.dart", "class Faker {}\nclass RealApi implements Api {}\n"))).toEqual([]);
});

test("stays quiet on a legacy fake when the agent edits elsewhere or reads", () => {
  expect(detect(edit("test/fakes/fake_api.dart", fake, { written: "  @override" }))).toEqual([]);
  expect(detect(read("test/fakes/fake_api.dart", fake))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for a fake", () => {
  expect(detect(prompt("Write a fake for the photo api"), dartApp)).toEqual([{ match: "fake", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Write a fake for the photo api"))).toEqual([]);
});
