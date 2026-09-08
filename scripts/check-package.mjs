import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../", import.meta.url));
const archive = resolve(root, "jaxxjj-gmgn-sdk-0.1.0.tgz");
const consumer = mkdtempSync(join(tmpdir(), "gmgn-sdk-consumer-"));
execFileSync("npm", ["install", "--prefix", consumer, "--ignore-scripts", "--no-audit", "--no-fund", archive],
  { encoding: "utf8" });
const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
  import { GmgnClient, OpenApiClient } from "@jaxxjj/gmgn-sdk";
  if (GmgnClient !== OpenApiClient) throw new Error("Alias mismatch");
  const c = new GmgnClient({host: "https://openapi.gmgn.ai", apiKey: "not-a-real-key"});
  if (typeof c.getKol !== "function" || typeof c.getTokenPoolInfo !== "function") {
    throw new Error("Export failure");
  }
  console.log("consumer import passed");
`], { cwd: consumer, encoding: "utf8", timeout: 5_000 });
assert.equal(output.trim(), "consumer import passed");
writeFileSync(join(consumer, "consumer.mts"), `
import { GmgnClient, type Config, type TokenSignalGroup } from "@jaxxjj/gmgn-sdk";
const config: Config = {host: "https://openapi.gmgn.ai", apiKey: "mock"};
const client = new GmgnClient(config);
const groups: TokenSignalGroup[] = [{signal_type: [12]}];
const run = (): Promise<unknown> => client.getTokenSignalV2("sol", groups);
// @ts-expect-error API key must be explicitly supplied.
const invalid: Config = {host: "https://openapi.gmgn.ai"};
void run; void invalid;
`);
execFileSync(join(root, "node_modules/.bin/tsc"), [
  "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
  "--module", "NodeNext", "--moduleResolution", "NodeNext",
  "--types", "node", "--typeRoots", join(root, "node_modules/@types"),
  join(consumer, "consumer.mts"),
], { cwd: consumer, encoding: "utf8", timeout: 30_000 });
console.log("Tarball consumer import and TypeScript declarations passed.");
