import { Attribute, Character, Player, Race } from "@prisma/client"
import { Snowflake } from "discord.js"
import { kebabCase } from "lodash-es"
import { db } from "../db.ts"
import { expect } from "../helpers/expect.ts"
import { OptionalKeys, RequiredKeys, StrictOmit } from "../types.ts"

export type CharacterData = Character & {
	race: Race
	aspectAttribute: Attribute
	player?: Player | null
	baseAttributeDice: ReturnType<typeof getAttributeDice>
	maxHealth: number
}

const baseQueryArgs = {
	include: { race: true, aspectAttribute: true, player: true },
} as const

export async function createCharacter({
	playerDiscordId,
	...data
}: OptionalKeys<
	StrictOmit<Character, "id" | "health">,
	"fatigue" | "currency"
> & {
	playerDiscordId?: Snowflake
	aspectId?: string
}): Promise<CharacterData> {
	const baseAttributeDice = getAttributeDice(
		{
			aspectAttributeId: data.aspectAttributeId,
			secondaryAttributeId: data.secondaryAttributeId,
		},
		await db.attribute.findMany(),
	)
	const maxHealth = getMaxHealth(baseAttributeDice)

	const id = kebabCase(data.name)

	const updates = {
		...data,
		health: maxHealth,
		...(playerDiscordId && {
			player: {
				connectOrCreate: {
					where: { discordUserId: playerDiscordId },
					create: { discordUserId: playerDiscordId },
				},
			},
		}),
	} satisfies Partial<Character>

	const character = await db.character.upsert({
		where: { id },
		create: {
			...updates,
			id,
		},
		update: updates,
		...baseQueryArgs,
	})

	return await withDataProperties(character)
}

export async function findCharacterById(
	id: string,
): Promise<CharacterData | null> {
	const character = await db.character.findFirst({
		where: { id },
		...baseQueryArgs,
	})
	return character && (await withDataProperties(character))
}

export async function findCharacterByPlayerId(
	playerId: Snowflake,
): Promise<CharacterData | null> {
	const character = await db.character.findFirst({
		where: { player: { discordUserId: playerId } },
		...baseQueryArgs,
	})
	return character && (await withDataProperties(character))
}

async function withDataProperties<T extends Character>(character: T) {
	const baseAttributeDice = getAttributeDice(
		character,
		await db.attribute.findMany(),
	)
	const maxHealth = getMaxHealth(baseAttributeDice)
	return { ...character, baseAttributeDice, maxHealth }
}

export async function updateCharacter({
	id,
	...data
}: RequiredKeys<Partial<Character>, "id">): Promise<CharacterData> {
	const character = await db.character.update({
		where: { id },
		data,
		...baseQueryArgs,
	})
	return await withDataProperties(character)
}

export async function setPlayerCharacter(
	discordUserId: Snowflake,
	characterId: string,
) {
	await db.player.upsert({
		where: { discordUserId },
		create: { discordUserId, characterId },
		update: { characterId },
	})
}

export function getAttributeDice(
	character: {
		aspectAttributeId: string
		secondaryAttributeId: string
	},
	attributes: Attribute[],
) {
	return new Map(
		attributes.map((attribute) => {
			let die = 4
			if (character.aspectAttributeId === attribute.id) {
				die = 8
			} else if (character.secondaryAttributeId === attribute.id) {
				die = 6
			}
			return [attribute.id, { attribute, die }]
		}),
	)
}

export function getMaxHealth(
	baseAttributeDice: Awaited<ReturnType<typeof getAttributeDice>>,
) {
	return expect(baseAttributeDice.get("strength")).die * 2
}
