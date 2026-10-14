# No Circular Feature Dependencies

Two feature files must not import each other; move the shared concept into something both depend on, or inline it, so each can be read and deleted alone.

When two feature files import each other, or conceptually cannot be understood without each other, the boundary between them is wrong.

Dart will compile mutual imports inside a library, so the analyzer will not stop you.
The cost shows up later: neither file can be read, moved, tested, or deleted on its own.

## Bad

```dart
// lib/checkout/checkout_controller.dart
import 'package:shop/cart/cart_controller.dart';

class CheckoutController {
  void start() => cart.lockForCheckout();
}
```

```dart
// lib/cart/cart_controller.dart
import 'package:shop/checkout/checkout_controller.dart';

class CartController {
  bool get isLocked => checkout.isActive;
}
```

Checkout knows about carts and carts know about checkout.
Deleting the checkout feature now breaks the cart.

## Good: pick a direction

Move the shared concept down to something both can depend on:

```dart
// lib/cart/cart_lock.dart
class CartLock {
  bool get isLocked => _lockedBy != null;
  void lock(Object owner) => _lockedBy = owner;
  Object? _lockedBy;
}
```

Checkout depends on `CartLock`. The cart depends on `CartLock`. Neither depends on the other.

## Good: inline it

If the shared piece is small and only two callers exist, inlining beats a third file.
A helper that exists only to break a cycle is refactor scaffolding.
See [Extract only stable concepts](https://wellactually.dev/p/passsy/extract-only-stable-concepts).

## The test

Ask whether you could delete one feature without touching the other.
If not, the dependency runs both ways and one direction has to go.
