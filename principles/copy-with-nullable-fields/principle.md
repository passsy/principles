# copyWith With Nullable Fields

Write copyWith as a typed function getter backed by a sentinel default, so callers can set nullable fields back to null without losing type safety.

A naive `copyWith` cannot set a nullable field back to `null`.
Use a typed function-type getter that delegates to a private implementation guarded by a `defaultArgument` sentinel.

## The problem

`??` cannot distinguish "argument omitted" from "argument was `null`".

```dart
// ❌ BAD - `copyWith(email: null)` silently does nothing
class User {
  const User({required this.name, this.email});

  final String name;
  final String? email;

  User copyWith({String? name, String? email}) {
    return User(
      name: name ?? this.name,
      email: email ?? this.email,
    );
  }
}
```

Clearing a field is then only possible by rebuilding the object by hand, which silently drops data every time a field is added.

```dart
// ❌ BAD - the workaround the naive copyWith forces on callers
final cleared = User(name: user.name);
```

Widening the public parameters to `Object?` fixes the semantics but throws away type safety.
Every call site compiles, and mistakes only surface at runtime.

```dart
// ❌ BAD - `copyWith(email: 42)` compiles and crashes at runtime
User copyWith({
  Object? name = defaultArgument,
  Object? email = defaultArgument,
}) { ... }
```

## The pattern

Declare `copyWith` as a **getter returning a typed function type**, and return the untyped implementation from it.

The sentinel and its resolver live once per project, next to the other object utilities:

```dart
/// Allows differentiation of default arguments from `null`
const Object defaultArgument = Object();

/// Returns [current], unless an [override] argument was passed.
T keepOr<T>(T current, {Object? override = defaultArgument}) {
  if (identical(override, defaultArgument)) {
    return current;
  }
  return override as T;
}
```

```dart
class User {
  const User({required this.name, this.email, this.age});

  final String name;
  final String? email;
  final int? age;

  /// Creates a copy of this user with the given fields replaced.
  ///
  /// Passing `null` for [email] or [age] clears the field, omitting an
  /// argument keeps the current value.
  User Function({
    String name,
    String? email,
    int? age,
  }) get copyWith => _copyWith;

  User _copyWith({
    Object? name = defaultArgument,
    Object? email = defaultArgument,
    Object? age = defaultArgument,
  }) {
    return User(
      name: keepOr(this.name, override: name),
      email: keepOr(this.email, override: email),
      age: keepOr(this.age, override: age),
    );
  }
}
```

`keepOr` infers `T` from the field it falls back to, so `_copyWith` needs no per-field casts.

Call sites read like any other `copyWith`:

```dart
user.copyWith();                       // everything kept
user.copyWith(email: null);            // email cleared, rest kept
user.copyWith(name: 'Dash', age: null); // one set, one cleared
user.copyWith(age: 'oops');            // compile error
user.copyWith(name: null);             // compile error, name is non-nullable
```

## Why it works

Function subtyping is **contravariant in parameter types**: `Function({Object? email})` is a subtype of `Function({String? email})`, because `String?` is a subtype of `Object?`.
So the untyped `_copyWith` is a legal value for a getter declared with precise types.

That splits the two jobs cleanly:

- The **getter's function type** is what callers are checked against, giving full type safety, autocomplete and ordinary call syntax.
- The **`Object?` parameters** of `_copyWith` carry the sentinel defaults, keeping `null` and "omitted" distinguishable.

Function types cannot declare default values, so the defaults necessarily come from `_copyWith`, exactly what is needed.

Unlike wrapper types (`Optional<T>`) or thunks (`copyWith(email: () => null)`), the call site stays clean and allocation-free.
Unlike code generation, it needs no `build_runner`, see [avoid_code_generation](https://wellactually.dev/p/passsy/avoid-code-generation).

## Rekord models

The pattern fits [Rekord](https://wellactually.dev/p/passsy/rekord-pattern) classes especially well.
Map values are already `Object?`, so spreading the current data and overwriting the passed keys needs no casts at all:

```dart
Person _copyWith({
  Object? id = defaultArgument,
  Object? name = defaultArgument,
}) {
  return Person.fromData({
    ...rekord.asMap(),
    if (id != defaultArgument) 'id': id,
    if (name != defaultArgument) 'name': name,
  });
}
```

There the sentinel does double duty: it keeps "omitted" apart from `null`, and it preserves Rekord's distinction between a key holding `null` and a key being absent.

## Rules

### Keep non-nullable fields non-nullable in the function type

`Function({String name})` is legal in a function type, an optional named parameter needs no default there, because a function type has no body.
Declaring the parameter as non-nullable turns "clearing a required field" into a compile error instead of a runtime cast failure.

```dart
// ❌ BAD - `copyWith(name: null)` compiles, then throws
//          "type 'Null' is not a subtype of type 'String' in type cast"
User Function({String? name, String? email}) get copyWith => _copyWith;

// ✅ GOOD - `copyWith(name: null)` is rejected by the analyzer
User Function({String name, String? email}) get copyWith => _copyWith;
```

The parameter type in the function type always mirrors the **field** type.
Never widen it to `T?` for the sake of optionality, optionality already comes from the default in `_copyWith`.

### Keep the two signatures in sync

Nothing checks the function type against `_copyWith`.
A parameter that exists in the function type but is ignored by `_copyWith` type-checks at every call site and silently does nothing.
This is the real cost of the pattern: review both signatures together whenever a field is added or removed.

```dart
// ❌ BAD - buildNumber is accepted and silently dropped
User Function({String name, String? buildNumber}) get copyWith => _copyWith;

User _copyWith({
  Object? name = defaultArgument,
  Object? buildNumber = defaultArgument, // never read below
}) {
  return User(name: keepOr(this.name, override: name));
}
```

### Document the getter, not `_copyWith`

The getter is what shows up on hover and in generated docs.
Spell out there that passing `null` clears a field. That is the part callers cannot guess.
See [dartdoc_comments](https://wellactually.dev/p/passsy/dartdoc-comments).

## When not to use it

Skip the indirection when no field is nullable.
A plain `copyWith` is unambiguous there and easier to read.

```dart
// ✅ GOOD - no nullable field, no sentinel needed
class Size {
  const Size({required this.width, required this.height});

  final double width;
  final double height;

  Size copyWith({double? width, double? height}) {
    return Size(
      width: width ?? this.width,
      height: height ?? this.height,
    );
  }
}
```

## Test the clearing behaviour

The distinction between "omitted" and "`null`" is the whole point of the pattern, so pin it.
A refactor back to `??` must fail the suite.

```dart
test('copyWith distinguishes an omitted argument from an explicit null', () {
  const user = User(name: 'Pascal', email: 'p@example.com', age: 38);

  expect(user.copyWith().email, 'p@example.com');
  expect(user.copyWith(age: 39).email, 'p@example.com');
  expect(user.copyWith(email: null).email, isNull);
  expect(user.copyWith(email: null).age, 38, reason: 'other fields kept');
});
```
