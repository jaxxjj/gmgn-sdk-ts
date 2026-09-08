# SDK qualification expansion

## 1. Objective

Make coverage explicit per public method, chain candidate, parameter class and
failure boundary. Passing a unit suite is not evidence of full live API coverage.

## 2. Scope

Offline: all 34 public endpoint methods, required/optional parameters, repeated
queries, reserved-key precedence, signed/API-key modes, read/write safety and
representative upstream failures. Live: bounded read-only probes with explicit
credentials. No trade, cancellation, token creation or fixture-generated orders.

## 3. Design

Use an independent executable case inventory and require exact public-method
coverage. Separate wire assertions, response/failure tests and live evidence.
Each live result records pass/failure/blocked status and a sanitized cassette
when a complete HTTP response exists. A negative fixture is not qualification.
New endpoints fail the inventory gate until their cases are added.

## 4. Boundaries

Candidate chains are not a claim that every service endpoint supports every
chain. Small live requests do not establish provider maximums. Synthetic keys
protect signed behavior; a caller may explicitly supply an existing API signing
key for signed reads, never a wallet private key. Unknown opaque cursors and order
IDs must come from real read responses or remain unqualified.

## 5. Verification

Run finite offline combinations; review recording allowlists; run serial
rate-limited live reads; replay all persisted results; audit redaction and package
exclusions; run `npm run check`. Keep true long-running, rotation and execution
qualification gaps visible. Do not publish or push as part of this change.
