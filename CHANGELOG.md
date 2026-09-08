# Changelog

## 0.1.1 — 2026-09-08

- Added executable per-endpoint chain/parameter/failure matrices, independent
  Ed25519/RSA wire-signature checks and read/write safety gates.
- Added a serial opt-in live qualification runner, per-case result ledger and
  generated coverage matrix with a CI freshness check. Negative and unrun cases
  remain explicit; no trading or production API change is included.

- Test-only HTTP cassette recording/replay with strict offline matching,
  credential/identity scrubbing, preserved JSON numeric lexemes and atomic writes.
- Live KOL and smart-money captures for Solana, BSC and Robinhood.
  Recording requires an explicit named read scenario; normal CI needs no credentials.
- `lossless-json` is development-only; runtime dependencies and public API are unchanged.

## 0.1.0 — 2026-09-08

First public release of the independent, unofficial GMGN TypeScript SDK.
Earlier version labels were internal development checkpoints, not npm releases.

### Included

- Market, token, wallet, tracking, quote and explicitly gated execution endpoints.
- Canonical `GmgnClient` and `GmgnClientOptions`, with compatibility aliases.
- Immutable request scopes with cancellation and total deadlines.
- Redirect rejection, bounded response bodies and rate-aware safe-read retries.
- No automatic retries for financial writes; failed submissions are marked as
  having an unknown execution outcome.
- Credential-safe errors with operation, attempt and bounded reason codes.
- Endpoint-local authentication and read/write policy.
- Separate request preparation, signing, response parsing and retry orchestration.
- Object-style trenches parameters with reserved-field and section validation.
- Zero runtime dependencies; Node.js 22+ and ESM.
- Formatting, strict TypeScript, protocol tests and independent tarball-consumer
  validation; SHA-pinned CI and release-candidate artifacts.

### Known limitations

- Endpoint responses remain `unknown` until their schemas are verified.
- No distributed rate limiter, lossless event feed or automatic pagination.
- No claim of qualification for unattended financial execution.
- Original MIT attribution is retained; this SDK is not affiliated with GMGN.
