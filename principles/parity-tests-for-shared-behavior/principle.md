# Prove Parity Between Paths That Claim to Agree

When two public paths claim the same behavior, add tests that pin them to each other on the tricky inputs so they cannot drift apart.

When two public entry points are documented as producing the same answer, a convenience wrapper and the full API, a sync and an async variant, a "check" and a "run" pair, add tests that pin them to each other on the tricky inputs.

Without those tests the two paths drift.
Each has its own unit tests, both suites stay green, and the disagreement only surfaces in production where one caller used the wrapper and another used the full API.

## Bad

```dart
test('validate rejects an expired token', () {
  expect(validator.validate(expired).isValid, isFalse);
});

test('isValid rejects an expired token', () {
  expect(validator.isValid(expired), isFalse);
});
```

Two tests, two paths, no statement that they must agree.
When someone adds a grace period to `validate` and forgets `isValid`, both tests still pass.

## Good

```dart
final tricky = [expired, expiringNow, clockSkewed, malformed, empty];

for (final token in tricky) {
  test('validate and isValid agree on ${token.label}', () {
    expect(validator.isValid(token), validator.validate(token).isValid);
  });
}
```

The test now encodes the actual contract: these two answers are the same answer.
It fails the moment one path changes without the other.

## When to reach for this

- A convenience method that delegates to a fuller one.
- A diagnostic path and the path that performs the work it diagnoses.
- Two implementations behind one interface that are meant to be interchangeable.
- A fake and the real implementation it stands in for ([prefer_fakes](https://wellactually.dev/p/passsy/prefer-fakes)).

Pick inputs at the boundaries, where the two paths are most likely to diverge, not the happy path where they obviously agree.
