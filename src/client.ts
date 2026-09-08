import { RequestClient, type Query } from "./core/request.js";
import { buildTrenchesBody, type GetTrenchesParams } from "./endpoints/trenches.js";
import type {
  SwapParams,
  MultiSwapParams,
  StrategyCreateParams,
  StrategyCancelParams,
  TokenSignalGroup,
  HotSearchParams,
  CreateTokenParams,
} from "./contracts/parameters.js";
import type { GmgnClientOptions, RequestOptions } from "./options.js";

export class GmgnClient {
  readonly #config: Readonly<GmgnClientOptions>;
  readonly #transport: RequestClient;

  constructor(config: GmgnClientOptions) {
    this.#config = Object.freeze({ ...config });
    this.#transport = new RequestClient(this.#config);
  }

  /** Immutable request scope; never changes options on a shared client. */
  withOptions(options: RequestOptions): GmgnClient {
    return new GmgnClient({
      ...this.#config,
      timeoutMs: options.timeoutMs ?? this.#config.timeoutMs,
      signal: Object.hasOwn(options, "signal") ? options.signal : this.#config.signal,
    });
  }

  // ---- Token endpoints (API-key auth) ----

  async getTokenInfo(chain: string, address: string): Promise<unknown> {
    return this.#request(
      { operation: "getTokenInfo", auth: "api-key", effect: "read" },
      "GET",
      "/v1/token/info",
      { chain, address },
    );
  }

  async getTokenSecurity(chain: string, address: string): Promise<unknown> {
    return this.#request(
      { operation: "getTokenSecurity", auth: "api-key", effect: "read" },
      "GET",
      "/v1/token/security",
      { chain, address },
    );
  }

  async getTokenPoolInfo(chain: string, address: string): Promise<unknown> {
    return this.#request(
      { operation: "getTokenPoolInfo", auth: "api-key", effect: "read" },
      "GET",
      "/v1/token/pool_info",
      { chain, address },
    );
  }

  async getTokenTopHolders(
    chain: string,
    address: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getTokenTopHolders", auth: "api-key", effect: "read" },
      "GET",
      "/v1/market/token_top_holders",
      {
        ...extra,
        chain,
        address,
      },
    );
  }

  async getTokenTopTraders(
    chain: string,
    address: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getTokenTopTraders", auth: "api-key", effect: "read" },
      "GET",
      "/v1/market/token_top_traders",
      {
        ...extra,
        chain,
        address,
      },
    );
  }

  // ---- Market endpoints (API-key auth) ----

  async getTokenKline(
    chain: string,
    address: string,
    resolution: string,
    from?: number,
    to?: number,
  ): Promise<unknown> {
    const query: Record<string, string | number> = { chain, address, resolution };
    if (from != null) query["from"] = from;
    if (to != null) query["to"] = to;
    return this.#request(
      { operation: "getTokenKline", auth: "api-key", effect: "read" },
      "GET",
      "/v1/market/token_kline",
      query,
    );
  }

  // ---- Portfolio endpoints ----

  async getWalletHoldings(
    chain: string,
    walletAddress: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getWalletHoldings", auth: "signed", effect: "read" },
      "GET",
      "/v1/user/wallet_holdings",
      {
        ...extra,
        chain,
        wallet_address: walletAddress,
      },
      null,
    );
  }

  async getWalletActivity(
    chain: string,
    walletAddress: string,
    extra: Record<string, string | number | string[]> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getWalletActivity", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/wallet_activity",
      {
        ...extra,
        chain,
        wallet_address: walletAddress,
      },
    );
  }

  async getWalletStats(chain: string, walletAddresses: string[], period = "7d"): Promise<unknown> {
    return this.#request(
      { operation: "getWalletStats", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/wallet_stats",
      {
        chain,
        wallet_address: walletAddresses,
        period,
      },
    );
  }

  async getWalletProfits(
    chain: string,
    walletAddresses: string[],
    period = "7d",
  ): Promise<unknown> {
    return this.#request(
      { operation: "getWalletProfits", auth: "api-key", effect: "read" },
      "POST",
      "/v1/user/wallet_profits",
      {},
      {
        chain,
        period,
        wallet_addresses: walletAddresses,
      },
    );
  }

  async getWalletTokenBalance(
    chain: string,
    walletAddress: string,
    tokenAddress: string,
  ): Promise<unknown> {
    return this.#request(
      { operation: "getWalletTokenBalance", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/wallet_token_balance",
      {
        chain,
        wallet_address: walletAddress,
        token_address: tokenAddress,
      },
    );
  }

  async getTrenches(params: GetTrenchesParams): Promise<unknown>;
  /** @deprecated Use the object parameter overload. */
  async getTrenches(
    chain: string,
    types?: string[],
    platforms?: string[],
    limit?: number,
    filters?: Record<string, number | string>,
  ): Promise<unknown>;
  async getTrenches(
    input: string | GetTrenchesParams,
    types?: string[],
    platforms?: string[],
    limit?: number,
    filters?: Record<string, number | string>,
  ): Promise<unknown> {
    const params =
      typeof input === "string" ? { chain: input, types, platforms, limit, filters } : input;
    const { chain } = params;
    const body = buildTrenchesBody(
      chain,
      params.types,
      params.platforms,
      params.limit,
      params.filters,
    );
    return this.#request(
      { operation: "getTrenches", auth: "api-key", effect: "read" },
      "POST",
      "/v1/trenches",
      { chain },
      body,
    );
  }

  // ---- Market trending endpoints (API-key auth) ----

  async getTrendingSwaps(
    chain: string,
    interval: string,
    extra: Record<string, string | number | string[]> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getTrendingSwaps", auth: "api-key", effect: "read" },
      "GET",
      "/v1/market/rank",
      { ...extra, chain, interval },
    );
  }

  /** @deprecated Use getTokenSignals. */
  async getTokenSignalV2(chain: string, groups: TokenSignalGroup[]): Promise<unknown> {
    return this.getTokenSignals(chain, groups);
  }
  async getTokenSignals(chain: string, groups: TokenSignalGroup[]): Promise<unknown> {
    return this.#request(
      { operation: "getTokenSignals", auth: "api-key", effect: "read" },
      "POST",
      "/v1/market/token_signal",
      {},
      { chain, groups },
    );
  }

  async getHotSearches(params: HotSearchParams[]): Promise<unknown> {
    return this.#request(
      { operation: "getHotSearches", auth: "api-key", effect: "read" },
      "POST",
      "/v1/market/hot_searches",
      {},
      { params },
    );
  }

  async searchMarket(
    query: string,
    extra: Record<string, string | number | string[]> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "searchMarket", auth: "api-key", effect: "read" },
      "GET",
      "/v1/market/search",
      { ...extra, q: query },
    );
  }

  // ---- User endpoints (API-key auth) ----

  async getUserInfo(): Promise<unknown> {
    return this.#request(
      { operation: "getUserInfo", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/info",
      {},
    );
  }

  async getFollowWallet(
    chain: string,
    extra: Record<string, string | number | string[]> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getFollowWallet", auth: "signed", effect: "read" },
      "GET",
      "/v1/trade/follow_wallet",
      { ...extra, chain },
      null,
    );
  }

  async getFollowTokens(
    chain: string,
    walletAddress: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getFollowTokens", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/follow_tokens",
      {
        ...extra,
        chain,
        wallet_address: walletAddress,
      },
    );
  }

  async getFollowGroupNames(chain: string, walletAddress: string): Promise<unknown> {
    return this.#request(
      { operation: "getFollowGroupNames", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/follow_token_groups",
      {
        chain,
        wallet_address: walletAddress,
      },
    );
  }

  async getKol(chain?: string, limit?: number): Promise<unknown> {
    const query: Record<string, string | number> = {};
    if (chain) query["chain"] = chain;
    if (limit != null) query["limit"] = limit;
    return this.#request(
      { operation: "getKol", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/kol",
      query,
    );
  }

  async getSmartMoney(chain?: string, limit?: number): Promise<unknown> {
    const query: Record<string, string | number> = {};
    if (chain) query["chain"] = chain;
    if (limit != null) query["limit"] = limit;
    return this.#request(
      { operation: "getSmartMoney", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/smartmoney",
      query,
    );
  }

  async getCreatedTokens(
    chain: string,
    walletAddress: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getCreatedTokens", auth: "api-key", effect: "read" },
      "GET",
      "/v1/user/created_tokens",
      {
        ...extra,
        chain,
        wallet_address: walletAddress,
      },
    );
  }

  async quoteOrder(
    chain: string,
    from_address: string,
    input_token: string,
    output_token: string,
    input_amount: string,
    slippage: number,
  ): Promise<unknown> {
    const query = { chain, from_address, input_token, output_token, input_amount, slippage };
    return this.#request(
      { operation: "quoteOrder", auth: "api-key", effect: "read" },
      "GET",
      "/v1/trade/quote",
      query,
    );
  }

  // ---- Swap endpoints (signed auth) ----

  async swap(params: SwapParams): Promise<unknown> {
    return this.#request(
      { operation: "swap", auth: "signed", effect: "write" },
      "POST",
      "/v1/trade/swap",
      {},
      params,
    );
  }

  async multiSwap(params: MultiSwapParams): Promise<unknown> {
    return this.#request(
      { operation: "multiSwap", auth: "signed", effect: "write" },
      "POST",
      "/v1/trade/multi_swap",
      {},
      params,
    );
  }

  async queryOrder(orderId: string, chain: string): Promise<unknown> {
    return this.#request(
      { operation: "queryOrder", auth: "signed", effect: "read" },
      "GET",
      "/v1/trade/query_order",
      { order_id: orderId, chain },
      null,
    );
  }

  async getGasPrice(chain: string): Promise<unknown> {
    return this.#request(
      { operation: "getGasPrice", auth: "api-key", effect: "read" },
      "GET",
      "/v1/trade/gas_price",
      { chain },
    );
  }

  // ---- Strategy order endpoints (signed auth) ----

  async createStrategyOrder(params: StrategyCreateParams): Promise<unknown> {
    return this.#request(
      { operation: "createStrategyOrder", auth: "signed", effect: "write" },
      "POST",
      "/v1/trade/strategy/create",
      {},
      params,
    );
  }

  async getStrategyOrders(
    chain: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.#request(
      { operation: "getStrategyOrders", auth: "signed", effect: "read" },
      "GET",
      "/v1/trade/strategy/orders",
      { ...extra, chain },
      null,
    );
  }

  async cancelStrategyOrder(params: StrategyCancelParams): Promise<unknown> {
    return this.#request(
      { operation: "cancelStrategyOrder", auth: "signed", effect: "write" },
      "POST",
      "/v1/trade/strategy/cancel",
      {},
      params,
    );
  }

  // ---- Cooking endpoints ----

  async getCookingStatistics(): Promise<unknown> {
    return this.#request(
      { operation: "getCookingStatistics", auth: "api-key", effect: "read" },
      "GET",
      "/v1/cooking/statistics",
      {},
    );
  }

  async createToken(params: CreateTokenParams): Promise<unknown> {
    return this.#request(
      { operation: "createToken", auth: "signed", effect: "write" },
      "POST",
      "/v1/cooking/create_token",
      {},
      params,
    );
  }

  #request(
    policy: { operation: string; auth: "signed" | "api-key"; effect: "read" | "write" },
    method: "GET" | "POST",
    path: string,
    query: Query,
    body: unknown = null,
  ): Promise<unknown> {
    return this.#transport.request({ ...policy, method, path }, query, body);
  }
}
