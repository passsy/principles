# Throw Instead of Returning a Success Bool

Report a failed operation by throwing, not by returning false, so the error and its stack trace reach the caller and cannot be silently ignored.

An operation that can fail reports failure by throwing.
A `bool` or `Future<bool>` return value answers a domain question ("is it valid?", "does the user have access?"), never "did it work?".
Return `void` (or the operation's actual result) and let failures propagate as exceptions.

## Why?

1. **The error is gone.**
   By the time `false` reaches the caller, the exception, its message and its stack trace have been thrown away.
   The caller knows something failed but can no longer log it, report it, or branch on the cause.
2. **`false` is silently ignorable.**
   An unchecked bool return compiles without complaint, so a forgotten check ships.
   An unhandled exception surfaces in logs and crash reporting.
3. **The caller needs try-catch anyway.**
   A `Future` can always fail (`TimeoutException`, `SocketException`).
   Funneling some failures into a bool splits error handling into two channels that both must be checked.
   The same reasoning rejects `Future<Either<T>>`, see [prefer exceptions](https://wellactually.dev/p/passsy/prefer-exceptions).

## Bad

```dart
Future<bool> removeBackpack(BackpackUuid uuid) async {
  try {
    await api.removeBackpack(backpackId: uuid);
    return true;
  } catch (e, stack) {
    log('Error removing backpack', error: e, stackTrace: stack);
    return false;
  }
}
```

```dart
final success = await controller.removeBackpack(uuid);
if (!success) {
  showErrorToast(); // failed, but nobody can say why
}
```

## Good

```dart
Future<void> removeBackpack(BackpackUuid uuid) async {
  try {
    await api.removeBackpack(backpackId: uuid);
  } catch (e, stack) {
    log('Error removing backpack', error: e, stackTrace: stack);
    rethrow;
  }
}
```

```dart
try {
  await controller.removeBackpack(uuid);
} catch (_) {
  // Logged with its stack trace by the controller.
  showErrorToast();
}
```

## Exceptions

A bool that answers a real question about the domain is fine:

```dart
bool isValidEmail(String input) { /* ... */ }
Future<bool> hasNetworkConnection() { /* ... */ }
```

A dialog result like `showDialog<bool>` is an answer ("did the user confirm?"), not a success flag.

For expected, non-exceptional absence prefer a nullable result over a bool: `int.tryParse` returns `null`, it does not return `false`.
