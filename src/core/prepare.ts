import { buildAuthQuery, buildMessage, detectAlgorithm, sign } from "./auth.js";
import type { Operation } from "./request.js";
import type { GmgnClientOptions } from "../options.js";
import { GmgnError } from "../errors.js";

export type Query = Record<string, string | number | string[]>;

export function prepareRequest(
  operation: Operation,
  query: Query,
  body: string,
  baseUrl: string,
  options: GmgnClientOptions,
): { url: URL; init: RequestInit } {
  const headers: Record<string, string> = {
    "X-APIKEY": options.apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "gmgn-sdk-ts",
  };
  let url: URL;
  let params: Query;
  let timestamp: number;
  try {
    const auth = buildAuthQuery();
    timestamp = auth.timestamp;
    params = { ...query, ...auth };
    url = new URL(operation.path, baseUrl);
    for (const [name, value] of Object.entries(params)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (
          (typeof item !== "string" && typeof item !== "number") ||
          (typeof item === "number" && !Number.isFinite(item))
        )
          throw new Error();
        url.searchParams.append(name, String(item));
      }
    }
  } catch {
    throw new GmgnError("configuration", { reason: "request_preparation" });
  }
  if (operation.auth === "signed") {
    try {
      const key = options.privateKeyPem;
      if (!key) throw new Error();
      headers["X-Signature"] = sign(
        buildMessage(operation.path, params, body, timestamp),
        key,
        detectAlgorithm(key),
      );
    } catch {
      throw new GmgnError("authentication", { reason: "request_preparation" });
    }
  }
  return {
    url,
    init: { method: operation.method, headers, body: body || undefined, redirect: "error" },
  };
}
