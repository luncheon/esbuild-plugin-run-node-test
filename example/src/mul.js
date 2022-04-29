import assert from "node:assert/strict";
import test from "node:test";

export const mul = (x, y) => x * y;

test("mul(3, 2) should be 6", () => {
  assert.equal(mul(3, 2), 6);
});
