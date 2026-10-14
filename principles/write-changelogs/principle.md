# Writing Changelogs

Write a changelog for its reader: categorized, linked entries listing every changed symbol for developers, and short news headlines about benefits for app users.

Changelogs serve different audiences. Write for your reader.

## Package Changelog (for developers)

Technical changelog for library/package consumers (CHANGELOG.md):

### Entry Format

Use **bold prefixes** to categorize entries:
- **Breaking**: Incompatible API changes
- **Deprecated**: Features being phased out
- **New**: Added functionality
- **Fix**: Bug corrections

### Best Practices

- **Reference issues/PRs**: Link for traceability `[#142](url)` or `(#142)`
- **Use backticks** for code: \`fetchUser()\`, \`UserService\`
- **Credit contributors**: `(thx @username)`
- **Include diff links**: `[diff v1.0.0...v1.1.0](url)` for detailed comparisons
- **Scale detail with importance**: Brief for small fixes, comprehensive for breaking changes
- **Code examples** for new APIs or migrations
- **Before/after** for breaking changes or improvements
- List all symbols that were added, removed, or changed (classes, functions, variables, etc.) to help package authors find relevant API changes and adjust their minimum constraints.

### Skip

- "Fixed CI", "Fixed linting", "Fixed tests" - internal details
- Dependency updates (unless user-facing impact)
- Refactoring without behavior change

### Methodology

- Visit all merged PRs and read the entire PR, including comments and discussions.
- Read the full diff of the merged commit
- Use tools like [dart_apitool](https://github.com/bmw-tech/dart_apitool) to analyze the API changes
- Think critically if API changes are breaking or not. e.g. a new method to a class can be breaking to consumers that use the implicit interface of the class (`class MyClass implements PackageClass`) even though adding a method usually is not considered breaking.

### Example

```markdown
## 2.0.0

- **Breaking** `fetchUser()` now returns `User?` instead of `User` - handle null case
- **Breaking** Removed deprecated `legacyApi()` - use `newApi()` instead [#98](url)
- **Deprecated** `oldMethod()` - use `newMethod()` instead, will be removed in 3.0.0
- **New** `UserService.batch()` for bulk operations [#103](url)
  ```dart
  final users = await userService.batch(['id1', 'id2']);
  ```
- **Fix** Memory leak when disposing `StreamController` [#142](url) (thx @contributor)

[diff v1.5.0...v2.0.0](url)
```

## App Changelog (for end users)

User-facing changelog for app stores or release notes:

- **Write every entry as a news headline** - see below
- **Focus on benefits**, not implementation
- **Use simple language** - no technical jargon
- **Group by user impact** - new features, improvements, fixes
- **Be brief** - users skim, not read
- **Skip internal changes** - refactors, dependency updates

```markdown
## What's New

- Dark mode - easier on your eyes at night
- Export data to PDF
- App loads 50% faster
- Fixed crash when uploading large photos
```

### Entries are news headlines

The default failure mode is minutes of what was done to the app: the subject is missing or trails behind the verb, so the reader unpacks every line before it says anything.

A headline puts the thing that acts in front and lets it act, in present tense.
Ask "who does what" and start with the who.

- **Actor first**: the screen, the flow, the button, the app - whatever the reader can point at
- **Present tense, active voice**: `lists`, `skips`, `disappears`, not `is listed`, `was skipped`, `has been removed`
- **No trailing period**: headlines do not carry them
- **Add no facts**: rearranging a line must not invent an actor the change never had

```markdown
Backpack contents listed directly on the backpack detail screen.        <- minutes
Backpack detail screen lists the contents directly                       <- headline

Download completion is reported by the backpack rather than the entry.  <- minutes
Backpack reports a finished download, the download entry no longer does  <- headline

Added the production Play Store upload, including the keystore.         <- minutes
Production Play Store takes the upload, keystore included                <- headline
```

Rewrite the whole file when you adopt this, not only the newest release.
Half a file in the old voice reads like two documents.

### A new feature has no "Changed" entries

Everything that happened to a feature inside the release that introduced it is part of **Added**.
There is no released version the reader could have known, so nothing changed for them.

Fold the detail into the Added entry or drop it, and never file it under **Changed** or **Fixed**.

```markdown
### Added
- Change-Wi-Fi flow guides the button hold: instructions, an mm:ss countdown and a hint to let go

### Changed
- The button hold shows the remaining time as an mm:ss counter    <- part of the feature above
- The hold instructions keep their position when the hint grows   <- fixes a bug nobody ever saw
```
