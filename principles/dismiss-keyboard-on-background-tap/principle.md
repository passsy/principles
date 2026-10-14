# Dismiss the Keyboard by Tapping the Background

In Flutter mobile apps, tapping the background outside a text field must dismiss the keyboard by removing focus; check this for every field you add.

In a Flutter mobile app, focusing a text field must not leave the keyboard stuck on screen until the user submits or presses a system back button.
Tapping an empty area of the page outside the field must dismiss the keyboard by removing focus.
Apply this to `TextField`, `TextFormField`, and every custom or package widget whose name ends in `TextField` or `TextFormField`, including `CupertinoTextField` and `ReactiveTextField`.

When adding a field, check the behavior in its actual page, dialog, or bottom sheet.
A shared field widget or an ancestor may already provide dismissal; reuse that behavior rather than adding duplicate handlers.
The trigger identifies a field to check, not a confirmed violation.
This requirement concerns mobile apps; a desktop-only or web-only surface is outside its scope.

## Provide Explicit Touch Dismissal

Flutter's default `TextField.onTapOutside` behavior does not unfocus on mobile touch events.
Where the field exposes this callback, explicitly unfocus:

```dart
TextField(
  onTapOutside: (event) {
    FocusManager.instance.primaryFocus?.unfocus();
  },
)
```

For wrappers without this callback, implement dismissal in the shared field or the surrounding surface.
If using a background gesture handler, make empty background areas hit-testable and cover the usable surface, not just the form's occupied content.
Keep buttons, scrolling, selection, and moving focus between fields working normally.
Controls that belong to the active field, such as formatting buttons, can use `TextFieldTapRegion` to retain focus.
Do not put the entire page in that region, because its background would then count as inside the field.

A keyboard Done button, system Back handling, or dismissal on scroll alone does not satisfy background-tap dismissal.

## Verify the User Interaction

Focus the field, enter text, and tap empty background using touch input.
Verify that the keyboard closes, focus is removed, and the entered text remains.
Repeat for custom fields and any dialog or bottom sheet introduced by the change.
A desktop mouse click alone does not verify mobile touch behavior.

See Flutter's [onTapOutside documentation](https://api.flutter.dev/flutter/material/TextField/onTapOutside.html) and [TextFieldTapRegion documentation](https://api.flutter.dev/flutter/widgets/TextFieldTapRegion-class.html).
