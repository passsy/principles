# Branch Complete Widgets, Not Individual Properties

When one condition picks between UI variants, branch once and build one complete widget per variant instead of repeating the condition on every property.

When one condition selects between complete UI presentations, branch once and construct one complete widget per variant.
Do not repeat the same condition across the widget's icon, title, subtitle, actions, or other properties.

Keeping every property of a variant together makes the alternatives readable as units.
It also prevents a later change from updating one conditional property while accidentally leaving another on the wrong branch.

❌ **Avoid: branching every property**

```dart
SectionHeader(
  icon: isArchived
      ? const Icon(Icons.archive)
      : const Icon(Icons.inbox),
  title: isArchived
      ? Text(context.l10n.archivedTitle)
      : Text(context.l10n.inboxTitle),
  subtitle: isArchived
      ? Text(context.l10n.archivedHint)
      : UnreadCount(count: unread),
);
```

✅ **Prefer: branching the complete widget**

```dart
final header = () {
  if (!isArchived) {
    return SectionHeader(
      icon: const Icon(Icons.inbox),
      title: Text(context.l10n.inboxTitle),
      subtitle: UnreadCount(count: unread),
    );
  }

  return SectionHeader(
    icon: const Icon(Icons.archive),
    title: Text(context.l10n.archivedTitle),
    subtitle: Text(context.l10n.archivedHint),
  );
}();
```

The branch can live in an IIFE, a `Builder`, an extracted widget, or an existing function with early returns.
Keep stable wrappers and layout outside the branch when they apply equally to every variant.

## Exceptions

- If only one property varies, a conditional on that property is clearer than duplicating the widget.
- If properties vary independently, keep their conditions independent.
  A widget-level branch would hide the real combinations or require one branch for every permutation.
- Do not duplicate a large subtree only to obey this shape.
  Extract the stable parts or the variant widgets when that keeps both branches readable.
