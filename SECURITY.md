# Security policy

This package is unofficial and pre-1.0. It is not certified for autonomous financial
execution. Do not put API keys, signing keys, raw authenticated requests or account
responses in issues, fixtures or PRs.

Report security concerns privately to the repository owner. If a private reporting
channel has not been configured, request one without including exploit credentials.

## Boundaries

- User-supplied host/fetch and calling application code are trusted. They can
  receive credentials. Request-scoped overrides cannot change either.
- SDK error metadata omits raw server text, signatures and key material.
- Execution opt-in prevents mistakes; it is not an authorization system.
- Cancellation after submission does not cancel a server-side trade.
- Unknown execution outcomes require reconciliation, not blind retries.
- Development fixtures use synthetic credentials and localhost only.

## Release gates still requiring administration

Protect the default branch and require CI checks/review. Review changes to
workflows/signing/execution policy. Configure a trusted publisher only after
choosing the npm scope and publication visibility. Never run untrusted PR code
with real credentials or publishing permission. This repository does not publish
to npm automatically.
