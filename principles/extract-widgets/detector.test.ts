import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const page = source`
  class ProfilePage extends StatelessWidget {
    @override
    Widget build(BuildContext context) {
      return Column(children: [_buildHeader(context)]);
    }

    Widget _buildHeader(BuildContext context) {
      return Text(context.l10n.title);
    }
  }
`;

test("fires on a _buildX method the agent writes", () => {
  expect(detect(write("lib/profile_page.dart", page))).toEqual([{ line: 7 }]);
});

test("stays quiet on a legacy _buildX method when the agent edits another line", () => {
  expect(detect(edit("lib/profile_page.dart", page, { written: "      return Text(context.l10n.title);" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/profile_page.dart", page))).toEqual([]);
});

test("stays quiet on extracted widgets", () => {
  const code = source`
    class ProfilePage extends StatelessWidget {
      @override
      Widget build(BuildContext context) {
        return Column(children: [Header(title: context.l10n.title)]);
      }
    }
  `;
  expect(detect(write("lib/profile_page.dart", code))).toEqual([]);
});

test("stays quiet in tests", () => {
  expect(detect(write("test/profile_page_test.dart", "Widget _buildApp() => const MaterialApp();"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions a build method in a Dart project", () => {
  expect(detect(prompt("Split the build method of the profile page, it is too long"), dartApp)).toEqual([{ match: "build method", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Split the build method of the profile page, it is too long"))).toEqual([]);
});
