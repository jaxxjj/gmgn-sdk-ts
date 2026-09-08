import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify, constants } from "node:crypto";
import { GmgnClient } from "../dist/index.js";
import { matrix, endpointCases } from "./support/endpoint-matrix.mjs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const key = privateKey.export({ type: "pkcs8", format: "pem" });
const options = { apiKey: "synthetic-matrix", privateKeyPem: key, maxRetries: 0 };
const payload = {
  value: "900719925474099312345",
  zero: 0,
  flag: false,
  nullable: null,
  extension: ["future"],
};
const canonicalOperation = (name) => (name === "getTokenSignalV2" ? "getTokenSignals" : name);
const queryEntries = (query) =>
  Object.entries(query).flatMap(([k, v]) =>
    (Array.isArray(v) ? v : [v]).map((x) => [k, String(x)]),
  );
const sortEntries = (rows) =>
  rows.sort(([ka, va], [kb, vb]) => ka.localeCompare(kb) || va.localeCompare(vb));
function signedMessage(url, body) {
  const query = [...new Set(url.searchParams.keys())]
    .sort()
    .flatMap((key) =>
      url.searchParams
        .getAll(key)
        .sort()
        .map((value) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`),
    )
    .join("&");
  return Buffer.from(`${url.pathname}:${query}:${body ?? ""}:${url.searchParams.get("timestamp")}`);
}

test("matrix inventory covers every public endpoint and has no duplicate cases", () => {
  const methods = Object.getOwnPropertyNames(GmgnClient.prototype).filter(
    (n) => !["constructor", "withOptions", "authExistRequest", "authSignedRequest"].includes(n),
  );
  assert.deepEqual([...new Set(matrix.map((row) => row.name))].sort(), methods.sort());
  assert.equal(
    new Set(matrix.map((row) => JSON.stringify([row.name, row.args]))).size,
    matrix.length,
  );
});

for (const row of matrix) {
  test(`wire matrix ${row.name}/${row.chain}/${row.variant}`, async () => {
    const before = structuredClone(row.args);
    let calls = 0;
    const client = new GmgnClient({
      ...options,
      enableTrading: true,
      fetch: async (input, init) => {
        calls++;
        const url = new URL(input);
        assert.equal(url.origin, "https://openapi.gmgn.ai");
        assert.equal(url.pathname, row.path);
        assert.equal(init.method, row.method);
        assert.equal(init.redirect, "error");
        assert.equal(init.headers["X-APIKEY"], options.apiKey);
        assert.equal(Boolean(init.headers["X-Signature"]), row.signed);
        if (row.signed)
          assert.ok(
            verify(
              null,
              signedMessage(url, init.body),
              publicKey,
              Buffer.from(init.headers["X-Signature"], "base64"),
            ),
          );
        assert.match(url.searchParams.get("timestamp"), /^\d+$/);
        assert.match(url.searchParams.get("client_id"), /^[0-9a-f-]{36}$/);
        const actual = [...url.searchParams].filter(
          ([key]) => !["timestamp", "client_id"].includes(key),
        );
        assert.deepEqual(sortEntries(actual), sortEntries(queryEntries(row.query)));
        assert.deepEqual(init.body === undefined ? undefined : JSON.parse(init.body), row.body);
        return new Response(JSON.stringify({ code: 0, data: payload }));
      },
    });
    assert.deepEqual(await client[row.name](...row.args), payload);
    assert.deepEqual(row.args, before, "Client mutated caller input");
    assert.equal(calls, 1);
  });
}

const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
for (const full of [false, true])
  for (const row of endpointCases("sol", full).filter((row) => row.signed))
    test(`RSA signed wire ${row.name}/${row.variant}`, async () => {
      const client = new GmgnClient({
        ...options,
        enableTrading: true,
        privateKeyPem: rsa.privateKey.export({ type: "pkcs8", format: "pem" }),
        fetch: async (input, init) => {
          assert.ok(
            verify(
              "sha256",
              signedMessage(new URL(input), init.body),
              {
                key: rsa.publicKey,
                padding: constants.RSA_PKCS1_PSS_PADDING,
                saltLength: 32,
              },
              Buffer.from(init.headers["X-Signature"], "base64"),
            ),
          );
          return new Response('{"code":0,"data":null}');
        },
      });
      assert.equal(await client[row.name](...row.args), null);
    });

// Cross every method's policy with terminal failures; no real service is called.
for (const row of endpointCases()) {
  for (const [label, status, body, kind] of [
    ["unauthorized", 401, '{"secret":"matrix-secret"}', "http"],
    ["forbidden", 403, "<html>matrix-secret</html>", "http"],
    ["rate-limit", 429, '{"code":0,"data":{}}', "http"],
    ["unavailable", 503, '{"code":0,"data":{}}', "http"],
    ["malformed", 200, "not-json matrix-secret", "protocol"],
    ["business", 200, '{"code":17,"message":"matrix-secret","data":{}}', "api"],
    ["missing-data", 200, '{"code":0}', "protocol"],
  ])
    test(`failure matrix ${row.name}/${label}`, async () => {
      let calls = 0;
      const client = new GmgnClient({
        ...options,
        enableTrading: true,
        fetch: async () => {
          calls++;
          return new Response(body, { status });
        },
      });
      await assert.rejects(client[row.name](...row.args), (error) => {
        assert.equal(error.kind, kind);
        assert.equal(error.operation, canonicalOperation(row.name));
        assert.equal(error.outcomeUnknown, row.write);
        assert.ok(!JSON.stringify(error).includes("matrix-secret"));
        return true;
      });
      assert.equal(calls, 1);
    });
  test(`cancellation matrix ${row.name}`, async () => {
    let calls = 0;
    const client = new GmgnClient({
      ...options,
      enableTrading: true,
      signal: AbortSignal.abort(),
      fetch: async () => {
        calls++;
      },
    });
    await assert.rejects(client[row.name](...row.args), { kind: "aborted", outcomeUnknown: false });
    assert.equal(calls, 0);
  });
  if (row.signed)
    test(`missing signing key matrix ${row.name}`, async () => {
      let calls = 0;
      const client = new GmgnClient({
        ...options,
        privateKeyPem: undefined,
        enableTrading: true,
        fetch: async () => {
          calls++;
        },
      });
      await assert.rejects(client[row.name](...row.args), {
        kind: "authentication",
        outcomeUnknown: false,
      });
      assert.equal(calls, 0);
    });
  if (row.write) {
    test(`execution opt-in matrix ${row.name}`, async () => {
      let calls = 0;
      const client = new GmgnClient({
        ...options,
        fetch: async () => {
          calls++;
        },
      });
      await assert.rejects(client[row.name](...row.args), {
        kind: "execution_disabled",
        outcomeUnknown: false,
      });
      assert.equal(calls, 0);
    });
    test(`ambiguous write is never retried ${row.name}`, async () => {
      let calls = 0;
      const client = new GmgnClient({
        ...options,
        enableTrading: true,
        maxRetries: 5,
        fetch: async () => {
          calls++;
          throw new Error("lost response");
        },
      });
      await assert.rejects(client[row.name](...row.args), {
        kind: "network",
        outcomeUnknown: true,
      });
      assert.equal(calls, 1);
    });
  }
}
