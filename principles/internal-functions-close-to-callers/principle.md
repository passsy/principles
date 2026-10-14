# Public Only When It Is an API

Make a function public only when it is a documented internal API; a helper that one other file needs belongs next to that caller as a private function.

A top-level function that is public only because one other file imports it is not an API.
It is a helper that ended up in the wrong file.

Either make it a real internal API, with a name and dartdoc that explain when to call it, or move it next to the caller and make it private.

## Bad

```dart
// lib/src/sync/sync_engine.dart
String buildEtagHeader(String revision) => 'W/"$revision"';
```

Nothing in this file uses `buildEtagHeader`.
It lives here because `sync_engine.dart` felt like a reasonable place, and it is public because `http_client.dart` needed it.
Now every reader of the sync engine has to wonder whether the header logic is part of syncing.

## Good: move it to the caller

```dart
// lib/src/net/http_client.dart
String _buildEtagHeader(String revision) => 'W/"$revision"';
```

## Good: keep it public, but earn it

```dart
// lib/src/net/etag.dart

/// Builds a weak ETag header value for [revision].
///
/// Use when issuing a conditional request. The server compares the weak
/// validator, so revisions that differ only in whitespace still match.
String buildEtagHeader(String revision) => 'W/"$revision"';
```

Now the file, the name, and the doc agree that this is a thing callers are meant to reach for.

## The test

Ask why the function is public.
If the answer is "because another file imports it", that is a location problem, not a visibility decision.
If the answer is "because callers outside this file are meant to use it", document it and give it a file where a reader would look for it.

Related: [Explicit exports](https://wellactually.dev/p/passsy/explicit-exports), [Name a file like the first class](https://wellactually.dev/p/passsy/file-naming), [Extract only stable concepts](https://wellactually.dev/p/passsy/extract-only-stable-concepts).
