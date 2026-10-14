# Never Trigger Analytics From Build

Never send analytics events from a Flutter build() method, directly or through a helper, because rebuilds are not user events and produce duplicate counts.

A Flutter `build()` method renders the current state. It must not trigger analytics events, directly or through a forwarding method.

Flutter may call `build()` whenever an inherited dependency changes, an ancestor rebuilds, the screen rotates, or the framework otherwise needs a fresh widget tree. None of those rebuilds is a business event. Tracking from `build()` therefore produces duplicates whose count depends on rendering behavior rather than user behavior.

Observe the actual event at its source:

- Track taps in the button's callback.
- Track lifecycle milestones in `initState()`, `didChangeDependencies()`, or `didUpdateWidget()` when that lifecycle transition is the event.
- Subscribe to reactive state outside `build()` and dispose the subscription with the widget.
- Keep deduplication near the state transition when repeated identical updates are possible.

## Bad: rendering triggers the event

```dart
@override
Widget build(BuildContext context) {
  final connected = controller.isConnected.watch(context);
  _reportConnection(connected);
  return ConnectionStatus(isConnected: connected);
}

void _reportConnection(bool connected) {
  if (connected) {
    analytics.backpackConnected();
  }
}
```

The forwarding method does not make the side effect safer. `_reportConnection()` still runs every time Flutter renders this widget.

## Good: the state transition triggers the event

```dart
VoidCallback? _unsubscribe;

@override
void didChangeDependencies() {
  super.didChangeDependencies();
  _unsubscribe ??= controller.isConnected.subscribe((value) {
    if (value) {
      analytics.backpackConnected();
    }
  });
}

@override
void dispose() {
  _unsubscribe?.call();
  super.dispose();
}

@override
Widget build(BuildContext context) {
  final connected = controller.isConnected.watch(context);
  return ConnectionStatus(isConnected: connected);
}
```

## Event callbacks are not build side effects

Declaring a callback during `build()` is fine. Its body runs later, when the user acts:

```dart
@override
Widget build(BuildContext context) {
  return FilledButton(
    onPressed: () {
      analytics.confirmClicked();
      controller.confirm();
    },
    child: const Text('Confirm'),
  );
}
```

The distinction is execution time: constructing the callback is rendering; invoking it is the user event.

## Exceptions

There is no exception for analytics events that are deduplicated. A guard can reduce duplicates, but the event still depends on a render occurring and keeps rendering coupled to business behavior.
