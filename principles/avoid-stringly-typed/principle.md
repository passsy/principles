# Avoid Stringly-Typed APIs

Do not use String or List<String> for statuses, roles, categories or options; use an enum, a class with static values or an extension type.

Avoid using `String` or `List<String>` to represent discrete values like statuses, roles, categories, or options. This applies to:
- Return types
- Function parameters
- Constructor parameters
- Class fields

This is known as "stringly-typed" code - using strings where a stronger type would be more appropriate.

## Problems with stringly-typed code

1. **No type safety** - typos compile fine, refactoring is error-prone
2. **No IDE support** - no autocomplete, no "find usages", no rename refactoring
3. **Magic strings** - consumers must know valid values, often via documentation or source diving
4. **Poor testability** - tests rely on exact string values that may change
5. **No exhaustiveness checking** - switch statements can't warn about missing cases

## Examples

### Function parameters

```dart
// ❌ BAD - String parameter for discrete options
void setTheme(String theme) {
  if (theme == 'light') { ... }
  else if (theme == 'dark') { ... }
}
setTheme('ligt'); // Typo compiles fine, fails silently

// ✅ GOOD - Enum parameter
enum Theme { light, dark, system }

void setTheme(Theme theme) {
  switch (theme) {
    case Theme.light: ...
    case Theme.dark: ...
    case Theme.system: ...
  }
}
setTheme(Theme.light); // Type-safe, autocomplete works
```

### Return types

```dart
// ❌ BAD - String-based status
String getConnectionStatus() => isConnected ? 'connected' : 'disconnected';

if (status == 'conected') { ... } // Typo, always false

// ✅ GOOD - Enum-based status
enum ConnectionStatus { connected, connecting, disconnected }

ConnectionStatus getConnectionStatus() =>
    isConnected ? ConnectionStatus.connected : ConnectionStatus.disconnected;
```

### List of outcomes

```dart
// ❌ BAD - List of strings
List<String> getAssignedRoles(String deviceId) {
  return ['power source', 'cadence source'];
}

if (roles.contains('power souce')) { ... } // Typo, always false

// ✅ GOOD - Set of enums
Set<DeviceRole> getAssignedRoles(DeviceId deviceId) {
  return {DeviceRole.powerSource, DeviceRole.cadenceSource};
}

if (roles.contains(DeviceRole.powerSource)) { ... } // Type-safe
```

### Constructor parameters

Categories come from the catalog server, which adds new ones without an app
update. An enum would crash on the first unknown value, so use a class with
static values.

```dart
// ❌ BAD - String for category
class Product {
  final String category; // 'electronics', 'clothing', 'food'?
  Product({required this.category});
}

// ✅ GOOD - Extensible typed category
class ProductCategory {
  final String value;
  const ProductCategory(this.value);

  static const electronics = ProductCategory('electronics');
  static const clothing = ProductCategory('clothing');
  static const food = ProductCategory('food');
}

class Product {
  final ProductCategory category;
  Product({required this.category});
}
```

### Identifiers

Unlike the cases above, a `String` id is not a defect on its own. But once
several kinds of id travel through the same code, a `String userId` is
interchangeable with a `String orderId`, and the compiler has nothing to say
about it. An extension type gives the id a name without any runtime cost - it
compiles down to the `String` it wraps.

```dart
// ⚠️ RISKY - every id is the same type
Future<Order> loadOrder(String userId, String orderId) { ... }

loadOrder(orderId, userId); // Arguments swapped, compiles fine

// ✅ BETTER - extension types
extension type const UserId(String value) {}
extension type const OrderId(String value) {}

Future<Order> loadOrder(UserId userId, OrderId orderId) { ... }

loadOrder(orderId, userId); // Compile error
```

Extension types are zero-cost, so this stays cheap even for IDs that travel
through every layer:

```dart
extension type const DeviceId(String value) {
  // Add validation at the boundary where the id enters the app
  factory DeviceId.parse(String raw) {
    if (raw.isEmpty) throw ArgumentError.value(raw, 'raw', 'empty device id');
    return DeviceId(raw);
  }
}

final devices = <DeviceId, Device>{}; // Keys can't be confused with names
```

Don't blanket-wrap every id in the codebase. It pays off where ids of different
kinds meet - repository and API signatures, caches keyed by id, functions taking
more than one id. A local variable holding a single id read from JSON and passed
straight on is fine as a `String`.

Use a regular class instead of an extension type when the id needs to be
subtyped, or when you must guarantee that nobody hands the underlying `String`
to an API expecting the id - an extension type is a compile-time view, so a
`String` can still be cast into it.

## Better alternatives

| Instead of | Use |
|------------|-----|
| `String` for one of N options (closed set) | `enum` |
| `String` for one of N options (extensible/server-defined) | Class with static values |
| `String` for an identifier, where ids get mixed up | `extension type` |
| `List<String>` for multiple options | `Set<TypedValue>` |
| `String` with embedded data | Result class or record |
| `Map<String, dynamic>` | Typed class |

`enum` is the first thing to reach for, not the only one. It only fits when the
set of values is closed and known at compile time. Identifiers have no such set,
and server-defined values grow without an app release.

### Enum vs class with static values vs extension type

Use **enum** when you control all possible values and they won't change without a code update:

```dart
// ✅ Enum - closed set, you control all values
enum ConnectionStatus { connected, connecting, disconnected }
```

Use **class with static values** when values come from a server or can be extended without app updates:

```dart
// ✅ Class with static values - extensible, server-defined
class ActivityType {
  final String value;
  const ActivityType(this.value);

  // Known values with autocomplete
  static const cycling = ActivityType('cycling');
  static const running = ActivityType('running');
  static const swimming = ActivityType('swimming');

  // Server can return new types the app doesn't know yet
  factory ActivityType.fromJson(String json) => ActivityType(json);

  @override
  bool operator ==(Object other) =>
      other is ActivityType && other.value == value;

  @override
  int get hashCode => value.hashCode;
}

// Usage - type-safe with autocomplete for known values
void startWorkout(ActivityType type) { ... }
startWorkout(ActivityType.cycling); // Autocomplete works

// But also handles unknown server values gracefully
final serverType = ActivityType.fromJson('hiking'); // New type, still works
```

This pattern gives you:
- Type safety (can't accidentally pass a `String`)
- Autocomplete for known values
- Forward compatibility with new server-defined values
- Equality checks work correctly

Consider an **extension type** when there is no set of values at all, only a
role the string plays - an id, a key, a token, a path:

```dart
// ✅ Extension type - unbounded values, but a named type
extension type const SessionToken(String value) {}
```

Equality and `hashCode` come from the wrapped `String`, so extension types work
as map keys and in sets without writing any boilerplate.

### Result objects for complex outcomes

```dart
// ❌ BAD - Strings with embedded information
List<String> processFiles() => ['ok: file1.txt', 'error: file2.txt'];

// ✅ GOOD - Structured result
class ProcessResult {
  final List<String> succeeded;
  final Map<String, String> failed; // filename -> error
}
```

### Records for simple composite results

```dart
// ❌ BAD - Encoding values in strings
String getStats() => 'added:3,removed:1';

// ✅ GOOD - Record
({int added, int removed}) getStats() => (added: 3, removed: 1);
```

## When strings are acceptable

- **Identifiers**: user IDs, file paths, URLs, database keys. A plain `String`
  is fine here. An extension type is worth considering once several kinds of ID
  travel through the same code and mixing them up is a real risk.
- **User input**: search queries, form text fields
- **Display text**: labels, messages (but see also: [Widget parameters for display text](https://wellactually.dev/p/passsy/avoid-plain-string-widget-args))
- **External data**: JSON keys, API parameters (convert to typed values at boundaries)
- **Truly open-ended values**: comments, descriptions, notes

## See also

- [avoid_plain_string_widget_args](https://wellactually.dev/p/passsy/avoid-plain-string-widget-args): For Widget parameters specifically, String parameters for user-facing display text should be replaced with Widget parameters.

## Display text pattern

When you need both type safety AND human-readable display, add a `displayName` getter:

```dart
enum DeviceRole {
  powerSource,
  cadenceSource;

  String get displayName => switch (this) {
    powerSource => 'power source',
    cadenceSource => 'cadence source',
  };
}

// Type-safe operations
if (roles.contains(DeviceRole.powerSource)) { ... }

// Human-readable display
final message = roles.map((r) => r.displayName).join(', ');
```
