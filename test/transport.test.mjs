import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { GmgnClient, GmgnError } from "../dist/index.js";

const ok = (data) => new Response(JSON.stringify({ code: 0, data }));
const client = (fetch, options = {}) =>
  new GmgnClient({ apiKey: "synthetic", fetch, maxRetries: 0, ...options });

test("configuration rejects unsafe origins and invalid budgets", () => {
  for (const host of [
    "http://example.com",
    "https://user:pw@example.com",
    "https://example.com/path",
    "https://example.com/?key=x",
  ]) {
    assert.throws(() => new GmgnClient({ apiKey: "fake", host }), { kind: "configuration" });
  }
  for (const maxRetries of [-1, 6, NaN, 1.5]) {
    assert.throws(() => client(async () => ok([]), { maxRetries }), { kind: "configuration" });
  }
});

test("HTTP errors cannot be overridden by business success", async () => {
  await assert.rejects(
    client(async () => new Response('{"code":0,"data":"wrong"}', { status: 500 })).getKol(),
    { kind: "http", status: 500 },
  );
});

test("malformed envelopes fail with stable protocol errors", async () => {
  for (const raw of ["null", "[]", "{}", '{"code":"0","data":[]}', '{"code":0}', "not-json"]) {
    await assert.rejects(client(async () => new Response(raw)).getKol(), { kind: "protocol" });
  }
});

test("nullable payloads and decimal strings remain unchanged", async () => {
  assert.equal(await client(async () => ok(null)).getKol(), null);
  assert.deepEqual(await client(async () => ok({ amount: "9007199254740993" })).getKol(), {
    amount: "9007199254740993",
  });
});

test("extension parameters cannot override explicit wallet identity", async () => {
  const c = client(async (url) => {
    const u = new URL(url);
    assert.equal(u.searchParams.get("chain"), "sol");
    assert.equal(u.searchParams.get("wallet_address"), "right");
    return ok([]);
  });
  await c.getWalletActivity("sol", "right", { chain: "bsc", wallet_address: "wrong" });
});

test("aborted scope never sends and does not mutate the parent", async () => {
  let calls = 0;
  const c = client(async () => {
    calls++;
    return ok([]);
  });
  await assert.rejects(c.withOptions({ signal: AbortSignal.abort() }).getKol(), {
    kind: "aborted",
    outcomeUnknown: false,
  });
  assert.equal(calls, 0);
  await c.getKol();
  assert.equal(calls, 1);
});

test("request scopes cannot alter host, fetch, or execution configuration", async () => {
  let calls = 0;
  const c = client(async () => {
    calls++;
    return ok([]);
  });
  const scope = c.withOptions({
    host: "https://untrusted.invalid",
    enableTrading: true,
    fetch: async () => {
      throw new Error("wrong fetch");
    },
  });
  await scope.getKol();
  assert.equal(calls, 1);
  await assert.rejects(scope.swap({}), { kind: "execution_disabled" });
});

test("retry wait obeys the total deadline", async () => {
  let calls = 0;
  await assert.rejects(
    client(
      async () => {
        calls++;
        return new Response('{"code":429}', { status: 429, headers: { "retry-after": "1" } });
      },
      { timeoutMs: 20, maxRetries: 2 },
    ).getKol(),
    { kind: "timeout" },
  );
  assert.equal(calls, 1);
});

test("retry count is bounded and re-signs every attempt", async () => {
  const ids = new Set();
  const signatures = new Set();
  const { privateKey } = generateKeyPairSync("ed25519");
  await assert.rejects(
    client(
      async (url, init) => {
        ids.add(new URL(url).searchParams.get("client_id"));
        signatures.add(init.headers["X-Signature"]);
        return new Response('{"code":503}', { status: 503 });
      },
      {
        maxRetries: 2,
        privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }),
      },
    ).getWalletHoldings("sol", "wallet"),
    { kind: "http", status: 503 },
  );
  assert.equal(ids.size, 3);
  assert.equal(signatures.size, 3);
});

test("HTTP error metadata does not expose reflected server secrets", async () => {
  await assert.rejects(
    client(
      async () =>
        new Response('{"code":403,"message":"synthetic-secret","error":"synthetic-secret"}', {
          status: 403,
        }),
    ).getKol(),
    (error) => {
      assert.ok(!JSON.stringify(error).includes("synthetic-secret"));
      assert.ok(!error.message.includes("synthetic-secret"));
      return true;
    },
  );
});

test("deadline aborts fetch and response body consumption", async () => {
  const hangingFetch = async (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  await assert.rejects(client(hangingFetch, { timeoutMs: 20 }).getKol(), { kind: "timeout" });
  const hangingBody = async () => new Response(new ReadableStream({ start() {} }));
  await assert.rejects(client(hangingBody, { timeoutMs: 20 }).getKol(), { kind: "timeout" });
});

test("response size is bounded and oversized streams are cancelled", async () => {
  let cancelled = false;
  await assert.rejects(
    client(
      async () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(new Uint8Array(40));
            },
            cancel() {
              cancelled = true;
            },
          }),
        ),
      { maxResponseBytes: 20 },
    ).getKol(),
    { kind: "protocol" },
  );
  assert.equal(cancelled, true);
});

test("server cooldown above budget does not get shortened", async () => {
  let calls = 0;
  const c = client(
    async () => {
      calls++;
      return new Response('{"code":429}', { status: 429, headers: { "retry-after": "60" } });
    },
    { maxRetries: 2, maxRetryDelayMs: 100 },
  );
  await assert.rejects(c.getKol(), { kind: "http", status: 429, retryAfterMs: 60000 });
  assert.equal(calls, 1);
});

test("safe POST reads retry, business errors and blocks do not", async () => {
  let calls = 0;
  const c = client(
    async () => (++calls === 1 ? new Response("gateway", { status: 503 }) : ok([])),
    { maxRetries: 1 },
  );
  assert.deepEqual(await c.getWalletProfits("sol", ["wallet"]), []);
  assert.equal(calls, 2);
  for (const [status, body] of [
    [200, { code: 123 }],
    [429, { code: 429, error: "ERROR_RATE_LIMIT_BLOCKED" }],
  ]) {
    calls = 0;
    await assert.rejects(
      client(
        async () => {
          calls++;
          return new Response(JSON.stringify(body), { status });
        },
        { maxRetries: 2 },
      ).getKol(),
      GmgnError,
    );
    assert.equal(calls, 1);
  }
});

test("execution requires opt-in, never retries, and marks ambiguous outcomes", async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    throw new Error("secret upstream credential");
  };
  await assert.rejects(client(fetch).swap({}), { kind: "execution_disabled" });
  await assert.rejects(client(fetch, { enableTrading: "false" }).swap({}), {
    kind: "execution_disabled",
  });
  assert.equal(calls, 0);
  const { privateKey } = generateKeyPairSync("ed25519");
  const c = client(fetch, {
    enableTrading: true,
    maxRetries: 5,
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }),
  });
  await assert.rejects(c.swap({}), (error) => {
    assert.equal(error.outcomeUnknown, true);
    assert.equal(error.kind, "network");
    assert.ok(!JSON.stringify(error).includes("secret"));
    assert.ok(!error.message.includes("secret"));
    return true;
  });
  assert.equal(calls, 1);
});

test("native fetch rejects cross-origin redirects without forwarding credentials", async (t) => {
  let targetCalls = 0;
  const target = createServer((_req, res) => {
    targetCalls++;
    res.end('{"code":0,"data":[]}');
  });
  const source = createServer((_req, res) => {
    res.writeHead(302, { location: `http://127.0.0.1:${target.address().port}/sink` });
    res.end();
  });
  for (const server of [target, source]) {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(() => {
      server.closeAllConnections();
      server.close();
    });
  }
  const c = new GmgnClient({
    apiKey: "synthetic",
    host: `http://127.0.0.1:${source.address().port}`,
    allowInsecureLocalhost: true,
    maxRetries: 0,
  });
  await assert.rejects(c.getKol(), { kind: "network" });
  assert.equal(targetCalls, 0);
});
