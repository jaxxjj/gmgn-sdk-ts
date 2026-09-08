/**
 * Node-only SDK entrypoint. No CLI parsing, credential loading, or network setup.
 *
 * Financial writes require explicit enableTrading configuration.
 */
export { GmgnClient, GmgnClient as OpenApiClient } from "./client.js";
export { GmgnError } from "./errors.js";
export type { ErrorKind, ErrorDetails } from "./errors.js";
export type { RequestOptions, GmgnClientOptions, Config } from "./options.js";
export type {
  SwapParams,
  StrategyConditionOrder,
  MultiSwapParams,
  StrategyCreateParams,
  StrategyCancelParams,
  TokenSignalGroup,
  HotSearchesParam,
  HotSearchParams,
  PumpFeeShareInfo,
  BAGSFeeShareInfo,
  FlapRateConf,
  FourmemeRateConf,
  BuyWalletInfo,
  TradeParam,
  CookingSellConfig,
  CreateTokenParams,
} from "./contracts/parameters.js";
export type { GetTrenchesParams, TrenchesSection } from "./endpoints/trenches.js";
