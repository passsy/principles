# Document Widgets

Give the main widget of every widget file a dartdoc comment that says where it is used and what makes it unique, not a restatement of its name.

Every widget file should have dartdoc comments on the main widget explaining where and how it's used in the app.

## What to document

### Main widget (required)

The primary widget in a file (usually matching the filename) must have a dartdoc comment that includes:

1. **Where it's used** - which screens, flows, or parent widgets contain it
2. **What makes it unique** - key behavior, state, or purpose (if not obvious from the name)

```dart
// ✅ GOOD - Documents where it's used
/// Device list item shown on [DevicesPage] and [DevicePickerPage].
///
/// Displays device name, connection status, and assigned roles.
/// Tapping triggers [onTap] for selection or navigation.
class DeviceItem extends StatelessWidget {
```

```dart
// ✅ GOOD - Explains the flow context
/// Workout summary shown after completing or abandoning a [WorkoutSession].
///
/// Displays duration, average power, and offers to save or discard.
/// Navigate here via [WorkoutPlayerPage] stop button.
class WorkoutSummaryPage extends StatelessWidget {
```

```dart
// ❌ BAD - No context about where it's used
class DeviceItem extends StatelessWidget {
```

```dart
// ❌ BAD - Restates the obvious, no usage context
/// A widget that displays a device item.
class DeviceItem extends StatelessWidget {
```

### Internal widgets (optional)

Helper widgets only used within the same file don't need documentation:

```dart
/// Heart rate zone selector used on [WorkoutEditorPage].
///
/// Allows picking target HR zones for interval training.
class HeartRateZonePicker extends StatelessWidget {
  // ... main widget, documented
}

// Internal helper, no docs needed but is still recommended
class ZoneIndicator extends StatelessWidget {
  // ...
}

// Internal helper, no docs needed but is still recommended
class ZoneSlider extends StatelessWidget {
  // ...
}
```

### Shared internal widgets (document briefly)

If a private widget is complex or reused across multiple widgets in the file, a brief comment helps:

```dart
/// Animated indicator for the currently selected zone.
class ZoneIndicator extends StatelessWidget {
```

## What NOT to write

- Don't restate the class name: `/// A device item widget`
- Don't describe internal implementation details
- Don't write generic descriptions: `/// This widget displays...`
- Don't use "interface" for UI elements (use screen, page, section, panel)

## Quick checklist

- [ ] Main widget has dartdoc with `[ParentPage]` or `[ParentWidget]` references
- [ ] Purpose is clear if not obvious from the name
- [ ] Non-obvious behaviors documented (navigation, state changes, side effects)
- [ ] Internal helpers left undocumented (unless complex)
