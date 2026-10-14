import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const loader = source`
  Future<void> upload(Report report) async {
    try {
      await uploadReport(report);
    } catch (e) {
      log('upload failed: $e');
    }
  }
`;

test("fires on a catch without a stack trace the agent writes", () => {
  expect(detect(write("lib/uploader.dart", loader))).toEqual([{ line: 4 }]);
});

test("stays quiet on a catch that keeps its stack trace", () => {
  const code = source`
    try {
      await uploadReport(report);
    } catch (e, stackTrace) {
      log('upload failed', error: e, stackTrace: stackTrace);
    } on FormatException catch (e, stack) {
      rethrow;
    }
  `;
  expect(detect(write("lib/uploader.dart", code))).toEqual([]);
});

test("stays quiet on catch (e) in a comment", () => {
  const code = source`
    /// Never write catch (e) here.
  `;
  expect(detect(write("lib/hint.dart", code))).toEqual([]);
});

test("stays quiet on a legacy catch when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/uploader.dart", loader, { written: "    await uploadReport(report);" }))).toEqual([]);
  expect(detect(read("lib/uploader.dart", loader))).toEqual([]);
});

test("stays quiet in generated code", () => {
  expect(detect(write("lib/uploader.g.dart", loader))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions a stack trace", () => {
  expect(detect(prompt("The crash log has no stack trace, why?"), dartApp)).toEqual([{ match: "stack trace", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("The crash log has no stack trace, why?"))).toEqual([]);
});
