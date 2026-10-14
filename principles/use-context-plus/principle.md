# Use package:context_plus

Use package:context_plus to bind objects to widget scopes and watch them, instead of provider, riverpod, get_it or hand-written InheritedWidgets.

Prefer `package:context_plus` for state management and binding objects to widget scopes. It combines dependency injection with reactive observation.

## Core Concepts

**Ref<T>**: A reference to a value bound to a BuildContext. Declare refs as globals, file-private, or static class variables:

```dart
final _counterRef = Ref<ValueNotifier<int>>();
```

**context.use()**: Bind objects with automatic lifecycle management:

```dart
final counter = context.use(() => ValueNotifier(0), ref: _counterRef);
```

## Binding Values

```dart
// Eager binding - creates immediately
final counter = _counterRef.bind(context, () => ValueNotifier(0));

// Lazy binding - creates on first access
_counterRef.bindLazy(context, () => ExpensiveService());

// External value binding - for pre-created objects
_counterRef.bindValue(context, existingNotifier);
```

## Watching Values

```dart
// Full rebuild on change
final value = _counterRef.watch(context);

// Selective rebuild - only when selected value changes
final name = _userRef.watchOnly(context, (user) => user.name);

// Side effect without rebuild
_counterRef.watchEffect(context, (value) => analytics.log(value));
```

## Supported Observables

Built-in support for:
- `ValueNotifier`, `ChangeNotifier`, `Listenable`
- `Future`, `Stream`
- `AnimationController`, `ScrollController`, `TextEditingController`

## Why context_plus?

Prefer context_plus over provider, riverpod, or get_it:

- Automatic disposal tied to BuildContext lifecycle
- Multi-value observation with tuples
- `watchOnly` for fine-grained rebuilds
- `watchEffect` for side effects without rebuilds
- Cleaner ref pattern vs InheritedWidget boilerplate

Avoid riverpod and get_it - while popular, neither was designed primarily for state management. context_plus provides a cleaner, purpose-built solution.

Note: [lite_ref](https://pub.dev/packages/lite_ref) is a similar alternative with comparable features. Both are good choices, but context_plus syntax is preferred.

https://pub.dev/packages/context_plus
