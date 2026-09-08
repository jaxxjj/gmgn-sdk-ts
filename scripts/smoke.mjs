import { GmgnClient } from "../dist/index.js";

const apiKey = process.env.GMGN_API_KEY;
if (!apiKey) throw new Error("Explicit GMGN_API_KEY is required");
const client = new GmgnClient({ host: "https://openapi.gmgn.ai", apiKey });
// The upstream transport has no timeout option; cap this optional process as a whole.
const deadline = setTimeout(() => {
  console.error("Read-only smoke test deadline exceeded");
  process.exit(1);
}, 45_000);
try {
  for (const chain of ["sol", "bsc", "robinhood"]) {
    const data = await client.getKol(chain, 2);
    if (!data || typeof data !== "object" || !Array.isArray(data.list)) {
      throw new Error("Unexpected KOL response shape");
    }
    console.log(JSON.stringify({ chain, rows: data.list.length, success: true }));
    await new Promise(resolve => setTimeout(resolve, 1_100));
  }
} catch {
  // Upstream error strings may contain response bodies. Don't leak them here.
  console.error("Read-only smoke failed; inspect transport privately");
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
}
