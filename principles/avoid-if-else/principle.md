# Flatten Nested Conditional Work

Resolve failed prerequisites and already-completed cases before the main operation, so the main operation can be read straight through.

This principle addresses nested conditional work.
Leave already-flat conditionals unchanged.

Before changing a conditional, identify the main operation and the cases that prevent or complete it.
Apply this principle when moving those cases out removes a level of nesting from substantial work.
Do not invent a preferred path between two alternative implementations.

Preserve behavior, including work that must run after either branch.

```dart
// Before: the main operation sits inside prerequisite checks.
void submit(Order? order, User? user) {
  if (order != null) {
    if (user != null) {
      saveOrder(order, user);
      sendConfirmation(order);
    } else {
      showLoginRequired();
    }
  } else {
    showMissingOrder();
  }
}

// After: each rejection finishes before the main operation starts.
void submit(Order? order, User? user) {
  if (order == null) {
    showMissingOrder();
    return;
  }
  if (user == null) {
    showLoginRequired();
    return;
  }
  saveOrder(order, user);
  sendConfirmation(order);
}
```
