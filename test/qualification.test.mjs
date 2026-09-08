import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { GmgnClient } from "../dist/index.js";
import { Cassette, providerPolicy } from "./support/cassette.mjs";
import { outcome } from "./support/qualification.mjs";
import { writes, matrix } from "./support/endpoint-matrix.mjs";
import { executeRead } from "./support/read-scenario.mjs";
const report = JSON.parse(
  readFileSync(new URL("../docs/qualification-results.json", import.meta.url), "utf8"),
);
const { privateKey } = generateKeyPairSync("ed25519");
const key = privateKey.export({ type: "pkcs8", format: "pem" });
test("qualification ledger is explicit and cannot silently drop recorded evidence", () => {
  assert.equal(report.service, "gmgn");
  assert.ok(report.cases.length > 0);
  for (const operation of new Set(matrix.map((row) => row.name)))
    assert.ok(
      report.cases.some((row) => row.operation === operation),
      `Missing live status for ${operation}`,
    );
  assert.equal(new Set(report.cases.map((row) => row.id)).size, report.cases.length);
  for (const row of report.cases) {
    assert.ok(matrix.some((entry) => entry.name === row.operation));
    assert.ok(["passed", "failed", "not-run"].includes(row.status));
    if (row.status === "passed") assert.ok(row.recorded);
    if (writes.has(row.operation)) assert.equal(row.status, "not-run");
  }
});
for (const row of report.cases.filter((entry) => entry.recorded))
  test(`live evidence replay ${row.id} [${row.status}]`, async () => {
    assert.ok(!writes.has(row.operation));
    const cassette = new Cassette({
      file: new URL(`./fixtures/qualification/${row.id}.json`, import.meta.url),
      policy: providerPolicy("gmgn"),
    });
    assert.equal(cassette.data.provenance.operation, row.operation);
    const client = new GmgnClient({
      apiKey: "offline-placeholder",
      privateKeyPem: key,
      maxRetries: 0,
      fetch: cassette.fetch(),
    });
    const actual = await outcome(() =>
      executeRead(
        client,
        row.operation,
        cassette.fixtureInputs.args,
        cassette.data.provenance.variant,
      ),
    );
    assert.deepEqual(actual, cassette.data.expected);
    assert.equal(actual.ok, row.status === "passed");
    cassette.assertConsumed();
  });
