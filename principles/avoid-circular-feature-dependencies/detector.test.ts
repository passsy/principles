import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const shop = { project: "fixtures/shop" };

const checkout = source`
  import 'package:shop/cart/cart_controller.dart';

  class CheckoutController {
    void start() => cart.lockForCheckout();
  }
`;

test("fires when the agent writes an import back to a file that imports this one", () => {
  expect(detect(write("lib/checkout/checkout_controller.dart", checkout), shop)).toEqual([
    { line: 1 },
  ]);
});

test("fires on a relative import that closes the cycle", () => {
  const code = "import '../cart/cart_controller.dart';\n\nclass CheckoutController {}";
  expect(detect(write("lib/checkout/checkout_controller.dart", code), shop)).toEqual([{ line: 1 }]);
});

test("stays quiet on a one-way import", () => {
  const code = "import 'package:shop/cart/cart_badge.dart';\n\nclass CheckoutController {}";
  expect(detect(write("lib/checkout/checkout_controller.dart", code), shop)).toEqual([]);
});

test("stays quiet when the import was already there", () => {
  expect(detect(edit("lib/checkout/checkout_controller.dart", checkout, { written: "    void start() => cart.lockForCheckout();" }), shop)).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/checkout/checkout_controller.dart", checkout), shop)).toEqual([]);
});

test("stays quiet on dart: imports", () => {
  expect(detect(write("lib/checkout/checkout_controller.dart", "import 'dart:async';\n"), shop)).toEqual([]);
});
