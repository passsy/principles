import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const changelog = source`
  # Changelog

  ## 1.1.0

  - **New** \`UserService.batch()\` for bulk operations
`;

test.each(["CHANGELOG", "CHANGELOG.md", "CHANGELOG.txt", "changelog.md", "CHANGELOG.rst"])("fires when the agent writes %s", (name) => {
  expect(detect(write(name, changelog))).toEqual([{}]);
});

test("points at the file on an edit", () => {
  expect(detect(edit("packages/api/CHANGELOG.md", changelog, { written: "## 1.1.0\n\n- **New** `UserService.batch()` for bulk operations" }))).toEqual([{}]);
});

test("stays quiet on a file that merely contains the word", () => {
  expect(detect(write("MY_CHANGELOG.md", changelog))).toEqual([]);
});

test("stays quiet when the agent only reads the changelog", () => {
  expect(detect(read("CHANGELOG.md", changelog))).toEqual([]);
});

test("stays quiet when the user only mentions a changelog", () => {
  expect(detect(prompt("Please update CHANGELOG.md"))).toEqual([]);
});
