import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

test("upstream client and signer remain byte-identical to the pinned extraction", () => {
  const hashes = {
    "OpenApiClient.ts": "ad21fcee9de342bfc273084a0cff549f9d8b59e9dc17c5193969a7ee443bdaeb",
    "signer.ts": "8e9bece38635028490c47b0ce93ed0c14a616facd956290dc32f00c4d8d48dbe",
  };
  for (const [file, hash] of Object.entries(hashes)) {
    const actual = createHash("sha256")
      .update(readFileSync(new URL(`../src/client/${file}`, import.meta.url))).digest("hex");
    assert.equal(actual, hash, file);
  }
});
