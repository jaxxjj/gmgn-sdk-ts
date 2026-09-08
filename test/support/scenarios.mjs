import assert from "node:assert/strict";

export const scenarios = Object.fromEntries(
  ["sol", "bsc", "robinhood"].flatMap((chain) =>
    ["kol", "smartmoney"].map((kind) => [
      `${chain}-${kind}`,
      async (client) => {
        const result = await (kind === "kol"
          ? client.getKol(chain, 2)
          : client.getSmartMoney(chain, 2));
        assert.ok(result && typeof result === "object");
        assert.ok(Array.isArray(result.list), "Expected wallet list");
        assert.ok(result.list.length > 0, "A capture must exercise actual rows");
        return result;
      },
    ]),
  ),
);
