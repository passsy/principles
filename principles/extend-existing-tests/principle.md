# Extend Existing Tests

Before creating a new test file or test helper class, check whether an existing one already covers that unit and extend it instead.

Before creating a new `_test.dart` file, check whether an existing test file already covers the same unit and the new cases belong there. Before writing a new class inside a test file, check whether a similar helper, fake, or robot already exists that could be reused or extended.

This is a nudge, not a ban. There are good reasons for a new file (a new unit under test, a different test flavor, a file that has grown unwieldy) and for a new class (genuinely new behavior to fake). But often there is no such reason, the new file or class exists only because nobody looked.

## Why

- **Scattered coverage**: Two test files for the same unit hide each other. The next person extends one and misses the other, or worse, duplicates cases across both.
- **Drifting helpers**: Every extra `FakeUserService` starts identical and drifts. Bug fixes and new behavior land in one copy; tests backed by the others quietly test stale assumptions.
- **Discovery is the convention**: `foo_test.dart` next to `foo.dart`'s test path is where everyone looks. A second file with a creative name (`foo_edge_cases_test.dart`, `foo_more_test.dart`) is invisible to that search.

## Before creating a new test file

1. Look for the conventional counterpart: `lib/src/foo.dart` → `test/src/foo_test.dart`. If it exists, add the new cases there, in a new `group(...)` when they form their own theme.
2. Search the test directory for other files importing the unit under test. Tests for a class sometimes live in a scenario-named file.
3. Only then create the file, and name it after the unit under test, not after the change or ticket.

Good reasons for a new file anyway:

- The unit under test is new and has no test file yet.
- A different test flavor with different setup cost (widget tests vs. unit tests of the same class).
- The existing file is so long that navigation suffers, and the split follows a stable theme.

## Before creating a new class in a test file

1. Search `test/` for existing fakes and helpers of the same type: `grep -r "class Fake" test/`, or search for the production type's name.
2. Prefer extending the existing fake with the override it is missing (see [fakes_overrides](https://wellactually.dev/p/passsy/fakes-overrides)) over writing a parallel one.
3. If a helper exists in another test file, promote it to a shared location (e.g. `test/helpers/`) instead of copying it.

A new class is right when it fakes a type nothing else fakes, or when its behavior contract genuinely differs from the existing fake, not when the existing one was simply not found.

```dart
// ❌ BAD - a second fake for the same service, created blind
class FakeAuthServiceForLogin implements AuthService {
  // 90% identical to FakeAuthService in auth_repository_test.dart
}

// ✅ GOOD - the existing fake, extended with the missing override
final auth = FakeAuthService(
  loginResponse: () => throw NetworkException(),
);
```
