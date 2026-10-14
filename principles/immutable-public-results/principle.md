# Public Result Objects Are Immutable

Copy collections into a result object and expose them unmodifiable, and keep the data that explains a failure on the typed reason itself, so callers cannot mutate or misread it.

A result object handed to a caller is a report, not a workspace.
Copy collections on the way in and expose them as unmodifiable.

## Bad

```dart
class ScanResult {
  ScanResult(this.issues);
  final List<Issue> issues;
}
```

The caller can mutate `issues`, and so can whoever built the result.
Two callers holding the same result see each other's edits.

## Good

```dart
class ScanResult {
  ScanResult(List<Issue> issues) : issues = List.unmodifiable(issues);

  final List<Issue> issues;
}
```

`List.unmodifiable` both copies and freezes, so a later change to the caller's original list does not leak in.

See [prefer-immutable](https://wellactually.dev/p/passsy/prefer-immutable).

## Keep metadata with the reason it explains

When a result carries a typed reason, the data needed to understand or assert that reason belongs on the reason, not scattered across the result.

### Bad

```dart
class SyncResult {
  final SyncFailure? failure;
  final String? conflictingRevision;
  final DateTime? rejectedAt;
}
```

`conflictingRevision` is meaningless unless `failure` happens to be a conflict.
Every caller has to know which fields pair with which reason, and a test asserting the conflict case has to reach across three fields.

### Good

```dart
sealed class SyncFailure {}

class SyncConflict extends SyncFailure {
  SyncConflict({required this.conflictingRevision, required this.rejectedAt});

  final String conflictingRevision;
  final DateTime rejectedAt;
}

class SyncResult {
  final SyncFailure? failure;
}
```

The reason now carries its own evidence.
An assertion is one `is SyncConflict` check plus the fields that are guaranteed to exist.

Note that [avoid-sealed-classes-in-public-apis](https://wellactually.dev/p/passsy/avoid-sealed-classes-in-public-apis) applies if this type ships in a published package.
Inside an app, a sealed hierarchy here is fine.
