import { Transport, type Config, type RequestOptions, type Query } from "../transport.js";
import { buildTrenchesBody } from "./trenches.js";
import type {
  SwapParams,
  MultiSwapParams,
  StrategyCreateParams,
  StrategyCancelParams,
  TokenSignalGroup,
  HotSearchesParam,
  CreateTokenParams,
} from "../models.js";
export type { Config } from "../transport.js";
export type * from "../models.js";

export class OpenApiClient {
  readonly #config: Readonly<Config>;
  readonly #transport: Transport;

  constructor(config: Config) {
    this.#config = Object.freeze({ ...config });
    this.#transport = new Transport(this.#config);
  }

  /** Immutable request scope; never changes options on a shared client. */
  withOptions(options: RequestOptions): OpenApiClient {
    return new OpenApiClient({
      ...this.#config,
      timeoutMs: options.timeoutMs ?? this.#config.timeoutMs,
      signal: Object.hasOwn(options, "signal") ? options.signal : this.#config.signal,
    });
  }

  // ---- Token endpoints (exist auth) ----

  async getTokenInfo(chain: string, address: string): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/token/info", { chain, address });
  }

  async getTokenSecurity(chain: string, address: string): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/token/security", { chain, address });
  }

  async getTokenPoolInfo(chain: string, address: string): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/token/pool_info", { chain, address });
  }

  async getTokenTopHolders(
    chain: string,
    address: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/market/token_top_holders", {
      ...extra,
      chain,
      address,
    });
  }

  async getTokenTopTraders(
    chain: string,
    address: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/market/token_top_traders", {
      ...extra,
      chain,
      address,
    });
  }

  // ---- Market endpoints (exist auth) ----

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
    return this.authExistRequest("GET", "/v1/market/token_kline", query);
  }

  // ---- Portfolio endpoints ----

  async getWalletHoldings(
    chain: string,
    walletAddress: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.authSignedRequest(
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
    return this.authExistRequest("GET", "/v1/user/wallet_activity", {
      ...extra,
      chain,
      wallet_address: walletAddress,
    });
  }

  async getWalletStats(chain: string, walletAddresses: string[], period = "7d"): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/user/wallet_stats", {
      chain,
      wallet_address: walletAddresses,
      period,
    });
  }

  async getWalletProfits(
    chain: string,
    walletAddresses: string[],
    period = "7d",
  ): Promise<unknown> {
    return this.authExistRequest(
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
    return this.authExistRequest("GET", "/v1/user/wallet_token_balance", {
      chain,
      wallet_address: walletAddress,
      token_address: tokenAddress,
    });
  }

  async getTrenches(
    chain: string,
    types?: string[],
    platforms?: string[],
    limit?: number,
    filters?: Record<string, number | string>,
  ): Promise<unknown> {
    const body = buildTrenchesBody(chain, types, platforms, limit, filters);
    return this.authExistRequest("POST", "/v1/trenches", { chain }, body);
  }

  // ---- Market trending endpoints (exist auth) ----

  async getTrendingSwaps(
    chain: string,
    interval: string,
    extra: Record<string, string | number | string[]> = {},
  ): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/market/rank", { ...extra, chain, interval });
  }

  async getTokenSignalV2(chain: string, groups: TokenSignalGroup[]): Promise<unknown> {
    return this.authExistRequest("POST", "/v1/market/token_signal", {}, { chain, groups });
  }

  async getHotSearches(params: HotSearchesParam[]): Promise<unknown> {
    return this.authExistRequest("POST", "/v1/market/hot_searches", {}, { params });
  }

  async searchMarket(
    query: string,
    extra: Record<string, string | number | string[]> = {},
  ): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/market/search", { ...extra, q: query });
  }

  // ---- User endpoints (exist auth) ----

  async getUserInfo(): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/user/info", {});
  }

  async getFollowWallet(
    chain: string,
    extra: Record<string, string | number | string[]> = {},
  ): Promise<unknown> {
    return this.authSignedRequest("GET", "/v1/trade/follow_wallet", { ...extra, chain }, null);
  }

  async getFollowTokens(
    chain: string,
    walletAddress: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/user/follow_tokens", {
      ...extra,
      chain,
      wallet_address: walletAddress,
    });
  }

  async getFollowGroupNames(chain: string, walletAddress: string): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/user/follow_token_groups", {
      chain,
      wallet_address: walletAddress,
    });
  }

  async getKol(chain?: string, limit?: number): Promise<unknown> {
    const query: Record<string, string | number> = {};
    if (chain) query["chain"] = chain;
    if (limit != null) query["limit"] = limit;
    return this.authExistRequest("GET", "/v1/user/kol", query);
  }

  async getSmartMoney(chain?: string, limit?: number): Promise<unknown> {
    const query: Record<string, string | number> = {};
    if (chain) query["chain"] = chain;
    if (limit != null) query["limit"] = limit;
    return this.authExistRequest("GET", "/v1/user/smartmoney", query);
  }

  async getCreatedTokens(
    chain: string,
    walletAddress: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/user/created_tokens", {
      ...extra,
      chain,
      wallet_address: walletAddress,
    });
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
    return this.authExistRequest("GET", "/v1/trade/quote", query);
  }

  // ---- Swap endpoints (signed auth) ----

  async swap(params: SwapParams): Promise<unknown> {
    return this.authSignedRequest("POST", "/v1/trade/swap", {}, params);
  }

  async multiSwap(params: MultiSwapParams): Promise<unknown> {
    return this.authSignedRequest("POST", "/v1/trade/multi_swap", {}, params);
  }

  async queryOrder(orderId: string, chain: string): Promise<unknown> {
    return this.authSignedRequest(
      "GET",
      "/v1/trade/query_order",
      { order_id: orderId, chain },
      null,
    );
  }

  async getGasPrice(chain: string): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/trade/gas_price", { chain });
  }

  // ---- Strategy order endpoints (signed auth) ----

  async createStrategyOrder(params: StrategyCreateParams): Promise<unknown> {
    return this.authSignedRequest("POST", "/v1/trade/strategy/create", {}, params);
  }

  async getStrategyOrders(
    chain: string,
    extra: Record<string, string | number> = {},
  ): Promise<unknown> {
    return this.authSignedRequest("GET", "/v1/trade/strategy/orders", { ...extra, chain }, null);
  }

  async cancelStrategyOrder(params: StrategyCancelParams): Promise<unknown> {
    return this.authSignedRequest("POST", "/v1/trade/strategy/cancel", {}, params);
  }

  // ---- Cooking endpoints ----

  async getCookingStatistics(): Promise<unknown> {
    return this.authExistRequest("GET", "/v1/cooking/statistics", {});
  }

  async createToken(params: CreateTokenParams): Promise<unknown> {
    return this.authSignedRequest("POST", "/v1/cooking/create_token", {}, params);
  }

  private authExistRequest(
    method: "GET" | "POST",
    path: string,
    query: Query,
    body: unknown = null,
  ): Promise<unknown> {
    return this.#transport.request(method, path, query, body, false);
  }

  private authSignedRequest(
    method: "GET" | "POST",
    path: string,
    query: Query,
    body: unknown,
  ): Promise<unknown> {
    return this.#transport.request(method, path, query, body, true);
  }
}
