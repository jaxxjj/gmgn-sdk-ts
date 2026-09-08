import test from "node:test";
import assert from "node:assert/strict";
import { GmgnClient } from "../dist/index.js";
import { Cassette, providerPolicy } from "./support/cassette.mjs";
import { scenarios } from "./support/scenarios.mjs";

for (const [scenario, run] of Object.entries(scenarios)) {
  test(`HTTP contract replay: ${scenario}`, async () => {
    const cassette = new Cassette({
      file: new URL(`./fixtures/http/${scenario}.json`, import.meta.url),
      policy: providerPolicy("gmgn"),
    });
    const client = new GmgnClient({ apiKey: "offline-placeholder", fetch: cassette.fetch() });
    const result = await run(client);
    assert.deepEqual(result, JSON.parse(cassette.data.exchanges[0].response.body).data);
    cassette.assertConsumed();
  });
}
