# Changelog

## 0.2.0 — unreleased

### Architecture follow-up

- Canonical `GmgnClient` and `GmgnClientOptions`; legacy names remain aliases.
- Endpoint-local auth/effect policy; request core no longer hardcodes business paths.
- Separate request preparation, signing, response parsing and retry orchestration.
- Preparation failures are never treated as retryable network failures.
- Safe error metadata includes operation, attempt and bounded reason codes.
- Object-style trenches parameters and reserved-field/section validation.
- Clean generated output before builds to exclude obsolete modules from packages.
- Conservative unknown outcome for every failed write after submission.

Independent SDK implementation, no byte-identity constraint.

### Breaking changes

- Financial writes now require `enableTrading: true`; a signing key alone only
  authorizes signed reads at the SDK boundary.
- Custom hosts must be HTTPS origins. Explicit literal-loopback HTTP is test-only.
- Errors now use exported `GmgnError`; raw upstream messages are not exposed.
- Invalid HTTP/envelope combinations are rejected instead of returning data.
- Default total timeout is 15s, response cap 8 MiB, and safe-read retry limit 2.
- Explicit chain/address parameters can no longer be overridden through `extra`.
- CLI debug/rate-limit environment variables no longer affect the SDK.

### Added

- Immutable request scopes with cancellation and deadline overrides.
- Redirect rejection, bounded response streaming and rate-aware safe-read retries.
- Ambiguous execution outcome marking; no automatic financial-write retries.
- Independent consumer validation of the exact versioned package artifact.
- SHA-pinned CI, manual release-candidate artifacts and Dependabot configuration.

## 0.1.0

Initial MIT-licensed GMGN client extraction; local tests and bounded three-chain
read-only smoke checks. No npm publication.
