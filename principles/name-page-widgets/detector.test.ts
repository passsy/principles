import { expect, test } from "vitest";
import { detect, edit, prompt, read, write } from "@wellactually/sdk/v3/test";

function widget(declaration: string): string {
  return ["/// The login screen.", declaration, "  const LoginScreen();", "}", ""].join("\n");
}

test.each([
  "class LoginScreen extends StatelessWidget {",
  "class LoginScreen extends ConsumerStatefulWidget {",
  "class LoginScreen extends HookConsumerWidget {",
  "class LoginScreen<T> extends StatelessWidget {",
  "class LoginScreen extends StatelessWidget with Diagnosticable {",
])("fires on %s", (declaration) => {
  expect(detect(write("lib/login_screen.dart", widget(declaration)))).toEqual([{ line: 2 }]);
});

test.each([
  "class ScreenMetrics {",
  "class LoginScreen extends ChangeNotifier {",
  "class ScreenSizeBuilder extends StatelessWidget {",
  "class LoginPage extends StatelessWidget {",
])("stays quiet on %s", (declaration) => {
  expect(detect(write("lib/login_screen.dart", widget(declaration)))).toEqual([]);
});

test("stays quiet on an existing *Screen the edit did not touch", () => {
  const content = widget("class LoginScreen extends StatelessWidget {");
  expect(detect(edit("lib/login_screen.dart", content, { written: "  const LoginScreen();" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/login_screen.dart", widget("class LoginScreen extends StatelessWidget {")))).toEqual([]);
});

test("stays quiet in a test file", () => {
  expect(detect(write("test/login_screen_test.dart", "class FakeScreen extends StatelessWidget {}"))).toEqual([]);
});

test("stays quiet on an ordinary sentence about a screen", () => {
  expect(detect(prompt("the login screen is too small on a phone"))).toEqual([]);
});
