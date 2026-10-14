import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const scope = source`
  class CartScope extends InheritedWidget {
    const CartScope({required this.cart, required super.child, super.key});
    final Cart cart;
  }
`;

test("fires on a hand-written InheritedWidget", () => {
  expect(detect(write("lib/cart_scope.dart", scope))).toEqual([{ line: 1 }]);
});

test("stays quiet on a context_plus Ref", () => {
  expect(detect(write("lib/cart.dart", "final _cartRef = Ref<Cart>();\n"))).toEqual([]);
});

test("stays quiet on an InheritedWidget the edit did not touch", () => {
  expect(detect(edit("lib/cart_scope.dart", scope, { written: "  final Cart cart;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/cart_scope.dart", scope))).toEqual([]);
});

test("stays quiet in a test file", () => {
  expect(detect(write("test/cart_scope_test.dart", scope))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions dependency injection in a Dart project", () => {
  expect(detect(prompt("How should we do dependency injection for the cart?"), dartApp)).toEqual([{ match: "dependency injection", depth: "pointer" }]);
});

test("stays quiet outside a Dart project", () => {
  expect(detect(prompt("How should we do dependency injection for the cart?"))).toEqual([]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Add a checkout button to the cart"), dartApp)).toEqual([]);
});
