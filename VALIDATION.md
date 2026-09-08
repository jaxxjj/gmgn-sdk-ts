# Validation — 2026-09-08

Architecture follow-up: 72 tests passed locally, including trenches overwrite
regressions, canonical naming, pre-send failures and diagnostic metadata.
The follow-up was not live-probed; earlier live results below apply to the
previous implementation. Endpoint-specific response models remain unverified.

The first public release target is 0.1.0, an independent implementation. The prototype byte-identity test is
intentionally removed; compatibility is assessed through protocol and behavior
tests rather than preserving upstream implementation defects.

Local validation includes protocol mappings/signatures, safe-read retries,
immutable cancellation scopes, fetch/body deadlines, bounded response size,
HTTP/envelope precedence, native cross-origin redirect rejection, credential-safe
errors, execution opt-in and ambiguous write outcomes. Package validation installs
the exact newly packed version in a separate consumer and checks declarations.

66 tests passed on Node 22.23.2 and the local Node 23.7.0 runtime. The inventory
covers all 33 endpoint methods. Formatting, strict TypeScript checks and isolated
tarball installation/declaration checks passed on Node 22.23.2. This does not
claim that the configured Node 24/26 GitHub matrix has executed yet.

CI definitions and manual release-candidate artifact workflows are repository
files. Their presence does not establish a completed GitHub Actions run, branch
protection, trusted publication or production readiness.

The earlier transport implementation was directly live-tested with `getKol(chain, 2)`:
sol, bsc and robinhood each succeeded with two rows. The launcher injected only
the pre-existing API key; no private key was loaded. No live trade is part of
this validation. All execution tests use synthetic keys and local/mocked requests.

Remaining gates: broader read-only contract probes, high-frequency endpoint
response schemas based on verified contracts, long-running collector integration,
release administration and any separately authorized trading qualification.
