import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const connection = source`
  /// The BLE link.
  class Connection {
    final String status;

    const Connection(this.status);
  }
`;

test("fires on a String status the agent writes", () => {
  expect(detect(write("lib/connection.dart", connection))).toEqual([{ line: 3 }]);
});

test("fires on a List<String> of roles", () => {
  expect(detect(write("lib/device.dart", "List<String> roles = [];"))).toEqual([{ line: 1 }]);
});

test("stays quiet on a String id outside an API boundary", () => {
  const code = source`
    class Device {
      final String id;
      const Device(this.id);
    }
  `;
  expect(detect(write("lib/device.dart", code))).toEqual([]);
});

test("fires on a String machine id at an API boundary", () => {
  const code = source`
    /// Loads one order for one user.
    Future<void> loadOrder(String userId, String orderId) async {}
  `;
  expect(detect(write("lib/api/order_api_client.dart", code))).toEqual([{ line: 2 }]);
});

test("stays quiet on a human-readable String at an API boundary", () => {
  expect(detect(write("lib/api/profile_api_client.dart", "Future<void> updateProfile(String displayName) async {}"))).toEqual([]);
});

test("stays quiet on a legacy String status when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/connection.dart", connection, { written: "  const Connection(this.status);" }))).toEqual([]);
  expect(detect(read("lib/connection.dart", connection))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for extension types", () => {
  expect(detect(prompt("use an extension type for API ids"), dartApp)).toEqual([{ match: "extension type", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("use an extension type for API ids"))).toEqual([]);
});
