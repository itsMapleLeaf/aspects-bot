import assert from "node:assert/strict"
import { execSync } from "node:child_process"
import test from "node:test"
import { CharacterModel } from "./CharacterModel.js"

test.before(() => {
	execSync("pnpm prisma db push --force-reset --accept-data-loss", {
		stdio: "inherit",
	})
})

void test.describe("CharacterModel", async () => {
	let character: CharacterModel

	test.beforeEach(async () => {
		character = await CharacterModel.create({
			name: "Athena",
			raceId: "Pyra",
			aspectId: "Wind",
			guildId: "123",
			primaryAttributeId: "Sense",
			secondaryAttributeId: "Mobility",
			tertiaryAttributeId: "Aspect",
		})
	})

	await test.it("strips extra props from the player option", async () => {
		const player = { id: "123", username: "someone" }
		character = await character.update({ player })
		assert.equal(character.data.player?.id, "123")
	})

	test.afterEach(async () => {
		await character.delete()
	})
})
