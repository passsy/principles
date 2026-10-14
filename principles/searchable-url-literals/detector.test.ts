import { expect, test } from "vitest";
import { detect, edit, source, write } from "@wellactually/sdk/v3/test";

const geocode = source`
  class Geocoder {
    static final _server = Uri.https('geocode.arcgis.com', '/arcgis/rest/services/World/GeocodeServer');
    final int retries = 3;
  }
`;

test("the Uri.https host and path split fires", () => {
  expect(detect(write("lib/geocoder.dart", geocode))).toEqual([{ line: 2 }]);
});

test("an assembled URL the agent did not write stays quiet", () => {
  expect(detect(edit("lib/geocoder.dart", geocode, { written: "  final int retries = 3;" }))).toEqual([]);
});

test("a path glued onto a base url fires, in any language", () => {
  expect(detect(write("src/api.ts", "const users = await fetch(baseUrl + '/api/v1/users');"))).toEqual([{ line: 1 }]);
  expect(detect(write("lib/api.dart", "final uri = Uri.parse('$apiBaseUrl/$version/users');"))).toEqual([{ line: 1 }]);
});

test("a complete literal stays quiet", () => {
  expect(detect(write("lib/geocoder.dart", "final uri = Uri.parse('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest');"))).toEqual([]);
});

test("passing a url variable around or logging it stays quiet", () => {
  const code = source`
    final response = await client.get(url);
    log('fetched $url');
  `;
  expect(detect(write("lib/fetch.dart", code))).toEqual([]);
});

test("generated clients are exempt", () => {
  expect(detect(write("lib/api.g.dart", "final uri = Uri.https(host, '/v1/users');"))).toEqual([]);
});
