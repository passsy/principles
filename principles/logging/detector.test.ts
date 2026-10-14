import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const upload = source`
  Future<void> upload(Report report) async {
    print('uploading report \${report.id}');
    await client.put(report);
  }
`;

test("fires on a print() the agent writes", () => {
  expect(detect(write("lib/uploader.dart", upload))).toEqual([{ line: 2 }]);
});

test("stays quiet on a print() that was already there", () => {
  expect(detect(edit("lib/uploader.dart", upload, { written: "  await client.put(report);" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/uploader.dart", upload))).toEqual([]);
});

test("stays quiet on chirp, debugPrint and print in comments", () => {
  const code = source`
    // Never print() here.
    void log(Object e, StackTrace stackTrace) {
      chirp.error('failed', error: e, stackTrace: stackTrace);
      debugPrint('done');
      logger.print('x');
    }
  `;
  expect(detect(write("lib/log.dart", code))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions logging", () => {
  expect(detect(prompt("Add some logging to the upload path"), dartApp)).toEqual([{ match: "logging", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Add some logging to the upload path"))).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Retry the upload twice"), dartApp)).toEqual([]);
});
