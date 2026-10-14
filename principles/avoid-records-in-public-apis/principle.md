# Avoid Records in Public APIs

Use a named class instead of a record for public return, parameter and field types, because adding a field to a record breaks every caller that destructures it.

Do not use Dart records (`({int x, String y})`) as return types, parameter types, or field types in public APIs. Use a named class instead.

Records are fine for local variables and private helper functions where only the author touches them.

## Why records break public APIs

When callers destructure a record, adding a new field is a **breaking change**:

```dart
// v1 - returns a record
({String id, String name}) getUser() => (id: '1', name: 'Alice');

// Caller destructures it
final (:id, :name) = getUser(); // ✅ works
```

Now you add `email` to the record:

```dart
// v2 - added email
({String id, String name, String email}) getUser() =>
    (id: '1', name: 'Alice', email: 'a@b.com');

// Caller's existing destructuring BREAKS, compile error
final (:id, :name) = getUser(); // ❌ Error: record has 3 fields, pattern expects 2
```

With a class, adding a field is non-breaking:

```dart
// v2 - added email
class User {
  final String id;
  final String name;
  final String email; // new field, no existing caller breaks
  User({required this.id, required this.name, required this.email});
}

final user = getUser();
print(user.name); // ✅ still works, email is just ignored
```

## Examples

### Return types

```dart
// ❌ BAD - record as public return type
Future<List<({String id, String buildNumber, String processingState})>> listRecentBuilds() async {
  // ...
}

// ✅ GOOD - named class
class Build {
  final String id;
  final String buildNumber;
  final String processingState;
  Build({required this.id, required this.buildNumber, required this.processingState});
}

Future<List<Build>> listRecentBuilds() async {
  // ...
}
```

### Parameters

```dart
// ❌ BAD - record as parameter type
void deploy(({String version, String channel}) config) { ... }

// ✅ GOOD - named class
void deploy(DeployConfig config) { ... }
```

### Private / local use is fine

```dart
// ✅ OK - private helper, only used internally
({int row, int col}) _parsePosition(String input) {
  return (row: 0, col: 0);
}

// ✅ OK - local variable
final (min, max) = _getRange(values);
```

## When records are acceptable

- **Private functions**: only the file author deals with them, easy to update all call sites together
- **Local variables**: destructuring within a single function body
- **Test helpers**: test-internal convenience where API stability doesn't matter
