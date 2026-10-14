# Extract Only Stable Concepts

Extract a function only when it names a stable domain concept, is reused, hides real complexity or is worth testing on its own.

Do not extract a function just to shorten code, bridge a refactor, or hide a few mechanical lines.
Extract a function when it names a stable concept in the domain, is reused, hides meaningful complexity, or defines a boundary worth testing independently.

## Why

Every extracted function creates a name, a call site, and a place the reader must jump to.
That cost is worth paying when the function gives the code a real concept.
It is not worth paying when the function only says "do this small sequence of steps".

Temporary helpers are especially risky during refactors.
They make the move easier, but if they survive, the final code describes the refactor instead of the problem.

## Rules

- Inline single-use helpers when their body is short and the name does not add domain meaning.
- Avoid names that describe implementation speed, age, size, or refactor state, such as `fast`, `slow`, `new`, `old`, `simple`, `helper`, or `impl`.
- Extract when the function name is a concept a teammate would use while discussing the feature.
- Extract when the function hides real complexity behind a clear boundary.
- Extract when the behavior is reused or independently testable.
- Revisit helpers created during a refactor before finishing.
  Delete or inline scaffolding that no longer represents a stable concept.

## Bad: extracted mechanics

```dart
Future<void> saveFast(Order order) async {
  final json = order.toJson();
  await file.writeAsString(jsonEncode(json));
}

Future<void> submit(Order order) async {
  validateOrder(order);
  await saveFast(order);
}
```

`saveFast` describes an implementation hope, not a concept.
If saving the order is only needed here and the body stays this small, keep the code local.

## Good: local mechanics stay local

```dart
Future<void> submit(Order order) async {
  validateOrder(order);

  final json = order.toJson();
  await file.writeAsString(jsonEncode(json));
}
```

The reader sees the whole flow without jumping to a weakly named helper.

## Good: extracted stable concept

```dart
Money calculateInvoiceTotal(Invoice invoice) {
  final subtotal = invoice.items.fold(
    Money.zero,
    (total, item) => total + item.price * item.quantity,
  );
  final discount = invoice.customer.discountFor(subtotal);
  final tax = taxTable.taxFor(subtotal - discount);

  return subtotal - discount + tax;
}
```

`calculateInvoiceTotal` is a stable business concept.
It is worth naming, testing, and reusing.

## Good: extracted boundary

```dart
Future<Response> retryWithBackoff(
  Future<Response> Function() request,
) async {
  for (final delay in [100, 300, 900]) {
    final response = await request();
    if (response.isSuccessful) {
      return response;
    }
    await clock.sleep(Duration(milliseconds: delay));
  }

  return await request();
}
```

The retry policy is complex enough to deserve a name and a focused test.
