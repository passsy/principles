# Override Pattern for Fakes

Give each method of a fake a nullable override function field placed right above it, so a test can change one behavior without a new fake.

The override pattern is a testing technique where each method in a fake implementation has a corresponding nullable function field that can be overridden to customize its default behavior in tests. The override field should be placed directly above the method it affects.

## Structure

```dart
class FakeSomeClass implements SomeInterface {
  // Override field directly above the method it affects
  Future<T> Function(/* same parameters as method */)? overrideMethodName;

  @override
  Future<T> methodName(/* parameters */) async {
    if (overrideMethodName != null) {
      return overrideMethodName!(/* same parameters */);
    }
    // Default implementation
  }
}
```

```dart
// Usage in test
test('handles upload failure', () {
  final fake = FakeApi();
  fake.overrideAddPhoto = (uuid, lat, lon) async {
    throw Exception('Network error');
  };
  // Test upload failure
});
```

## Advantages

- **Flexibility**: Tests can easily customize behavior without modifying the fake implementation
- **Clarity**: The relationship between override and method is clear through proximity
- **Type Safety**: Override functions match the method signature exactly
- **Default Behavior**: When not overridden, the fake provides sensible defaults
- **Test Isolation**: Each test can have its own override without affecting others

## Best Practices

- Place the override field directly above the method it affects
- Use positional parameters in override functions
- Name parameters in override function types for better readability
- Keep the default implementation simple and predictable (success case)
