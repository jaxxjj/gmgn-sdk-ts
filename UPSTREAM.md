# Protocol provenance, not a synchronization contract

This is an independent, unofficial SDK. It has its own versioning and release
policy. It does not auto-copy, patch-replay or track the upstream main branch.

Initial derivation:

- Repository: https://github.com/GMGNAI/gmgn-skills
- Commit: `aa4d29a9b7d1aaaac3d6acd72c13f17575605348`
- Package: `gmgn-cli 1.6.1`
- License: MIT, Copyright (c) 2025 GMGN; original LICENSE retained.

An unpublished prototype copied the client and signer verbatim. This SDK replaces the
transport, separates models/endpoint mapping, removes CLI logging/environment/file
loading, gates financial writes and fixes transport defects. Signing canonicalization
and endpoint protocol mappings derive from the original implementation.

## Maintaining compatibility

Treat official CLI/docs/changelogs as protocol evidence, not executable updates.
Review changes to routes, parameters, chain support, envelope/error semantics and
authentication. Add independent regression tests before changing this SDK.
Do not claim an OpenAPI schema exists or generate response types from one example.

Safe read-only live probes should be separately approved and budgeted. Mocks prove
our implementation's behavior, not backend availability. A CLI commit that has not
changed is not proof the deployed API is unchanged.

Record the evidence and migration impact of each protocol change in CHANGELOG.md.
SDK versions describe our consumer contract, not the CLI version. Before 1.0,
breaking changes receive a minor version with migration notes; after 1.0 they need
a major version. Publish 1.0 only after the supported API/response contracts and
operational gates are established.
