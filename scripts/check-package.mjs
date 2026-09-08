import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../", import.meta.url));
const consumer = mkdtempSync(join(tmpdir(), "gmgn-sdk-consumer-"));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const [packed] = JSON.parse(
  execFileSync("npm", ["pack", "--json", "--pack-destination", consumer], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  }),
);
assert.equal(packed.name, manifest.name);
assert.equal(packed.version, manifest.version);
for (const { path } of packed.files) {
  assert.ok(
    /^(dist\/|LICENSE$|README\.md$|UPSTREAM\.md$|CHANGELOG\.md$|SECURITY\.md$|package\.json$)/.test(
      path,
    ),
    `Unexpected package file: ${path}`,
  );
  assert.ok(!/(^|\/)(\.env|node_modules|test)(\/|$)/.test(path), `Unsafe package file: ${path}`);
}
const archive = resolve(consumer, packed.filename);
execFileSync(
  "npm",
  ["install", "--prefix", consumer, "--ignore-scripts", "--no-audit", "--no-fund", archive],
  { encoding: "utf8", timeout: 60_000 },
);
const output = execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `
  import { GmgnClient, OpenApiClient } from "@jaxonchenjc/gmgn-sdk";
  if (GmgnClient !== OpenApiClient) throw new Error("Alias mismatch");
  const c = new GmgnClient({host: "https://openapi.gmgn.ai", apiKey: "not-a-real-key"});
  if (typeof c.getKol !== "function" || typeof c.getTokenPoolInfo !== "function") {
    throw new Error("Export failure");
  }
  console.log("consumer import passed");
`,
  ],
  { cwd: consumer, encoding: "utf8", timeout: 5_000 },
);
assert.equal(output.trim(), "consumer import passed");
writeFileSync(
  join(consumer, "consumer.mts"),
  `
import { GmgnClient, type Config, type TokenSignalGroup } from "@jaxonchenjc/gmgn-sdk";
import type { GmgnClientOptions, GetTrenchesParams, HotSearchParams } from "@jaxonchenjc/gmgn-sdk";
const options: GmgnClientOptions = {apiKey: "mock"};
const trenches: GetTrenchesParams = {chain: "sol", types: ["completed"], limit: 5};
const hot: HotSearchParams = {chain: "sol", interval: "1h"};
// @ts-expect-error Section names cannot overwrite protocol keys.
const badSection: GetTrenchesParams = {chain: "sol", types: ["version"]};
void options; void trenches; void hot; void badSection;
const config: Config = {host: "https://openapi.gmgn.ai", apiKey: "mock"};
const client = new GmgnClient(config);
const groups: TokenSignalGroup[] = [{signal_type: [12]}];
const run = (): Promise<unknown> => client.getTokenSignals("sol", groups);
// @ts-expect-error API key must be explicitly supplied.
const invalid: Config = {host: "https://openapi.gmgn.ai"};
void run; void invalid;
`,
);
execFileSync(
  join(root, "node_modules/.bin/tsc"),
  [
    "--noEmit",
    "--strict",
    "--skipLibCheck",
    "--target",
    "ES2022",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--types",
    "node",
    "--typeRoots",
    join(root, "node_modules/@types"),
    join(consumer, "consumer.mts"),
  ],
  { cwd: consumer, encoding: "utf8", timeout: 30_000 },
);
console.log("Tarball consumer import and TypeScript declarations passed.");
if (process.argv.includes("--artifact")) {
  const destination = join(root, "artifacts");
  mkdirSync(destination, { recursive: true });
  copyFileSync(archive, join(destination, packed.filename));
  const sha256 = createHash("sha256").update(readFileSync(archive)).digest("hex");
  writeFileSync(join(destination, `${packed.filename}.sha256`), `${sha256}  ${packed.filename}\n`);
}
