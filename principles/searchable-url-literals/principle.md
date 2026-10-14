# Write URLs as Complete Literals

Write URLs and route paths as complete literal strings, so searching the codebase for a path from a log or bug report finds the code.

A URL or a route path belongs in the source as one complete string.
Do not assemble it from a host constant, a version variable, and a path segment.

The reason is search, not style.
When a request 404s, when a log line shows a path, when the backend team asks who still calls an endpoint, the first thing anyone does is search the codebase for the path they are holding.
A composed URL matches nothing, because the full string only ever exists at runtime.

## Bad

```dart
static final _geocodeServer = Uri.https(
  'geocode.arcgis.com',
  '/arcgis/rest/services/World/GeocodeServer',
);

Uri _geocodeUri(String operation) => _geocodeServer.appendPath(operation);
```

Searching for `geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest` finds nothing.
Searching for the host alone finds one line that does not say which endpoints are used.

## Good

```dart
Uri.parse('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest')
    .addQueryParameters(parameters);
```

## Routers

The same rule, and it matters more here, because a route table is the index everyone greps.

Bad:

```dart
router.post('/api/$latestVersion/$authPath', handleAuth);
```

Good:

```dart
router.post('/api/v1/auth', handleAuth);
```

Someone holding `/api/v1/auth` from a log line, a Postman collection, or a bug report can jump straight to the handler.
With the interpolated form they first have to discover that `latestVersion` is `v1` and `authPath` is `auth`, which means reading two other files before the search can even begin.

A version bump is not a good reason to interpolate.
Bumping `v1` to `v2` by editing one constant silently rewrites every route in the table, including the ones that were not ready to move.
Changing each literal is the point: it forces the change to be seen per endpoint, and it keeps the old version greppable while both are live.

## Query parameters are not part of this

Build query strings from a map or a helper.
They are values rather than identity, and nobody searches for `?f=json&maxSuggestions=5`.
A helper also handles percent-encoding, which hand-written strings get wrong.

## Repetition is the accepted cost

Five methods calling the same host repeat that host five times.
That is slightly worse on the day someone renames it, and better on every other day.
The rename case is exactly the one where a search must not miss a call site, so the duplication pays for itself there too.

## Exceptions

- A host that genuinely varies per environment stays a variable, because there is no single literal to write.
  Keep everything after it literal: `'$apiBaseUrl/api/v1/auth'` still lets someone find `/api/v1/auth`.
- Generated clients and generated route tables are exempt, nobody edits or greps them by hand.
- A path segment that is real data, such as an id, stays interpolated: `'/api/v1/sites/$siteId'` is already as literal as it can be.
