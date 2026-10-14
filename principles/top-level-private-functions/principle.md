# Private Helpers Are Top-Level Functions

Write a private helper that does not touch instance state as a top-level function in the file, not a static member, because library privacy already scopes it.

A private helper that does not touch instance state belongs at the top level of the file, not inside the class as `static`.

Dart's library privacy already scopes `_name` to the file.
Putting it inside the class adds a qualifier without adding protection, and it pushes the class body further from the thing readers came to read.

## Bad

```dart
class InvoiceRenderer {
  String render(Invoice invoice) {
    return _formatLines(invoice.lines).join('\n');
  }

  static List<String> _formatLines(List<Line> lines) {
    return lines.map((it) => '${it.label}: ${it.amount}').toList();
  }
}
```

## Good

```dart
class InvoiceRenderer {
  String render(Invoice invoice) {
    return _formatLines(invoice.lines).join('\n');
  }
}

List<String> _formatLines(List<Line> lines) {
  return lines.map((it) => '${it.label}: ${it.amount}').toList();
}
```

The class body is only the public surface.
The helper sits below it, private to the file, reachable from tests in the same library if needed.

## Exceptions

Keep it inside the class when it genuinely belongs to the type:

- Factory-like constructors and named constructors.
- A `static const` that is part of the type's vocabulary, such as `Duration.zero`.
- A helper that reads the class's own static state.

Before adding a top-level helper at all, check [extract-only-stable-concepts](https://wellactually.dev/p/passsy/extract-only-stable-concepts).
A single-use helper whose name restates its body should be inlined, not relocated.
