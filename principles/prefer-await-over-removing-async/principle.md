# Add missing await rather than removing async

Fix async_return_with_no_await by adding the missing await and keeping async, because the next change will likely need another await anyway.

When `async_return_with_no_await` is mentioned, prefer adding the missing `await` to the returned future. Keep the function's `async` modifier instead of removing it to silence the lint.

Keeping `async` makes later refactoring easier: new functionality will often need another `await`. Removing `async` now forces a second edit to the function signature, potentially many lines above, when that happens.

Prefer:

```dart
Future<Result> loadResult() async {
  return await fetchResult();
}
```

Do not fix the diagnostic by changing that function to:

```dart
Future<Result> loadResult() {
  return fetchResult();
}
```

Apply the same preference to delegated calls in branches and callbacks. Preserve existing error handling and validate behavior when adding an await affects timing or execution zones; do not blindly apply a mechanical fix that breaks a test. This rule is a preference for fixing the named diagnostic, not a requirement to make every future-returning function async.
