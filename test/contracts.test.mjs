import test from "node:test";
import assert from "node:assert/strict";
import { GmgnClient, OpenApiClient } from "../dist/index.js";

test("canonical class name and legacy alias agree", () => {
  assert.equal(GmgnClient, OpenApiClient);
  assert.equal(GmgnClient.name, "GmgnClient");
});

test("trenches rejects reserved fields and invalid sections before sending", async () => {
  let calls = 0;
  const client = new GmgnClient({
    apiKey: "fake",
    fetch: async () => {
      calls++;
      return new Response('{"code":0,"data":[]}');
    },
  });
  for (const params of [
    { chain: "sol", types: ["version"] },
    { chain: "sol", limit: 5, filters: { limit: 999 } },
    { chain: "sol", filters: { quote_address_type: "bad" } },
    { chain: "sol", limit: 0 },
  ]) {
    await assert.rejects(client.getTrenches(params), {
      kind: "configuration",
      operation: "getTrenches",
      reason: "invalid_parameters",
      attempt: 0,
    });
  }
  await assert.rejects(client.getTrenches("sol", ["version"]), { kind: "configuration" });
  assert.equal(calls, 0);
});

test("trenches object and legacy calls produce the same valid request", async () => {
  const bodies = [];
  const client = new GmgnClient({
    apiKey: "fake",
    fetch: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return new Response('{"code":0,"data":[]}');
    },
  });
  await client.getTrenches({
    chain: "sol",
    types: ["completed"],
    limit: 5,
    filters: { min_mc: 10 },
  });
  await client.getTrenches("sol", ["completed"], undefined, 5, { min_mc: 10 });
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(bodies[0].version, "v2");
  assert.equal(bodies[0].completed.limit, 5);
});

test("preparation failures never send or retry", async () => {
  let calls = 0;
  const client = new GmgnClient({
    apiKey: "fake",
    maxRetries: 5,
    privateKeyPem: "invalid",
    fetch: async () => {
      calls++;
      throw new Error("unexpected");
    },
  });
  await assert.rejects(client.getWalletHoldings("sol", "wallet"), {
    kind: "authentication",
    operation: "getWalletHoldings",
    reason: "request_preparation",
    attempt: 1,
  });
  await assert.rejects(client.getKol("sol", NaN), {
    kind: "configuration",
    operation: "getKol",
    reason: "request_preparation",
    attempt: 1,
  });
  assert.equal(calls, 0);
});

test("protocol error reason identifies operation without response secrets", async () => {
  const client = new GmgnClient({
    apiKey: "fake",
    fetch: async () => new Response('{"secret":"do-not-log"}'),
  });
  await assert.rejects(client.getTokenInfo("sol", "mint"), (error) => {
    assert.equal(error.operation, "getTokenInfo");
    assert.equal(error.reason, "invalid_envelope");
    assert.equal(error.attempt, 1);
    assert.ok(!JSON.stringify(error).includes("do-not-log"));
    return true;
  });
});
