import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { GmgnClient } from "../dist/index.js";
import { Cassette, providerPolicy } from "../test/support/cassette.mjs";
import { endpointCases, writes } from "../test/support/endpoint-matrix.mjs";
import { outcome, writeReport, isAccessFailure } from "../test/support/qualification.mjs";
import { executeRead } from "../test/support/read-scenario.mjs";

const candidates = ["sol", "bsc", "base", "eth", "robinhood", "arc", "stable"];
function findAddresses(value) {
  const addresses = [];
  function visit(x) {
    if (!x || typeof x !== "object") return;
    if (typeof x.address === "string") addresses.push(x.address);
    if (typeof x.wallet_address === "string") addresses.push(x.wallet_address);
    if (Array.isArray(x)) x.forEach(visit);
    else
      Object.values(x).forEach((v) => {
        if (typeof v === "object") visit(v);
      });
  }
  visit(value);
  return [...new Set(addresses)];
}
export async function qualify({
  apiKey,
  privateKeyPem,
  resume = false,
  fromChain = "sol",
  profile = "full",
  directory = resolve("test/fixtures/qualification"),
  reportFile = resolve("docs/qualification-results.json"),
}) {
  if (!apiKey) throw new Error("Explicit API key required");
  if (!candidates.includes(fromChain)) throw new Error("Unknown start chain");
  if (!["full", "batch", "pagination"].includes(profile))
    throw new Error("Unknown qualification profile");
  let consecutiveCaptureFailures = 0;
  const report =
    resume && existsSync(reportFile)
      ? JSON.parse(readFileSync(reportFile, "utf8"))
      : {
          format: "sdk-qualification/v1",
          service: "gmgn",
          capturedAt: new Date().toISOString(),
          scope:
            "Finite read-only sample. Passed means SDK envelope accepted, not exhaustive semantic validation.",
          cases: [],
        };
  if (report.service !== "gmgn") throw new Error("Wrong qualification report");
  for (const chain of candidates)
    for (const row of endpointCases(chain)) {
      if (row.scope === "global" && chain !== "sol") continue;
      const id = `${chain}-${row.name}`;
      if (!report.cases.some((entry) => entry.id === id))
        report.cases.push({
          id,
          operation: row.name,
          chain,
          status: "not-run",
          reason: "pending",
          recorded: false,
        });
    }
  writeReport(reportFile, report);
  const config = { apiKey, privateKeyPem, maxRetries: 0, timeoutMs: 12000 };
  async function run(id, name, args, chain, variant) {
    if (writes.has(name)) throw new Error("Live writes are forbidden");
    const previous = report.cases.find((row) => row.id === id);
    if (previous?.status === "passed" && !["getKol", "getTrendingSwaps"].includes(name)) return;
    if (previous?.recorded || previous?.status === "failed") {
      const base = id;
      let attempt = 2;
      while (report.cases.some((row) => row.id === id)) id = `${base}-attempt${attempt++}`;
    } else if (previous) report.cases = report.cases.filter((row) => row.id !== id);
    const cassette = new Cassette({
      file: resolve(directory, `${id}.json`),
      policy: providerPolicy("gmgn"),
      mode: "record",
      inputs: { args },
      provenance: { kind: "live", source: "SDK read-only qualification", operation: name, variant },
    });
    const client = new GmgnClient({ ...config, fetch: cassette.fetch(globalThis.fetch) });
    let result;
    const expected = await outcome(
      async () => (result = await executeRead(client, name, args, variant, () => delay(6000))),
    );
    const recorded = !cassette.failed && cassette.data.exchanges.length > 0;
    if (recorded) {
      cassette.data.expected = expected;
      cassette.commit();
    }
    report.cases.push({
      id,
      operation: name,
      chain,
      variant,
      status: expected.ok ? "passed" : "failed",
      recorded,
      ...expected,
      ...(cassette.failed ? { captureFailure: cassette.failure } : {}),
    });
    writeReport(reportFile, report);
    console.log(
      JSON.stringify({
        id,
        status: expected.ok ? "passed" : "failed",
        recorded,
        ...(expected.error ? { error: expected.error } : {}),
        ...(cassette.failed ? { captureFailure: cassette.failure } : {}),
      }),
    );
    consecutiveCaptureFailures = cassette.failed ? consecutiveCaptureFailures + 1 : 0;
    if (consecutiveCaptureFailures >= 3)
      throw new Error("Three consecutive capture/transport failures; stopped");
    if (isAccessFailure(expected.error, [401, 403, 429]))
      throw new Error("Authentication/access/rate-limit gate; qualification stopped");
    await delay(6000);
    return result;
  }
  const block = (id, operation, chain, reason) => {
    const previous = report.cases.find((row) => row.id === id);
    if (previous?.recorded || previous?.status === "failed") return;
    report.cases = report.cases.filter((row) => row.id !== id);
    report.cases.push({ id, operation, chain, status: "not-run", reason, recorded: false });
  };
  if (profile === "pagination") {
    for (const chain of ["sol", "bsc", "robinhood"].filter(
      (chain) => candidates.indexOf(chain) >= candidates.indexOf(fromChain),
    )) {
      const kol = await run(`${chain}-kol-page-discovery`, "getKol", [chain, 2], chain, "limit-2");
      const wallet = kol?.list?.find((row) => typeof row.maker === "string")?.maker;
      if (wallet)
        await run(
          `${chain}-activity-two-pages`,
          "getWalletActivity",
          [chain, wallet, { limit: 2 }],
          chain,
          "activity-two-pages",
        );
      else block(`${chain}-activity-two-pages`, "getWalletActivity", chain, "no-discovered-maker");
    }
    writeReport(reportFile, report);
    return { profile, cases: report.cases.length };
  }
  if (profile === "batch") {
    for (const chain of ["sol", "bsc", "robinhood"].filter(
      (chain) => candidates.indexOf(chain) >= candidates.indexOf(fromChain),
    )) {
      const kol = await run(
        `${chain}-kol-batch-discovery`,
        "getKol",
        [chain, 20],
        chain,
        "limit-20",
      );
      const smart = await run(
        `${chain}-smartmoney-batch-discovery`,
        "getSmartMoney",
        [chain, 20],
        chain,
        "limit-20",
      );
      const wallets = [
        ...new Set(
          [...(kol?.list ?? []), ...(smart?.list ?? [])]
            .map((row) => row.maker ?? row.wallet_address)
            .filter((value) => typeof value === "string"),
        ),
      ];
      if (wallets.length >= 2)
        await run(
          `${chain}-stats-batch30d`,
          "getWalletStats",
          [chain, wallets.slice(0, 2), "30d"],
          chain,
          "distinct-wallets-2/30d",
        );
      else block(`${chain}-stats-batch30d`, "getWalletStats", chain, "no-second-distinct-maker");
    }
    writeReport(reportFile, report);
    return { profile, cases: report.cases.length };
  }
  for (const chain of candidates.slice(candidates.indexOf(fromChain))) {
    const kol = await run(`${chain}-getKol`, "getKol", [chain, 2], chain, "limit-2");
    const wallets = [
      ...new Set(
        (kol?.list ?? [])
          .map((row) => row.maker ?? row.wallet_address)
          .filter((value) => typeof value === "string"),
      ),
    ];
    const rank = await run(
      `${chain}-getTrendingSwaps`,
      "getTrendingSwaps",
      [chain, "1h", { limit: 2 }],
      chain,
      "1h-limit-2",
    );
    const tokens = findAddresses(rank);
    const wallet = wallets[0],
      token = tokens[0];
    for (const row of endpointCases(chain, false, {
      wallet,
      otherWallet: wallets[1],
      token,
      otherToken: tokens[1],
    })) {
      const id = `${chain}-${row.name}`;
      if (["getKol", "getTrendingSwaps"].includes(row.name)) continue;
      if (row.scope === "global" && chain !== "sol") continue;
      if (row.write) {
        block(id, row.name, chain, "financial-write-synthetic-only");
        continue;
      }
      const gatedTradeOperations = new Set(
        report.cases
          .filter((entry) => entry.error?.status === 429)
          .map((entry) => entry.operation)
          .filter((name) =>
            ["getFollowWallet", "quoteOrder", "getGasPrice", "getStrategyOrders"].includes(name),
          ),
      );
      if (row.path.startsWith("/v1/trade/") && gatedTradeOperations.size >= 2) {
        block(id, row.name, chain, "trade-route-family-rate-gated; not-probed-further");
        continue;
      }
      if (
        report.cases.filter((entry) => entry.operation === row.name && entry.error?.status === 429)
          .length >= 2
      ) {
        block(id, row.name, chain, "repeated-endpoint-rate-limit");
        continue;
      }
      if (row.name === "queryOrder") {
        block(id, row.name, chain, "no-existing-owned-order-id");
        continue;
      }
      if (row.name === "getTokenSignalV2") {
        block(id, row.name, chain, "deprecated-alias-tested-offline");
        continue;
      }
      if (row.signed && !privateKeyPem) {
        block(id, row.name, chain, "API-signing-key-not-supplied");
        continue;
      }
      const needsWallet = /getWallet|FollowTokens|FollowGroupNames|CreatedTokens|quoteOrder/.test(
        row.name,
      );
      const needsToken =
        /getToken(Info|Security|PoolInfo|TopHolders|TopTraders|Kline)|getWalletTokenBalance|searchMarket|quoteOrder/.test(
          row.name,
        );
      if ((needsWallet && !wallet) || (needsToken && !token)) {
        block(id, row.name, chain, "no-discovered-chain-input");
        continue;
      }
      if (row.name === "quoteOrder" && !tokens[1]) {
        block(id, row.name, chain, "no-distinct-output-token");
        continue;
      }
      let args = row.args;
      if (
        [
          "getTokenTopHolders",
          "getTokenTopTraders",
          "getWalletHoldings",
          "getWalletActivity",
          "getFollowTokens",
          "getCreatedTokens",
        ].includes(row.name)
      )
        args = [...args.slice(0, 2), { limit: 2 }];
      if (row.name === "getSmartMoney") args = [chain, 2];
      if (row.name === "getTrenches") args = [{ chain, types: ["completed"], limit: 2 }];
      if (row.name === "getTokenSignals") args = [chain, [{ signal_type: [1] }]];
      if (row.name === "getTokenKline")
        args = [
          chain,
          token,
          "1m",
          Math.floor(Date.now() / 1000) - 600,
          Math.floor(Date.now() / 1000),
        ];
      await run(id, row.name, args, chain, "small-read");
    }
    // Focused parameter variants on the three primary chains, not every Cartesian product.
    if (["sol", "bsc", "robinhood"].includes(chain)) {
      await run(`${chain}-kol-limit1`, "getKol", [chain, 1], chain, "limit-1");
      if (wallets.length > 1)
        await run(
          `${chain}-stats-batch30d`,
          "getWalletStats",
          [chain, wallets.slice(0, 2), "30d"],
          chain,
          "batch-2-30d",
        );
      await run(`${chain}-rank24h`, "getTrendingSwaps", [chain, "24h", { limit: 2 }], chain, "24h");
    }
    writeReport(reportFile, report);
  }
  return {
    cases: report.cases.length,
    passed: report.cases.filter((r) => r.status === "passed").length,
    failed: report.cases.filter((r) => r.status === "failed").length,
    notRun: report.cases.filter((r) => r.status === "not-run").length,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.env.GMGN_QUALIFY !== "1") throw new Error("Qualification is opt-in");
    console.log(
      await qualify({
        apiKey: process.env.GMGN_API_KEY,
        privateKeyPem: process.env.GMGN_API_SIGNING_KEY,
        resume: process.env.GMGN_QUALIFY_RESUME === "1",
        fromChain: process.env.GMGN_QUALIFY_FROM_CHAIN ?? "sol",
        profile: process.env.GMGN_QUALIFY_PROFILE ?? "full",
      }),
    );
  } catch {
    console.error("Qualification stopped; inspect privately.");
    process.exitCode = 1;
  }
}
