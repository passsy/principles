import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const notifier = source`
  class CartController extends ChangeNotifier {
    final selected = ValueNotifier<int>(0);
    double total = 0;
  }
`;

test("fires on ChangeNotifier and ValueNotifier plumbing the agent writes", () => {
  expect(detect(write("lib/cart_controller.dart", notifier))).toEqual([
    { line: 1 },
    { line: 2 },
  ]);
});

test("stays quiet in a file that already uses state_beacon", () => {
  const code = "import 'package:state_beacon/state_beacon.dart';\n" + notifier;
  expect(detect(write("lib/cart_controller.dart", code))).toEqual([]);
});

test("stays quiet on a BeaconController", () => {
  expect(detect(write("lib/cart_controller.dart", "class CartController extends BeaconController {\n  late final items = B.list<CartItem>([]);\n}\n"))).toEqual([]);
});

test("stays quiet on plumbing the edit did not touch", () => {
  expect(detect(edit("lib/cart_controller.dart", notifier, { written: "  double total = 0;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/cart_controller.dart", notifier))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions ChangeNotifier in a Dart project", () => {
  expect(detect(prompt("Make the cart a ChangeNotifier"), dartApp)).toEqual([{ match: "ChangeNotifier", depth: "pointer" }]);
});

test("stays quiet on the bare word signal", () => {
  expect(detect(prompt("The stream emits a signal when done"), dartApp)).toEqual([]);
});

test("stays quiet outside a Dart project", () => {
  expect(detect(prompt("Make the cart a ChangeNotifier"))).toEqual([]);
});
