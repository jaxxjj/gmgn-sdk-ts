import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { GmgnClient } from "../dist/index.js";

// Independent protocol inventory. No server support is implied by these fixtures.
const routes = [
  ["getTokenInfo", ["sol", "mint"], "GET", "/v1/token/info"],
  ["getTokenSecurity", ["sol", "mint"], "GET", "/v1/token/security"],
  ["getTokenPoolInfo", ["sol", "mint"], "GET", "/v1/token/pool_info"],
  ["getTokenTopHolders", ["sol", "mint"], "GET", "/v1/market/token_top_holders"],
  ["getTokenTopTraders", ["sol", "mint"], "GET", "/v1/market/token_top_traders"],
  ["getTokenKline", ["sol", "mint", "1m"], "GET", "/v1/market/token_kline"],
  ["getWalletHoldings", ["sol", "wallet"], "GET", "/v1/user/wallet_holdings", true],
  ["getWalletActivity", ["sol", "wallet"], "GET", "/v1/user/wallet_activity"],
  ["getWalletStats", ["sol", ["wallet"]], "GET", "/v1/user/wallet_stats"],
  ["getWalletProfits", ["sol", ["wallet"]], "POST", "/v1/user/wallet_profits"],
  ["getWalletTokenBalance", ["sol", "wallet", "mint"], "GET", "/v1/user/wallet_token_balance"],
  ["getTrenches", ["sol"], "POST", "/v1/trenches"],
  ["getTrendingSwaps", ["sol", "1h"], "GET", "/v1/market/rank"],
  ["getTokenSignalV2", ["sol", []], "POST", "/v1/market/token_signal"],
  ["getHotSearches", [[]], "POST", "/v1/market/hot_searches"],
  ["searchMarket", ["token"], "GET", "/v1/market/search"],
  ["getUserInfo", [], "GET", "/v1/user/info"],
  ["getFollowWallet", ["sol"], "GET", "/v1/trade/follow_wallet", true],
  ["getFollowTokens", ["sol", "wallet"], "GET", "/v1/user/follow_tokens"],
  ["getFollowGroupNames", ["sol", "wallet"], "GET", "/v1/user/follow_token_groups"],
  ["getKol", ["sol", 2], "GET", "/v1/user/kol"],
  ["getSmartMoney", ["sol", 2], "GET", "/v1/user/smartmoney"],
  ["getCreatedTokens", ["sol", "wallet"], "GET", "/v1/user/created_tokens"],
  ["quoteOrder", ["sol", "wallet", "in", "out", "1", 0.01], "GET", "/v1/trade/quote"],
  ["swap", [{}], "POST", "/v1/trade/swap", true],
  ["multiSwap", [{}], "POST", "/v1/trade/multi_swap", true],
  ["queryOrder", ["order", "sol"], "GET", "/v1/trade/query_order", true],
  ["getGasPrice", ["sol"], "GET", "/v1/trade/gas_price"],
  ["createStrategyOrder", [{}], "POST", "/v1/trade/strategy/create", true],
  ["getStrategyOrders", ["sol"], "GET", "/v1/trade/strategy/orders", true],
  ["cancelStrategyOrder", [{}], "POST", "/v1/trade/strategy/cancel", true],
  ["getCookingStatistics", [], "GET", "/v1/cooking/statistics"],
  ["createToken", [{}], "POST", "/v1/cooking/create_token", true],
];

test("protocol inventory covers every public endpoint", () => {
  const methods = Object.getOwnPropertyNames(GmgnClient.prototype).filter(
    (name) =>
      !["constructor", "withOptions", "authExistRequest", "authSignedRequest"].includes(name),
  );
  assert.deepEqual(methods.sort(), routes.map(([name]) => name).sort());
});

for (const [name, args, method, path, signed = false] of routes) {
  test(`route: ${name}`, async () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    let calls = 0;
    const c = new GmgnClient({
      apiKey: "synthetic",
      enableTrading: true,
      privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }),
      fetch: async (url, init) => {
        calls++;
        assert.equal(new URL(url).pathname, path);
        assert.equal(init.method, method);
        assert.equal(Boolean(init.headers["X-Signature"]), signed);
        assert.equal(init.redirect, "error");
        return new Response('{"code":0,"data":{"marker":true}}');
      },
    });
    assert.deepEqual(await c[name](...args), { marker: true });
    assert.equal(calls, 1);
  });
}
