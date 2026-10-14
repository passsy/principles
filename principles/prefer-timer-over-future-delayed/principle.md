# Prefer Timer over Future.delayed in widgets

In widgets and other classes with dispose(), delay work with a Timer you cancel in dispose(), because Future.delayed cannot be cancelled.

## Why

`Future.delayed` cannot be cancelled. If a widget is disposed before the delay completes, the callback still fires, potentially calling `setState` on an unmounted widget or accessing disposed resources.

`Timer` can be cancelled in `dispose()`, preventing these issues.

## Rule

- In `StatefulWidget` (or any class with a lifecycle/dispose): use `Timer` for delayed operations
- Cancel the timer in `dispose()`
- `Future.delayed` is fine in pure Dart code without widget lifecycle (tests, services, CLI tools)

## Good Examples

```dart
class _MyWidgetState extends State<MyWidget> {
  Timer? _delayTimer;

  void _startDelayed() {
    _delayTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _showContent = true);
      }
    });
  }

  @override
  void dispose() {
    _delayTimer?.cancel();
    super.dispose();
  }
}
```

```dart
// In a service with dispose, also use Timer
class MyService {
  Timer? _retryTimer;

  void scheduleRetry(Duration delay) {
    _retryTimer = Timer(delay, _retry);
  }

  void dispose() {
    _retryTimer?.cancel();
  }
}
```

## Bad Examples

```dart
// BAD: Future.delayed in a widget, cannot cancel on dispose
class _MyWidgetState extends State<MyWidget> {
  void _startDelayed() {
    Future.delayed(const Duration(seconds: 3), () {
      setState(() => _showContent = true); // May fire after dispose!
    });
  }
}
```

```dart
// BAD: Future<void>.delayed, unnecessarily verbose type parameter
Future<void>.delayed(const Duration(seconds: 5)).then((_) {
  doSomething();
});
// Use Future.delayed (without <void>) or better yet, Timer
```
