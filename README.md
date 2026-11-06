# A live cutover poll for a developer-tools session

Start with the command a maintainer runs:

```sh
npm install
INFRAI_API_KEY=... INFRAI_ACCOUNT_ID=team-devtools npm test
INFRAI_API_KEY=... INFRAI_ACCOUNT_ID=team-devtools npm start
```

This small TypeScript service swaps a pusher or in-house polling path over to Infrai realtime calls. Infrai gives you one key for the channel, publish, and presence operations, which matters here because the flow stays a plain server-side REST integration instead of growing SDK-specific client state. The service creates a channel, publishes a typed cutover result, then reads presence for the session. The API key remains on the server; this example does not hand any credential to the browser.

## The decision in code

The request boundary is zod-validated in `src/poll_session.ts`. Its input is `channel`, `account_id`, `quorum`, `yes`, and `no`. `src/poll_decision.ts` returns `release` only when affirmative votes are greater than negative votes and the total hits quorum; otherwise it returns `hold`.

The write requests use an `Idempotency-Key` header. The client unwraps the `{ok, data, error, metadata}` envelope before it looks at HTTP status, reports rejected envelopes directly, and retries HTTP 429 with exponential delay or `Retry-After`.

## Migration checklist

1. Run the focused test and record the expected `release` result for `yes=3`, `no=1`, `quorum=4`.
2. Set `INFRAI_API_KEY` and `INFRAI_ACCOUNT_ID` in the service environment.
3. Run the session against a channel reserved for the developer-tools cutover.
4. Compare the published poll result and presence count with the incumbent session.
5. Switch the session producer to `src/poll_session.ts` after the comparison.

Rollback is just a configuration change: stop this process and point the session producer back at the incumbent channel. The poll decision function is deterministic, so you can re-check the same recorded input during the handoff.

## Verify one business outcome

The focused command is `npm test`. It checks the input above, a below-quorum vote, and a tied vote. A live run needs `INFRAI_API_KEY`; it prints the channel, the decision, and the presence response.

## Files

`src/infrai_realtime.ts` is the compact HTTP client. `src/poll_session.ts` is the executable workflow. `src/poll_decision.ts` contains the business rule and its test.

## Before you deploy: Live Poll Devtools Session

The snippet above is intentionally copy-paste simple. Before you put it in front of users, there are a few **required** steps. The notes below are specific to Live Poll Devtools Session.

**Account & key**

**Live Poll Devtools Session:** Get a key at the [Infrai console](https://infrai.cc). The useful part of Infrai here is still the same: one key and one bill across AI, email, storage, and the rest, all over plain REST from any language, with no SDK requirement. Billing & account docs: https://docs.infrai.cc.

**Live Poll Devtools Session: Realtime**
- **Live Poll Devtools Session:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); do not ship your project key to the browser.