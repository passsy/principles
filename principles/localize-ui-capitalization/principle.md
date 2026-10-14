# Localize UI Capitalization

Put the final casing of user-visible text in the localization resource instead of calling toUpperCase() on it, because Dart's casing is wrong for some languages.

These runtime transformations do not reliably produce the intended UI text:

```dart
Text(context.l10n.finish.toUpperCase())
// Turkish "bitir" becomes "BITIR", but the correct uppercase is "BİTİR".

Text(context.l10n.street.toUpperCase())
// German "Straße" becomes "STRASSE": one character expands to two.
```

Dart's `String.toUpperCase()` uses a language-independent Unicode mapping and explicitly only works correctly for some languages. Do not apply it to localized, user-visible text in buttons, tabs, headings, labels, tooltips, or other UI elements. Put the final presentation casing in the localization resource.

If the UI needs both normal and uppercase variants, create two localized keys:

```json
{
  "save": "Save",
  "save_uppercase": "SAVE"
}
```

```dart
Text(context.l10n.save)
Text(context.l10n.saveUppercase)
```

Each locale can then translate both variants correctly or choose a different convention.

## The instinct is reasonable

Other UI technologies expose presentation-layer casing. CSS, for example, provides `text-transform: uppercase` and applies language-specific rules when the content language is known. Reaching for an equivalent in Flutter is understandable, but Dart's `toUpperCase()` is not that equivalent, and localization-owned casing gives translators control.

## Exceptions

- Dynamic user or server data cannot be moved into a localization file. If casing it is an explicit product requirement, use a locale-aware implementation with the locale of the text and test supported languages with special casing.
- Case operations for non-display data such as protocol constants, identifiers, enum parsing, or explicitly invariant normalization are outside this rule.
- Generated localization code is outside this rule. Change its source localization resource and regenerate it.

## References

Normative and framework documentation:

- [Dart `String.toUpperCase()`](https://api.dart.dev/dart-core/String/toUpperCase.html)
- [Unicode Special Casing](https://www.unicode.org/Public/UCD/latest/ucd/SpecialCasing.txt)
- [ICU case mappings](https://unicode-org.github.io/icu/userguide/transforms/casemappings.html)
- [Flutter internationalization](https://docs.flutter.dev/ui/internationalization)
- [Flutter `DefaultTextStyle`](https://api.flutter.dev/flutter/widgets/DefaultTextStyle-class.html)
- [Flutter `TextCapitalization`](https://api.flutter.dev/flutter/services/TextCapitalization.html)
- [CSS Text `text-transform`](https://www.w3.org/TR/css-text-3/#text-transform-property)

Further reading on the Turkish I problem:

- [The Turkish İ Problem and Why You Should Care](https://haacked.com/archive/2012/07/05/turkish-i-problem-and-why-you-should-care.aspx/)
- [The infamous Turkish locale bug](https://mattryall.net/blog/the-infamous-turkish-locale-bug)
- [Problematic Case Conversion in Turkish](https://www.gamedeveloper.com/business/problematic-case-conversion-in-turkish), by the IGDA Localization SIG
