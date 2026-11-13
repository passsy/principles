import { expect, test } from "vitest";
import { command, detect, prompt } from "@wellactually/sdk/v3/test";

test.each([
  { text: "open a pull request for this", word: "pull request" },
  { text: "I left comments on both pull requests", word: "pull requests" },
])("points at the principle on $text", ({ text, word }) => {
  expect(detect(prompt(text))).toEqual([{ match: word, depth: "pointer" }]);
});

test.each(["the job runs on pull_request", "can you write the PR description", "Adjust my write good pr descriptions principle", "check the review-requested-pull-requests automation", "run the pre-commit hook", "Prüfe das Wetter"])("stays quiet on %s", (text) => {
  expect(detect(prompt(text))).toEqual([]);
});

test.each([
  { line: 'gh pr create --title "Fix CI" --body "why"', match: "gh pr create" },
  { line: 'gh pr edit 166 --body "why"', match: "gh pr edit" },
])("fires in full on the command $line", ({ line, match }) => {
  expect(detect(command(line))).toEqual([{ match }]);
});

test.each(["gh pr view 166 --json state", "gh pr checks 166", "printf '%s\\n' 'gh pr create is the documented form'"])("stays quiet on the command %s", (line) => {
  expect(detect(command(line))).toEqual([]);
});
