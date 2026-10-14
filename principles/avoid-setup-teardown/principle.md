# Avoid `setUp()`/`tearDown()` in Tests

Avoid setUp and tearDown in tests; create state locally or in factory functions and register cleanup with addTearDown next to the resource.

`setUp()` and `tearDown()` hide test dependencies in callbacks that run outside the test body.
They usually force shared mutable fields so tests can communicate with those callbacks.
That makes tests harder to read, order-dependent failures harder to debug, and cleanup easy to forget when a single test needs extra resources.

Prefer local `final` variables, factory functions, and `addTearDown()` registered next to resource creation.
A test should show the state it uses and the cleanup it needs without scanning the whole file.

## Do

- Create objects inside the test when the setup is small.
- Use factory functions for repeated object construction.
- Register cleanup with `addTearDown()` immediately after creating a resource that must be disposed.
- Pass test-specific behavior into local fakes through constructors, fields, or override callbacks.

## Don't

- Store test state in top-level or group-level mutable variables just so `setUp()` can fill it.
- Reset shared variables in `tearDown()` to make tests pass in a specific order.
- Put cleanup far away from the resource it cleans up.
- Keep `setUp()` for "common setup" that only a few tests actually need.

## Good: setup function returns isolated state

```dart
Future<ProfileRepository> setupRepository({
  FakeProfileApi? api,
}) async {
  final resolvedApi = api ?? FakeProfileApi();
  final directory = await Directory.systemTemp.createTemp('profile_test_');
  addTearDown(() async {
    await directory.delete(recursive: true);
  });

  return ProfileRepository(
    api: resolvedApi,
    cache: FileProfileCache(directory),
  );
}

test('loads profile from the api', () async {
  final api = FakeProfileApi()
    ..profiles['user-1'] = Profile(id: 'user-1', name: 'Alex');
  final repository = await setupRepository(api: api);

  final profile = await repository.load('user-1');

  expect(profile.name, 'Alex');
});
```

The setup function creates fresh state and registers cleanup before returning the repository.
Each test passes only the collaborators it needs to customize.

## Bad: hidden shared state

```dart
late FakeProfileApi api;
late ProfileCache cache;
late ProfileRepository repository;

setUp(() {
  api = FakeProfileApi();
  cache = ProfileCache.memory();
  repository = ProfileRepository(api: api, cache: cache);
});

tearDown(() {
  cache.clear();
});

test('loads profile from the api', () async {
  api.profiles['user-1'] = Profile(id: 'user-1', name: 'Alex');

  final profile = await repository.load('user-1');

  expect(profile.name, 'Alex');
});
```

The test depends on mutable fields initialized elsewhere.
The cleanup is detached from the resource and may be wrong for the next test that changes the setup.
