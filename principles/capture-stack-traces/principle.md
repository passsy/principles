# Capture Stack Traces in Catch Blocks

Catch the stack trace together with the error and pass both along, because an error without its stack trace says what failed but not where.

Catch both the error and the stack trace, then pass both along.

A caught exception without its stack trace tells you what went wrong but not where.
Dart gives you the stack trace for free in the catch clause, and rethrowing or logging without it throws away the only part that makes the error debuggable.

## Bad

```dart
try {
  await uploadReport(report);
} catch (e) {
  log('upload failed: $e');
}
```

The log says the upload failed. It does not say which of the four awaits inside `uploadReport` threw.

## Good

```dart
try {
  await uploadReport(report);
} catch (e, stackTrace) {
  log('upload failed', error: e, stackTrace: stackTrace);
}
```

## Good: rethrowing with context

```dart
try {
  return parseConfig(raw);
} catch (e, stackTrace) {
  Error.throwWithStackTrace(
    ConfigException('config at $path is malformed'),
    stackTrace,
  );
}
```

`Error.throwWithStackTrace` keeps the original throw site instead of pointing at the rethrow.

## Exceptions

A bare `catch (e)` is fine when the error is immediately converted to a value and the stack trace genuinely cannot help:

```dart
int? tryParsePort(String raw) {
  try {
    return int.parse(raw);
  } catch (e) {
    return null;
  }
}
```

Prefer `int.tryParse` here anyway.
