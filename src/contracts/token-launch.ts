import type { TradeParam } from "./trading.js";
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
