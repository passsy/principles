# Prefer Immutable Objects

Keep model objects immutable and hold changing state, such as which items are checked, separately, because mutating a field may not trigger setState and leaves the UI stale.

Prefer immutable objects to avoid unintended state mutations.  
Mutable state might not trigger `setState`, leading to incorrect UI rendering.  

Instead of using mutable fields (e.g., `bool checked` in an `Item` class), represent state separately, such as:

```dart
List<Item> items;
List<Item> checkedItems;
```

This makes it easier to add additional states for the screen,  
while keeping the model `Item` consistent across different parts of the app.
