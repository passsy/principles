# Avoid Sealed Classes in Public APIs

Avoid sealed classes and enums in a package's public API when cases may grow, because each new case breaks every caller's exhaustive switch.

Do not use sealed classes as return types, parameter types, or field types in package public APIs when the set of cases may grow.
Use a normal class with typed values and optional structured fields instead.

Sealed classes are fine for private helpers, local implementation details, and truly closed domains that will never gain more cases.

## Why sealed classes break public APIs

When callers switch over a sealed class, Dart lets them handle all known subtypes exhaustively:

```dart
// v1 - public API
sealed class TapInspectionResult {}

class TapInspectionSuccess extends TapInspectionResult {
  final Offset position;
  TapInspectionSuccess(this.position);
}

class TapInspectionBlocked extends TapInspectionResult {
  final TapFailure failure;
  TapInspectionBlocked(this.failure);
}

// Caller code
final message = switch (result) {
  TapInspectionSuccess() => 'can tap',
  TapInspectionBlocked(:final failure) => failure.message,
};
```

Now you add a new subtype:

```dart
// v2 - added a new public case
class TapInspectionPartiallyCovered extends TapInspectionResult {
  final TapBlocker blocker;
  TapInspectionPartiallyCovered(this.blocker);
}
```

The caller's existing exhaustive switch now fails to compile because it does not handle `TapInspectionPartiallyCovered`.
That makes adding a useful new diagnosis a breaking change.

With a normal result object, adding more details is non-breaking:

```dart
class TapInspection {
  final Offset? tapPosition;
  final TapFailure? failure;

  bool get canTap => tapPosition != null;

  TapInspection({
    required this.tapPosition,
    required this.failure,
  });
}

class TapFailure {
  final TapFailureReason reason;
  final String message;
  final TapBlocker? blocker;

  TapFailure({
    required this.reason,
    required this.message,
    this.blocker,
  });
}
```

Existing callers can ignore newly added fields or newly added reason values.

## Examples

### Results with extendable outcomes

```dart
// BAD - every new outcome is a breaking subtype
sealed class PaymentResult {}

class PaymentSucceeded extends PaymentResult {}

class PaymentDeclined extends PaymentResult {
  final String message;
  PaymentDeclined(this.message);
}

Future<PaymentResult> pay() async {
  // ...
}
```

```dart
// GOOD - new fields and known values can be added without breaking callers
class PaymentResult {
  final bool succeeded;
  final PaymentFailure? failure;

  PaymentResult({
    required this.succeeded,
    this.failure,
  });
}

class PaymentFailure {
  final PaymentFailureReason reason;
  final String message;

  PaymentFailure({
    required this.reason,
    required this.message,
  });
}

class PaymentFailureReason {
  final String name;

  const PaymentFailureReason._(this.name);

  static const declined = PaymentFailureReason._('declined');
  static const expiredCard = PaymentFailureReason._('expiredCard');
  static const unknown = PaymentFailureReason._('unknown');
}

Future<PaymentResult> pay() async {
  // ...
}
```

### Failure cases with different data

```dart
// BAD - tempting because each subtype can carry different fields,
// but new diagnostics become breaking public cases.
sealed class TapFailure {}

class CoveredTapFailure extends TapFailure {
  final Widget blocker;
  CoveredTapFailure(this.blocker);
}

class IgnoredTapFailure extends TapFailure {
  final IgnorePointer ignorePointer;
  IgnoredTapFailure(this.ignorePointer);
}
```

```dart
// GOOD - one stable failure object can grow over time.
class TapFailure {
  final TapFailureReason reason;
  final String message;
  final Widget? blocker;
  final Element? relatedElement;

  TapFailure({
    required this.reason,
    required this.message,
    this.blocker,
    this.relatedElement,
  });
}
```

## Avoid public enums for extendable cases too

Enums have the same exhaustiveness problem when the values may grow.
If the package may add new reason values later, use a typed value class with static constants instead of an enum.

```dart
// BAD - adding a new enum value can break exhaustive switches.
enum TapFailureReason {
  covered,
  ignored,
  absorbed,
}
```

```dart
// GOOD - callers can compare known values, and the package can add more.
class TapFailureReason {
  final String name;

  const TapFailureReason._(this.name);

  static const covered = TapFailureReason._('covered');
  static const ignored = TapFailureReason._('ignored');
  static const absorbed = TapFailureReason._('absorbed');
  static const unknown = TapFailureReason._('unknown');
}
```

## When sealed classes are acceptable

- Private classes inside a library where all switch sites can be updated together.
- Test-only helpers where API stability does not matter.
- Truly closed domains where adding a case would already be a conceptual breaking change.
- Application code that is refactored together and not consumed as a package API.
