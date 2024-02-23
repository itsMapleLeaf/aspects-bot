import { APIEmbed, Snowflake } from "discord.js"
import { eq } from "drizzle-orm"
import { kebabCase } from "lodash-es"
import { db } from "../db.ts"
import { CommandError } from "../discord/commands/CommandError.ts"
import {
	getAspect,
	getAttribute,
	getRace,
	listAspects,
	listAttributes,
	listRaces,
} from "../game-data.ts"
import { raise } from "../helpers/errors.ts"
import {
	aspectsTable,
	attributesTable,
	charactersTable,
	racesTable,
} from "../schema.ts"

type CharacterModelData = typeof charactersTable.$inferSelect & {
	race: typeof racesTable.$inferSelect
	aspect: typeof aspectsTable.$inferSelect
}

export class CharacterModel {
	#data: CharacterModelData
	#attributes: (typeof attributesTable.$inferSelect)[]

	private constructor(
		data: CharacterModelData,
		attributesData: (typeof attributesTable.$inferSelect)[],
	) {
		this.#data = data
		this.#attributes = attributesData
	}

	static async create(options: {
		name: string
		playerDiscordId: string | null
		aspectId: string | null
		raceId: string | null
		secondaryAttributeId: string | null
	}) {
		const race = options.raceId
			? await getRace(options.raceId)
			: randomItem(await listRaces())

		const aspects = await listAspects()
		const aspect = options.aspectId
			? await getAspect(options.aspectId)
			: randomItem(aspects)

		const attributes = await listAttributes()

		const secondaryAttribute = options.secondaryAttributeId
			? await getAttribute(options.secondaryAttributeId)
			: randomItem(attributes.filter((a) => a.id !== aspect.attributeId))

		if (aspect.attributeId === secondaryAttribute.id) {
			throw new CommandError(
				"Secondary attribute cannot be the same as the aspect's attribute.",
			)
		}

		const data = {
			id: kebabCase(options.name),
			name: options.name,
			playerDiscordId: options.playerDiscordId,
			raceId: race.id,
			aspectId: aspect.id,
			secondaryAttributeId: secondaryAttribute.id,
			health: 0,
			fatigue: 0,
		} satisfies typeof charactersTable.$inferInsert

		const model = new CharacterModel({ ...data, race, aspect }, attributes)
		await model.update({ health: model.maxHealth })
		return model
	}

	static async fromCharacterId(characterId: string) {
		const character =
			(await db.query.charactersTable.findFirst({
				where: eq(charactersTable.id, characterId),
				with: {
					race: true,
					aspect: true,
				},
			})) ?? raise(new CommandError("Couldn't find that character."))

		const attributes = await db.query.attributesTable.findMany()

		return new CharacterModel(character, attributes)
	}

	static async fromPlayer(user: { id: Snowflake }) {
		const character = await db.query.charactersTable.findFirst({
			where: eq(charactersTable.playerDiscordId, user.id),
			with: {
				race: true,
				aspect: true,
			},
		})
		if (!character) return

		const attributes = await db.query.attributesTable.findMany()
		return new CharacterModel(character, attributes)
	}

	get data(): Readonly<CharacterModelData> {
		return this.#data
	}

	get baseAttributeDice() {
		return this.#attributes.map((attribute) => ({
			attribute,
			die:
				this.#data.aspect.attributeId === attribute.id
					? 8
					: this.#data.secondaryAttributeId === attribute.id
					? 6
					: 4,
		}))
	}

	getAttributeDie(attributeId: string) {
		return (
			this.baseAttributeDice.find((v) => v.attribute.id === attributeId)?.die ??
			raise(`Attribute "${attributeId}" not found`)
		)
	}

	get maxHealth() {
		return this.getAttributeDie("strength") * 2
	}

	get embed(): APIEmbed {
		return {
			title: this.#data.name,
			fields: [
				{
					name: "Player",
					value: this.#data.playerDiscordId
						? `<@${this.#data.playerDiscordId}>`
						: "NPC",
				},
				{ name: "Race", value: this.#data.race.name },
				{ name: "Aspect", value: this.#data.aspect.name },
				...this.baseAttributeDice.map((entry) => ({
					name: entry.attribute.name,
					value: `d${entry.die}`,
				})),
				{
					name: "Health",
					value: `${this.#data.health}/${this.maxHealth}`,
				},
				{ name: "Fatigue", value: `${this.#data.fatigue}` },
			],
		}
	}

	async update(values: Partial<typeof charactersTable.$inferInsert>) {
		const data = db
			.insert(charactersTable)
			.values({ ...this.#data, ...values })
			.onConflictDoUpdate({
				target: [charactersTable.id],
				set: values,
			})
			.returning()
			.get()

		this.#data = { ...this.#data, ...data }
	}
}

function randomItem<T>(items: Iterable<T>): T {
	const array = [...items]
	if (array.length === 0) throw new Error("No items to choose from")
	return array[Math.floor(Math.random() * array.length)]
}