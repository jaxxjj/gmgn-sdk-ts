# HTTP record/replay

Normal `npm test` uses committed, scrubbed cassettes through the SDK's injected
fetch seam. Missing, unmatched, exhausted and unused interactions fail; replay
never delegates to the network. Existing signature, retry and adversarial tests
remain necessary: a cassette with scrubbed authentication cannot verify signing.

Inject `GMGN_API_KEY` using your secret mechanism, without putting it in command
history. Explicitly select one read-only scenario:

```sh
GMGN_RECORD=1 npm run test:record -- sol-kol
GMGN_RECORD=1 npm run test:record -- sol-smartmoney
GMGN_RECORD=1 npm run test:record -- bsc-kol
GMGN_RECORD=1 npm run test:record -- bsc-smartmoney
GMGN_RECORD=1 npm run test:record -- robinhood-kol
GMGN_RECORD=1 npm run test:record -- robinhood-smartmoney
```

Each scenario requests two rows. No credential-file discovery, private keys,
financial writes, record-all mode or automatic fixture updates are provided.
Only the official origin and explicitly allowlisted read routes may record.
The qualification runner also permits four reviewed read-only POST routes;
it never permits trading, strategy mutation or token-creation POSTs.

The recorder preserves original response bytes for the SDK and writes a
separately scrubbed copy only after the scenario passes. Existing fixtures survive
failed captures. Review every fixture diff before committing: identities are
pseudonymized, free text and URLs are redacted, and the provenance says whether
the input was actually captured live or synthesized. Response number-versus-string
types and exact numeric lexemes survive scrubbing. Unknown free-text fields,
transaction hashes and some identifiers intentionally lose semantics.

Matching includes method, origin, path, query and selected protocol headers.
Only authentication values and GMGN's generated `timestamp`/`client_id` are
normalized away. Missing authentication is still an error. Responses are consumed
FIFO per request key; this does not simulate arbitrary concurrent scheduling.

The small test helper is mirrored in the independent SDK repositories; it is not
a shared runtime package or a Worldline dependency. `lossless-json` is a dev
dependency here. Helpers, fixtures and recording scripts are excluded from the
npm tarball by its existing explicit file whitelist.

These captures qualify the observed read shapes only. They do not prove all-chain
endpoint coverage, current live access, signature validity or trading safety.

## Broader qualification

`GMGN_QUALIFY=1 npm run test:qualify` executes the finite read-only plan.
Inject `GMGN_API_KEY` and, optionally, `GMGN_API_SIGNING_KEY` through a secret
manager. The latter is an API-authentication signing PEM, **not a wallet key**.
The runner never discovers credential files automatically.
Calls are serial with a six-second pause and no automatic SDK retries.
401/403/429 stops the current run. After the service cooldown is over,
`GMGN_QUALIFY_RESUME=1` explicitly resumes, preserving earlier failure evidence
and skipping an endpoint/route family already observed to be rate-gated.
Three consecutive capture/transport failures also stop the runner. Capture-stage
diagnostics are separate from SDK errors. `GMGN_QUALIFY_FROM_CHAIN` can narrow a
resumed run to the remaining chain suffix without discarding earlier evidence.
With resume enabled, `GMGN_QUALIFY_PROFILE=batch` checks two distinct discovered
makers across sol/bsc/robinhood at a 30d window. `GMGN_QUALIFY_PROFILE=pagination`
checks two actual wallet-activity pages per primary chain using the returned
`next` cursor as `cursor`; both interactions share one cassette and are replayed
with an overlap check. Transaction hashes and cursor identity are pseudonymized
consistently, not erased.
The cursor parameter is cross-checked against the upstream CLI usage reference:
https://github.com/GMGNAI/gmgn-skills/blob/main/docs/cli-usage.md

`npm run coverage:report` regenerates [coverage.md](coverage.md).
`npm run test:coverage` separately measures runtime line/branch/function coverage;
those percentages are not endpoint/parameter/live qualification percentages.
The Node 22 Linux CI job enforces a runtime floor of 95% lines, 85% branches
and 90% functions. The report freshness check runs in the ordinary check suite.
