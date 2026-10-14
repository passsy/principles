import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const bad = source`
  class Photo {}

  enum Size { small, large }

  class ImageApi {
    List<Photo> getPhotos() => [];
  }
`;

test("fires on every declaration above the class the file is named after", () => {
  expect(detect(write("lib/image_api.dart", bad))).toEqual([
    { line: 1 },
    { line: 3 },
  ]);
});

test("stays quiet when the main class comes first", () => {
  const good = source`
    class ImageApi {
      List<Photo> getPhotos() => [];
    }

    class Photo {}
  `;
  expect(detect(write("lib/image_api.dart", good))).toEqual([]);
});

test("stays quiet when no class is named after the file", () => {
  expect(detect(write("lib/gallery.dart", bad))).toEqual([]);
});

test("stays quiet when the edit writes no declaration", () => {
  expect(detect(edit("lib/image_api.dart", bad, { written: "    List<Photo> getPhotos() => [];" }))).toEqual([]);
});

test("stays quiet on a read and in tests", () => {
  expect(detect(read("lib/image_api.dart", bad))).toEqual([]);
  expect(detect(write("test/image_api.dart", bad))).toEqual([]);
});
