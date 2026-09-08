import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPairSync, verify, constants } from "node:crypto";
import { spawnSync } from "node:child_process";
import { GmgnClient, OpenApiClient } from "../dist/index.js";

// A real localhost HTTP boundary exercises the vendored transport, not a
// replacement implementation. No test requests leave the local machine.
async function fixture(t, reply, config = {}) {
  const calls = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const call = {
      method: req.method,
      url: new URL(req.url, "http://localhost"),
      headers: req.headers,
      body,
    };
    calls.push(call);
    const response = reply(call, calls.length);
    res.writeHead(response.status ?? 200, {
      "Content-Type": "application/json",
      ...response.headers,
    });
    res.end(typeof response.raw === "string" ? response.raw : JSON.stringify(response.body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return {
    calls,
    client: new GmgnClient({
      host: `http://127.0.0.1:${server.address().port}`,
      apiKey: "local-test-api-key",
      allowInsecureLocalhost: true,
      ...config,
    }),
  };
}
const ok = (data) => ({ body: { code: 0, data } });

test("library import has no CLI, network or credential-loading side effects", () => {
  const entry = new URL("../dist/index.js", import.meta.url).href;
  const script = `
    const beforeFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error("unexpected request"); };
    const blockedFetch = globalThis.fetch;
    const mod = await import(${JSON.stringify(entry)});
    if (mod.GmgnClient !== mod.OpenApiClient || globalThis.fetch !== blockedFetch) process.exit(2);
    process.stdout.write("ok");
  `;
  const p = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script, "--", "--unexpected-cli-flag"],
    { encoding: "utf8", timeout: 5_000, env: { PATH: process.env.PATH } },
  );
  assert.equal(p.status, 0, p.stderr);
  assert.equal(p.stdout, "ok");
  assert.equal(p.stderr, "");
  assert.equal(GmgnClient, OpenApiClient);
});

test("KOL request builds auth query and preserves unknown fields and decimals", async (t) => {
  const payload = { list: [{ token_amount: "0.000000000000000001", future_field: null }] };
  const { client, calls } = await fixture(t, () => ok(payload));
  assert.deepEqual(await client.getKol("sol", 2), payload);
  const call = calls[0];
  assert.equal(call.method, "GET");
  assert.equal(call.url.pathname, "/v1/user/kol");
  assert.equal(call.url.searchParams.get("chain"), "sol");
  assert.equal(call.url.searchParams.get("limit"), "2");
  assert.equal(call.headers["x-apikey"], "local-test-api-key");
  assert.equal(call.headers["x-signature"], undefined);
  assert.ok(Math.abs(Number(call.url.searchParams.get("timestamp")) - Date.now() / 1000) < 5);
  assert.match(call.url.searchParams.get("client_id"), /^[0-9a-f-]{36}$/);
});

test("smart-money and token pool routing", async (t) => {
  const { client, calls } = await fixture(t, () => ok({}));
  await client.getSmartMoney("bsc", 5);
  await client.getTokenPoolInfo("robinhood", "0x" + "1".repeat(40));
  assert.deepEqual(
    calls.map((c) => c.url.pathname),
    ["/v1/user/smartmoney", "/v1/token/pool_info"],
  );
  assert.equal(calls[1].url.searchParams.get("address"), "0x" + "1".repeat(40));
});

test("array query parameters remain repeated keys; cursor is not interpreted", async (t) => {
  const { client, calls } = await fixture(t, () => ok({ activities: [], next: "next/+==" }));
  const result = await client.getWalletActivity("sol", "wallet", {
    type: ["buy", "sell"],
    cursor: "prior/+==",
    limit: 20,
  });
  assert.deepEqual(calls[0].url.searchParams.getAll("type"), ["buy", "sell"]);
  assert.equal(calls[0].url.searchParams.get("cursor"), "prior/+==");
  assert.equal(result.next, "next/+==");
});

test("batch stats serialize wallet addresses as repeated parameters", async (t) => {
  const { client, calls } = await fixture(t, () => ok([]));
  await client.getWalletStats("bsc", ["a", "b"], "7d");
  assert.deepEqual(calls[0].url.searchParams.getAll("wallet_address"), ["a", "b"]);
});

test("read-only POST payloads preserve provider field names", async (t) => {
  const { client, calls } = await fixture(t, () => ok([]));
  await client.getWalletProfits("sol", ["a", "b"], "7d");
  await client.getTokenSignalV2("bsc", [{ signal_type: [12], mc_min: 10 }]);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(calls[0].body), {
    chain: "sol",
    period: "7d",
    wallet_addresses: ["a", "b"],
  });
  assert.deepEqual(JSON.parse(calls[1].body), {
    chain: "bsc",
    groups: [{ signal_type: [12], mc_min: 10 }],
  });
});

test("kline timestamps are passed through, not converted implicitly", async (t) => {
  const { client, calls } = await fixture(t, () => ok({ list: [] }));
  await client.getTokenKline("sol", "mint", "1m", 100, 200);
  assert.equal(calls[0].url.searchParams.get("from"), "100");
  assert.equal(calls[0].url.searchParams.get("to"), "200");
});

test("business errors and malformed JSON are rejected", async (t) => {
  const { client } = await fixture(t, () => ({ body: { code: 400, error: "BAD_QUERY" } }));
  await assert.rejects(client.getKol("sol"), { kind: "api", apiCode: 400 });
  const invalid = await fixture(t, () => ({ raw: "not JSON" }));
  await assert.rejects(invalid.client.getKol("sol"), { kind: "protocol" });
});

test("401 is not retried", async (t) => {
  const { client, calls } = await fixture(t, () => ({
    status: 401,
    body: { code: 401, message: "unauthorized" },
  }));
  await assert.rejects(client.getKol("sol"), /401/);
  assert.equal(calls.length, 1);
});

test("429 retries safely with fresh authentication", async (t) => {
  const { client, calls } = await fixture(t, (_, attempt) =>
    attempt === 1
      ? {
          status: 429,
          headers: { "x-ratelimit-reset": String(Math.floor(Date.now() / 1000)) },
          body: { code: 429, error: "RATE_LIMIT_EXCEEDED" },
        }
      : ok({ list: [] }),
  );
  assert.deepEqual(await client.getKol("sol"), { list: [] });
  assert.equal(calls.length, 2);
  assert.notEqual(
    calls[0].url.searchParams.get("client_id"),
    calls[1].url.searchParams.get("client_id"),
  );
});

test("separate calls receive distinct authentication request IDs", async (t) => {
  const { client, calls } = await fixture(t, () => ok({ list: [] }));
  await client.getKol("sol");
  await client.getKol("sol");
  assert.notEqual(
    calls[0].url.searchParams.get("client_id"),
    calls[1].url.searchParams.get("client_id"),
  );
});

test("long cooldown does not block for minutes or retry", async (t) => {
  const { client, calls } = await fixture(t, () => ({
    status: 429,
    headers: { "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 600) },
    body: { code: 429, error: "RATE_LIMIT_BANNED" },
  }));
  await assert.rejects(client.getKol("sol"), /429/);
  assert.equal(calls.length, 1);
});

test("signed endpoints reject missing key without sending a request", async (t) => {
  const { client, calls } = await fixture(t, () => ok({}));
  await assert.rejects(client.getFollowWallet("sol"), { kind: "authentication" });
  await assert.rejects(client.getWalletHoldings("sol", "wallet"), { kind: "authentication" });
  assert.equal(calls.length, 0);
});

function signatureMessage(call) {
  const entries = [...call.url.searchParams.entries()].sort(([ka, va], [kb, vb]) =>
    ka < kb ? -1 : ka > kb ? 1 : va < vb ? -1 : va > vb ? 1 : 0,
  );
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return `${call.url.pathname}:${query}:${call.body}:${call.url.searchParams.get("timestamp")}`;
}

test("Ed25519 signed read verifies independently with node crypto", async (t) => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const { client, calls } = await fixture(t, () => ok({ list: [] }), {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }),
  });
  await client.getWalletHoldings("sol", "wallet", { limit: 3 });
  assert.ok(
    verify(
      null,
      Buffer.from(signatureMessage(calls[0])),
      publicKey,
      Buffer.from(calls[0].headers["x-signature"], "base64"),
    ),
  );
});

test("RSA-PSS signed read verifies independently", async (t) => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const { client, calls } = await fixture(t, () => ok({ list: [] }), {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }),
  });
  await client.getFollowWallet("bsc");
  assert.ok(
    verify(
      "sha256",
      Buffer.from(signatureMessage(calls[0])),
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      Buffer.from(calls[0].headers["x-signature"], "base64"),
    ),
  );
});

test("signed writes are not retried; test never leaves localhost", async (t) => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const { client, calls } = await fixture(
    t,
    () => ({
      status: 429,
      headers: { "x-ratelimit-reset": String(Math.floor(Date.now() / 1000)) },
      body: { code: 429, error: "RATE_LIMIT_EXCEEDED" },
    }),
    { privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }), enableTrading: true },
  );
  await assert.rejects(
    client.cancelStrategyOrder({
      chain: "sol",
      from_address: "mock-wallet",
      order_id: "mock-order",
    }),
    /429/,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.pathname, "/v1/trade/strategy/cancel");
});
