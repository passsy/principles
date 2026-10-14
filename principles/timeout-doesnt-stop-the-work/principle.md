# A Timeout Doesn't Stop the Work

Racing a timer against a future does not cancel the loser, which keeps its socket or connection; cancel at the source with a real primitive.

Racing a future against `setTimeout` / `Future.delayed` / `time.After` does **not** cancel the slow operation. The wrapper resolves; the loser keeps going to completion. Its socket reads finish, its DB query lands, its file handle stays open, its retries fire. You see neither the result nor the error, but the work, the side effects, and the resources are still alive in the background.

This is a cross-language footgun. JS `Promise.race`, Dart `Future.any`, Python `asyncio.wait`, Kotlin `select`, Rust `futures::select!`, none of them propagate cancellation to the losing branch. They only pick a winner.

## Why this matters

1. **Resource leaks.** A "timed-out" DB query holds its connection until the server actually replies. A "timed-out" HTTP request keeps the socket open. Repeat under load → pool exhaustion → real outage.
2. **Phantom writes.** A POST you gave up on still arrives at the server seconds later. The retry you fired in the meantime now collides with the "cancelled" one.
3. **Unhandled rejections.** When the loser eventually rejects, nobody is listening, most runtimes log this loudly (`UnhandledPromiseRejection`, "Future error not caught") and some terminate the process.
4. **Wrong diagnostics.** Your timeout log says `failed after 5000ms`, the request log says `succeeded after 30000ms`. Both are true; the system is misbehaving for reasons your traces cannot explain.

## Use a real cancellation primitive

Every mature ecosystem ships one. Pass it through; don't reinvent it with `race`.

### JS / TypeScript: `AbortController`

`fetch`, `Request`, `setTimeout`, `EventTarget.addEventListener`, Node's `fs/promises`, `node:net`, `undici`, `pg` (v8.13+ via `AbortSignal`), and most modern libraries accept an `AbortSignal`. Honour it.

❌

```ts
async function fetchWithTimeout(url: string, ms: number) {
  return Promise.race([
    fetch(url),                                  // keeps running
    new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))
  ])
}
```

✅

```ts
async function fetchWithTimeout(url: string, ms: number) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(new Error('timeout')), ms)
  try {
    return await fetch(url, { signal: ac.signal }) // socket actually closes
  } finally {
    clearTimeout(t)
  }
}
```

For raw promises with no `signal` parameter, also use `AbortSignal.timeout(ms)` (Node 17.3+, browsers) and propagate it. Or `Promise.any([promise, abortable(signal)])` only when you *also* free the resources the loser holds.

### Node-side DB / RPC clients: native query timeouts

When the library exposes a server-side cancel (`query_timeout`, `statement_timeout`, gRPC `Deadline`, HTTP client `Timeout`), prefer it. It tells the **server** to stop, releases the connection, and surfaces a real error.

❌

```ts
await Promise.race([
  pool.query('select 1'),
  new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000))
])
```

✅

```ts
const client = new Client({
  connectionString,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
  statement_timeout: 5000
})
try {
  await client.connect()
  await client.query('select 1')
} finally {
  await client.end()
}
```

### Dart: there is no `Future` cancellation, only `Completer` teardown

`Future` is a value, not a task. You cannot cancel one. `Future.any` and `Future.timeout` race; the loser runs to completion. `CancelableOperation` from `package:async` does **not** fix this, it is itself a `Future` wrapper. Its `onCancel` is a callback hook; if the wrapped future has no way to be torn down, the hook has nothing to do. Wrapping a leak in a `CancelableOperation` is still a leak.

Real cancellation in Dart always comes from the **source that completes the `Completer`**. To cancel, you reach into that source and stop it: close the socket, cancel the subscription, abort the request, kill the isolate. Whatever was about to call `completer.complete(value)` now never does, and the future stays pending forever (which is fine, you've moved on and nobody is listening).

❌

```dart
// CancelableOperation around an uncancellable Future, still leaks.
final op = CancelableOperation.fromFuture(http.get(url));
Timer(Duration(seconds: 5), op.cancel);
return op.value;  // op.cancel() returns; the GET keeps running.
```

✅ close the source that feeds the `Completer`:

```dart
// http.Client.close() actually severs the in-flight socket.
final client = http.Client();
final timer = Timer(Duration(seconds: 5), client.close);
try {
  return await client.get(url);
} finally {
  timer.cancel();
  client.close();
}
```

✅ for a `Stream`-based source, `subscription.cancel()` is the teardown:

```dart
Future<T> firstOrTimeout<T>(Stream<T> source, Duration limit) {
  final completer = Completer<T>();
  late StreamSubscription<T> sub;

  final timer = Timer(limit, () {
    sub.cancel();                              // real teardown
    if (!completer.isCompleted) completer.completeError(TimeoutException(null, limit));
  });

  sub = source.listen((event) {
    timer.cancel();
    sub.cancel();
    if (!completer.isCompleted) completer.complete(event);
  }, onError: completer.completeError);

  return completer.future;
}
```

✅ when you control the producer, expose a cancellation hook (a flag, an `AbortController`-equivalent, or accept a `CancelableOperation`) and check it between awaits:

```dart
class _Cancelled implements Exception {}
class CancelToken { bool _cancelled = false; void cancel() => _cancelled = true; bool get isCancelled => _cancelled; }

Future<User> fetchUser(String id, {required CancelToken token}) async {
  final raw = await db.find(id);
  if (token.isCancelled) throw _Cancelled();    // every await is a cancellation point
  final enriched = await api.enrich(raw);
  if (token.isCancelled) throw _Cancelled();
  return enriched;
}
```

For HTTP specifically, `package:dio`'s `CancelToken` closes the underlying socket, that's a real cancellation, use it. For plain `package:http`, `Client.close()` aborts every in-flight request on that client. For isolates, `Isolate.kill(priority: Isolate.immediate)` is the hammer.

### Kotlin: structured concurrency

`withTimeout`/`withTimeoutOrNull` cancel the coroutine; cancellation propagates through `coroutineContext.job`. Don't race manually.

❌

```kotlin
select<String> {
  async { fetchUser(id) }.onAwait { it }
  async { delay(5000); "timeout" }.onAwait { it }
}
```

✅

```kotlin
withTimeout(5_000) {
  fetchUser(id)             // cancellation actually unwinds the coroutine
}
```

### Go: `context.Context`

Pass a deadline-bound context. Every well-behaved API in the standard library and most third-party libraries take one.

❌

```go
ch := make(chan Result, 1)
go func() { ch <- fetchUser(id) }()
select {
case r := <-ch: return r
case <-time.After(5 * time.Second): return Result{Err: errors.New("timeout")}
// the goroutine and its DB query keep going
}
```

✅

```go
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel()
return fetchUserCtx(ctx, id)                 // the query is cancelled server-side
```

### Python: `asyncio.timeout` (3.11+) / `wait_for`

Both cancel the awaited coroutine, not just the wrapper.

✅

```python
async with asyncio.timeout(5):
    return await fetch_user(id)
```

## When you genuinely can't cancel

Sometimes the library gives you no hook (third-party CPU-bound code, a black-box callback, a sync FFI call). In that case:

1. Move the uncancellable work behind an isolate / worker / subprocess you *can* kill.
2. If you absolutely must race, document the leak (`// LEAK: pg.query keeps running; pool may stall under load`) and bound the damage (rate limit, circuit-break, separate dedicated pool).
3. Never silently rely on the loser being "probably fast enough".

## When you *want* the work to finish: cache warm-ups

The rule above assumes the loser running on is a *bug*. Sometimes it is the *point*. A cache warm-up is the canonical case: you fire a fetch early (during app start, route preload, idle prefetch) only so a later reader gets a hit. You race it against a timeout so the *caller*, a splash screen, a route transition, isn't held hostage by a slow network. But you do **not** want to cancel the fetch: whenever it lands, it correctly populates the cache, and the next reader benefits. Cancelling would throw away useful, already-paid-for work.

Here the timeout legitimately only bounds *the wait*, not *the work*. Walk the four harms and confirm none apply:

1. **Resource leaks**: one bounded background request, not a per-call leak that compounds under load. Fine. (Still give the underlying client a real timeout so a *dead* connection can't hang forever, bound the work's worst case even though you don't cancel it.)
2. **Phantom writes**: a warm-up is a read. It has no side effect other than filling a cache. Fine.
3. **Unhandled rejections**: still real. The loser can still fail after the timeout, so it still needs a `.catchError` / `try`. Don't skip this.
4. **Wrong diagnostics**: expected and benign here: "warm-up timed out, fetch completed later" is the designed behaviour, not a mystery.

The trap is the *destination*. A warm-up that lands in a plain, idempotent cache (`map[key] = value`, last-write-wins) is safe, because a late write is just a correct write. A warm-up that lands in a one-shot, consume-once, or "clear after read" structure is **not**: the late write races the reader and can repopulate state the reader already drained, resurrecting data the user never waited for. That is a phantom write wearing a cache costume. If the work will outlive the timeout, its result must land somewhere a late, out-of-order write is always correct.

✅ race the *wait*, let the *work* finish, land it in a plain cache:

```dart
// getActivities() caches into a plain TTL map; a late write is just a
// correct write. Warm-up bounds only how long the splash waits.
Future<void> warmActivitiesCache(VekoloApiClient api) async {
  try {
    await api.activities();          // keeps running past the timeout, wanted
  } catch (e, s) {
    log.warning('warm-up failed; reader will fetch normally', error: e, stackTrace: s);
  }
}

// caller bounds its own wait, not the work:
await warmActivitiesCache(api).timeout(
  const Duration(seconds: 3),
  onTimeout: () {},                  // proceed; the fetch fills the cache later
);
```

❌ the same warm-up landing in a consume-once mailbox:

```dart
// preload() fetches, then a screen calls consume() which returns and CLEARS.
// If the fetch finishes after consume() ran, it repopulates a drained cache , 
// a later navigation reads data from a preload nobody waited for.
service.preload().timeout(timeout);  // loser keeps running → phantom write
```

## Quick checklist before merging a `Promise.race` / `Future.any` / `select`

- [ ] Does the loser have side effects (network, DB, file, timer)?
- [ ] Does the library it calls accept an `AbortSignal` / `Context` / `CancelToken`?
- [ ] If so, use it instead.
- [ ] If not, am I OK with the loser running to completion? Documented?
- [ ] Is this a warm-up where the loser *should* finish? Then confirm it lands in a plain idempotent cache (not a consume-once structure), still has error handling, and the underlying client has its own timeout.
