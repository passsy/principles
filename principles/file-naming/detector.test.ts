import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const photos = source`
  class Photo {}

  class Gallery {
    List<Photo> photos = [];
  }
`;

test("fires when no class earns the file its name", () => {
  expect(detect(write("lib/image_api.dart", photos))).toEqual([{ line: 1 }]);
});

test("stays quiet when a class matches the file name", () => {
  expect(detect(write("lib/gallery.dart", photos))).toEqual([]);
});

test("accepts a class that ends with the file name", () => {
  expect(detect(write("lib/report/fetcher.dart", "class ReportFetcher {}\n"))).toEqual([]);
});

test("ignores underscores and case", () => {
  expect(detect(write("lib/http_client.dart", "class HTTPClient {}\n"))).toEqual([]);
});

test("stays quiet on a file of functions", () => {
  expect(detect(write("lib/format.dart", "String formatPrice(int cents) => '$cents';\n"))).toEqual([]);
});

test("stays quiet when the edit writes no class", () => {
  expect(detect(edit("lib/image_api.dart", photos, { written: "    List<Photo> photos = [];" }))).toEqual([]);
});

test("stays quiet on a read, a test and main.dart", () => {
  expect(detect(read("lib/image_api.dart", photos))).toEqual([]);
  expect(detect(write("test/image_api_test.dart", photos))).toEqual([]);
  expect(detect(write("lib/main.dart", photos))).toEqual([]);
});
