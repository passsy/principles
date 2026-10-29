import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const widgetTest = source`
  import 'package:flutter_test/flutter_test.dart';

  void main() {
    testWidgets('saves the form', (tester) async {
      await tester.pumpWidget(const App());
      await tester.tap(find.byType(SaveButton));
      await tester.pump();
      expect(find.text('Saved'), findsOneWidget);
    });
  }
`;

test("fires on each Finder the agent writes in a widget test", () => {
  expect(detect(write("test/save_test.dart", widgetTest))).toEqual([
    { line: 6, match: "find.byType" },
    { line: 8, match: "find.text" },
  ]);
});

test("fires on a Finder nested in another call", () => {
  const code = source`
    void main() {
      testWidgets('shows the title', (tester) async {
        expect(tester.widget<Text>(find.byKey(const Key('title'))).data, 'Hi');
      });
    }
  `;
  expect(detect(write("test/title_test.dart", code))).toEqual([{ line: 3, match: "find.byKey" }]);
});

test("fires on an edit that adds a Finder", () => {
  expect(detect(edit("test/save_test.dart", widgetTest, { written: "      await tester.tap(find.byType(SaveButton));" }))).toEqual([
    { line: 6, match: "find.byType" },
  ]);
});

test("stays quiet when the edit did not touch a Finder", () => {
  expect(detect(edit("test/save_test.dart", widgetTest, { written: "      await tester.pump();" }))).toEqual([]);
});

test("stays quiet on spot", () => {
  const code = source`
    import 'package:spot/spot.dart';

    void main() {
      testWidgets('saves the form', (tester) async {
        await tester.pumpWidget(const App());
        await act.tap(spot<SaveButton>());
        spotText('Saved').existsOnce();
      });
    }
  `;
  expect(detect(write("test/save_test.dart", code))).toEqual([]);
});

test("stays quiet on find. in comments and strings", () => {
  const code = source`
    void main() {
      // Was find.byType(SaveButton) before spot.
      testWidgets('replaces find.text', (tester) async {
        await act.tap(spot<SaveButton>());
      });
    }
  `;
  expect(detect(write("test/save_test.dart", code))).toEqual([]);
});

test("stays quiet on other methods named find", () => {
  const code = source`
    void main() {
      testWidgets('loads the user', (tester) async {
        final user = repository.find.byId(1);
        final match = _find.byType(SaveButton);
      });
    }
  `;
  expect(detect(write("test/user_test.dart", code))).toEqual([]);
});

test("stays quiet on a test file without a widget test", () => {
  const code = "Finder saveButton() => find.byType(SaveButton);\n";
  expect(detect(write("test/helpers/finders.dart", code))).toEqual([]);
});

test("stays quiet outside of tests", () => {
  const code = source`
    void main() {
      testWidgets('saves', (tester) async {
        await tester.tap(find.byType(SaveButton));
      });
    }
  `;
  expect(detect(write("lib/save.dart", code))).toEqual([]);
});

test("stays quiet when the agent only reads the test", () => {
  expect(detect(read("test/save_test.dart", widgetTest))).toEqual([]);
});
