# Extract Widgets Instead of _buildX() Methods

Extract UI sections into public widget classes instead of Widget _buildX() methods, so tests can find them by type and the tree stays easy to query.

Avoid `Widget _buildX() {}` methods inside widgets that return relevant UI sections or elements.
Instead, extract widgets into separate classes.

Extracted widgets make testing easier. Widget testing libraries like `package:spot` rely on identifiable widget hierarchies that are easy to query (`spot<ProfilePage>.spot<ProfileHeader>().spot<ProfileImage>()`). Private `_buildX()` methods create anonymous widget trees that are harder to test.

## Public vs Private Extracted Widgets

Prefer **public** extracted widgets (no underscore prefix) even when they are only used within a single file. Public widgets can be queried in tests using `spot<WidgetName>()`, while private widgets (`_WidgetName`) cannot be referenced from test files.

```dart
// Bad - private widget cannot be tested
class _Header extends StatelessWidget { ... }

// Good - public widget can be queried in tests
class Header extends StatelessWidget { ... }
```

If you're concerned about namespace pollution, consider placing related widgets in the same file as the parent widget. This keeps them co-located while still being testable.

## Presentation Widgets vs Coordinator Widgets

When extracting widgets, distinguish between two types:

**Presentation widgets** receive all data via constructor parameters and callbacks. They may access styling/theming and localizations from context (e.g., `Theme.of(context)`, `context.l10n`), but should not access services, models, or business logic. They should use primitives or generic Flutter types, not domain models.

**Coordinator widgets** read services from context and transform data into props for presentation widgets. They are typically page-level or section-level widgets.

Prefer presentation widgets by default. Only use context access for services when you have a legitimate coordinator widget.

```dart
// Bad
@override
Widget build(BuildContext context) {
  return Column(children: [
    _buildHeader(context),
    _buildButton(context),
  ]);
}

Widget _buildHeader(BuildContext context) {
  return Text(context.localizations.title);
}

Widget _buildButton(BuildContext context) {
  return ElevatedButton(
    onPressed: () => context.read<MyNotifier>().doSomething(),
    child: Text(context.localizations.buttonLabel),
  );
}
```

```dart
// Good
@override
Widget build(BuildContext context) {
  return Column(children: [
    Header(title: context.localizations.title),
    ActionButton(
      label: context.localizations.buttonLabel,
      onPressed: () => context.read<MyNotifier>().doSomething(),
    ),
  ]);
}

class Header extends StatelessWidget {
  const Header({required this.title, super.key});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(title, style: Theme.of(context).textTheme.headlineMedium);
  }
}

class ActionButton extends StatelessWidget {
  const ActionButton({
    required this.label,
    required this.onPressed,
    super.key,
  });
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(onPressed: onPressed, child: Text(label));
  }
}
```

## Related Resources

This pattern is based on well-established architectural patterns from the React and Angular communities:

- **Dan Abramov's Presentational and Container Components** (React)
  - [Original article](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)
  - Also known as "Smart/Dumb Components" pattern
  - Note: While hooks have evolved this pattern in React, the core principle of separating data access from presentation remains valuable in Flutter

- **Smart/Dumb Components in Flutter**
  - [Flutter Community article](https://medium.com/flutter-community/smart-dumb-components-in-flutter-a6606e3beb7d)
  - [Alternative link](https://efthymis.com/smart-dumb-components-in-flutter/)
  - Applies the presentational/container pattern specifically to Flutter

- **Container/Presentational Pattern**
  - [Patterns.dev comprehensive guide](https://www.patterns.dev/react/presentational-container-pattern/)
  - Explains benefits for testability, reusability, and separation of concerns

- **Angular Component Architecture**
  - [Angular University guide](https://blog.angular-university.io/angular-component-design-how-to-avoid-custom-event-bubbling-and-extraneous-properties-in-the-local-component-tree/)
  - Container vs Presentational Components patterns and pitfalls
