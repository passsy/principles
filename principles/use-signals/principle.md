# Use Signals for Reactive State

Keep reactive state in signals scoped to a controller, preferably state_beacon, instead of ChangeNotifier or ValueNotifier, so derived values cannot go stale.

## Why

A `ChangeNotifier` has one notification for the whole object. `notifyListeners()`
calls every listener, and dispatch is O(N) in their number, so a controller with
fifteen fields rebuilds every widget that watches it whenever any one field
moves, the last-synced timestamp repaints the forty product cards. The fix is
manual and per screen: split the notifier, or wrap each read in `Selector` or
`ValueListenableBuilder`. Correctness by discipline, re-earned on every edit.

The expensive half is derived state. `total = subtotal - discount` has no home
in a notifier. Either it is recomputed in `build`, which is fine until the
computation is not cheap, or it is cached in a field and invalidated by hand.
Forgetting to invalidate is silent: the screen shows a stale number, nothing
throws, and the bug is found by a user.

Signals keep the dependencies instead of the notifications. Reading a signal
inside a derived value or a `build` method records that edge, so a write reaches
exactly the readers of that value and nobody else. Derived values are lazy:
computed on first read, then cached, and the graph is glitch-free: each node
recomputes at most once per change, and no listener observes a half-updated
graph where `subtotal` moved but `total` did not. Writing a value equal to the
current one notifies nobody.

This is the same trade every reactive framework has converged on: Angular
adopted signals to escape global top-down change detection, and SolidJS, Preact,
Vue and Svelte 5 all keep a dependency graph for the same reason.

## What signals do not fix

`watch(context)` marks the calling element dirty, so the unit of rebuild is the
whole `build` method that read the signal. Granularity comes from where you
read, not from what you read: a page that watches every signal at the top of its
build is a `ChangeNotifier` with extra syntax. Read each signal in the smallest
widget that needs it.

Dependencies are recorded at read time, so a derived value that returns early
stops depending on what it did not read. That is correct, and it surprises
people. When a derived value fails to update, the first question is which reads
actually ran.

## Rule

- Reactive state lives in signals, scoped to a controller object. Never
  global, never top-level.
- Anything computable from other signals is a derived signal, not a field kept
  in sync by hand.
- Watch in the smallest widget that needs the value.
- The controller owns disposal, so no widget removes listeners by hand.

## Good Examples

```dart
class CartController extends BeaconController {
  late final items = B.list<CartItem>([]);
  late final coupon = B.writable<String?>(null);

  // Recomputed on read, once, and only after items actually changed.
  late final subtotal = B.derived(
    () => items.value.fold(0.0, (sum, item) => sum + item.price * item.quantity),
  );
  late final discount = B.derived(() => coupon.value == 'SAVE20' ? subtotal.value * 0.2 : 0.0);
  late final total = B.derived(() => subtotal.value - discount.value);
}

class CartTotal extends StatelessWidget {
  const CartTotal({required this.controller, super.key});

  final CartController controller;

  @override
  Widget build(BuildContext context) {
    // Only this widget rebuilds, and only when the total moves.
    return Text('${controller.total.watch(context)}');
  }
}
```

## Bad Examples

```dart
// BAD: one notification for the whole object, and a total that goes stale
class CartController extends ChangeNotifier {
  final List<CartItem> items = [];
  String? coupon;
  double total = 0;

  void add(CartItem item) {
    items.add(item);
    total = items.fold(0.0, (sum, item) => sum + item.price);
    notifyListeners();
  }

  void applyCoupon(String code) {
    coupon = code;
    // total is now wrong, and the screen still shows the old one
    notifyListeners();
  }
}
```

```dart
// BAD: watching at the top, so the whole page rebuilds on any of the three
Widget build(BuildContext context) {
  final subtotal = controller.subtotal.watch(context);
  final discount = controller.discount.watch(context);
  final total = controller.total.watch(context);
  return CheckoutLayout(subtotal: subtotal, discount: discount, total: total);
}
```

```dart
// BAD: a global signal, owned by nobody, disposed by nobody
final cartItems = Beacon.list<CartItem>([]);
```

## Implementations

- [state_beacon](https://pub.dev/packages/state_beacon_flutter) is preferred:
  `BeaconController` scopes and disposes a group of signals together
- [signals](https://pub.dev/packages/signals) is the alternative, with a larger ecosystem

Both cover the shapes worth knowing: `derived` for computed values, `future` and
`stream` with an `AsyncValue` of idle/loading/data/error, and the specialised
variants (`debounced`, `throttled`, `list`, undo/redo). Reach for the package
docs rather than restating them here.
