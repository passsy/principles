# Test the Real Production Code

Import and exercise the real code from lib/ in tests and never copy or reimplement production logic in a test file, because a test of a copy passes while production is broken.

A test must import and exercise the actual code in `lib/`.
Never write a local implementation, a "reference implementation", or a simplified copy of production logic inside a test file.

A test against a copy proves the copy works.
It passes while production is broken, and it keeps passing after production changes, which is worse than having no test at all.

## Bad

```dart
// test/price_test.dart

// Mirrors the logic in lib/src/price.dart
int applyDiscount(int cents, int percent) {
  return cents - (cents * percent ~/ 100);
}

void main() {
  test('applies percentage discount', () {
    expect(applyDiscount(1000, 10), 900);
  });
}
```

## Good

```dart
// test/price_test.dart
import 'package:shop/src/price.dart';

void main() {
  test('applies percentage discount', () {
    expect(applyDiscount(1000, 10), 900);
  });
}
```

## When production code is hard to test

That is a finding, not a reason to copy it.
Fix production first, then test it:

- Code buried in a widget or a `main()` moves to a top-level function.
- Code that reaches a singleton takes the dependency as a parameter instead ([avoid-singletons](https://wellactually.dev/p/passsy/avoid-singletons)).
- Code that reads `DateTime.now()` reads `clock.now()` instead ([use-clock](https://wellactually.dev/p/passsy/use-clock)).

Fakes are the exception that proves the rule.
A fake stands in for a *collaborator* the code under test talks to, never for the code under test itself.
See [prefer-fakes](https://wellactually.dev/p/passsy/prefer-fakes) and [fakes-overrides](https://wellactually.dev/p/passsy/fakes-overrides).
