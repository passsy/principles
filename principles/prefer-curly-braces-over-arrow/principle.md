# Prefer Curly Braces Over Multi-Line Arrow Lambdas

Give a lambda that spans several lines a curly-brace body instead of =>, because it needs less indentation and you can set breakpoints inside it.

When writing lambdas that span multiple lines, use curly braces `{}` instead of arrow syntax `=>`. This improves readability and reduces indentation levels.

## Why?

1. **Better indentation**: Multi-line arrow lambdas require the entire expression to be indented, leading to excessive indentation. Curly braces allow for better code structure and clearer formatting.

2. **Debugging support**: You cannot place breakpoints inside arrow lambdas (`=>`), but you can place them on individual lines inside curly brace blocks. This makes debugging significantly easier.

## Examples

### Example 1: Method chaining

❌ **Avoid: Multi-line arrow lambda**

```dart
final result = items.map((item) =>
    item.name
        .trim()
        .toLowerCase()
        .replaceAll(' ', '_'));
```

✅ **Prefer: Curly braces**

```dart
final result = items.map((item) {
  return item.name
      .trim()
      .toLowerCase()
      .replaceAll(' ', '_');
});
```

### Example 2: Constructor in map

❌ **Avoid: Multi-line arrow lambda**

```dart
MyWidget(
  items: data
      .map(
        (item) => DataModel(
          id: item.id,
          name: item.name,
          value: item.value,
          timestamp: DateTime.now(),
        ),
      )
      .toList(),
)
```

✅ **Prefer: Curly braces**

```dart
MyWidget(
  items: data.map((item) {
    return DataModel(
      id: item.id,
      name: item.name,
      value: item.value,
      timestamp: DateTime.now(),
    );
  }).toList(),
)
```

The arrow lambda version has excessive indentation (10 spaces), while the curly braces version uses standard indentation (6 spaces).

## When Arrow Syntax is OK

Arrow syntax is perfectly fine for single-line expressions:

```dart
final doubled = numbers.map((n) => n * 2);
final names = users.map((user) => user.name);
```

Arrow syntax is also fine for **method definitions with switch expressions**. The switch body is self-contained and well-structured on its own, wrapping it in `{ return ...; }` adds noise without reducing indentation or improving debuggability:

```dart
// OK: switch expression in a method definition
Color toColor() => switch (this) {
      PixelEffectColor.red => const Color(0xFFFF2020),
      PixelEffectColor.orange => const Color(0xFFFF7800),
      // ...
    };
```
