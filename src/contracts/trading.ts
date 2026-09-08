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
