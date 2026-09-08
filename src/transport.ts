import { setTimeout as delay } from "node:timers/promises";
import { buildAuthQuery, buildMessage, detectAlgorithm, sign } from "./client/signer.js";
import { GmgnError } from "./errors.js";

export interface RequestOptions {
  /** Total deadline, including retries and response consumption. Default: 15s. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface Config extends RequestOptions {
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

export type Query = Record<string, string | number | string[]>;

const READ_POST_PATHS = new Set([
  "/v1/user/wallet_profits",
  "/v1/trenches",
  "/v1/market/token_signal",
  "/v1/market/hot_searches",
]);

function integer(value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new GmgnError("configuration");
  }
  return value;
}

function origin(config: Config): string {
  let url: URL;
  try {
    url = new URL(config.host ?? "https://openapi.gmgn.ai");
  } catch {
    throw new GmgnError("configuration");
  }
  const local = ["127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && local && config.allowInsecureLocalhost === true))
  ) {
    throw new GmgnError("configuration");
  }
  return url.origin;
}

function cooldown(headers: Headers): number | undefined {
  const values: number[] = [];
  const retry = headers.get("retry-after");
  if (retry !== null) {
    const seconds = /^\d+(\.\d+)?$/.test(retry) ? Number(retry) : NaN;
    const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now();
    if (Number.isFinite(ms)) values.push(Math.max(0, Math.ceil(ms)));
  }
  const reset = headers.get("x-ratelimit-reset");
  if (reset && /^\d+$/.test(reset)) {
    const ms = Number(reset) * 1000 - Date.now() + 1000;
    if (Number.isFinite(ms)) values.push(Math.max(0, Math.ceil(ms)));
  }
  return values.length ? Math.max(...values) : undefined;
}

async function readBody(response: Response, limit: number, signal: AbortSignal): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        cancel();
        throw new GmgnError("protocol");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

export class Transport {
  readonly #config: Readonly<Config>;
  readonly #host: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #timeout: number;
  readonly #retries: number;
  readonly #maxWait: number;
  readonly #maxBytes: number;

  constructor(config: Config) {
    if (typeof config.apiKey !== "string" || !config.apiKey.trim() || /[\r\n]/.test(config.apiKey))
      throw new GmgnError("configuration");
    this.#config = Object.freeze({ ...config });
    this.#host = origin(config);
    this.#fetch = config.fetch ?? globalThis.fetch;
    this.#timeout = integer(config.timeoutMs ?? 15_000, 1, 2_147_483_647);
    this.#retries = integer(config.maxRetries ?? 2, 0, 5);
    this.#maxWait = integer(config.maxRetryDelayMs ?? 5000, 0, 2_147_483_647);
    this.#maxBytes = integer(config.maxResponseBytes ?? 8 * 1024 * 1024, 1, 128 * 1024 * 1024);
  }

  async request(
    method: "GET" | "POST",
    path: string,
    query: Query,
    body: unknown,
    signed: boolean,
  ): Promise<unknown> {
    // New POST routes fail closed unless explicitly proven read-only.
    const write = method === "POST" && !READ_POST_PATHS.has(path);
    const retrySafe = !write;
    if (write && this.#config.enableTrading !== true) throw new GmgnError("execution_disabled");
    const key = this.#config.privateKeyPem;
    if (signed && !key) throw new GmgnError("authentication");
    let algorithm: ReturnType<typeof detectAlgorithm> | undefined;
    try {
      if (signed && key) algorithm = detectAlgorithm(key);
    } catch {
      throw new GmgnError("authentication");
    }
    let bodyText: string;
    try {
      bodyText = body == null ? "" : JSON.stringify(body);
      if (typeof bodyText !== "string") throw new GmgnError("configuration");
    } catch {
      throw new GmgnError("configuration");
    }
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.#timeout);
    const signal = this.#config.signal
      ? AbortSignal.any([deadline.signal, this.#config.signal])
      : deadline.signal;
    let sent = false;
    try {
      for (let attempt = 0; ; attempt++) {
        signal.throwIfAborted();
        let failure: GmgnError;
        let retry = false;
        try {
          const auth = buildAuthQuery();
          const params = { ...query, ...auth };
          const url = new URL(path, this.#host);
          for (const [name, value] of Object.entries(params)) {
            for (const item of Array.isArray(value) ? value : [value]) {
              url.searchParams.append(name, String(item));
            }
          }
          const headers: Record<string, string> = {
            "X-APIKEY": this.#config.apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "gmgn-sdk-ts",
          };
          if (signed && key && algorithm) {
            headers["X-Signature"] = sign(
              buildMessage(path, params, bodyText, auth.timestamp),
              key,
              algorithm,
            );
          }
          sent = true;
          const response = await this.#fetch(url, {
            method,
            headers,
            body: bodyText || undefined,
            redirect: "error",
            signal,
          });
          const text = await readBody(response, this.#maxBytes, signal);
          const retryAfterMs = cooldown(response.headers);
          let data: unknown;
          try {
            data = JSON.parse(text);
          } catch {
            // A non-JSON gateway error is still an HTTP error, not a success.
            if (response.ok) throw new GmgnError("protocol");
          }
          const envelope =
            data !== null && typeof data === "object" && !Array.isArray(data)
              ? (data as Record<string, unknown>)
              : undefined;
          const apiCode = typeof envelope?.code === "number" ? envelope.code : undefined;
          if (!response.ok) {
            failure = new GmgnError("http", {
              status: response.status,
              apiCode,
              retryAfterMs,
              outcomeUnknown: write && response.status >= 500,
            });
            retry = response.status === 429 || [502, 503, 504].includes(response.status);
            if (envelope?.error === "ERROR_RATE_LIMIT_BLOCKED") retry = false;
          } else if (!envelope || !Number.isInteger(apiCode)) {
            throw new GmgnError("protocol");
          } else if (apiCode !== 0) {
            failure = new GmgnError("api", { status: response.status, apiCode });
          } else if (!Object.hasOwn(envelope, "data")) {
            throw new GmgnError("protocol");
          } else {
            return envelope.data;
          }
        } catch (error) {
          signal.throwIfAborted();
          failure = error instanceof GmgnError ? error : new GmgnError("network");
          retry = failure.kind === "network";
          if (write) {
            failure = new GmgnError(failure.kind, {
              status: failure.status,
              apiCode: failure.apiCode,
              retryAfterMs: failure.retryAfterMs,
              outcomeUnknown: sent,
            });
          }
        }
        if (!retrySafe || !retry || attempt >= this.#retries) throw failure;
        const backoff = Math.floor(250 * 2 ** attempt * (0.5 + Math.random() * 0.5));
        const wait = Math.max(backoff, failure.retryAfterMs ?? 0);
        if (wait > this.#maxWait) throw failure;
        await delay(wait, undefined, { signal });
      }
    } catch (error) {
      if (signal.aborted) {
        throw new GmgnError(this.#config.signal?.aborted ? "aborted" : "timeout", {
          outcomeUnknown: write && sent,
        });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
