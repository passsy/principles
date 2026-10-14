# PR Description Style Guidelines

Give a PR a verb-first title and a short description of the problem and the change, with examples or screenshots, and leave out fluff and test-plan lists.

## Preparation

- Gather information from the full commit messages and full diff
- Follow links (issues, documentation) to better understand the change

## Title Format

PR titles can be more descriptive than commit messages (no 50-char limit):

- Action-oriented: Start with a verb (Add, Fix, Improve, Remove, Allow, Detect)
- Concise but complete: Describe the change in a single, scannable line
- Specific: Name the exact component/feature affected
- Examples: "Fix too long filenames", "Add snapshotRenderBox(), snapshotState()", "Improve shorthand errors"

## Description Patterns by PR Type

### Bug Fixes

- Link to the issue being fixed (e.g., Fixes #121)
- Explain the root cause briefly
- Show before/after behavior when relevant

### Feature Additions

- Show code examples demonstrating the new API
- Use fenced code blocks with syntax highlighting
- Keep examples minimal but complete

### Error Message Improvements

- Show the old error message vs new error message side-by-side in code blocks
- Let the improvement speak for itself

### UI/UX Changes

- Include screenshots showing before/after states
- Annotate what the reader should notice

## Structure Preferences

- Short PRs: 1-2 sentences is fine ("Add snapshotRenderBox() and snapshotState()")
- Complex PRs: Use sections with `###` headings when covering multiple scenarios
- No fluff: Skip "This PR does..." intros, jump straight into what changed
- Reference issues: Always link related issues with Fixes #X or mention them

## Visual Aids

- ASCII diagrams for explaining widget hierarchies or relationships
- Screenshots for visual changes (before/after format)
- Code blocks for error messages, API examples, or terminal output

## What to Include

- The description is a birds-eye view on the change. Move the details into the documentation of the actual code, so that it is part of the source code.

Include (when useful):
- The problem (briefly, if not obvious from title)
- The solution (what you actually changed)
- Usage examples (for new APIs)
- Migration notes (for breaking changes)

## Length

Nobody reads a page long PR description.
Rule of thumb: aim for 100-200 words.

Code blocks, Tables, mermaid diagrams, images, videos are welcome and don't count towards the word count.

## What to Skip

- Obvious explanations ("This PR adds feature X" when title says "Add feature X")
- Implementation details unless they affect usage
- Lengthy justifications for simple changes
- "Verified", "Verification", or test-plan sections that list commands the author ran locally.
  CI checks already report whether tests, analysis, and linting passed.
  Only mention verification when it is unusual and helps the reviewer understand risk, such as a manual reproduction step, a non-CI environment, or a targeted command for a subtle bug.

## Checklist Style (for WIP/draft PRs)

- Use `- [ ]` checkboxes for remaining work
- Be specific about what's left to explore or verify
