import assert from "node:assert/strict";

export async function executeRead(client, name, args, variant, pause = async () => {}) {
  if (variant !== "activity-two-pages") return client[name](...args);
  assert.equal(name, "getWalletActivity");
  const first = await client[name](...args);
  assert.ok(Array.isArray(first.activities) && first.activities.length > 0);
  assert.ok(typeof first.next === "string" && first.next.length > 0, "No real next cursor");
  await pause();
  const second = await client.getWalletActivity(args[0], args[1], {
    ...args[2],
    cursor: first.next,
  });
  assert.ok(Array.isArray(second.activities) && second.activities.length > 0);
  const identity = (row) =>
    JSON.stringify([
      row.tx_hash,
      row.event_type,
      row.token?.address,
      row.timestamp,
      row.token_amount,
    ]);
  const keys = [...first.activities, ...second.activities].map(identity);
  assert.equal(new Set(keys).size, keys.length, "Overlapping activity pages");
  return [first, second];
}
