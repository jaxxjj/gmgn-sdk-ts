import { GmgnError } from "../errors.js";
export type TrenchesSection = "new_creation" | "near_completion" | "completed";
export interface GetTrenchesParams {
  chain: string;
  types?: TrenchesSection[];
  platforms?: string[];
  limit?: number;
  filters?: Record<string, number | string>;
}
const RESERVED = new Set([
  "version",
  "limit",
  "filters",
  "launchpad_platform_v2",
  "launchpad_platform",
  "quote_address_type",
  "__proto__",
  "constructor",
  "prototype",
]);
const TRENCHES_QUOTE_ADDRESS_TYPES: Record<string, number[]> = {
  sol: [4, 5, 3, 1, 13, 0],
  bsc: [6, 7, 1, 16, 8, 3, 9, 10, 2, 17, 18, 0],
  base: [11, 3, 12, 13, 0],
  eth: [20, 11, 8, 3, 12, 1, 0],
  robinhood: [11, 20, 24, 12, 0],
};

export function buildTrenchesBody(
  chain: string,
  types?: string[],
  platforms?: string[],
  limit?: number,
  filters?: Record<string, number | string>,
): Record<string, unknown> {
  const invalid = () =>
    new GmgnError("configuration", {
      operation: "getTrenches",
      attempt: 0,
      reason: "invalid_parameters",
    });
  if (typeof chain !== "string" || !chain.trim()) throw invalid();
  if (
    types !== undefined &&
    (!Array.isArray(types) ||
      types.some((type) => !["new_creation", "near_completion", "completed"].includes(type)))
  )
    throw invalid();
  if (
    platforms !== undefined &&
    (!Array.isArray(platforms) ||
      platforms.some((platform) => typeof platform !== "string" || !platform.trim()))
  )
    throw invalid();
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw invalid();
  if (filters !== undefined) {
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) throw invalid();
    for (const [name, value] of Object.entries(filters)) {
      if (
        RESERVED.has(name) ||
        (typeof value !== "string" && typeof value !== "number") ||
        (typeof value === "number" && !Number.isFinite(value))
      )
        throw invalid();
    }
  }
  const selectedTypes = types?.length ? types : ["new_creation", "near_completion", "completed"];
  const quote_address_type = TRENCHES_QUOTE_ADDRESS_TYPES[chain] ?? [];
  const actualLimit = limit ?? 80;
  const section: Record<string, unknown> = {
    filters: ["offchain", "onchain"],
    launchpad_platform_v2: true,
    limit: actualLimit,
    ...filters,
  };
  // Let the service apply its current per-chain launchpad defaults when the user
  // does not provide an explicit filter. Keeping a duplicate client-side allow-list
  // here can silently hide newly supported platforms until the CLI is released.
  if (platforms?.length) section.launchpad_platform = platforms;
  if (quote_address_type.length) section.quote_address_type = quote_address_type;
  const body: Record<string, unknown> = { version: "v2" };
  for (const type of selectedTypes) {
    body[type] = { ...section };
  }
  return body;
}
