# Control Flow Keywords on Their Own Line

Put a guard clause's return or throw on its own line inside braces, so exits stay visible and can take a breakpoint.

Place guard-clause `return` and `throw` statements on their own lines inside
blocks. This keeps exits visible in procedural code.

## Why?

1. **Scannability**: When scanning code vertically, `return` and `throw` signal exits from the current scope. Placing them at the start of a line makes them immediately visible: you don't have to read the full line to notice a control flow exit.

2. **Debuggability**: When `return` or `throw` is on its own line inside a block, you can place a breakpoint on it. Inline one-liners like `if (x) return;` don't allow breakpoints on the return itself.

3. **Minimize Diffs**: Inserting a comment or logging before the branch creates a minimal diff. Adding the extra curly braces is extra clutter when reviewing the new diff 

## Examples

### Example 1: Early return guard

❌ **Avoid: Inline return**

```dart
if (!mounted) return;
```

✅ **Prefer: Block with return on its own line**

```dart
if (!mounted) {
  return;
}
```

### Example 2: Throw on failure

❌ **Avoid: Inline throw**

```dart
if (!opened) throw Exception('failed to open');
```

✅ **Prefer: Block with throw on its own line**

```dart
if (!opened) {
  throw Exception('failed to open');
}
```

### Example 3: Return with value

❌ **Avoid: Inline return with value**

```dart
if (items.isEmpty) return const [];
```

✅ **Prefer: Block with return on its own line**

```dart
if (items.isEmpty) {
  return const [];
}
```

### Example 4: Multiple guards

❌ **Avoid: Inline guards**

```dart
Future<void> save() async {
  if (!isValid) return;
  if (!mounted) return;
  await repository.save(data);
}
```

✅ **Prefer: Block guards**

```dart
Future<void> save() async {
  if (!isValid) {
    return;
  }
  if (!mounted) {
    return;
  }
  await repository.save(data);
}
```

## Exception: compact classification ladders

An ordered, side-effect-free classification ladder may keep each condition and
returned value on one line:

```dart
factory FixtureSignalStrength.fromRssi(int? rssi) {
  if (rssi == null || rssi >= 0) return FixtureSignalStrength.lost;
  if (rssi > -60) return FixtureSignalStrength.best;
  if (rssi > -70) return FixtureSignalStrength.good;
  if (rssi > -80) return FixtureSignalStrength.fair;
  return FixtureSignalStrength.poor;
}
```

This reads as an ordered lookup table: each line is one condition-result pair.
The strongest reason for the inline form is that a mapper often contains
several small checks and usually trivial returned values. Keeping each pair
together makes the complete mapping easier to compare, while braces add
vertical noise between related conditions and results.

Use this exception only when:

- the function or block is recognizably a classifier or mapper;
- it contains multiple `if (...) return value;` mappings;
- the checks and returned values are usually short and trivial.

A final fallback return is not required. Logging or other supporting statements
do not invalidate an otherwise clear mapper.

The exception does not apply to bare early exits, a lone inline guard in
procedural code, or inline `throw` statements.

Using `return` inside an IIFE or short lambda as a single-line expression is
also fine:

```dart
// OK: return inside IIFE/lambda is the body, not a guard
final status = () {
  if (isLoading) return LoadingStatus.inProgress;
  return LoadingStatus.success;
}();
```
