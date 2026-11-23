import { mentioned, onCommand, onPrompt, onTool } from "@wellactually/detector-sdk/v5";

// A word trigger for the user's request. Not a language rule: a PR
// description reads the same above any diff.
//
// "pull request" and "pull requests" are both listed because a word trigger
// requires the whole word. "pullrequest" is deliberately absent, so the
// `pull_request:` workflow event does not pull the rule in. "PR" is absent
// too: it turns up in automation prompts and passing mentions far more often
// than when a description is being written, and `gh pr create` covers that.
onPrompt({
  *detect(event) {
    yield* mentioned(event, ["pull request", "pull requests"]);
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

// The same act through an MCP tool: T3 Code's pull_request_create and
// pull_request_update, and the GitHub MCP server's create_pull_request and
// update_pull_request. Judged by the tool, not the server, whose name the
// user picks. An update fires only when it sets the title or the body, not
// when it only changes reviewers, labels or the state.
const CREATES = ["pull_request_create", "create_pull_request"];
const UPDATES = ["pull_request_update", "update_pull_request"];

onTool({
  *detect(event) {
    if (CREATES.includes(event.tool)) {
      yield {};
    }
    if (UPDATES.includes(event.tool) && ("title" in event.input || "body" in event.input)) {
      yield {};
    }
  },
});
