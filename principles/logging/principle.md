# Logging

Log through package:chirp, or developer.log in a Flutter app without chirp, and never print(), because print loses the error and stack trace.

Never use `print()` outside a CLI writing to stdout as its actual output.

## package:chirp

Chirp is the logger for server, CLI and Flutter code alike.
It works with no configuration.
Use it idiomatically and do not build wrappers around it.

Inside a class method, the `Object.chirp` extension gives every instance a cached child logger:

```dart
class ReportUploader {
  Future<void> upload(Report report) async {
    chirp.info('uploading report ${report.id}');
    try {
      await _client.put(report);
    } catch (e, stackTrace) {
      chirp.error('upload failed', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }
}
```

In top-level functions and closures there is no instance, so call the statics:

```dart
Future<void> main() async {
  Chirp.info('starting worker');
}
```

Do not write `componentLogger` helpers or `Chirp.root.child(context: ...)` boilerplate.
The extension already does that.
`Chirp.root = ...` is only needed to customise the formatter, level, or writers.

Always pass `error:` and `stackTrace:` for caught exceptions.
See [capture-stack-traces](https://wellactually.dev/p/passsy/capture-stack-traces).

## Flutter apps without chirp: developer.log

A Flutter app that does not depend on chirp logs with `developer.log` instead of adding chirp for a few lines.
Follow what the project already uses and do not mix both in one app.

```dart
import 'dart:developer' as developer;

developer.log(
  'route push failed',
  name: 'navigation',
  error: e,
  stackTrace: stackTrace,
);
```

Both reach DevTools with structure.
`print` reaches the console as a string and loses the error and stack trace.
