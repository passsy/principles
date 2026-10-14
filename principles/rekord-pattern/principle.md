# Rekord Pattern

Back data models that wrap API maps with a Rekord and typed getters parsed lazily through deep_pick, so a missing or broken field only fails when it is read.

Use the Rekord pattern for data model classes that wrap API responses or other `Map<String, Object?>` data. Rekord provides lazy field parsing via `deep_pick`, making models robust against API changes.

## Why

- **Lazy parsing**: Fields are parsed only when accessed, not on construction. A corrupted or missing field won't crash the app unless that field is actually read.
- **Robust against API changes**: Adding or removing server fields doesn't break existing code. Only accessed fields matter.
- **Test-friendly**: The `create` factory accepts all fields as optional named parameters, so tests only provide the fields they actually use.
- **Immutable**: Data cannot be modified after construction.
- **No code generation**: Works at runtime with `deep_pick`, no `build_runner` needed.

## Contrast with `fromJson`

Traditional `fromJson` parses the entire response eagerly. If any field is missing or has a wrong type, the whole object fails to construct, even if the broken field would never be read.

```dart
// ❌ BAD - Eager parsing, crashes on any missing field
class User {
  final String id;
  final String name;
  final String? bio; // Added on server v2, missing in v1 responses

  User.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,        // crashes if missing
        name = json['name'] as String,     // crashes if missing
        bio = json['bio'] as String?;
}
```

```dart
// ✅ GOOD - Lazy parsing, only crashes when a broken field is accessed
class User with RekordMixin {
  User.fromData(Map<String, Object?> data) : rekord = Rekord(data);

  @override
  final Rekord rekord;

  String get id => rekord.read('id').asStringOrThrow();
  String get name => rekord.read('name').asStringOrThrow();
  String? get bio => rekord.read('bio').asStringOrNull();
}
```

## Structure

Every Rekord class follows this structure:

```dart
class Person with RekordMixin {
  /// From raw Map data, e.g. a JSON response.
  Person.fromData(Map<String, Object?> data) : rekord = Rekord(data);

  /// From a deep_pick Pick, for list parsing.
  factory Person.fromPick(Pick pick) {
    return Person.fromData(pick.asMapOrThrow());
  }

  /// For code and tests: every parameter is optional.
  factory Person.create({
    String? id,
    String? name,
    int? age,
  }) {
    return Person.fromData({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (age != null) 'age': age,
    });
  }

  @override
  final Rekord rekord;

  // Typed getters, parsed lazily via deep_pick
  String get id => rekord.read('id').asStringOrThrow();
  String get name => rekord.read('name').asStringOrThrow();
  int? get age => rekord.read('age').asIntOrNull();

  @override
  String toString() => 'Person(id: $id, name: $name)';
}
```

### Required parts

1. **`with RekordMixin`**: contract that provides `rekord` getter
2. **`fromData` constructor**: takes `Map<String, Object?>`, creates the `Rekord`
3. **`fromPick` factory**: for use in `deep_pick` list parsing (calls `fromData(pick.asMapOrThrow())`)
4. **`create` factory**: all-optional named parameters for test ergonomics
5. **`@override final Rekord rekord`**: stores the immutable data
6. **Typed getters**: each field parsed lazily via `rekord.read('key')`

## The `Rekord` class itself

`Rekord` and `RekordMixin` are not a pub package. Copy this file into the project (e.g. `lib/helpers/rekord.dart`) and add `deep_pick` as a dependency:

```dart
import 'dart:collection';

import 'package:deep_pick/deep_pick.dart' as deep_pick;

export 'package:deep_pick/deep_pick.dart';

/// Contract for classes that are based on a [Rekord].
mixin RekordMixin {
  Rekord get rekord;
}

/// An immutable, [Map] based collection of data, read lazily via [read]
/// with the [deep_pick.Pick] API. Nested [Rekord] and [RekordMixin] objects
/// are flattened to plain maps.
class Rekord {
  Rekord(Map<String, Object?> data) : _data = _processMap(data);

  final Map<String, Object?> _data;

  /// Returns an unmodifiable view of the underlying data map.
  Map<String, Object?> asMap() {
    bool productionCode = true;
    assert(() {
      productionCode = false;
      return true;
    }());
    if (productionCode) {
      return UnmodifiableMapView<String, Object?>(_data);
    }
    // data is directly visible in the debugger
    final easyToDebugCopy = Map.of(_data);
    return UnmodifiableMapView<String, Object?>(easyToDebugCopy);
  }

  /// Converts all nested [Rekord] and [RekordMixin] objects to plain maps
  static Map<String, Object?> _processMap(Map<dynamic, dynamic> data) {
    final map = SplayTreeMap<String, Object?>();
    for (final entry in data.entries) {
      map[entry.key as String] = _processValue(entry.value);
    }
    return map;
  }

  static List<Object?> _processList(Iterable<dynamic> data) {
    return data.map(_processValue).toList();
  }

  static Object? _processValue(Object? value) {
    if (value is Map) {
      return _processMap(value);
    }
    if (value is Iterable) {
      return _processList(value);
    }
    if (value is Rekord) {
      return _processMap(value._data);
    }
    if (value is RekordMixin) {
      return _processMap(value.rekord._data);
    }
    return value;
  }

  /// A [deep_pick.Pick] for reading values, e.g. `rekord.read('id')`.
  deep_pick.Pick get read {
    return deep_pick.Pick(_data).withContext('rekord', asMap());
  }

  @override
  String toString() {
    return 'Rekord$_data';
  }
}
```

Notes on the implementation:

- The `export 'package:deep_pick/deep_pick.dart';` means model files only import `rekord.dart` and still get `pick`, `Pick`, and all `as*` extensions.
- `SplayTreeMap` keeps keys sorted, so `toString()` output and map comparisons are stable regardless of the order the server sent the fields in.
- `withContext('rekord', asMap())` attaches the full map to every `Pick`, so a failed `asStringOrThrow()` error can show the data it failed on.
- The `assert` dance in `asMap()` returns a defensive copy in debug builds only, so the map contents are visible in the debugger, without paying the copy in release builds.

## Parsing API responses

Use `fromPick` in list parsing and `fromData` for single objects:

```dart
// Single object
final json = jsonDecode(response.body) as Map<String, Object?>;
final person = Person.fromData(json);

// List of objects via deep_pick
final people = pick(response.data).asListOrEmpty((it) {
  return Person.fromPick(it);
});

// Nested object inside another Rekord
class Team with RekordMixin {
  Team.fromData(Map<String, Object?> data) : rekord = Rekord(data);

  @override
  final Rekord rekord;

  String get name => rekord.read('name').asStringOrThrow();
  Person get captain => Person.fromPick(rekord.read('captain'));
  List<Person> get members => rekord.read('members')
      .asListOrEmpty((it) => Person.fromPick(it));
}
```

## Test ergonomics

The `create` factory makes tests concise. Only provide the fields your test actually exercises:

```dart
// Test only cares about name
final person = Person.create(name: 'Alice');
expect(person.name, 'Alice');

// Fields not provided will throw when accessed (which is fine , 
// if the test doesn't access them, it doesn't matter)
```

## Modifying a Rekord: `copyWith`

Rekord data is immutable, so changes go through `copyWith`.
Spread the current map and overwrite only the keys that were passed, using the `defaultArgument` sentinel, see [copy-with-nullable-fields](https://wellactually.dev/p/passsy/copy-with-nullable-fields) for why the getter is typed and the implementation is not.

```dart
class Person with RekordMixin {
  // ...

  Person Function({
    String? id,
    String? name,
    int? age,
  }) get copyWith => _copyWith;

  Person _copyWith({
    Object? id = defaultArgument,
    Object? name = defaultArgument,
    Object? age = defaultArgument,
  }) {
    return Person.fromData({
      ...rekord.asMap(),
      if (id != defaultArgument) 'id': id,
      if (name != defaultArgument) 'name': name,
      if (age != defaultArgument) 'age': age,
    });
  }
}
```

Rekord fits the pattern better than a plain class: map values are already `Object?`, so `_copyWith` needs no casts at all.

The sentinel maps directly onto the states Rekord can represent:

| call | resulting data |
| --- | --- |
| `person.copyWith()` | key untouched |
| `person.copyWith(name: 'Dash')` | `'name': 'Dash'` |
| `person.copyWith(name: null)` | `'name': null`, present, `isAbsent` is `false` |

Without the sentinel a field could never be cleared, and `??` would additionally collapse "value is `null`" into "key is absent", the exact distinction the Rekord pattern exists to preserve.

### `create` has the same ambiguity

`if (id != null) 'id': id` cannot produce an explicit `null`: omitting the argument and passing `null` both leave the key absent.
That is the right default for test ergonomics, so keep the plain factory unless a test needs to pin the "present but `null`" case.

When it does, use the same sentinel.
A factory cannot be a getter, so the typed facade becomes a `static const` field over a top-level function:

```dart
class Person with RekordMixin {
  static const Person Function({String? id, String? name}) create = _create;

  // ...
}

Person _create({
  Object? id = defaultArgument,
  Object? name = defaultArgument,
}) {
  return Person.fromData({
    if (id != defaultArgument) 'id': id,
    if (name != defaultArgument) 'name': name,
  });
}
```

`Person.create()` still leaves keys absent, while `Person.create(name: null)` now writes an explicit `null`.

## Typed getters for enums and custom types

Use extension types or enums for discrete values instead of raw strings:

```dart
class Workout with RekordMixin {
  // ...

  // ❌ BAD - raw string
  String get visibility => rekord.read('visibility').asStringOrThrow();

  // ✅ GOOD - typed wrapper
  ActivityVisibility get visibility =>
      ActivityVisibility(rekord.read('visibility').asStringOrThrow());

  // ✅ GOOD - nullable enum-like type
  WorkoutCategory? get category {
    final value = rekord.read('category').asStringOrNull();
    if (value == null) return null;
    return WorkoutCategory(value);
  }
}
```

## Crash-free models for UI rendering

Rekord's lazy parsing already protects you from import-time crashes, but a getter that uses `asStringOrThrow` will still throw at the call site when the field is missing.
For data shown in the UI, that's a real risk: the server can return a `{}` row, a partial response, or a payload with a renamed field, and one bad row should never crash the whole screen.

Treat this as a contract: **anything rendered in `build()` must come back as `null` or a safe fallback, never throw.**

### Two getter shapes per field (when both are useful)

Some fields are accessed both from business logic (where a missing value is a real bug worth a stack trace) and from the UI (where the screen has to keep rendering).
For those, expose two getters with the same name and an `OrNull` suffix:

```dart
class User with RekordMixin {
  // ...

  // Throws, for business logic; missing value is a bug worth seeing.
  String get id => rekord.read('id').asStringOrThrow();
  String get name => rekord.read('name').asStringOrThrow();

  // Nullable, for UI rendering; tolerates partial payloads.
  String? get idOrNull => rekord.read('id').asStringOrNull();
  String? get nameOrNull => rekord.read('name').asStringOrNull();
}
```

Pages that touch the model in `build()` use `nameOrNull`; an upload pipeline that genuinely cannot proceed without an id uses `id` and lets the throw bubble up to error reporting.

If a field is *only* read from the UI, skip the throwing variant entirely, just expose `String?`.

### Default to nullable for UI-only models

Models that never feed business logic (e.g. an `Activity` displayed in a feed) don't need the dual shape.
Make every getter nullable, return null on missing data, and let the rendering code hide the affected widget.

```dart
class Activity with RekordMixin {
  // Every getter is nullable; the UI hides anything that's null.
  String? get id => rekord.read('id').asStringOrNull();
  String? get title => rekord.read('title').asStringOrNull();
  int? get activeDuration => rekord.read('activeDuration').asIntOrNull();

  // Sub-objects: null when missing or malformed, so a single bad nested
  // payload doesn't take down the whole row.
  ActivityUser? get user {
    final data = rekord.read('user').asMapOrNull<String, Object?>();
    return data != null ? ActivityUser.fromData(data) : null;
  }
}
```

```dart
// In the widget, hide the Text instead of substituting placeholder strings
// like 'Unknown' or ''.
if (activity.title != null) Text(activity.title!),
```

### Avoid sentinel placeholders

Don't paper over missing data with strings like `'Unknown'`, `'Activity'`, or `'?'`, they look like real values to the user and to log scrapers.
Hide the widget instead.
The two acceptable exceptions are:

- The model layer reusing a domain-defined sentinel that downstream code already understands (e.g. `-1` for "missing sample" in a chart preview array, where the chart deliberately skips that index, see the `whenNull` section below).
- A boolean default that's clearly safer than null (e.g. `stravaSync` defaulting to `false`).

### Booleans: `asBoolOrFalse`, not `asBoolOrNull() ?? false`

```dart
// ❌ BAD - two reads, two parses, awkward to read.
bool get stravaSync => rekord.read('stravaSync').asBoolOrNull() ?? false;

// ✅ GOOD - single, intent-revealing call.
bool get stravaSync => rekord.read('stravaSync').asBoolOrFalse();
```

### Lists: keep server sentinels with `whenNull`

`asListOrNull` accepts a `whenNull` parameter that fires for every `null` *element* inside an otherwise-valid list.
Use it to substitute the sentinel that the rest of the system already understands, never `0`, which would look like a real reading.

```dart
// Server convention: -1 = "no data, skip drawing". Coercing null to 0 would
// draw a misleading "rider held 0 W" line during a sensor dropout.
List<int>? get powerPreview => rekord
    .read('powerPreview')
    .asListOrNull<int>((p) => p.asIntOrThrow(), whenNull: (_) => previewGapSentinel);
```

If the sentinel is project-wide, import it from a shared constant (e.g. `previewGapSentinel`) instead of re-declaring `-1` inline, the model and the renderer must agree on the meaning.

### Complex sub-parsing: try/catch around the throwing parser

When a getter delegates to a non-Rekord parser (a `fromJson` factory, a hand-rolled algorithm, anything that can throw mid-parse), wrap it so a malformed sub-payload only loses *that* sub-tree, not the whole object.

```dart
WorkoutPlan? get plan {
  final planList = rekord
      .read('plan')
      .asListOrNull<Map<String, Object?>>((p) => p.asMapOrThrow<String, Object?>());
  if (planList == null || planList.isEmpty) {
    return null;
  }
  try {
    return WorkoutPlan.fromJson({'plan': planList, 'events': eventsList});
  } catch (_) {
    // A garbled plan returns null, the rest of the activity still renders.
    return null;
  }
}
```

### Lists in API responses: empty placeholder per bad row, never skip

A list endpoint that returns `[A, garbage, B]` must not collapse to `[A, B]`.
Skipping silently hides corruption. The user's feed appears to load fine but is missing entries, and there's no signal that something went wrong.

Replace the bad row with an empty placeholder (`Activity.create()`, `WorkoutSummary.create()`, etc.) so it keeps its slot in the list and renders as a deliberately-empty card.
Combined with nullable getters, this guarantees:

- The healthy rows around the bad one keep working.
- The bad row is visible to the user as "something is here we couldn't parse" rather than disappearing.
- A `chirp.warning` (or `Chirp.warning` from a top-level function, see [logging](https://wellactually.dev/p/passsy/logging)) records the failure for the next debug session.

```dart
class ActivitiesResponse with RekordMixin {
  // ...

  // ❌ BAD - one bad row throws and the whole feed dies.
  List<Activity> get items => rekord.read('items')
      .asListOrEmpty((p) => Activity.fromData(p.asMapOrThrow<String, Object?>()));

  // ❌ BAD - skipping silently hides corruption.
  List<Activity> get items => rekord.read('items').asListOrEmpty<Activity?>((p) {
    try {
      return Activity.fromData(p.asMapOrThrow<String, Object?>());
    } catch (_) {
      return null;
    }
  }).whereType<Activity>().toList();

  // ✅ GOOD - one bad row becomes an empty placeholder; the rest render fine.
  List<Activity> get items => rekord.read('items').asListOrEmpty<Activity>((p) {
    try {
      return Activity.fromData(p.asMapOrThrow<String, Object?>());
    } catch (e, stackTrace) {
      chirp.warning(
        'Failed to parse activity item; using empty placeholder',
        error: e,
        stackTrace: stackTrace,
      );
      return Activity.create();
    }
  });
}
```

For the placeholder to actually render without a second crash, the model itself has to be nullable-everywhere (the previous "Default to nullable for UI-only models" section).
A throwing-getter model wrapped in `try/catch` only moves the crash from parse time to render time. Solve it at the model.

Pin this contract with a test for every list endpoint:

```dart
test('a malformed item becomes an empty placeholder, healthy rows survive', () {
  final response = ActivitiesResponse.fromData({
    'items': [
      <String, Object?>{'id': 'good-1', 'title': 'Real ride'},
      'this should have been an object', // bad row
      <String, Object?>{'id': 'good-2', 'title': 'Another'},
    ],
  });

  expect(response.items, hasLength(3), reason: 'bad row keeps its slot');
  expect(response.items[0].id, 'good-1');
  expect(response.items[1].id, isNull); // empty placeholder
  expect(response.items[2].id, 'good-2');
});
```

### Test the empty payload

Every Rekord model that surfaces in the UI deserves a test that constructs it from `{}` and asserts every nullable getter returns `null` without throwing.
This pins the contract so a future refactor can't accidentally re-introduce an `asStringOrThrow` in a UI-bound getter.

```dart
test('every Activity getter resolves to null/fallback for an empty payload', () {
  final activity = Activity.fromData(<String, Object?>{});

  expect(activity.id, isNull);
  expect(activity.title, isNull);
  expect(activity.activeDuration, isNull);
  expect(activity.user, isNull);
  // ...exhaustively, every nullable getter on the model.

  // toString must not throw either, logs touch it constantly.
  expect(activity.toString(), isNotEmpty);
});
```

For the dual-getter style, add a sibling test that pins the throw contract on the bare getter, so a "soften everything" refactor can't silently weaken business-logic guards:

```dart
test('throwing getters still throw on empty payloads', () {
  final user = User.fromData(<String, Object?>{});
  expect(() => user.id, throwsA(anything));
  expect(() => user.name, throwsA(anything));
  // ...
});
```

## Nested Rekord objects in `create`

When the `create` factory accepts nested Rekord objects, the `Rekord` constructor automatically flattens them to plain maps:

```dart
factory Activity.create({
  String? id,
  ActivityUser? user,    // Another RekordMixin class
  ActivityWorkout? workout,
}) {
  return Activity.fromData({
    if (id != null) 'id': id,
    if (user != null) 'user': user,         // Rekord handles this
    if (workout != null) 'workout': workout, // Rekord handles this
  });
}
```
