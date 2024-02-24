import { Snowflake } from "discord.js"
import { eq } from "drizzle-orm"
import { kebabCase } from "lodash-es"
import { db } from "../db.ts"
import { expect } from "../helpers/expect.ts"
import { charactersTable, playersTable } from "../schema.ts"
import { StrictOmit } from "../types.ts"

export type CharacterData = Awaited<ReturnType<typeof createCharacter>>

export async function createCharacter({
	playerDiscordId,
	...insertData
}: StrictOmit<typeof charactersTable.$inferInsert, "id" | "health"> & {
	playerDiscordId: Snowflake | null
}) {
	const aspect = expect(
		await db.query.aspectsTable.findFirst({
			where: (fields, ops) => ops.eq(fields.id, insertData.aspectId),
			with: { attribute: true },
		}),
	)

	const baseAttributeDice = await getBaseAttributeDice({
		aspectAttributeId: aspect.attribute.id,
		secondaryAttributeId: insertData.secondaryAttributeId,
	})
	const maxHealth = getMaxHealth(baseAttributeDice)

	const character = db
		.insert(charactersTable)
		.values({
			...insertData,
			id: kebabCase(insertData.name),
			health: maxHealth,
		})
		.returning()
		.get()

	let player = null
	if (playerDiscordId) {
		player = await setPlayerCharacter(playerDiscordId, expect(character).id)
	}

	const race = expect(
		await db.query.racesTable.findFirst({
			where: (fields, ops) => ops.eq(fields.id, insertData.raceId),
		}),
	)

	return {
		...expect(character),
		race,
		aspect,
		player,
		baseAttributeDice,
		maxHealth,
	}
}

export async function getCharacter(
	args: { characterId: string } | { discordUser: { id: Snowflake } },
): Promise<CharacterData | undefined> {
	let character
	if ("characterId" in args) {
		character = await db.query.charactersTable.findFirst({
			where: (fields, ops) => ops.eq(fields.id, args.characterId),
			with: {
				race: true,
				aspect: {
					with: { attribute: true },
				},
				player: true,
			},
		})
	} else {
		const player = await db.query.playersTable.findFirst({
			where: (fields, ops) => ops.eq(fields.discordUserId, args.discordUser.id),
			columns: {},
			with: {
				character: {
					with: {
						race: true,
						aspect: {
							with: { attribute: true },
						},
						player: true,
					},
				},
			},
		})
		character = player?.character
	}

	if (!character) return

	const baseAttributeDice = await getBaseAttributeDice({
		aspectAttributeId: character.aspect.attribute.id,
		secondaryAttributeId: character.secondaryAttributeId,
	})

	const maxHealth = getMaxHealth(baseAttributeDice)

	return { ...character, baseAttributeDice, maxHealth }
}

export async function updateCharacter(
	id: string,
	data: Partial<typeof charactersTable.$inferInsert>,
) {
	const updated = db
		.update(charactersTable)
		.set(data)
		.where(eq(charactersTable.id, id))
		.returning()
		.get()
	return expect(updated)
}

export async function setPlayerCharacter(
	playerId: Snowflake,
	characterId: string,
) {
	const player = db
		.insert(playersTable)
		.values({
			discordUserId: playerId,
			characterId,
		})
		.onConflictDoUpdate({
			target: [playersTable.discordUserId],
			set: {
				characterId,
			},
		})
		.returning()
		.get()
	return expect(player)
}

async function getBaseAttributeDice({
	aspectAttributeId,
	secondaryAttributeId,
}: {
	aspectAttributeId: string
	secondaryAttributeId: string
}) {
	const attributes = await db.query.attributesTable.findMany()
	return new Map(
		attributes.map((attribute) => {
			let die = 4
			if (aspectAttributeId === attribute.id) {
				die = 8
			} else if (secondaryAttributeId === attribute.id) {
				die = 6
			}
			return [attribute.id, { attribute, die }]
		}),
	)
}

function getMaxHealth(
	baseAttributeDice: Awaited<ReturnType<typeof getBaseAttributeDice>>,
) {
	return expect(baseAttributeDice.get("strength")).die * 2
}
