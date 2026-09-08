import { setTimeout as delay } from "node:timers/promises";
import type { GmgnClientOptions } from "../options.js";
import { GmgnError } from "../errors.js";
import { origin, integer } from "./config.js";
import { prepareRequest, type Query } from "./prepare.js";
import { parseResponse } from "./response.js";
export type { Query } from "./prepare.js";

export interface Operation {
  operation: string;
  method: "GET" | "POST";
  path: string;
  auth: "api-key" | "signed";
  effect: "read" | "write";
}

/** Owns deadlines and retry orchestration, not endpoint-specific policy. */
export class RequestClient {
  readonly #config: Readonly<GmgnClientOptions>;
  readonly #origin: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #timeout: number;
  readonly #retries: number;
  readonly #maxWait: number;
  readonly #maxBytes: number;

  constructor(config: GmgnClientOptions) {
    if (
      typeof config.apiKey !== "string" ||
      !config.apiKey.trim() ||
      /[\r\n]/.test(config.apiKey)
    ) {
      throw new GmgnError("configuration");
    }
    this.#config = Object.freeze({ ...config });
    this.#origin = origin(config);
    this.#fetch = config.fetch ?? globalThis.fetch;
    this.#timeout = integer(config.timeoutMs ?? 15000, 1, 2147483647);
    this.#retries = integer(config.maxRetries ?? 2, 0, 5);
    this.#maxWait = integer(config.maxRetryDelayMs ?? 5000, 0, 2147483647);
    this.#maxBytes = integer(config.maxResponseBytes ?? 8 * 1024 * 1024, 1, 128 * 1024 * 1024);
  }

  async request(operation: Operation, query: Query, body: unknown): Promise<unknown> {
    const write = operation.effect === "write";
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.#timeout);
    const signal = this.#config.signal
      ? AbortSignal.any([deadline.signal, this.#config.signal])
      : deadline.signal;
    let sent = false;
    let attempt = 0;
    try {
      if (write && this.#config.enableTrading !== true) throw new GmgnError("execution_disabled");
      signal.throwIfAborted();
      let bodyText: string;
      try {
        bodyText = body == null ? "" : JSON.stringify(body);
        if (typeof bodyText !== "string") throw new Error();
      } catch {
        throw new GmgnError("configuration", { reason: "invalid_parameters" });
      }
      for (;;) {
        signal.throwIfAborted();
        attempt++;
        // Preparation/signing errors remain outside the network retry boundary.
        const prepared = prepareRequest(operation, query, bodyText, this.#origin, this.#config);
        let failure: GmgnError;
        try {
          sent = true;
          return await this.#sendAttempt(prepared, signal);
        } catch (error) {
          signal.throwIfAborted();
          if (!(error instanceof GmgnError)) throw error;
          failure = error;
        }
        const retryable =
          failure.kind === "network" ||
          (failure.kind === "http" &&
            failure.reason !== "rate_limit_blocked" &&
            [429, 502, 503, 504].includes(failure.status ?? 0));
        if (write || !retryable || attempt > this.#retries) throw failure;
        const backoff = Math.floor(250 * 2 ** (attempt - 1) * (0.5 + Math.random() * 0.5));
        const wait = Math.max(backoff, failure.retryAfterMs ?? 0);
        if (wait > this.#maxWait) throw failure;
        await delay(wait, undefined, { signal });
      }
    } catch (error) {
      const failure = signal.aborted
        ? new GmgnError(this.#config.signal?.aborted ? "aborted" : "timeout")
        : error instanceof GmgnError
          ? error
          : new GmgnError("configuration");
      throw new GmgnError(failure.kind, {
        operation: operation.operation,
        attempt,
        reason: failure.reason,
        status: failure.status,
        apiCode: failure.apiCode,
        retryAfterMs: failure.retryAfterMs,
        outcomeUnknown: write && sent,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async #sendAttempt(
    prepared: ReturnType<typeof prepareRequest>,
    signal: AbortSignal,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.#fetch(prepared.url, { ...prepared.init, signal });
    } catch {
      throw new GmgnError("network");
    }
    return parseResponse(response, this.#maxBytes, signal);
  }
}
