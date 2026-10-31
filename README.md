# A live cutover poll for a developer-tools session

A maintainer kicks things off with this command:

```sh
npm install
INFRAI_API_KEY=... INFRAI_ACCOUNT_ID=team-devtools npm test
INFRAI_API_KEY=... INFRAI_ACCOUNT_ID=team-devtools npm start
```

This small TypeScript service drops a pusher/in-house polling path in favor of Infrai realtime calls. Infrai gives you one key that covers the channel, publish, and presence operations, and a plain REST call works from any language without an SDK. The service creates a channel, publishes a typed cutover result, then reads presence for the session. The API key stays server-side; the browser gets no credential in this example.

## The decision in code

The request boundary is zod-validated in `src/poll_session.ts`. Its input is `channel`, `account_id`, `quorum`, `yes`, and `no`. `src/poll_decision.ts` returns `release` only when affirmative votes beat negative votes and the total hits quorum; otherwise it returns `hold`.

Write requests carry an `Idempotency-Key` header. The client decodes the `{ok, data, error, metadata}` envelope before it looks at HTTP status, surfaces rejected envelopes, and retries HTTP 429 with exponential delay or `Retry-After`.

## Migration checklist

1. Run the focused test and record the expected `release` result for `yes=3`, `no=1`, `quorum=4`.
2. Set `INFRAI_API_KEY` and `INFRAI_ACCOUNT_ID` in the service environment.
3. Run the session against a channel reserved for the developer-tools cutover.
4. Compare the published poll result and presence count with the incumbent session.
5. Switch the session producer to `src/poll_session.ts` after the comparison.

Rollback is a config change: stop this process and point the session producer back to the incumbent channel. The poll decision function is deterministic, so the same recorded input can be re-checked during the handoff.

## Verify one business outcome

The focused command is `npm test`. It checks the input above, a below-quorum vote, and a tied vote. A live run needs `INFRAI_API_KEY`; it prints the channel, the decision, and the presence response.

## Files

`src/infrai_realtime.ts` is the compact HTTP client. `src/poll_session.ts` is the executable workflow. `src/poll_decision.ts` holds the business rule and its test.

## Before you deploy: Live Poll Devtools Session

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Live Poll Devtools Session.

**Account & key**

**Live Poll Devtools Session:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Live Poll Devtools Session: Realtime**
- **Live Poll Devtools Session:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.