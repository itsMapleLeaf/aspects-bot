import * as Discord from "discord.js"
import {
	diceKinds,
	getAspect,
	getAttribute,
	getRace,
	listAspects,
	listAttributes,
	listRaces,
} from "../game-data.ts"

type CharacterData = {
	name: string
	player?: string
	race: string
	aspect: string
	attributes: Record<string, string>
	health: number
	maxHealth: number
	fatigue: number
}

export class Character {
	readonly id = crypto.randomUUID()
	#data: CharacterData

	constructor(data: CharacterData) {
		this.#data = data
	}

	static async create(args: {
		name: string
		player?: string
		race?: string
		aspect?: string
		secondaryAttribute?: string
	}) {
		const race = args.race
			? await getRace(args.race)
			: randomItem(await listRaces())

		const aspects = await listAspects()
		const aspect = args.aspect
			? await getAspect(args.aspect)
			: randomItem(aspects)

		const attributes = await listAttributes()

		const secondaryAttribute = args.secondaryAttribute
			? await getAttribute(args.secondaryAttribute)
			: randomItem(attributes)

		const attributeDice = Object.fromEntries(
			attributes.map((attribute) => [
				attribute.id,
				attribute.id === aspect.attributeId
					? "d8"
					: attribute.id === secondaryAttribute.id
					? "d6"
					: "d4",
			]),
		)

		const strengthAttributeDie = attributeDice["strength"]
		const maxHealth = diceKinds.get(strengthAttributeDie)!.faces * 2
		const health = maxHealth

		return new Character({
			name: args.name,
			player: args.player,
			race: race.id,
			aspect: aspect.id,
			attributes: attributeDice,
			health,
			maxHealth,
			fatigue: 0,
		})
	}

	get data() {
		return this.#data
	}

	async save(updates?: Partial<CharacterData>) {
		// using db = await Deno.openKv()
		// await db.set(["characters", this.id], { ...this.#data, ...updates })
		return new Character({ ...this.#data, ...updates })
	}

	static async fromDb(id: string) {
		// using db = await Deno.openKv()
		// const data = await db.get(["characters", id])
		// return data.value ? new Character(data.value as CharacterData) : null
	}

	toEmbed(): Discord.APIEmbed {
		return {
			title: this.#data.name,
			fields: [
				{ name: "Played by", value: this.#data.player ?? "no one yet" },
				{ name: "Race", value: this.#data.race },
				{ name: "Aspect", value: this.#data.aspect },
				{
					name: "Attributes",
					value: Object.entries(this.#data.attributes)
						.map(([name, dice]) => `${name}: ${dice}`)
						.join("\n"),
				},
				{
					name: "Health",
					value: `${this.#data.health}/${this.#data.maxHealth}`,
				},
				{ name: "Fatigue", value: this.#data.fatigue.toString() },
			],
		}
	}
}

function randomItem<T>(items: Iterable<T>): T {
	const array = [...items]
	if (array.length === 0) throw new Error("No items to choose from")
	return array[Math.floor(Math.random() * array.length)]
}
