# Prefer Debuggable Code

Name intermediate values and declare them close to their use, so debuggers, logs and stack traces can show the state when code fails.

Debuggers, logs, and stack traces can only show **named state**. Values computed inline in one expression are invisible to all three. Prefer code shapes that give debugging tools more to show.

## 1. Name intermediate values

❌

```dart
await idle(deadline.difference(clock.now()).inMilliseconds);
```

✅

```dart
final now = clock.now();
final remaining = deadline.difference(now);
await idle(remaining.inMilliseconds);
```

### Decompose complex predicates

A multi-clause boolean tells you *whether* it failed, not *which clause*.

❌

```dart
if (user != null && user.isActive && !user.isBanned && user.age >= 18) { ... }
```

✅

```dart
final isRegistered = user != null;
final isActive = isRegistered && user.isActive;
final isPermitted = isActive && !user.isBanned;
final isAdult = isPermitted && user.age >= 18;
if (isAdult) { ... }
```

This is for clauses of one question.
Clauses that ask different questions get their own `if` instead, see [one_question_per_if](https://wellactually.dev/p/passsy/one-question-per-if).

## 2. Declare variables close to their use

Minimize a variable's *live time*, the distance between declaration and last use. Long live times force the reader to hold context across unrelated code. (McConnell, *Code Complete* ch. 10.)

❌

```dart
void processOrder(Order order) {
  final now = clock.now();
  final customer = database.lookup(order.customerId);
  // ... 20 lines unrelated to `now` ...
  final discount = now.hour < 9 ? 0.1 : 0.0;
}
```

✅

```dart
void processOrder(Order order) {
  final customer = database.lookup(order.customerId);
  // ... 20 lines ...
  final now = clock.now();
  final discount = now.hour < 9 ? 0.1 : 0.0;
}
```

## Exceptions

- Trivial passthroughs: `final name = user.name;`, no gain
- Single-sentence math: `meters / 1000`, already obvious
- Method chains with one lambda per line, steppable in the Dart debugger as-is
