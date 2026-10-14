# Test Pages in the Full App

Test a page by launching the app and navigating to it, not by wrapping it in its own MaterialApp, so routes, providers and results are tested for real.

A page is not a widget you can hold in your hand.
It is a destination: something a route pushes, providers feed, and a navigator pops with a result.
Wrapping it in a private `MaterialApp` and pumping it tests the page against a harness you wrote, not against the app that has to ship.

Test pages by launching the app and navigating to them.
Leaf widgets (a button, a chip, a painter) stay fine to pump on their own.

This applies to anything named `*Screen` too.
That name should become `*Page` ([name_page_widgets](https://wellactually.dev/p/passsy/name-page-widgets)), but the harness is the more expensive of the two mistakes, so do not wait for the rename to fix the test.

See [Full App Widget Testing in Flutter](https://www.nimblesite.co/blog/flutter_full_app_widget_testing/) for the long form of this argument.

## Why

The harness is a second implementation of your app, and it drifts.

- **The route is not exercised.** `fullscreenDialog`, `rootNavigator: true`, a redirect, a guard, a `ShellRoute`: none of it runs when the test pushes the page itself.
- **The result goes nowhere.** A page that pops with a value is only half a feature; the other half is the caller that receives it. A harness asserts its own `Future`, so a page that stops returning its result still passes.
- **The providers are invented.** The harness supplies the two the page needs today. The app supplies twenty, wired to each other, and a page that starts reading a third one fails in production, not in the test.
- **The entry point is unproven.** Nothing shows the button that opens the page actually opens it.

The failure mode is quiet: the test suite stays green while the wiring rots, because the harness and the app can disagree indefinitely.

## Do

- Launch the app and navigate to the page the way a user reaches it.
- Deep-link to the page's route when the navigation itself is covered elsewhere, and say so in a comment.
- Fake the hardware and the network, not the route.
- Assert what the *caller* received after the page pops, not only what the page did.
- Pump leaf widgets directly, with or without a `MaterialApp`; they have no route to speak of.

## Don't

- Build a `MaterialApp` around a page and drive it with taps.
- Recreate the app's providers in a test harness so a page can render.
- Push the page under test yourself with `Navigator.push` inside the test.
- Keep a page harness because the real route is inconvenient. That inconvenience is the coupling the test should be reporting.

## Robots make it bearable

Full app tests are worth writing on their own, and a robot layer makes them readable.
A robot is a plain object over the tester that names the app's actions, so a scenario reads as behaviour instead of taps and pumps.
It is optional, but once more than a couple of scenarios reach the same page, the shared vocabulary pays for itself.

```dart
class ContactFormRobot {
  const ContactFormRobot(this.robot);

  final NoaRobot robot;

  Future<void> tapScanButton() async {
    await act.tap(spot<ContactFormPage>().spot<ScanButton>());
    await robot.fastIdle();
  }
}
```

## Bad: the page in its own app

```dart
testWidgets('pops with the captured photo', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => ElevatedButton(
          onPressed: () {
            result = Navigator.of(context).push(
              MaterialPageRoute<CameraResult>(builder: (_) => const CameraPage()),
            );
          },
          child: const Text('open'),
        ),
      ),
    ),
  );

  await act.tap(spotText('open'));
  await tester.pumpAndSettle();
  await act.tap(spot<ShutterButton>());
  await tester.pumpAndSettle();

  expect(await result, isA<CameraCapture>());
});
```

The test pushes its own route, so `fullscreenDialog` and `rootNavigator` never run.
It asserts its own `result` future, so deleting the value from the page's `pop()` keeps it green.
And nothing here proves the app has a button that opens this page at all.

## Good: the page where it actually lives

```dart
robotTest('the shutter puts the capture into the contact form', (robot) async {
  final CameraRobot camera = await robot.openCameraFromContactForm();

  await camera.tapShutter();

  // The page popped itself and the form received the picture.
  camera.page.doesNotExist();
  robot.verifyFieldPrefilled(robot.l10n.contactNameHint, 'Max Mustermann');
});
```

Same page, same shutter, but the assertion now lives one layer out: what the contact form received.
Remove the value from the page's `pop()` and this test fails, which is the whole point.

## Leaf widgets are not pages

```dart
testWidgets('shows progress and ignores taps while capturing', (tester) async {
  await tester.pumpWidget(
    MaterialApp(home: Scaffold(body: ShutterButton(capturing: true, onTap: () => taps++))),
  );

  await act.tap(spot<ShutterButton>());

  expect(taps, 0);
});
```

A button rendered at two states has no route, no providers and no caller to disappoint.
Pump it directly and move on.
