import { mentioned, onCommand, onPrompt } from "@wellactually/sdk/v3";

// A word trigger for the user's request. Not a language rule: a PR
// description reads the same above any diff.
//
// "pull request" and "pull requests" are both listed because a word trigger
// requires the whole word. "pullrequest" is deliberately absent, so the
// `pull_request:` workflow event does not pull the rule in.
onPrompt({
  *detect(event) {
    yield* mentioned(event, ["pr", "prs", "pull request", "pull requests"]);
  },
});

// The whole rule when the description is actually being written through
// `gh pr create`. `gh pr edit` is included because rewriting the body is the
// same act as writing it. Read-side subcommands (view, list, checks, diff)
// are not.
onCommand({
  *detect(event) {
    const match = /(?:^|[\n;&|()])\s*(gh\s+pr\s+(?:create|edit))\b/i.exec(event.command);
    if (match?.[1]) {
      yield { match: match[1] };
    }
  },
});
