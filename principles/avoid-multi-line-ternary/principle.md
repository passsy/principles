# Avoid Multi-Line Ternary Operators

Keep ternaries on one line; when a condition spans lines, use an immediately invoked function or if-else so each branch stays readable and debuggable.

Multi-line ternary operators (`condition ? trueValue : falseValue`) are hard to read and error-prone when they span multiple lines. Instead, prefer:

- **IIFE (Immediately Invoked Function Expression)** for complex expressions that need to return a value
- **if-else statements** for simple cases
- **Single-line ternaries** are OK for simple conditions

## Why?

1. **Readability**: Multi-line ternaries become difficult to parse, especially with nested conditions or complex expressions. The `?` and `:` operators can get lost in the formatting.

2. **Debuggability**: You cannot place breakpoints in the middle of a ternary expression. With IIFE or if-else, you can debug each branch independently.

3. **Maintainability**: Adding logic to a ternary (like logging or validation) requires refactoring to if-else anyway. Starting with IIFE or if-else makes future changes easier.

## Examples

### Example 1: Simple conditional assignment

❌ **Avoid: Multi-line ternary**

```dart
final status = isLoading
    ? LoadingStatus.inProgress
    : hasError
        ? LoadingStatus.error
        : LoadingStatus.success;
```

✅ **Prefer: IIFE for complex logic**

```dart
final status = () {
  if (isLoading) return LoadingStatus.inProgress;
  if (hasError) return LoadingStatus.error;
  return LoadingStatus.success;
}();
```

✅ **Also OK: if-else for simple assignment**

```dart
final LoadingStatus status;
if (isLoading) {
  status = LoadingStatus.inProgress;
} else if (hasError) {
  status = LoadingStatus.error;
} else {
  status = LoadingStatus.success;
}
```

### Example 2: Widget construction

❌ **Avoid: Multi-line ternary in widget tree**

```dart
Widget build(BuildContext context) {
  return Scaffold(
    body: isLoading
        ? Center(child: CircularProgressIndicator())
        : hasError
            ? ErrorWidget(error: error)
            : ContentWidget(data: data),
  );
}
```

✅ **Prefer: IIFE for cleaner widget logic**

```dart
Widget build(BuildContext context) {
  return Scaffold(
    body: () {
      if (isLoading) return Center(child: CircularProgressIndicator());
      if (hasError) return ErrorWidget(error: error);
      return ContentWidget(data: data);
    }(),
  );
}
```

✅ **Also OK: Builder widget with early returns** (see [builders_with_early_returns](https://wellactually.dev/p/passsy/builders-with-early-returns))

```dart
Widget build(BuildContext context) {
  return Scaffold(
    body: Builder(builder: (context) {
      if (isLoading) return Center(child: CircularProgressIndicator());
      if (hasError) return ErrorWidget(error: error);
      return ContentWidget(data: data);
    }),
  );
}
```

### Example 3: Complex expression

❌ **Avoid: Multi-line ternary with complex expressions**

```dart
final message = user != null
    ? user.isPremium
        ? 'Welcome back, ${user.name}! Enjoy premium features.'
        : 'Welcome back, ${user.name}!'
    : 'Please sign in to continue.';
```

✅ **Prefer: IIFE for complex string construction**

```dart
final message = () {
  if (user == null) return 'Please sign in to continue.';
  if (user.isPremium) {
    return 'Welcome back, ${user.name}! Enjoy premium features.';
  }
  return 'Welcome back, ${user.name}!';
}();
```

## When Single-Line Ternaries are OK

Single-line ternary operators are perfectly fine for simple conditions:

```dart
final color = isActive ? Colors.green : Colors.grey;
final label = count == 1 ? 'item' : 'items';
final icon = isExpanded ? Icons.expand_less : Icons.expand_more;
```

## IIFE vs if-else Guidelines

**Use IIFE when:**
- You need to assign a final variable based on complex logic
- The result is used inline (e.g., in a widget tree or function call)
- You want to avoid temporary mutable variables

**Use if-else when:**
- The logic is simple and straightforward
- You're not constrained by needing a final variable
- The code is at the top level of a function (not inline)

Both are acceptable - choose based on context and readability.
