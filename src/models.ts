export interface SwapParams {
  chain: string;
  from_address: string;
  input_token: string;
  output_token: string;
  input_amount: string;
  swap_mode?: string;
  input_amount_bps?: string;
  output_amount?: string;
  slippage?: number;
  auto_slippage?: boolean;
  min_output_amount?: string;
  is_anti_mev?: boolean;
  priority_fee?: string;
  tip_fee?: string;
  gas_price?: string;
  gas_level?: string;
  auto_fee?: boolean;
  max_fee_per_gas?: string;
  max_priority_fee_per_gas?: string;
  condition_orders?: StrategyConditionOrder[];
  sell_ratio_type?: string;
}

export interface StrategyConditionOrder {
  order_type: string; // "profit_stop" | "loss_stop" | "profit_stop_trace" | "loss_stop_trace"
  side: string; // "sell"
  price_scale?: string;
  sell_ratio: string;
  drawdown_rate?: string;
}

export interface MultiSwapParams {
  chain: string;
  accounts: string[];
  input_token: string;
  output_token: string;
  input_amount?: Record<string, string>;
  input_amount_bps?: Record<string, string>;
  output_amount?: Record<string, string>;
  swap_mode?: string;
  slippage?: number;
  auto_slippage?: boolean;
  is_anti_mev?: boolean;
  priority_fee?: string;
  tip_fee?: string;
  gas_price?: string;
  gas_level?: string;
  auto_fee?: boolean;
  max_fee_per_gas?: string;
  max_priority_fee_per_gas?: string;
  condition_orders?: StrategyConditionOrder[];
  sell_ratio_type?: string;
}

export interface StrategyCreateParams {
  chain: string;
  from_address: string;
  base_token: string;
  quote_token: string;
  order_type: string;
  sub_order_type: string;
  check_price?: string;
  open_price?: string;
  amount_in?: string;
  amount_in_percent?: string;
  limit_price_mode?: string;
  price_gap_ratio?: string;
  expire_in?: number;
  sell_ratio_type?: string;
  slippage?: number;
  auto_slippage?: boolean;
  fee?: string;
  auto_fee?: boolean;
  gas_price?: string;
  gas_level?: string;
  max_fee_per_gas?: string;
  max_priority_fee_per_gas?: string;
  is_anti_mev?: boolean;
  anti_mev_mode?: string;
  priority_fee?: string;
  tip_fee?: string;
  custom_rpc?: string;
  condition_orders?: StrategyConditionOrder[];
  quote_investment?: string;
  sell_param?: TradeParam;
  buy_param?: TradeParam;
}

export interface StrategyCancelParams {
  chain: string;
  from_address: string;
  order_id: string;
  order_type?: string;
  close_sell_model?: string;
}

export interface TokenSignalGroup {
  signal_type?: number[];
  mc_min?: number;
  mc_max?: number;
  trigger_mc_min?: number;
  trigger_mc_max?: number;
  total_fee_min?: number;
  total_fee_max?: number;
  min_create_or_open_ts?: string;
  max_create_or_open_ts?: string;
}

// HotSearchesParam carries its filter fields flattened (no nested `filter` object):
// label/interval/chain plus optional `filters` boolean tags, `limit`, and rank-style
// numeric range bounds (min_<metric>/max_<metric>) incl. min_created/max_created.
// Extra range keys are forwarded verbatim; the service translates metric names per
// interval. See `market hot-searches` docs for the supported metric list.
export interface HotSearchesParam {
  label?: string;
  interval: string; // "1m" | "5m" | "1h" | "6h" | "24h"
  chain: string; // "sol" | "bsc" | "base" | "eth" | "robinhood" | "arc" | "stable"
  filters?: string[];
  limit?: number;
  [key: string]: string[] | number | string | undefined;
}

export interface PumpFeeShareInfo {
  provider: string; // "solana" | "twitter" | "github"
  username: string; // platform username; a SOL address when provider = "solana"
  basic_points: number;
}

export interface BAGSFeeShareInfo {
  provider: string; // "twitter" | "solana" | "kick" | "github"
  username: string;
  basic_points: number;
}

export interface FlapRateConf {
  tax_rate?: number; // V5 unified tax rate, e.g. 5% -> 500
  buy_tax_rate?: number; // V6 separate buy tax rate
  sell_tax_rate?: number; // V6 separate sell tax rate
  mkt_bps?: number;
  deflation_bps?: number;
  dividend_bps?: number;
  lp_bps?: number;
  minimum_share_balance?: number;
  recipient_type?: string;
  beneficiary?: string;
  twitter_account?: string;
  split_conf?: Array<{ recipient: string; bps: number }>;
}

export interface FourmemeRateConf {
  fee_plan?: boolean;
  fee_rate?: number;
  burn_rate?: number;
  divide_rate?: number;
  liquidity_rate?: number;
  recipient_rate?: number;
  recipient_address?: string;
  min_sharing?: number;
}

export interface BuyWalletInfo {
  from_address: string;
  buy_amt: string;
}

// Buy/sell execution config for CondMarket orders (snipe buy, auto-sell, pending_sell).
// Does NOT affect the main creation tx. Falls back to outer-level fields when omitted.
export interface TradeParam {
  slippage?: number;
  auto_slippage?: boolean;
  fee?: string;
  priority_fee?: string;
  tip_fee?: string;
  gas_price?: string;
  max_priority_fee_per_gas?: string;
  max_fee_per_gas?: string;
  is_anti_mev?: boolean; // backend currently forces true; passing has no effect
  anti_mev_mode?: string; // backend currently forces "secure"; passing has no effect
}

export interface CookingSellConfig {
  sell_type: string; // "delay_sell" | "limit_order"
  delay_sec?: number; // required when sell_type = "delay_sell"
  delay_mili_sec?: number; // optional; takes precedence over delay_sec
  sell_ratio: string; // "1" = 100%, "0.5" = 50%
  check_price?: string; // trigger market cap in USD; required when sell_type = "limit_order"
  wallet_addresses: string[]; // empty array means the strategy is inert
}

export interface CreateTokenParams {
  // Required
  chain: string;
  dex: string;
  from_address: string;
  name: string;
  symbol: string;
  buy_amt: string;

  // Image (one required)
  image?: string;
  image_url?: string;

  // Social
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;

  // Transaction
  slippage?: number;
  auto_slippage?: boolean;

  // Fees
  fee?: string;
  priority_fee?: string;
  tip_fee?: string;
  gas_price?: string;
  max_priority_fee_per_gas?: string;
  max_fee_per_gas?: string;

  // Anti-MEV (SOL only)
  is_anti_mev?: boolean;
  anti_mev_mode?: string;

  // Advanced
  raised_token?: string;
  dev_gas?: string;
  dev_priority?: string;
  dev_tip?: string;
  dev_max_fee_per_gas?: string;
  approve_vision?: string;
  source?: string;
  dev_wallet_bps?: number;

  // CondMarket buy/sell execution config (snipe / bundle / auto-sell)
  buy_trade_config?: TradeParam;
  sell_trade_config?: TradeParam;

  // Auto-sell strategies created after a successful launch
  sell_configs?: CookingSellConfig[];

  // Pump.fun specific
  is_mayhem?: boolean;
  is_cashback?: boolean;
  is_buy_back?: boolean;
  pump_fee_share_list?: PumpFeeShareInfo[];

  // Flap specific
  flap_rate_conf?: FlapRateConf;

  // FourMeme specific
  fourmeme_rate_conf?: FourmemeRateConf;

  // BAGS specific
  bags_fee_share_list?: BAGSFeeShareInfo[];

  // Bonk specific
  bonk_model?: string;

  // Multi-wallet buy
  buy_wallets?: BuyWalletInfo[];
  snip_buy_wallets?: BuyWalletInfo[];
}
