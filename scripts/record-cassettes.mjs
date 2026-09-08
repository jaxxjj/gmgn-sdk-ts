import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { GmgnClient } from "../dist/index.js";
import { Cassette, providerPolicy } from "../test/support/cassette.mjs";
import { scenarios } from "../test/support/scenarios.mjs";

export async function recordScenario({ scenario, apiKey, directory }) {
  if (!Object.hasOwn(scenarios, scenario) || !apiKey || !directory)
    throw new Error("Explicit scenario, credentials and output directory required");
  const cassette = new Cassette({
    file: resolve(directory, `${scenario}.json`),
    policy: providerPolicy("gmgn"),
    mode: "record",
    provenance: { kind: "live", source: "GMGN HTTP via SDK fetch transport", scenario },
  });
  const client = new GmgnClient({
    apiKey,
    fetch: cassette.fetch(globalThis.fetch),
    maxRetries: 0,
    timeoutMs: 15_000,
  });
  await scenarios[scenario](client);
  cassette.commit();
  return { scenario, exchanges: cassette.data.exchanges.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.env.GMGN_RECORD !== "1") throw new Error("Recording is opt-in");
    console.log(
      await recordScenario({
        scenario: process.argv[2],
        apiKey: process.env.GMGN_API_KEY,
        directory: new URL("../test/fixtures/http/", import.meta.url).pathname,
      }),
    );
  } catch {
    console.error("Recording failed; no successful cassette committed. Inspect privately.");
    process.exitCode = 1;
  }
}
