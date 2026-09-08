// Independent protocol oracle. Do not derive expected requests from production code.
export const chains = ["sol", "bsc", "base", "eth", "robinhood", "arc", "stable"];
export const signedReads = new Set([
  "getWalletHoldings",
  "getFollowWallet",
  "queryOrder",
  "getStrategyOrders",
]);
export const writes = new Set([
  "swap",
  "multiSwap",
  "createStrategyOrder",
  "cancelStrategyOrder",
  "createToken",
]);
const quoteTypes = {
  sol: [4, 5, 3, 1, 13, 0],
  bsc: [6, 7, 1, 16, 8, 3, 9, 10, 2, 17, 18, 0],
  base: [11, 3, 12, 13, 0],
  eth: [20, 11, 8, 3, 12, 1, 0],
  robinhood: [11, 20, 24, 12, 0],
};

export function endpointCases(chain = "sol", full = false, values = {}) {
  const token =
    values.token ??
    (chain === "sol"
      ? "11111111111111111111111111111112"
      : "0x0000000000000000000000000000000000000002");
  const wallet =
    values.wallet ??
    (chain === "sol"
      ? "11111111111111111111111111111113"
      : "0x0000000000000000000000000000000000000003");
  const otherWallet = values.otherWallet ?? wallet;
  const otherToken = values.otherToken ?? token;
  const rows = [];
  const add = (name, method, path, args, query = {}, body = undefined, scope = "chain") =>
    rows.push({
      name,
      method,
      path,
      args,
      query,
      body,
      scope,
      chain,
      variant: full ? "options" : "minimal",
      signed: signedReads.has(name) || writes.has(name),
      write: writes.has(name),
    });
  const tokenQuery = { chain, address: token };
  for (const [name, path] of [
    ["getTokenInfo", "/v1/token/info"],
    ["getTokenSecurity", "/v1/token/security"],
    ["getTokenPoolInfo", "/v1/token/pool_info"],
  ])
    add(name, "GET", path, [chain, token], tokenQuery);
  for (const [name, path] of [
    ["getTokenTopHolders", "/v1/market/token_top_holders"],
    ["getTokenTopTraders", "/v1/market/token_top_traders"],
  ]) {
    const extra = full ? { limit: 2, orderby: "balance", direction: "desc" } : {};
    add(name, "GET", path, [chain, token, extra], { ...extra, ...tokenQuery });
  }
  add(
    "getTokenKline",
    "GET",
    "/v1/market/token_kline",
    full ? [chain, token, "1m", 1788825600, 1788829200] : [chain, token, "1m"],
    { ...tokenQuery, resolution: "1m", ...(full ? { from: 1788825600, to: 1788829200 } : {}) },
  );
  const walletQuery = { chain, wallet_address: wallet };
  for (const [name, path] of [
    ["getWalletHoldings", "/v1/user/wallet_holdings"],
    ["getWalletActivity", "/v1/user/wallet_activity"],
    ["getFollowTokens", "/v1/user/follow_tokens"],
    ["getCreatedTokens", "/v1/user/created_tokens"],
  ]) {
    const extra = full
      ? { limit: 2, ...(name === "getWalletActivity" ? { type: ["buy", "sell"] } : {}) }
      : {};
    add(name, "GET", path, [chain, wallet, extra], { ...extra, ...walletQuery });
  }
  const wallets = full ? [wallet, otherWallet] : [wallet];
  const period = full ? "30d" : "7d";
  add("getWalletStats", "GET", "/v1/user/wallet_stats", [chain, wallets, period], {
    chain,
    wallet_address: wallets,
    period,
  });
  add(
    "getWalletProfits",
    "POST",
    "/v1/user/wallet_profits",
    [chain, wallets, period],
    {},
    { chain, period, wallet_addresses: wallets },
  );
  add("getWalletTokenBalance", "GET", "/v1/user/wallet_token_balance", [chain, wallet, token], {
    ...walletQuery,
    token_address: token,
  });
  const sections = full ? ["completed"] : ["new_creation", "near_completion", "completed"];
  const section = {
    filters: ["offchain", "onchain"],
    launchpad_platform_v2: true,
    limit: full ? 2 : 80,
    ...(full ? { min_mc: 10, launchpad_platform: ["synthetic-platform"] } : {}),
    ...(quoteTypes[chain] ? { quote_address_type: quoteTypes[chain] } : {}),
  };
  add(
    "getTrenches",
    "POST",
    "/v1/trenches",
    [
      full
        ? {
            chain,
            types: sections,
            limit: 2,
            platforms: ["synthetic-platform"],
            filters: { min_mc: 10 },
          }
        : { chain },
    ],
    { chain },
    { version: "v2", ...Object.fromEntries(sections.map((name) => [name, section])) },
  );
  const extra = full ? { limit: 2, filters: ["renounced", "frozen"] } : {};
  add("getTrendingSwaps", "GET", "/v1/market/rank", [chain, full ? "24h" : "1h", extra], {
    ...extra,
    chain,
    interval: full ? "24h" : "1h",
  });
  const groups = full
    ? [
        {
          signal_type: [1, 2],
          mc_min: 1,
          mc_max: 1000000,
          trigger_mc_min: 2,
          trigger_mc_max: 999999,
          total_fee_min: 0,
          total_fee_max: 100,
          min_create_or_open_ts: "1788825600",
          max_create_or_open_ts: "1788829200",
        },
      ]
    : [];
  for (const name of ["getTokenSignalV2", "getTokenSignals"])
    add(name, "POST", "/v1/market/token_signal", [chain, groups], {}, { chain, groups });
  const params = [
    {
      chain,
      interval: "1h",
      limit: 2,
      ...(full ? { label: "fixture", filters: ["renounced"], min_mc: 1 } : {}),
    },
  ];
  add("getHotSearches", "POST", "/v1/market/hot_searches", [params], {}, { params });
  const searchExtra = full ? { chain, limit: 2, type: ["token", "wallet"] } : {};
  add("searchMarket", "GET", "/v1/market/search", [token, searchExtra], {
    ...searchExtra,
    q: token,
  });
  add("getUserInfo", "GET", "/v1/user/info", [], {}, undefined, "global");
  const followExtra = full ? { limit: 2, tags: ["kol", "smart_money"] } : {};
  add("getFollowWallet", "GET", "/v1/trade/follow_wallet", [chain, followExtra], {
    ...followExtra,
    chain,
  });
  add("getFollowGroupNames", "GET", "/v1/user/follow_token_groups", [chain, wallet], walletQuery);
  for (const [name, path] of [
    ["getKol", "/v1/user/kol"],
    ["getSmartMoney", "/v1/user/smartmoney"],
  ])
    add(name, "GET", path, full ? [chain, 2] : [chain], { chain, ...(full ? { limit: 2 } : {}) });
  add(
    "quoteOrder",
    "GET",
    "/v1/trade/quote",
    [chain, wallet, token, otherToken, "1", full ? 0.01 : 0],
    {
      chain,
      from_address: wallet,
      input_token: token,
      output_token: otherToken,
      input_amount: "1",
      slippage: full ? 0.01 : 0,
    },
  );
  add("queryOrder", "GET", "/v1/trade/query_order", [values.orderId ?? "synthetic-order", chain], {
    order_id: values.orderId ?? "synthetic-order",
    chain,
  });
  add("getGasPrice", "GET", "/v1/trade/gas_price", [chain], { chain });
  const orderExtra = full ? { limit: 2, status: "active" } : {};
  add("getStrategyOrders", "GET", "/v1/trade/strategy/orders", [chain, orderExtra], {
    ...orderExtra,
    chain,
  });
  add("getCookingStatistics", "GET", "/v1/cooking/statistics", [], {}, undefined, "global");
  const common = {
    chain,
    from_address: wallet,
    input_token: token,
    output_token: otherToken,
    input_amount: "1",
  };
  const options = {
    slippage: 0,
    auto_slippage: false,
    is_anti_mev: false,
    auto_fee: false,
    priority_fee: "0",
    tip_fee: "0",
    gas_price: "0",
    max_fee_per_gas: "0",
    max_priority_fee_per_gas: "0",
    gas_level: "standard",
    swap_mode: "exact_in",
    input_amount_bps: "100",
    output_amount: "2",
    min_output_amount: "1",
    sell_ratio_type: "balance",
    condition_orders: [
      {
        order_type: "loss_stop",
        side: "sell",
        price_scale: "0.9",
        sell_ratio: "0.5",
        drawdown_rate: "0.1",
      },
    ],
  };
  const swap = { ...common, ...(full ? options : {}) };
  const multi = {
    chain,
    accounts: [wallet, otherWallet],
    input_token: token,
    output_token: otherToken,
    ...(full
      ? {
          ...options,
          input_amount: { [wallet]: "1" },
          input_amount_bps: { [wallet]: "100" },
          output_amount: { [wallet]: "2" },
        }
      : {}),
  };
  const strategy = {
    chain,
    from_address: wallet,
    base_token: token,
    quote_token: otherToken,
    order_type: "limit",
    sub_order_type: "buy",
    ...(full
      ? {
          check_price: "1",
          open_price: "1",
          amount_in: "1",
          amount_in_percent: "10",
          limit_price_mode: "price",
          price_gap_ratio: "0",
          expire_in: 60,
          quote_investment: "1",
          buy_param: { auto_fee: false, slippage: 0 },
          sell_param: { tip_fee: "0" },
          custom_rpc: "https://fixture.invalid",
          anti_mev_mode: "secure",
          fee: "0",
          ...Object.fromEntries(
            Object.entries(options).filter(
              ([key]) =>
                !["swap_mode", "input_amount_bps", "output_amount", "min_output_amount"].includes(
                  key,
                ),
            ),
          ),
        }
      : {}),
  };
  const cancel = {
    chain,
    from_address: wallet,
    order_id: "synthetic-order",
    ...(full ? { order_type: "limit", close_sell_model: "none" } : {}),
  };
  const create = {
    chain,
    dex: "synthetic",
    from_address: wallet,
    name: "Fixture",
    symbol: "TEST",
    buy_amt: "0",
    image_url: "https://fixture.invalid/image.png",
    ...(full
      ? {
          description: "synthetic",
          website: "https://fixture.invalid",
          slippage: 0,
          auto_slippage: false,
          is_mayhem: false,
          is_cashback: false,
          is_buy_back: false,
          dev_wallet_bps: 0,
          pump_fee_share_list: [{ provider: "solana", username: wallet, basic_points: 10000 }],
          bags_fee_share_list: [{ provider: "solana", username: wallet, basic_points: 10000 }],
          flap_rate_conf: { tax_rate: 0, split_conf: [{ recipient: wallet, bps: 10000 }] },
          fourmeme_rate_conf: { fee_plan: false, fee_rate: 0, recipient_address: wallet },
          buy_wallets: [{ from_address: wallet, buy_amt: "0" }],
          snip_buy_wallets: [],
          buy_trade_config: { slippage: 0 },
          sell_trade_config: { auto_fee: false },
          sell_configs: [
            {
              sell_type: "delay_sell",
              delay_sec: 1,
              delay_mili_sec: 0,
              sell_ratio: "1",
              wallet_addresses: [],
            },
          ],
        }
      : {}),
  };
  for (const [name, path, body] of [
    ["swap", "/v1/trade/swap", swap],
    ["multiSwap", "/v1/trade/multi_swap", multi],
    ["createStrategyOrder", "/v1/trade/strategy/create", strategy],
    ["cancelStrategyOrder", "/v1/trade/strategy/cancel", cancel],
    ["createToken", "/v1/cooking/create_token", create],
  ])
    add(name, "POST", path, [body], {}, body);
  return rows;
}

const seen = new Set();
export const matrix = chains.flatMap((chain) =>
  [false, true].flatMap((full) =>
    endpointCases(chain, full).filter((row) => {
      if (row.scope === "global" && (chain !== "sol" || full)) return false;
      const key = JSON.stringify([row.name, row.args]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ),
);
