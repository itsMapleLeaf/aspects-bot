import { Snowflake } from "discord.js"
import { eq } from "drizzle-orm"
import { kebabCase } from "lodash-es"
import { db } from "../db.ts"
import { expect } from "../helpers/expect.ts"
import { charactersTable } from "../schema.ts"
import { StrictOmit } from "../types.ts"

export type CharacterData = Awaited<ReturnType<typeof createCharacter>>

export async function createCharacter(
	insertData: StrictOmit<typeof charactersTable.$inferInsert, "id" | "health">,
) {
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

	const { id } = db
		.insert(charactersTable)
		.values({
			...insertData,
			id: kebabCase(insertData.name),
			health: maxHealth,
		})
		.returning({ id: charactersTable.id })
		.get()

	const character = await db.query.charactersTable.findFirst({
		where: (fields, ops) => ops.eq(fields.id, id),
		with: {
			race: true,
		},
	})

	return { ...expect(character), aspect, baseAttributeDice, maxHealth }
}

export async function getCharacter(
	args: { characterId: string } | { discordUser: { id: Snowflake } },
): Promise<CharacterData | undefined> {
	const where =
		"characterId" in args
			? eq(charactersTable.id, args.characterId)
			: eq(charactersTable.playerDiscordId, args.discordUser.id)

	const data = await db.query.charactersTable.findFirst({
		where,
		with: {
			race: true,
			aspect: {
				with: { attribute: true },
			},
		},
	})

	if (!data) return

	const baseAttributeDice = await getBaseAttributeDice({
		aspectAttributeId: data.aspect.attribute.id,
		secondaryAttributeId: data.secondaryAttributeId,
	})

	const maxHealth = getMaxHealth(baseAttributeDice)

	return { ...data, baseAttributeDice, maxHealth }
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
