# One Question per `if`

Join conditions with && only when they form one question, and give each separate question its own nested if.

An `if` asks a question.
Clauses joined with `&&` should be parts of that one question.
When two clauses ask different questions, give each its own `if`.

Merging is the default.
Nesting costs a level of indentation, so it has to buy something.

## Merge when it is one question

```dart
// The null check only makes the second clause safe to ask: "is admin?"
if (user != null && user.isAdmin) { ... }

// Two halves of one fact: "is in range?"
if (index >= 0 && index < items.length) { ... }
```

Neither clause means anything to the reader without the other.
The combined condition has one name, `isAdmin` or `isInRange`, and no "and" in it.

## Split when it is two questions

```dart
// Bad: "file changed on macOS" is not one thing
if (fileChanged && Platform.isMacOS) {
  refreshFinderIcon();
}

// Good: what happened outside, where it matters inside
if (fileChanged) {
  // Finder caches icons, other file managers pick the change up themselves.
  if (Platform.isMacOS) {
    refreshFinderIcon();
  }
}
```

`fileChanged` asks whether something happened.
`Platform.isMacOS` asks whether this environment needs the workaround.
Each has its own reason to exist, and the comment explaining the second has nowhere to go in the joined version.

The split also keeps the next change small.
Supporting Windows only adds lines:

```diff
 if (fileChanged) {
   // Finder caches icons, other file managers pick the change up themselves.
   if (Platform.isMacOS) {
     refreshFinderIcon();
   }
+  // Explorer needs a shell notification to redraw the icon.
+  if (Platform.isWindows) {
+    notifyShell();
+  }
 }
```

The joined version has to be taken apart first, so the diff rewrites the macOS lines too:

```diff
-if (fileChanged && Platform.isMacOS) {
-  refreshFinderIcon();
-}
+if (fileChanged) {
+  if (Platform.isMacOS) {
+    refreshFinderIcon();
+  }
+  if (Platform.isWindows) {
+    notifyShell();
+  }
+}
```

Review and blame lose the signal that only Windows is new.

## The tests

Split when any of these holds, merge when none does:

1. **Name.** The combined condition has no single name without "and".
2. **Comment.** Each clause needs its own comment to explain why it is there.
3. **Handling.** One clause could get its own `else`, log line or second reaction.
4. **Diff.** Adding a sibling case would rewrite existing lines instead of only adding new ones.

A typical pair of different questions is "did it happen?" and "does it apply here?": an event and a platform, a trigger and a permission, a state change and a feature flag.

## Related rules

- [early_returns](https://wellactually.dev/p/passsy/early-returns) comes first.
  When a clause can become a guard that returns, write the guard and stay flat.
  Nest only when code after the block must still run.
- [prefer_debuggable_code](https://wellactually.dev/p/passsy/prefer-debuggable-code) names the clauses of one question (`isRegistered`, `isActive`, `isAdult`).
  This rule is about clauses that do not belong to one question in the first place.
- "Collapsible if" lints ask for the merge.
  Clippy and DeepSource leave nested `if`s alone when a comment sits between them, which is the split this rule describes.
  DCM's `avoid-collapsible-if` has no such exemption, so ignore it on the line when the split is deliberate.

## Exceptions

- Do not nest deeper than two levels for this rule.
  Three questions in a row are a sign that the block wants to be a function with guards.
- A single short condition that reads as a sentence can stay joined when none of the four tests holds, even if the clauses are technically different kinds: `if (isDebug && verbose)`.
