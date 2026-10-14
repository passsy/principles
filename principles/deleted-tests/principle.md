# Flag Deleted or Commented Out Tests

Treat a deleted, commented-out or skipped test as a red flag that needs a reason: fix it, delete it with a tracking issue, or skip it with an issue number.

When reviewing PRs, always check for tests that have been deleted or commented out. These are red flags that require justification.

## What to look for

### Deleted tests

In the diff, look for removed lines containing:
- `test(` or `testWidgets(`
- `group(`
- Entire test files deleted

```diff
- test('should validate email format', () {
-   expect(isValidEmail('test@example.com'), isTrue);
-   expect(isValidEmail('invalid'), isFalse);
- });
```

**Always ask:** Why was this test removed? Is the feature being removed too?

### Commented out tests

Look for tests wrapped in comments:

```dart
// test('should handle edge case', () {
//   // TODO: fix flaky test
//   expect(result, equals(expected));
// });
```

Or using `skip`:

```dart
test('should process data', () {
  // ...
}, skip: 'Temporarily disabled');
```

## Review actions

### For deleted tests

1. **Check if feature was removed** - If the tested code is also deleted, the test deletion is justified
2. **Check if test was moved** - Sometimes tests are relocated to another file
3. **Request justification** - If neither above, ask why the test was removed

Comment template:
```
This test was deleted. Was the corresponding feature removed, or is there another reason?
```

### For commented out tests

**Never approve commented out tests.** They should either be:
- Fixed and re-enabled
- Deleted entirely with an issue created to track the fix
- Marked with `skip:` and a tracking issue

Comment template:
```
Commented out tests are not allowed. Please either:
1. Fix and re-enable the test
2. Delete it and create an issue to track re-adding it
3. Use `skip: 'Issue #123 - reason'` with a tracking issue
```

### For skipped tests

Skipped tests with `skip:` parameter are acceptable IF they include:
- A reason explaining why
- A tracking issue number

```dart
// ❌ BAD - No explanation
test('flaky test', () { ... }, skip: true);

// ❌ BAD - Vague reason
test('flaky test', () { ... }, skip: 'Temporarily disabled');

// ✅ OK - Has tracking issue
test('flaky test', () { ... }, skip: 'Issue #456 - Flaky on CI, needs investigation');
```

## Why this matters

- **Tests document behavior** - Deleting tests loses documentation of expected behavior
- **Silent regressions** - Removed tests can't catch future bugs
- **Technical debt** - Commented tests accumulate and are rarely fixed
- **False confidence** - Test suite appears to pass but coverage decreased
