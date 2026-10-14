import { expect, test } from "vitest";
import { detect, edit, read, write } from "@wellactually/sdk/v3/test";

const api = "export 'src/logger.dart';\nexport 'src/writer.dart' show Writer;\n";

test("fires on a bare export in the API file", () => {
  expect(detect(write("lib/demo.dart", api))).toEqual([{ line: 1 }]);
});

test("fires on an export with hide", () => {
  expect(detect(write("lib/demo.dart", "export 'src/logger.dart' hide LoggerInternals;\n"))).toEqual([{ line: 1 }]);
});

test("stays quiet on src files re-exporting internally", () => {
  expect(detect(write("lib/src/logger.dart", "export 'spans.dart';\n"))).toEqual([]);
});

test("stays quiet outside lib", () => {
  expect(detect(write("bin/tool.dart", "export 'package:demo/demo.dart';\n"))).toEqual([]);
});

test("stays quiet on a legacy bare export when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/demo.dart", api, { written: "export 'src/writer.dart' show Writer;" }))).toEqual([]);
  expect(detect(read("lib/demo.dart", api))).toEqual([]);
});
