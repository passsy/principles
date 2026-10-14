import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const controller = source`
  class BackpackController {
    Future<bool> removeBackpack(String uuid) async {
      try {
        await api.removeBackpack(uuid);
        return true;
      } catch (e, stack) {
        log('Error removing backpack', error: e, stackTrace: stack);
        return false;
      }
    }
  }
`;

test("fires on a Future<bool> whose catch returns false", () => {
  expect(detect(write("lib/backpack_controller.dart", controller))).toEqual([{ line: 2 }]);
});

test("stays quiet when the agent edits another part of that file", () => {
  expect(detect(edit("lib/backpack_controller.dart", controller, { written: "        await api.removeBackpack(uuid);" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/backpack_controller.dart", controller))).toEqual([]);
});

test("stays quiet on a Future<bool> answering a domain question", () => {
  const code = source`
    Future<bool> hasNetworkConnection() async {
      final result = await checker.probe();
      return result.isReachable;
    }
  `;
  expect(detect(write("lib/connectivity.dart", code))).toEqual([]);
});

test("stays quiet on a sync bool validity check with a catch", () => {
  const code = source`
    bool isValidPort(String raw) {
      try {
        int.parse(raw);
        return true;
      } on FormatException catch (e, stackTrace) {
        return false;
      }
    }
  `;
  expect(detect(write("lib/port_parser.dart", code))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks about a success flag", () => {
  expect(detect(prompt("should removeBackpack return a success flag?"), dartApp)).toEqual([{ match: "success flag", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("should removeBackpack return a success flag?"))).toEqual([]);
});
