import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const utils = source`
  String buildEtagHeader(String revision) => 'W/"$revision"';

  String formatPrice(int cents) => '$cents';
`;

test.each(["lib/utils.dart", "lib/src/helpers.dart", "lib/src/string_utils.dart", "lib/common.dart"])("fires when the agent writes into the grab-bag %s", (path) => {
  expect(detect(write(path, utils))).toEqual([{}]);
});

test("points at the file when the agent adds a helper", () => {
  expect(detect(edit("lib/utils.dart", utils, { written: "String formatPrice(int cents) => '$cents';" }))).toEqual([{}]);
});

test("stays quiet on a file named after what it holds", () => {
  expect(detect(write("lib/src/net/etag.dart", utils))).toEqual([]);
});

test("stays quiet when the agent only reads the grab-bag", () => {
  expect(detect(read("lib/utils.dart", utils))).toEqual([]);
});

test("stays quiet on test helpers", () => {
  expect(detect(write("test/helpers.dart", utils))).toEqual([]);
});
