import { GmgnError } from "../errors.js";
export async function parseResponse(
  response: Response,
  limit: number,
  signal: AbortSignal,
): Promise<unknown> {
  let text: string;
  try {
    text = await readBody(response, limit, signal);
  } catch (error) {
    if (error instanceof GmgnError) throw error;
    throw new GmgnError("network");
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    /* HTTP status still takes precedence. */
  }
  const envelope =
    data !== null && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : undefined;
  const apiCode = typeof envelope?.code === "number" ? envelope.code : undefined;
  if (!response.ok)
    throw new GmgnError("http", {
      status: response.status,
      apiCode,
      retryAfterMs: cooldown(response.headers),
      reason: envelope?.error === "ERROR_RATE_LIMIT_BLOCKED" ? "rate_limit_blocked" : undefined,
    });
  if (!envelope || !Number.isInteger(apiCode)) {
    throw new GmgnError("protocol", { reason: "invalid_envelope" });
  }
  if (apiCode !== 0) throw new GmgnError("api", { status: response.status, apiCode });
  if (!Object.hasOwn(envelope, "data"))
    throw new GmgnError("protocol", { reason: "invalid_envelope" });
  return envelope.data;
}
export function cooldown(headers: Headers): number | undefined {
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

export async function readBody(
  response: Response,
  limit: number,
  signal: AbortSignal,
): Promise<string> {
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
        throw new GmgnError("protocol", { reason: "response_too_large" });
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
