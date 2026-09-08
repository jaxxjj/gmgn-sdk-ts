/**
 * Node-only SDK entrypoint. No CLI parsing, credential loading, or network setup.
 *
 * Financial writes require explicit enableTrading configuration.
 */
export { OpenApiClient, OpenApiClient as GmgnClient } from "./client/OpenApiClient.js";
export { GmgnError } from "./errors.js";
export type { ErrorKind, ErrorDetails } from "./errors.js";
export type { RequestOptions } from "./transport.js";
export type {
  Config,
  SwapParams,
  StrategyConditionOrder,
  MultiSwapParams,
  StrategyCreateParams,
  StrategyCancelParams,
  TokenSignalGroup,
  HotSearchesParam,
  PumpFeeShareInfo,
  BAGSFeeShareInfo,
  FlapRateConf,
  FourmemeRateConf,
  BuyWalletInfo,
  TradeParam,
  CookingSellConfig,
  CreateTokenParams,
} from "./client/OpenApiClient.js";
