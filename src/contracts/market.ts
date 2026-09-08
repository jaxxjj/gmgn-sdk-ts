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
export interface HotSearchParams {
  label?: string;
  interval: string; // "1m" | "5m" | "1h" | "6h" | "24h"
  chain: string; // "sol" | "bsc" | "base" | "eth" | "robinhood" | "arc" | "stable"
  filters?: string[];
  limit?: number;
  [key: string]: string[] | number | string | undefined;
}

/** @deprecated Use HotSearchParams. */
export type HotSearchesParam = HotSearchParams;
