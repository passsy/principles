# Call Screen Widgets *Page

Name a widget that a route pushes *Page in *_page.dart, never *Screen, because Flutter already calls a route's configuration a Page and a screen is hardware.

A destination is a page. The glass it happens to fill is the screen.

Do not call the widget for the login screen `LoginScreen`. Call it `LoginPage`,
in `login_page.dart`.

## Why

**Flutter already picked the word.** The framework hands you `Page`,
`MaterialPage`, `CupertinoPage`, `PageRoute`, `MaterialPageRoute`,
`PageRouteBuilder`, `Navigator.pages`, `pageBuilder` and `PageStorageKey`. A
[`Page`](https://api.flutter.dev/flutter/widgets/Page-class.html) *describes the
configuration of a route*, which is exactly the thing you are naming.
`MaterialPage(child: LoginPage())` speaks one vocabulary. The same line with
`LoginScreen` inside it speaks two.

**`Screen` is taken, and it means hardware.** Flutter's widgets library has no
`Screen` class. The nearest thing is `DisplayFeatureSubScreen`, where a
sub-screen is a region of the physical display, and the docs use *large screens*
for tablets, foldables and ChromeOS: devices, not destinations. `MediaQuery`
reports the app window rather than the device, so the word is already carrying
two meanings before anyone attaches it to a widget class.

**One screen can hold several pages.** The list-detail layout puts a list and a
detail side by side in a single window. A dialog or a bottom sheet carries a
destination without filling anything at all. `SettingsScreen` in the right pane
of a tablet layout is a name that has quietly become false; `SettingsPage` is
true wherever it is mounted.

**One word per concept.** A codebase split between `*Page` and `*Screen` makes
every grep half an answer, and starts every new file with a decision nobody
should have to make. What a page *is*, something a route pushes, providers
feed, and a navigator pops with a result, is defined in
[test_pages_in_the_full_app](https://wellactually.dev/p/passsy/test-pages-in-the-full-app).

## Rule

- A widget a route pushes is `*Page`, in `*_page.dart`, tested in
  `*_page_test.dart`.
- `Screen` stays available for what it means: `screenSize`, `isWideScreen`,
  screenshots, screen readers.
- A widget that is never pushed and never popped is not a page. Name a dialog
  `*Dialog`, a sheet `*Sheet`, and everything else after what it shows.
- Renaming an existing `*Screen` is its own commit. Do not smuggle it into an
  unrelated change, and do not let it block one.

## Good Examples

```dart
// login_page.dart
class LoginPage extends StatelessWidget { ... }

Navigator.of(context).push(
  MaterialPageRoute<Credentials>(builder: (_) => const LoginPage()),
);

// A pane in a list-detail layout is still a page, because it is still pushed
// on a narrow window.
Row(children: [ConversationListPage(), Expanded(child: ConversationPage(id: id))]);
```

## Bad Examples

```dart
// BAD: two vocabularies for one concept, in one expression
MaterialPageRoute(builder: (_) => const LoginScreen());
```

```dart
// BAD: a name that is only true on a phone
class SettingsScreen extends StatelessWidget { ... }
```

```dart
// BAD: a dialog is not a destination, and neither name fits
class DeleteAccountScreen extends StatelessWidget { ... } // -> DeleteAccountDialog
```

## The other conventions, and why not

Flutter's own cookbook says *screens and pages are called routes*, and names its
samples `FirstRoute` and `SecondRoute`. Some style guides give both words a job:
`Screen` owns the top-level chrome, `Page` is the primary content inside it.
Both are coherent, and neither is worth the tax: the second one makes you
classify a widget before you can name its file, and gets that judgement wrong in
review for years.

Pick one word. It is `Page`, because the framework's is.
