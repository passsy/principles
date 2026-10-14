# Avoid Fallbacks That Mislead the User

Before writing a fallback, decide what the user sees when it triggers, and never let a substitute value pass for the real thing.

A fallback is code that runs when the intended path fails and hands back something else instead: a cached copy, a default, an empty list, the raw key instead of its translation.
Every fallback is a product decision about what a person sees when something is broken, made in the middle of an error handler.
Make that decision explicitly.

Before writing one, answer three questions:

1. **What does the user see when this triggers?**
   Not the type that comes back, the pixels on the screen.
2. **Could they tell?**
   A visible error state or a "last updated 3 hours ago" label is honest.
   Stale numbers rendered exactly like fresh ones are not.
3. **What would they do with it?**
   A wrong currency rate gets acted on.
   A missing translation gets shrugged at.

If the answer to the first question is "something that looks correct but is not", do not write the fallback.
Let the failure surface: throw, show an error state, or return the substitute in a shape the UI cannot mistake for the real thing.

## Why?

1. **A fallback hides the failure from everyone.**
   No exception, no crash report, nothing in the logs.
   The API has been down for a week and the dashboard is green, because every request "succeeded" with the snapshot from last Tuesday.
2. **Plausibly wrong is worse than visibly broken.**
   A user who sees an error retries or waits.
   A user who sees a number trusts it.
   Fallbacks turn outages into wrong decisions made with confidence.
3. **Fallbacks compound.**
   A stale cache feeding a default feeding a `?? 0` produces a screen full of numbers of which none is real, and no single line looks wrong.
4. **The fallback path is the least tested code in the app.**
   It runs only when something else is already broken, usually in production, usually at the worst time.

## How bad is it?

Judge a fallback by what it does to the person looking at the screen, not by how small the code is.

| Severity | What the user sees                         | Example                                                                                                          |
| -------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| minor    | Something ugly that is obviously not right | A missing translation renders its key, `checkout_title`, instead of a heading                                    |
| major    | Something that looks right and is wrong    | The currency API is unreachable, so prices are computed from a stale snapshot and shown as current               |
| critical | A different outcome                        | A permission check that cannot reach the server falls back to "allowed"; a payment retries with a guessed amount |

Minor ones are worth a log line and a follow-up.
Major ones are bugs to fix before merging.
Critical ones must not exist.

## Bad

The fallback that produces wrong numbers with a straight face:

```dart
Future<Rates> loadRates() async {
  try {
    return await api.fetchRates();
  } catch (e, stack) {
    log('rates unavailable, using snapshot', error: e, stackTrace: stack);
    return _lastSnapshot; // rendered like live rates, nobody can tell
  }
}
```

The same shape one level down, in a stream:

```ts
const rates$ = fetchRates().catch(() => cachedRates);
```

And the small one that leaks internals into the UI:

```dart
String translate(String key) => _strings[key] ?? key;
```

## Good

Let the failure reach the UI, which has an error state for exactly this:

```dart
Future<Rates> loadRates() async {
  try {
    return await api.fetchRates();
  } catch (e, stack) {
    log('rates unavailable', error: e, stackTrace: stack);
    rethrow;
  }
}
```

If showing old data is the right product call, make its age part of the value so the UI has to deal with it:

```dart
Future<Rates> loadRates() async {
  try {
    final fresh = await api.fetchRates();
    _snapshot = fresh;
    return fresh;
  } catch (e, stack) {
    log('rates unavailable, serving snapshot', error: e, stackTrace: stack);
    final snapshot = _snapshot;
    if (snapshot == null) {
      rethrow;
    }
    return snapshot.copyWith(stale: true); // the UI renders "as of 09:15" and greys the prices
  }
}
```

For translations, fall back to something a user can read, and make the missing key loud where developers look:

```dart
String translate(String key) {
  final text = _strings[key] ?? _baseLanguage[key];
  if (text == null) {
    assert(false, 'missing translation for $key');
    log('missing translation for $key');
    return _baseLanguage['untranslated']!;
  }
  return text;
}
```

## Honest fallbacks

Not every substitute is a lie.
These are fine, because the user either chose them or cannot mistake them for the real thing:

- A default the user or the config set (`theme ?? Theme.system`).
- Absence where absence is expected: `int.tryParse` returning `null`, `firstWhereOrNull`.
- An empty list from an empty result, as opposed to an empty list from a failed request.
- Offline mode that says it is offline.
- A retry, which is a fallback to the same path, not to a different answer.

The test is always the same: when this runs, does the person on the other side know something is wrong, or have they been told a comfortable untruth?
