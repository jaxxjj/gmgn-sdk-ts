# Upstream provenance

This is an **unofficial extraction**, not an official GMGN SDK.

- Repository: https://github.com/GMGNAI/gmgn-skills
- Pinned commit: `aa4d29a9b7d1aaaac3d6acd72c13f17575605348`
- Upstream package version: `gmgn-cli 1.6.1`
- Retrieved/verified: 2026-09-08
- License: MIT, Copyright (c) 2025 GMGN. Original license retained verbatim.

Copied byte-for-byte:

| Upstream path | Local path |
|---|---|
| `src/client/OpenApiClient.ts` | `src/client/OpenApiClient.ts` |
| `src/client/signer.ts` | `src/client/signer.ts` |

Local additions: library export entrypoint, package/build metadata, documentation,
tests, and an opt-in smoke script. No endpoint/auth/signing logic was rewritten.
`test/upstream.test.mjs` pins SHA256 hashes so local edits cannot silently diverge.

## Intentionally not copied

- CLI entrypoint, Commander, CLI argument parsing.
- Global Undici dispatcher configuration (IPv4/proxy settings).
- Automatic `.env`/global configuration loader.
- Browser login, API-key generation/configuration.
- Skills, CLI confirmation prompts, or command-side input validation.

## Inherited behaviour and limitations

- Endpoint methods generally return `Promise<unknown>`; exported TypeScript types
  cover request parameters, not guaranteed parsed response schemas.
- Successful API envelopes return `data`. Arrays, nullable values, cursors and
  decimal strings are not normalized. The upstream client is not a lossless JSON
  number parser: numeric literals follow JavaScript JSON number semantics.
- **Reproduced upstream retry defect:** `executePreparedRequest` returns the
  asynchronous `parseResponse(...)` promise without awaiting it inside its
  try/catch. Consequently a 429 response rejection bypasses the intended retry.
  The local characterization test asserts the actual single-attempt failure.
  Retry-related code exists but is not a working guarantee in this pinned version.
  No silent fix was applied to the byte-identical extracted code.
  It is also not a shared scheduler or proactive global rate limiter.
- The client reads `GMGN_DEBUG` and `GMGN_RATE_LIMIT_AUTO_RETRY_MAX_WAIT_MS`;
  it does not read API keys or private keys from the environment or disk by itself.
- Transport uses global `fetch`, with no built-in request timeout/AbortSignal API.
  Response errors may include upstream body text; never assume they are safe to log.
- `host` is caller-controlled. Use the official HTTPS host with real credentials;
  no origin allowlist or redirect policy was added.
- Authentication requires an accurately synchronized system clock.
- User-Agent remains `gmgn-cli/<this package's version>` due to the upstream code's
  relative package.json lookup. This does not make the SDK an official CLI release.
- `signer.ts` retains an explicit `loadPrivateKey` helper, but it is not exported
  from the package root and never runs during import.
- **Financial write methods do not ask for confirmation.** The CLI added that
  protection outside this client. With authorized credentials, calls such as
  `swap`, `multiSwap`, strategy creation/cancellation and token creation can act
  on real wallets. An API signing key is not a wallet seed but can authorize writes.

## Updating

Choose a new upstream commit explicitly, inspect its two files and license, copy
them together, update this document and pinned hashes, then run typecheck/tests,
tarball-consumer checks and bounded read-only smoke tests.
Do not auto-track `main` or silently replace this extraction with a new version.
