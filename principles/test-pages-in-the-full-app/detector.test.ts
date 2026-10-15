import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

function harness(home: string): string {
  return source`
    import 'package:flutter_test/flutter_test.dart';

    void main() {
      testWidgets('saves', (tester) async {
        await tester.pumpWidget(const MaterialApp(home: HOME()));
        await tester.tap(find.byType(SaveButton));
      });
    }
  `.replace("HOME", home);
}

test("fires on an app wrapper around a page", () => {
  expect(detect(write("test/settings_page_test.dart", harness("SettingsPage")))).toEqual([
    { line: 5 },
  ]);
});

test("fires on an app wrapper around a *Screen too", () => {
  expect(detect(write("test/settings_screen_test.dart", harness("SettingsScreen")))).toEqual([
    { line: 5 },
  ]);
});

test("only points at the principle on an app wrapper around a leaf widget", () => {
  expect(detect(write("test/save_button_test.dart", harness("SaveButton")))).toEqual([
    { line: 5, match: "tester.pumpWidget", depth: "pointer" },
  ]);
});

test("points at the principle on a tester.pumpWidget in a widget test", () => {
  const code = source`
    void main() {
      testWidgets('shows the name', (tester) async {
        await tester.pumpWidget(const NameTag(name: 'Ada'));
      });
    }
  `;
  expect(detect(write("test/name_tag_test.dart", code))).toEqual([{ line: 3, match: "tester.pumpWidget", depth: "pointer" }]);
});

test("stays quiet on a tester.pumpWidget outside a widget test", () => {
  const code = "Future<void> pumpApp(WidgetTester tester) => tester.pumpWidget(const App());";
  expect(detect(write("test/helpers/pump_app.dart", code))).toEqual([]);
});

test("stays quiet on the app building its own pages", () => {
  expect(detect(write("lib/app.dart", "Widget build() {\n  return const MaterialApp(home: SettingsPage());\n}\n"))).toEqual([]);
});

test("stays quiet when the edit did not touch the wrapper", () => {
  expect(detect(edit("test/settings_page_test.dart", harness("SettingsPage"), { written: "    await tester.tap(find.byType(SaveButton));" }))).toEqual([]);
});

test("stays quiet when the agent only reads the test", () => {
  expect(detect(read("test/settings_page_test.dart", harness("SettingsPage")))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user asks for a widget test in a Dart project", () => {
  expect(detect(prompt("Write a widget test for the settings page"), dartApp)).toEqual([{ match: "widget test", depth: "pointer" }]);
});

test("points at the principle without a pubspec.yaml", () => {
  expect(detect(prompt("Write a widget test for the settings page"))).toEqual([{ match: "widget test", depth: "pointer" }]);
});
