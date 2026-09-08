import { rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Only delete this package's generated output, never a caller-supplied path.
rmSync(fileURLToPath(new URL("../dist", import.meta.url)), { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url)),
    "-p",
    fileURLToPath(new URL("../tsconfig.json", import.meta.url)),
  ],
  { stdio: "inherit" },
);
