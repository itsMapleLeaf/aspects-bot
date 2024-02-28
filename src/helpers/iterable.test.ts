import assert from "node:assert"
import test from "node:test"
import { take } from "./iterable.ts"

void test("take", () => {
	const items = new Set(["a", "b", "c", "d", "e"])
	assert.deepStrictEqual([...take(3, items)], ["a", "b", "c"])
	assert.deepStrictEqual([...take(0, items)], [])
	assert.deepStrictEqual([...take(5, items)], ["a", "b", "c", "d", "e"])
	assert.deepStrictEqual([...take(6, items)], ["a", "b", "c", "d", "e"])
})
