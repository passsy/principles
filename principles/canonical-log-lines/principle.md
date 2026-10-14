# Canonical Log Lines

Carry one context object through a request and emit a single wide log line when it ends, instead of scattering log calls that need a join.

A request that logs eight times tells its story in eight places.
To read it back you have to find the other seven, which means every line needs an id to join on, every reader needs to know the join, and the store has to keep all eight so the join stays possible.

Log once instead.
Create a context object at the entry point, let every layer add what it learned, and emit one wide structured line when the request ends, succeeded or failed.

1. **Create the context at the boundary.**
   Server middleware, job runner, message consumer, whatever owns "one unit of work".
   Not at the log call, not lazily on first use.
2. **Layers add fields, layers do not log.**
   Auth adds `user_id` and `auth_type`, the router adds `route`, the DB layer adds `db_queries` and `db_ms`.
   None of them emit anything.
3. **One emitter logs once, at the end, always.**
   On success and on failure, with `duration_ms` and an explicit outcome field.
   The happy path is what makes the line queryable; a line that appears only on errors is a crash report, not a log.
4. **An error joins the line, it does not start a new one.**
   The error handler attaches `error`, `error_type` and the stack trace to the context that is already there, then lets the same emitter fire.

One line answers questions no fragment can: *which slow requests were also cache misses for paying customers on the new code path*.
That is a filter over one row, not a join across eight.

## Why?

1. **Fragments need a join; a row needs a filter.**
   Correlating by `request_id` works only if every line carries it, every line survived retention, and the reader knows to ask.
   One line per request needs none of that, and costs a fraction of eight lines of repeated metadata.
2. **The interesting questions are about combinations of fields.**
   "Slow *and* authenticated by API key *and* hitting the read replica" is answerable only if those facts sit on the same record.
   Split across lines, that query is a self-join nobody writes at 3am.
3. **Threading an id through every log call is manual work that rots.**
   Someone always forgets it in the one code path that turns out to matter.
   A context created once at the boundary cannot be forgotten halfway down.
4. **One row is also a metric.**
   Count, group and take percentiles over the canonical line and you have your dashboards, without a second pipeline that can disagree with the logs.

## The shape

❌ the story in fragments

```ts
export async function handleCharge(req: Request) {
  log.info('charge requested', { requestId: req.id, path: req.url })
  const user = await authenticate(req)
  log.info('authenticated', { requestId: req.id, userId: user.id })
  const card = await loadCard(user)
  try {
    return await gateway.charge(card, req.amount)
  } catch (e) {
    log.error('charge failed', { requestId: req.id, error: e })  // no user, no card
    throw e
  }
}
```

Every call repeats `requestId` by hand, the failure line has lost everything the earlier lines knew, and reading one request means grepping and re-sorting.

✅ one context, one line

```ts
const store = new AsyncLocalStorage<LogContext>()
export const logContext = () => store.getStore()

export async function canonicalLog(req: Request, next: () => Promise<Response>) {
  const ctx: LogContext = { request_id: req.id, method: req.method, path: req.url }
  const started = performance.now()
  try {
    return await store.run(ctx, next)
  } catch (error) {
    ctx.error = String(error)
    ctx.error_type = error?.constructor?.name
    ctx.stack = error instanceof Error ? error.stack : undefined
    throw error
  } finally {
    ctx.duration_ms = Math.round(performance.now() - started)
    ctx.outcome = ctx.error ? 'error' : 'ok'
    log.info('canonical', ctx)          // exactly once, success and failure
  }
}

export async function handleCharge(req: Request) {
  const ctx = logContext()
  const user = await authenticate(req)
  ctx.user_id = user.id
  ctx.auth_type = user.authType
  const card = await loadCard(user)
  ctx.card_last4 = card.last4
  return await gateway.charge(card, req.amount)
}
```

The failure now carries `user_id`, `auth_type`, `card_last4`, `duration_ms` and the stack, because they were on the context before the throw.

## Where the context lives

Always the same mechanism: something implicit and request-scoped that a nested call reaches without every signature growing a parameter.

| | |
| --- | --- |
| Node / TS | `AsyncLocalStorage` |
| Dart server | a Zone-scoped context object; `chirp` stays the sink (see [logging](https://wellactually.dev/p/passsy/logging)) |
| JVM | `MDC` (SLF4J/Logback), or a request-scoped bean |
| Go | a struct on the `context.Context` you already pass |
| OpenTelemetry | a span and `span.SetAttributes`: a span *is* a canonical log line with a parent and a clock |

Prefer the ecosystem's own mechanism.
When the service already emits spans, put the fields on the span rather than inventing a second carrier beside it.

## Buffering detail, flushed on error

The canonical line is the summary.
Some requests also want the trace: every query, every retry, every branch taken.
Emitting that always is unaffordable; losing it on the request that failed is what makes production debugging miserable.

So buffer it on the same context, discard it when the request succeeds, and emit it when it fails.
.NET ships this as [log buffering](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/log-buffering), AWS Powertools for Lambda buffers `DEBUG`/`INFO` and flushes on error, error reporters call it *breadcrumbs*, and tracing calls it tail-based sampling.

Keep the two separate, and bound the buffer: a runaway loop should not turn a failed request into an out-of-memory one.

## Field discipline

- **Flat, snake_case, stable names.** `db_ms`, not `timings.db.duration`. Field names are an interface; renaming one breaks every saved query and alert built on it.
- **Values, not sentences.** `outcome=rate_limited`, not `message="user was rate limited after 3 attempts"`. Sentences are not groupable.
- **No secrets, no PII, no request bodies.** The line is high-volume and widely readable; treat it as a public surface.
- **Cardinality is fine, unbounded strings are not.** `user_id` is a good field. A raw SQL string or a stack trace as a *dimension* is not; attach it as a payload, do not group by it.

## Exceptions

- **Long-running work with no end.** A stream consumer, a migration, an hours-long job: one line per unit (per message, per batch) plus periodic checkpoints, rather than one line hours from now.
- **Flutter and client apps.** No request boundary, and the "end" is a session the app may not survive. Use breadcrumbs on the crash report; the concept transfers, the mechanism does not.
- **Progress reporting.** A CLI or deploy script logging steps is talking to a human watching the terminal. That is output, not telemetry.
- **A genuinely different unit of work.** A request that enqueues three jobs gets one line, and each job gets its own when it runs.

## Sources

- [Using Canonical Log Lines for Online Visibility](https://brandur.org/canonical-log-lines) by Brandur Leach, the original, with the middleware
- [Fast and flexible observability with canonical log lines](https://stripe.com/blog/canonical-log-lines) by Stripe in production
- [Logs vs Structured Events](https://charity.wtf/2019/02/05/logs-vs-structured-events/) by Charity Majors: the same idea as "arbitrarily wide structured events", one event per request per service
- [Chapter 8: Mapped Diagnostic Context](https://logback.qos.ch/manual/mdc.html) on the JVM's request-scoped carrier
