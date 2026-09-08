# GMGN TypeScript SDK

Independent, unofficial, Node.js-only GMGN API SDK. Originally derived from the
MIT-licensed GMGN CLI; now maintained independently, not byte-identical to upstream.
Zero runtime dependencies. Node 22+. ESM.

## Install from npm

```bash
npm install @jaxonchenjc/gmgn-sdk@0.1.0
```

## Install

In this repository:

```bash
npm ci
npm run check
node scripts/check-package.mjs --artifact
```

Then in a consumer project:

```bash
npm install /path/to/gmgn-sdk-ts/artifacts/jaxonchenjc-gmgn-sdk-0.1.0.tgz
```

The artifact is installed and typechecked in a separate consumer before it is
copied to `artifacts/`. A SHA256 file accompanies it.

## Read data

```ts
import { GmgnClient, GmgnError } from "@jaxonchenjc/gmgn-sdk";

const apiKey = process.env.GMGN_API_KEY;
if (!apiKey) throw new Error("Set GMGN_API_KEY");
const gmgn = new GmgnClient({ apiKey }); // official HTTPS origin by default

const kol = await gmgn.getKol("sol", 20);
const activity = await gmgn.getWalletActivity("sol", walletAddress, {
  limit: 20,
  type: ["buy", "sell"],
});
const pool = await gmgn.getTokenPoolInfo("sol", tokenAddress);
```

`GmgnClient` is the canonical class; `OpenApiClient` remains a compatibility alias.
Use `GmgnClientOptions`, `HotSearchParams` and `getTokenSignals`; the older
`Config`, `HotSearchesParam` and `getTokenSignalV2` names remain compatible.

Prefer the object parameter API for trenches:

```ts
await gmgn.getTrenches({
  chain: "sol",
  types: ["completed"],
  limit: 20,
  filters: { min_mc: 10_000 },
});
```

Unknown section names and filters that override reserved protocol fields are
rejected before sending. The old positional overload remains supported.
Responses return the successful envelope's `data`, currently **unknown**.
Validate endpoint-specific fields before using them. Null stays null; decimal
strings stay strings. JSON numeric literals still have JavaScript number precision.
Do not cast unchecked data to a made-up response schema.

## Cancellation and deadlines

```ts
const controller = new AbortController();
const request = gmgn
  .withOptions({
    signal: controller.signal,
    timeoutMs: 5_000,
  })
  .getKol("sol", 20);

controller.abort();
try {
  await request;
} catch (error) {
  if (error instanceof GmgnError && error.kind === "aborted") {
    // Expected caller cancellation.
  } else {
    throw error;
  }
}
```

`withOptions` creates an immutable request scope; it never mutates the shared client.
Its only overrides are `signal` and `timeoutMs`, not credentials or trading access.
Default total deadline: 15s, including fetch, body consumption and retry waits.
The SDK doesn't discover credentials, read environment variables, configure global
network dispatchers, or log on its own.

## Transport policy

| Option             | Default               | Meaning                                                            |
| ------------------ | --------------------- | ------------------------------------------------------------------ |
| `maxRetries`       | 2                     | Additional attempts for safe reads, at most 5                      |
| `maxRetryDelayMs`  | 5000                  | Upper bound on a retry wait; longer cooldowns fail immediately     |
| `maxResponseBytes` | 8 MiB                 | Decoded body size limit                                            |
| `enableTrading`    | false                 | Explicit execution opt-in                                          |
| `host`             | official HTTPS origin | Trusted credential destination                                     |
| `fetch`            | native fetch          | Injection for adapters/tests; must honor signal/redirect semantics |

All redirects are rejected. Custom hosts must be HTTPS origins without paths,
credentials, fragments or query strings. HTTP is allowed only for literal loopback
addresses with explicit `allowInsecureLocalhost: true`.

Safe reads retry network errors, HTTP 429 and 502/503/504 with bounded exponential
backoff/jitter. `Retry-After` and `x-ratelimit-reset` are respected, never shortened
to fit the wait budget. Business-error blocks, auth failures and financial writes
are not retried. Read-only POST routes are explicitly classified.
Each attempt receives fresh auth timestamp/request ID/signature.

There is no shared-account/distributed rate limiter: collectors must coordinate
concurrency and quotas across processes. Retrying is not a substitute for this.

## Errors and execution

`GmgnError` exposes `kind`, `status`, numeric `apiCode`, `retryAfterMs`,
`operation`, `attempt`, `reason`, and `outcomeUnknown`. Attempts are one-based
for request preparation and sending; failures before the first attempt use zero.
Reasons distinguish invalid envelopes, oversized responses, request preparation
and invalid parameters without including raw input.
Messages contain no upstream body, API key, signature or raw
network cause. Error kinds: configuration, authentication, http, api, protocol,
network, timeout, aborted, execution_disabled.

Signed reads require an explicitly supplied `privateKeyPem`; that **does not**
enable trading. Financial writes require `enableTrading: true` as well.
This prevents accidental calls, not malicious code with your credentials. Use
separate processes/credentials and external approval for real execution.

No financial write is automatically retried. After submission, any failure is
conservatively marked unknown, including HTTP/business rejection responses.
`outcomeUnknown: true` means a write
may have reached the server but its outcome is not confirmed. Reconcile using
provider order/transaction records; **do not blindly resubmit**. False is not a
universal guarantee of no side effects after an HTTP/business failure.

## API scope

Token information/security/pools/holders/traders; market candles/ranks/signals/search;
wallet activity/stats/profits/balances/holdings; KOL/smart-money/follows; quote/gas;
explicitly gated swaps/strategies/token creation.
See declarations for exact signatures. Chain acceptance in a method signature is
not proof of service support for that endpoint/chain.

This library is not a lossless event feed, wallet-monitor database, PnL engine or
trading strategy. Pagination cursors are passed through; no invented pagination
schema or automatic infinite polling.

## Development and release

```bash
npm run check
# Optional, explicit live read access; inject credentials without shell history:
npm run test:smoke
```

CI is defined for Node 22/24/26 on Linux and Node 24 on macOS. PR tests use synthetic
credentials only, including replay of sanitized live HTTP cassettes.
See [record/replay development guide](docs/record-replay.md) for explicit recording.
The [coverage matrix](docs/coverage.md) distinguishes offline wire tests from live
sample outcomes and unqualified combinations.
The manual release-candidate workflow tests and uploads a tarball
with SHA256, **not an npm publication**. Actions are SHA-pinned and read-only.
Dependabot updates development dependencies and Actions through reviewed PRs.
Repository branch rules, npm trusted publisher setup and real-secret smoke gates
are administrative release prerequisites, not enabled by these files alone.

See [UPSTREAM.md](UPSTREAM.md), [CHANGELOG.md](CHANGELOG.md) and
[SECURITY.md](SECURITY.md).
