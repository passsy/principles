# Use Early Returns

Return early from guards to flatten nesting, but keep symmetric forks as if-else and independent checks as positive parallel if blocks.

Avoid deeply nested conditionals by handling edge cases first and returning.
This reduces indentation and keeps the main path at the outermost level.

```dart
// Bad
Widget build(BuildContext context) {
  if (user != null) {
    if (user.isVerified) {
      return Profile(user);
    } else {
      return VerifyPrompt();
    }
  } else {
    return SignIn();
  }
}

// Good
Widget build(BuildContext context) {
  if (user == null) {
    return SignIn();
  }

  if (user.isVerified) {
    return Profile(user);
  } else {
    return VerifyPrompt();
  }
}
```

The null check is a guard, so it returns early.
The verified check is a symmetric fork, so it stays an `if-else`.

## Independent checks are not guards

An early return earns its place by deleting an else block and a level of
indentation. A function that runs several independent checks (a dispatcher
deciding which kind of input it was handed) has neither: there is no else,
and each check returns from inside its own block anyway, so the guard
flattens nothing. What the negated guard does instead is cost comprehension
twice: `if (!file.isPubspec) return null;` is harder to read than the
positive condition, and every such `return` silently disables all the checks
below it, inventing an order between branches that have nothing to do with
each other.

```dart
// Bad: three independent checks disguised as one guarded path
Finding? detect(Event event) {
  final mentioned = checkConversation(event);
  if (mentioned != null) {
    return mentioned;
  }
  final file = event.file;
  if (file == null) {
    return null; // kills the pubspec check and the code check at once
  }
  if (!file.isPubspec) {
    return null; // and now the code check below is unreachable
  }
  return checkPubspec(file);
}

// Good: one block per trigger. The condition names the input,
// the body evaluates it, and neighbouring blocks stay untouched.
Finding? detect(Event event) {
  if (event.isConversation) {
    return checkConversation(event);
  }
  final file = event.file;
  if (file != null && file.isPubspec) {
    return checkPubspec(file);
  }
  if (file != null && file.isDartCode) {
    return checkWrittenCode(file);
  }
  return null;
}
```

Returning from inside a block is fine: each block is self-contained, and the
evaluation belongs in an extracted function so the trigger list stays
readable at a glance. Adding a fourth check is appending a block, not
threading a new condition through somebody else's guards.

The test: does the early return remove an else block or flatten the code
after it? A guard does. When the answer is no, because the checks are parallel, not
sequential, the negation buys nothing, so write positive parallel `if`
blocks instead.

Early returns are for guards, not for every branch.
See [avoid_if_else](https://wellactually.dev/p/passsy/avoid-if-else) for when a fork should stay an `if-else`.
