# Use spot Instead of Finders

In Flutter widget tests, select widgets with spot (`spot<SaveButton>()`, `spotText('Saved')`) instead of `find.byType` and `find.text`, for readable chains and clear failures.

`find.byType`, `find.text` and `find.byKey` describe one widget each, and every relation between them is another nested `find.descendant`.
[spot](https://pub.dev/packages/spot) describes the same lookup as a chain that reads like the widget tree, and checks it with an assertion that says what it found when it fails.

Spot ships an agent skill, [spot-testing](https://github.com/passsy/spot/tree/main/skills/spot-testing), with the selectors, assertions, interactions and debugging steps in detail.
Install it or read it before converting a test.

## Why

- **Chains read like the tree.**
  `spot<ProfilePage>().spot<SaveButton>()` replaces `find.descendant(of: find.byType(ProfilePage), matching: find.byType(SaveButton))`.
- **Failures explain themselves.**
  When `spotText('Saved').existsOnce()` fails, spot prints the widgets it did find along the chain.
  `expect(find.text('Saved'), findsOneWidget)` only says it found zero.
- **Taps are checked.**
  `act.tap` refuses a widget that is covered, outside the viewport or not hit testable, where `tester.tap` taps the coordinates and passes.
- **Properties are typed.**
  `spotText('Dash').hasFontSize(14)` replaces digging the widget out with `tester.widget<Text>(find.text('Dash'))`.
- **Failed tests leave a timeline.**
  spot writes an HTML timeline with a screenshot of every step, which a `find` lookup knows nothing about.

## Do

- Add `spot` as a dev dependency and import `package:spot/spot.dart`.
- Select by type with `spot<SaveButton>()`, by text with `spotText('Saved')`, by icon with `spotIcon(Icons.add)`.
- Narrow with a chain, `spot<AlertDialog>().spotText('Delete')`, instead of `find.descendant`.
- Narrow duplicates by a meaningful parent or child, not with `.first()`.
- Assert on the selector with `.existsOnce()`, `.doesNotExist()` or `.existsAtLeastOnce()`.
- Interact with `act.tap(...)` and `act.enterText(...)`.

## Don't

- Write a new `find.byType`, `find.text`, `find.byKey` or `find.descendant` in a widget test.
- Pair a selector with `findsOneWidget` or `findsNothing`, spot has its own assertions.
- Mix both styles in one test.
  When you edit a test that still uses `find`, convert the lookups you touch.

## Bad

```dart
testWidgets('deletes the contact', (tester) async {
  await tester.pumpWidget(const App());

  await tester.tap(find.byIcon(Icons.delete));
  await tester.pumpAndSettle();

  expect(
    find.descendant(of: find.byType(AlertDialog), matching: find.text('Delete?')),
    findsOneWidget,
  );
  await tester.tap(find.widgetWithText(TextButton, 'Delete'));
  await tester.pumpAndSettle();

  expect(find.byType(ContactTile), findsNothing);
});
```

## Good

```dart
testWidgets('deletes the contact', (tester) async {
  await tester.pumpWidget(const App());

  await act.tap(spotIcon(Icons.delete));
  await tester.pumpAndSettle();

  final dialog = spot<AlertDialog>();
  dialog.spotText('Delete?').existsOnce();
  await act.tap(dialog.spot<TextButton>(children: [spotText('Delete')]));
  await tester.pumpAndSettle();

  spot<ContactTile>().doesNotExist();
});
```
