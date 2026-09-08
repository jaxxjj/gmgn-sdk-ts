export interface RequestOptions {
  /** Total deadline, including retries and response consumption. Default: 15s. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface GmgnClientOptions extends RequestOptions {
  apiKey: string;
  privateKeyPem?: string;
  /** Credentials will be sent here. Defaults to the official HTTPS origin. */
  host?: string;
  /** Only allows HTTP for literal loopback addresses, for local testing. */
  allowInsecureLocalhost?: boolean;
  /** Financial writes are disabled unless explicitly enabled. */
  enableTrading?: boolean;
  /** Additional attempts for safe reads only. Default: 2, maximum: 5. */
  maxRetries?: number;
  /** Never shorten a server cooldown to fit this budget. Default: 5s. */
  maxRetryDelayMs?: number;
  /** Maximum decoded response bytes. Default: 8 MiB. */
  maxResponseBytes?: number;
  /** Must obey standard fetch semantics, including signal and redirect. */
  fetch?: typeof globalThis.fetch;
}

/** @deprecated Use GmgnClientOptions. */
export type Config = GmgnClientOptions;
