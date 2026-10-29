# Principles

Pascal Welsch's principles for [Well Actually](https://wellactually.dev), and the packages their detectors share.

A principle is advice for a coding agent, with a detector that decides when the advice is relevant.
There are 82 of them here, 81 for Dart and Flutter and one for TypeScript.

## Layout

```text
principles/
  avoid-late/
    principle.md        the advice
    detector.ts         when it applies
    detector.test.ts    what the detector fires on, and what it stays quiet on
    package.json        the packages the detector imports
packages/
  dart-kit/             what the Dart detectors share
```

Every folder below `principles/` is one principle, named after the folder.
A detector imports the Well Actually SDK and, where it helps, `dart-kit`.
Each principle has a `package.json` that names what its detector imports.

## Work on a principle

```bash
npm install
```

```bash
npm test
```

```bash
npx vitest run principles/avoid-late
```

```bash
npm run typecheck
```

The tests build each principle and run its real detector in the sandbox Well Actually uses.

## How they reach the registry

The repository can be connected to the Well Actually registry, under My principles, Repositories.
The registry then reads it on every push: it builds and tests the principles whose files changed, or whose `dart-kit` changed, and stores each as a new version.

## dart-kit

`packages/dart-kit` answers the questions about Dart that more than one detector asks.

- `DART`, `DART_WITHOUT_TESTS`, `DART_LIB`, `DART_TESTS` and `PUBSPEC` say which files a detector looks at.
- `isDartProject(event)` keeps a prompt handler to Dart projects.
- `isComment(line)` and `dartCode(source)` tell code from comments and strings.
- `calls(line, names)` and `addsDependency(line, names)` find a call and a pubspec dependency by name.
- `buildMethodRanges(lines)` and `matchParen(line, open)` find where a build method and a parenthesis end.

It is TypeScript without a build step.
The detector build compiles it together with the detector.

## Licence

Principle texts: all rights reserved by Pascal Welsch. Detector code: MIT. Usable through Well Actually per its terms.
`packages/dart-kit` is MIT, see its `LICENSE`.
