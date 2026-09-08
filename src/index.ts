/**
 * Node-only SDK entrypoint. No CLI parsing, credential loading, or network setup.
 *
 * The upstream client includes financial writes without the CLI's confirmation
 * prompts. Calling those methods can execute real transactions.
 */
export { OpenApiClient, OpenApiClient as GmgnClient } from "./client/OpenApiClient.js";
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
