# Validation — 2026-09-08

This SDK is a byte-identical extraction, not a new transport implementation.

## Local checks

- 17 tests: import-side-effect boundary, REST paths/authentication, repeated query
  parameters, cursor preservation, decimal strings, business/non-JSON/auth errors,
  request IDs, signed reads, no retries for signed writes, and source hashes.
- TypeScript compilation and strict exported-API typecheck.
- npm tarball content check; no credentials, tests, node_modules or CLI entrypoint.
- Clean consumer project import and declaration resolution from the tarball.
- Core client/signer compared byte-for-byte with pinned upstream files.

The tests deliberately characterize a reproduced upstream 429 retry defect, rather
than claiming retry works. See UPSTREAM.md.

## Bounded live checks

Using only an explicitly injected existing API key, called the extracted client's
`getKol(chain, 2)` sequentially for:

| Chain | Result |
|---|---|
| sol | success, 2 rows |
| bsc | success, 2 rows |
| robinhood | success, 2 rows |

No CLI subprocess, signed request, trade, token creation, profile/follow changes,
or third-party notification was used in these live checks.
The local smoke launcher read the pre-existing credential file only to inject the
API key; the SDK itself has no credential discovery. No secrets were persisted.

Other endpoint/chain combinations were not live-tested. Signature tests use fresh
ephemeral keys and localhost only. Mocked success does not establish server support.
No browser, proxy, long-duration rate-limit, retry recovery, PnL or production
security certification is implied.
