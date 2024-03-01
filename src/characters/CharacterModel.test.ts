import assert from "node:assert/strict"
import test from "node:test"
import { CharacterModel } from "./CharacterModel.ts"

void test.describe("CharacterModel", async () => {
	await test("saving player with extra props", async () => {
		let character = await CharacterModel.create({
			name: "Athena",
			raceId: "Pyra",
			aspectId: "Wind",
			guildId: "123",
			primaryAttributeId: "Sense",
			secondaryAttributeId: "Mobility",
			tertiaryAttributeId: "Aspect",
		})
		const player = { id: "123", username: "someone" }
		character = await character.update({ player })
		assert.equal(character.data.player?.id, "123")
	})
})
