import assert from "node:assert/strict";
import test from "node:test";

export const add = (x: number, y: number) => x + y;

test("add(1, 2) should be 3", () => {
  assert.equal(add(1, 2), 3);
});
