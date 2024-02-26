import assert from "node:assert"
import test from "node:test"
import { range, take } from "./iterable.ts"

test("take", () => {
	const items = new Set(["a", "b", "c", "d", "e"])
	assert.deepEqual([...take(3, items)], ["a", "b", "c"])
})
