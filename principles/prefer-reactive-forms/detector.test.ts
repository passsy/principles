import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const loginForm = source`
  class _LoginPageState extends State<LoginPage> {
    final _formKey = GlobalKey<FormState>();
    final _email = TextEditingController();

    @override
    Widget build(BuildContext context) {
      return Form(
        key: _formKey,
        child: TextFormField(controller: _email),
      );
    }
  }
`;

test("fires on hand-rolled form plumbing the agent writes", () => {
  expect(detect(write("lib/login_page.dart", loginForm))).toEqual([
    { line: 2 },
    { line: 3 },
    { line: 9 },
  ]);
});

test("stays quiet on a TextEditingController outside a form", () => {
  const search = source`
    class _SearchBarState extends State<SearchBar> {
      final _query = TextEditingController();
    }
  `;
  expect(detect(write("lib/search_bar.dart", search))).toEqual([]);
});

test("stays quiet in a file that already uses reactive_forms", () => {
  const code = "import 'package:reactive_forms/reactive_forms.dart';\n" + loginForm;
  expect(detect(write("lib/login_page.dart", code))).toEqual([]);
});

test("stays quiet on plumbing the edit did not touch", () => {
  expect(detect(edit("lib/login_page.dart", loginForm, { written: "      return Form(" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/login_page.dart", loginForm))).toEqual([]);
});

test("fires on flutter_form_builder added to the pubspec", () => {
  const pubspec = "name: demo\ndependencies:\n  flutter_form_builder: ^9.0.0\n  # flutter_form_builder: ^8.0.0\n";
  expect(detect(write("pubspec.yaml", pubspec))).toEqual([{ line: 3 }]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions forms in a Dart project", () => {
  expect(detect(prompt("Build the signup forms for the onboarding flow"), dartApp)).toEqual([{ match: "forms", depth: "pointer" }]);
});

test("stays quiet on the bare word form", () => {
  expect(detect(prompt("Return the result in the form of a list"), dartApp)).toEqual([]);
});

test("stays quiet outside a Dart project", () => {
  expect(detect(prompt("Build the signup forms for the onboarding flow"))).toEqual([]);
});
