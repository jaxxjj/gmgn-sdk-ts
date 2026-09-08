# GMGN TypeScript SDK

Unofficial, minimal Node.js SDK extracted from GMGN's MIT-licensed `OpenApiClient`.
**No CLI process, no automatic credential files, no runtime dependencies.**

This repository is initially private and the package has `private: true`.
Nothing has been published to npm. The package name in examples is for local/tarball
installation, not a claim that it is available in the public registry.

## Install locally

Requires Node.js 22+.

```bash
npm ci
npm test
npm pack
# In your consumer project:
npm install /path/to/jaxxjj-gmgn-sdk-0.1.0.tgz
```

## Read data

```ts
import { GmgnClient } from "@jaxxjj/gmgn-sdk";

const apiKey = process.env.GMGN_API_KEY;
if (!apiKey) throw new Error("Set GMGN_API_KEY");

const client = new GmgnClient({
  host: "https://openapi.gmgn.ai",
  apiKey,
});

const kolTrades = await client.getKol("sol", 20);
const smartMoney = await client.getSmartMoney("bsc", 20);
const trending = await client.getTrendingSwaps("robinhood", "1h", { limit: 5 });

// address here is the token address, not a pool address.
const pool = await client.getTokenPoolInfo("sol", tokenAddress);
const history = await client.getWalletActivity("sol", walletAddress, { limit: 20 });
```

Methods retain upstream names. `OpenApiClient` and `GmgnClient` are the same class.
Successful calls return the API envelope's `data`. Treat it as `unknown` and validate
the endpoint-specific shape before using it; don't replace absent amounts with zero.

## Included API groups

| Group | Example methods |
|---|---|
| Tokens | `getTokenInfo`, `getTokenSecurity`, `getTokenPoolInfo`, `getTokenTopHolders`, `getTokenTopTraders` |
| Market | `getTokenKline`, `getTrendingSwaps`, `getTokenSignalV2`, `getHotSearches`, `getTrenches`, `searchMarket` |
| Wallets | `getWalletActivity`, `getWalletStats`, `getWalletProfits`, `getWalletTokenBalance`, `getCreatedTokens` |
| Tracking | `getKol`, `getSmartMoney`, `getFollowTokens`, `getFollowWallet` |
| Signed reads/writes | Retained from upstream; read the warning below |

Use generated declarations in `dist/client/OpenApiClient.d.ts` for exact signatures.
Backend support differs by endpoint and chain; accepting a chain string is not proof
every operation is supported there.

## Important safety warning

**This is a direct API client, not a trading safety layer.**
The copied class also contains trading and token-creation methods.
Those methods **do not include the CLI's user-confirmation prompts**.

For data collection, inject only a server-authorized read-only API key and omit
`privateKeyPem`. Some reads (including holdings/followed-wallet activity) require a
signature, so don't interpret omission of a key as universal access to all read APIs.
Use a separate explicitly approved execution component if you later need signed writes.

Never pass an untrusted `host` with real credentials or enable debug logs in a secret-bearing
production environment without auditing log redaction. This extraction intentionally retains
upstream transport/retry limitations rather than pretending to be a hardened new implementation.

The SDK does not alter the global fetch/dispatcher, load `.env`, launch browsers, query Keychain,
start timers or send requests simply because it was imported.
Applications own network timeouts/proxies, concurrency budgets, durable cursors and data storage.

**Known upstream bug reproduced by tests:** 429 response errors bypass the intended retry
because asynchronous response parsing is returned without `await` inside the retry try/catch.
This byte-identical extraction retains that defect. Do not rely on automatic retries; rate-limit
errors propagate to the caller. Any fix should be an explicit, tested vendor patch.

See [UPSTREAM.md](UPSTREAM.md) for provenance and known limitations.

## Development

```bash
npm ci
npm run typecheck
npm test
npm pack --dry-run
```

Tests use local/mocked HTTP and ephemeral signing keys. No account credentials or live
transactions are involved. To explicitly test read access:

```bash
GMGN_API_KEY=... npm run test:smoke
```

Prefer injecting the key from a secret manager rather than putting it in shell history.
The smoke script calls KOL data once for each of `sol`, `bsc`, `robinhood`, sequentially.
It prints only chain/count metadata, never the key or raw wallet data.

This is an API integration library, not a PnL engine, lossless event feed, or trading strategy.
