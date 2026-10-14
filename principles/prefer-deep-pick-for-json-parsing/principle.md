# Prefer deep_pick for JSON Parsing

Parse JSON with package:deep_pick instead of code generation or casting the Map from jsonDecode by hand, because it is type safe, null aware and needs no build_runner.

Use `package:deep_pick` for parsing JSON instead of code generation solutions like `json_serializable` or manual handling of Map<String, dynamic> from `jsonDecode()`

## Why deep_pick?

- No build_runner required - works at runtime
- Type-safe with fixed output types regardless of input
- Handles null safety gracefully - each method explicitly declares null behavior
- Clear error messages distinguishing between absent keys and null values
- Supports nested access with `pick(json, 'user', 'address', 'city')`
- Automatic type conversions (String to int/double, bool strings, etc.)
- Range-safe list access - out-of-bounds returns null instead of crashing

## Available Methods

| Type | Methods |
|------|---------|
| String | `asStringOrThrow()`, `asStringOrNull()` |
| Int | `asIntOrThrow()`, `asIntOrNull()` |
| Double | `asDoubleOrThrow()`, `asDoubleOrNull()` |
| Bool | `asBoolOrTrue()`, `asBoolOrFalse()`, `asBoolOrNull()` |
| DateTime | `asDateTimeOrThrow()`, `asDateTimeOrNull()` (ISO 8601, RFC 1123) |
| List | `asListOrEmpty()`, `asListOrNull()`, `asListOrThrow()` |
| Map | `asMapOrNull()`, `asMapOrThrow()` |

## Basic Example

Use `fromPick` factory constructor pattern for parsing lists:

```dart

import 'package:deep_pick/deep_pick.dart';

class User {
  factory User.fromPick(RequiredPick pick) {
    return User(
      name: pick('name').asStringOrThrow(),
      age: pick('age').asIntOrThrow(),
    );
  }
}

// Parse list of users
final users = pick(json, 'users').asListOrEmpty((pick) => User.fromPick(pick));
```

## Rekord Pattern with `fromPick`

When using the Rekord pattern, add a `fromPick` factory that delegates to `fromData`. Call `pick.asMapOrThrow()` directly, no need to wrap it in `Map<String, Object?>.from()` since `asMapOrThrow()` already returns `Map<String, Object?>`.

```dart
// ✅ Good
factory WorkoutSummary.fromPick(Pick pick) {
  return WorkoutSummary.fromData(pick.asMapOrThrow());
}

// ❌ Bad - redundant Map.from() copy
factory WorkoutSummary.fromPick(Pick pick) {
  return WorkoutSummary.fromData(Map<String, Object?>.from(pick.asMapOrThrow()));
}
```

## Custom Types with `let`

Use `letOrNull`/`letOrThrow` for custom type transformations:

```dart
final UserId id = pick(json, 'id').letOrNull((pick) => UserId(pick.asString()));
final status = pick(json, 'status').letOrThrow((pick) => Status.fromString(pick.asString()));
```

https://pub.dev/packages/deep_pick
