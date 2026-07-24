# Page Pulse

A small tool that audits any URL: HTTP status, response time, title, meta
description, H1 count, images missing alt text, and approximate word count.

Built for [Digital Heroes Training Task](https://digitalheroesco.com).

## Setup

```bash
npm install
npm start        # runs on http://localhost:3000
npm test         # runs the Jest test suite
```

No environment variables or API keys required.

## API contract

`GET /api/audit?url=<url>`

**Success — 200**
```json
{
  "url": "https://example.com/",
  "httpStatus": 200,
  "responseTimeMs": 184,
  "title": "Example Domain",
  "metaDescription": "An example website",
  "h1Count": 1,
  "imageCount": 3,
  "imagesMissingAlt": 1,
  "wordCount": 214
}
```

**Failure**
```json
{ "error": "human-readable message" }
```

| Status | Meaning                                      |
|--------|-----------------------------------------------|
| 400    | Missing or malformed URL                      |
| 422    | URL resolved but response wasn't HTML         |
| 502    | Could not reach the host (DNS, connection refused, etc.) |
| 504    | Request exceeded the timeout (8s default)     |
| 500    | Unexpected server error                       |

## Design decisions

**1. Separated parsing logic from the Express route.**
`lib/audit.js` has no knowledge of `req`/`res` — it takes a URL and an
injectable `fetchImpl`, and either returns a report or throws a typed
`{ status, message }` error. This is what makes Task B's tests possible
without spinning up a real server or hitting the network: the tests
inject a mock `fetch`.

**2. Errors are thrown as typed objects, not generic `Error`s.**
Every failure carries an intended HTTP status code. The Express route
becomes a thin translator (`catch (err) { res.status(err.status)... }`)
instead of a pile of `if` statements guessing what went wrong. Tradeoff:
this isn't a real `Error` subclass, so stack traces are thinner — fine
for a tool this size, but I'd formalize it into an `AuditError` class if
this grew.

**3. Timeout via `AbortController`, not a manual `Promise.race`.**
`AbortController` actually cancels the in-flight request instead of just
racing a timer while the request keeps running in the background. It's
a bit more verbose to wire up but avoids leaking open connections on
slow or hanging hosts — the exact failure mode this tool is supposed to
catch, not cause.

## What I'd change with more time

Word count currently strips all whitespace from `<body>` text and splits
on spaces, which overcounts slightly on pages with heavy inline script/
style text that Cheerio doesn't filter out by default. I'd add an
explicit `$('script, style').remove()` before extracting body text —
noted here since it's the kind of thing that's better flagged than
silently wrong.
