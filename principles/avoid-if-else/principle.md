# Avoid If-Else Statements

Prefer switch, polymorphism, collection functions or early returns over if-else, and keep if-else for two equally weighted branches.

Using `if-else` statements can lead to deeply nested and hard-to-read code. Instead, prefer:

- `switch` statements for multiple conditions
- Polymorphism or strategy patterns
- Functional programming constructs (`map`, `where`, `fold`)
- Early returns to reduce nesting

These approaches result in cleaner, more maintainable code.

## When If-Else Is Appropriate

Use `if-else` when both branches are equally weighted or likely. Early returns are better for guard clauses or error handling, not for equally valid code paths.

```dart
// Good: equally weighted branches use if-else
if (package.isFlutterPackage) {
  return flutter(args);
} else {
  return dart(args);
}

// Good: guard clause uses early return
if (user == null) {
  return ErrorWidget();
}
return UserProfile(user);
```

The mistake to watch for is turning a symmetric fork into a fake guard:

```dart
// Bad: neither branch is an edge case, but one is dressed up as one
if (isBackgroundIsolate) {
  ping();
  return;
}
routeToInstance();
```

Two isolates, two equally valid paths.
The reader has to notice a bare `return` to see that they are alternatives.
