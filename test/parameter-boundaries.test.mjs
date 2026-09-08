import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { GmgnClient } from "../dist/index.js";
import { chains } from "./support/endpoint-matrix.mjs";
const { privateKey } = generateKeyPairSync("ed25519");
const pem = privateKey.export({ type: "pkcs8", format: "pem" });
function harness() {
  const calls = [];
  const client = new GmgnClient({
    apiKey: "synthetic",
    privateKeyPem: pem,
    maxRetries: 0,
    fetch: async (url, init) => {
      calls.push({ url: new URL(url), init });
      return new Response('{"code":0,"data":null}');
    },
  });
  return { client, calls };
}
for (const chain of chains)
  for (const resolution of ["1s", "1m", "5m", "1h", "1d"])
    for (const [from, to] of [
      [undefined, undefined],
      [0, undefined],
      [undefined, 1788829200],
      [1788825600, 1788829200],
    ])
      test(`kline serialization ${chain}/${resolution}/${from}/${to}`, async () => {
        const { client, calls } = harness();
        assert.equal(await client.getTokenKline(chain, "mint", resolution, from, to), null);
        const query = calls[0].url.searchParams;
        assert.equal(query.get("chain"), chain);
        assert.equal(query.get("resolution"), resolution);
        assert.equal(query.get("from"), from === undefined ? null : String(from));
        assert.equal(query.get("to"), to === undefined ? null : String(to));
      });
for (const name of [
  "getTokenTopHolders",
  "getTokenTopTraders",
  "getWalletHoldings",
  "getWalletActivity",
  "getFollowTokens",
  "getCreatedTokens",
])
  for (const cursor of ["", "opaque/+==", "游标"])
    test(`opaque cursor and identity precedence ${name}/${cursor}`, async () => {
      const { client, calls } = harness();
      await client[name]("sol", "identity", {
        chain: "bsc",
        address: "wrong",
        wallet_address: "wrong",
        cursor,
        limit: 0,
      });
      const query = calls[0].url.searchParams;
      assert.equal(query.get("chain"), "sol");
      assert.equal(
        query.get(name.startsWith("getToken") ? "address" : "wallet_address"),
        "identity",
      );
      assert.equal(query.get("cursor"), cursor);
      assert.equal(query.get("limit"), "0");
    });
for (const values of [[], ["a"], ["a", "b"], ["a", "a"]])
  for (const period of [undefined, "1d", "7d", "30d"])
    test(`wallet batch ${values.length}/${values.join("-")}/${period}`, async () => {
      const { client, calls } = harness();
      await client.getWalletStats("sol", values, period);
      await client.getWalletProfits("sol", values, period);
      assert.deepEqual(calls[0].url.searchParams.getAll("wallet_address"), values);
      assert.equal(calls[0].url.searchParams.get("period"), period ?? "7d");
      assert.deepEqual(JSON.parse(calls[1].init.body), {
        chain: "sol",
        period: period ?? "7d",
        wallet_addresses: values,
      });
    });
for (const types of [
  undefined,
  [],
  ["completed"],
  ["new_creation", "near_completion"],
  ["completed", "completed"],
])
  for (const platforms of [undefined, [], ["platform-a", "platform-b"]])
    test(`trenches sections/platforms ${JSON.stringify(types)}/${JSON.stringify(platforms)}`, async () => {
      const { client, calls } = harness();
      await client.getTrenches({
        chain: "sol",
        types,
        platforms,
        limit: 1,
        filters: { min_mc: 0 },
      });
      const body = JSON.parse(calls[0].init.body);
      const names = [
        ...new Set(types?.length ? types : ["new_creation", "near_completion", "completed"]),
      ];
      assert.deepEqual(
        Object.keys(body)
          .filter((key) => key !== "version")
          .sort(),
        names.sort(),
      );
      for (const name of names) {
        assert.equal(body[name].limit, 1);
        assert.equal(body[name].min_mc, 0);
        assert.deepEqual(body[name].launchpad_platform, platforms?.length ? platforms : undefined);
      }
    });
for (const value of [NaN, Infinity, -Infinity])
  for (const name of ["getKol", "getSmartMoney"])
    test(`nonfinite query rejected ${name}/${value}`, async () => {
      const { client, calls } = harness();
      await assert.rejects(client[name]("sol", value), { kind: "configuration" });
      assert.equal(calls.length, 0);
    });
