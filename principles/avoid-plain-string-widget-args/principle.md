# Widget Parameters Instead of String Parameters

Give reusable widgets Widget parameters with a DefaultTextStyle instead of String parameters for user-facing text, so callers can pass icons, rich text or their own style.

When creating reusable widgets, avoid passing `String` parameters for user-facing text that will be displayed to users. Instead, pass `Widget` parameters and use `DefaultTextStyle` to apply default styling.

This approach provides greater flexibility, allowing callers to:
- Pass simple `Text` widgets that inherit the default styling
- Pass rich text with custom formatting
- Pass complex widgets with icons, images, or other content
- Override the default styling when needed

## Bad Examples

```dart
// Bad - Cannot add icons or formatting
class StatusCard extends StatelessWidget {
  const StatusCard({
    required this.title,
    required this.message,
    super.key,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          Text(title, style: TextStyle(fontWeight: FontWeight.bold)),
          Text(message),
        ],
      ),
    );
  }
}
```

## Good Examples

```dart
// Good - Flexible widget parameters
class StatusCard extends StatelessWidget {
  const StatusCard({
    required this.title,
    required this.message,
    super.key,
  });

  final Widget title;
  final Widget message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          DefaultTextStyle(
            style: const TextStyle(fontWeight: FontWeight.bold),
            child: title,
          ),
          DefaultTextStyle(
            style: const TextStyle(fontSize: 14),
            child: message,
          ),
        ],
      ),
    );
  }
}

// Usage - simple text
StatusCard(
  title: const Text('Success'),
  message: const Text('Operation completed'),
)

// Usage - with icon
StatusCard(
  title: Row(
    children: [
      Icon(Icons.check_circle, color: Colors.green),
      SizedBox(width: 8),
      Text('Success'),
    ],
  ),
  message: const Text('Operation completed'),
)

// Usage - with rich text
StatusCard(
  title: const Text('Success'),
  message: RichText(
    text: TextSpan(
      text: 'Operation completed in ',
      children: [
        TextSpan(
          text: '2.5s',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ],
    ),
  ),
)
```

## Exceptions

You may use `String` parameters when:
- The string is used as id (productId, userId) for data retrieval
- The string is used for **internal logic** and not displayed to users (e.g., `routeName`, `analyticsKey`)
- The string is a **configuration value** (e.g., `formControlName`, `validationPattern`)
- The widget is a **low-level helper** that explicitly formats strings (e.g., `FormattedNumber`, `DateFormatter`)

## Migration

When refactoring existing widgets:

1. Change `final String foo` to `final Widget foo`
2. Replace `Text(foo, style: ...)` with:
   ```dart
   DefaultTextStyle(
     style: ..., // the original style
     child: foo,
   )
   ```
3. Update call sites from `MyWidget(foo: 'text')` to `MyWidget(foo: const Text('text'))`
4. Verify the widget still looks the same
5. Document the default text styles in the parameter documentation

## See also

- [avoid-stringly-typed](https://wellactually.dev/p/passsy/avoid-stringly-typed): For non-widget code, avoid using strings for identity/branching; prefer enums and typed APIs.
