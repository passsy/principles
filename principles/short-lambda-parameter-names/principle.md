# Short Lambda Parameter Names

Name the parameter of a single-parameter lambda it or another name under 7 characters; lambdas with several parameters keep descriptive names.

When using **single-parameter** lambdas, prefer `it` or other short names (<7 chars) instead of verbose parameter names.

**This rule only applies to single-parameter lambdas.** Multi-parameter lambdas should use descriptive names to distinguish between parameters.

## ✅ Good - Single parameter with short name

```dart
// Using 'it'
items.map((it) => it.name);
items.where((it) => it.isActive);

// Using short descriptive names (< 7 chars)
users.map((user) => user.email);
items.fold(0, (sum, it) => sum + it.value);
```

## ❌ Bad - Single parameter with long name

```dart
// Too verbose for a simple lambda
items.map((currentItem) => currentItem.name);
users.where((userModel) => userModel.isActive);
numbers.map((numberValue) => numberValue * 2);
```

## ✅ Good - Multi-parameter lambdas with descriptive names

Multi-parameter lambdas are **exempt from this rule**. Use clear, descriptive names to distinguish parameters:

```dart
// Builder callbacks - descriptive names are correct
SingleMotionBuilder(
  builder: (context, animatedOffset, child) {
    return Transform.translate(offset: Offset(animatedOffset, 0), child: child);
  },
);

AnimatedBuilder(
  builder: (context, child) => Opacity(opacity: 0.5, child: child),
);

// Fold with accumulator - descriptive names help readability
items.fold<int>(0, (totalCount, item) => totalCount + item.quantity);
```

## ✅ Good - Unused parameters with underscore

```dart
// Underscore for intentionally unused parameters
builder: (context, value, _) { ... }
builder: (_, value, _) { ... }
```
