import type { GmgnClientOptions as Config } from "../options.js";
import { GmgnError } from "../errors.js";
export function integer(value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new GmgnError("configuration");
  }
  return value;
}

export function origin(config: Config): string {
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
