# Wrap Only the Call That Throws a Generic Exception

Wrap only the one call you expect to throw FormatException, StateError, TimeoutException and similar generic types, because a wide try cannot tell which statement threw.

Some exception types are thrown from many places in pure Dart and the SDK.
Catch them only around the one call you expect to throw them, never around a large or deep block.

The generic ones:

- `FormatException`, thrown by `int.parse`, `double.parse`, `Uri.parse`, `utf8.decode`, `jsonDecode`, `Version.parse`, platform channel codecs and many more
- `StateError`, `ArgumentError`, `RangeError`, `TypeError`, `AssertionError` and `UnsupportedError`, which any collection access, cast or precondition can throw
- `TimeoutException`, which every `await` with a timeout can throw, including the ones inside the functions you call

## Why?

An `on FormatException` clause cannot tell which statement threw.
Around a block that sends a request, decodes the response and parses it, the clause catches a `FormatException` from the request or from a callee as well, and handles it as if the parse had failed.
The handler then makes the wrong decision, and nothing in the logs says so.

The same holds for every type in the list above.
The wider the `try` block, the more code can throw the type, and the less the handler knows about what actually went wrong.

Nothing about this needs an `await`.
Two synchronous calls in one `try` are already two places the exception can come from.
Only `TimeoutException` is tied to awaits; every other type in the list is thrown by sync and async code alike.

## Bad

```dart
Future<Firmware> readFirmware(Device device) async {
  try {
    final response = await connection.request(device, 'fw-version');
    final text = utf8.decode(response);
    return KnownFirmware(Version.parse(text.trim()));
  } on FormatException {
    // Meant for Version.parse, but also catches one from the request or utf8.decode.
    return const UnknownFirmware();
  } catch (e, stackTrace) {
    log('reading the firmware version failed', error: e, stackTrace: stackTrace);
    // Skipped when the request threw a FormatException.
    await connection.restartSession(device);
    return const UnknownFirmware();
  }
}
```

A request that fails while decoding its own frame throws a `FormatException`.
The first clause takes it, the session is never restarted, and the next request fails the same way.

## Good

Split the request from the parse.
The request keeps its own broad catch, and only `Version.parse` sits inside `on FormatException`.

```dart
Future<Firmware> readFirmware(Device device) async {
  final List<int> response;
  try {
    response = await connection.request(device, 'fw-version');
  } catch (e, stackTrace) {
    log('reading the firmware version failed', error: e, stackTrace: stackTrace);
    await connection.restartSession(device);
    return const UnknownFirmware();
  }

  final text = utf8.decode(response, allowMalformed: true).trim();
  try {
    return KnownFirmware(Version.parse(text));
  } on FormatException {
    return const UnknownFirmware();
  }
}
```

`allowMalformed: true` makes `utf8.decode` replace invalid bytes instead of throwing, so the decode cannot throw a `FormatException` of its own.

## Prefer APIs that do not throw

The tightest `try` is the one you do not need.

```dart
final port = int.tryParse(raw);
final uri = Uri.tryParse(link);
```

`int.tryParse`, `double.tryParse` and `Uri.tryParse` return `null` instead of throwing.
`Version.parse` has no `tryParse`, so wrap that single call as shown above.

## Catch TimeoutException where the timeout is

A `TimeoutException` belongs to the `.timeout()` call that set the limit.
Catch it there, or pass `onTimeout:` and skip the exception entirely.

```dart
final response = await connection
    .request(device, 'fw-version')
    .timeout(
      const Duration(seconds: 5),
      onTimeout: () => throw DeviceUnresponsiveException(device),
    );
```

An `on TimeoutException` around several awaits also catches a timeout that fired deep inside a callee, with a different limit and a different meaning.

## Two synchronous parses are two sources too

```dart
// Bad: which half was invalid, and was it a parse at all?
try {
  final hour = int.parse(parts[0]);
  final minute = int.parse(parts[1]);
  return TimeOfDay(hour: hour, minute: minute);
} on FormatException {
  return null;
}
```

```dart
// Good: each value is checked where it is parsed.
final hour = int.tryParse(parts[0]);
final minute = int.tryParse(parts[1]);
if (hour == null || minute == null) {
  return null;
}
return TimeOfDay(hour: hour, minute: minute);
```

## Exceptions

Calls nested in one expression, such as `KnownFirmware(Version.parse(text))`, count as the one call being wrapped.
Broad types such as `on Exception` or a plain `catch` are not covered here: they are meant to catch everything.
