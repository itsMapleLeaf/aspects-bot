import type { Character, Prisma } from "@prisma/client"
import * as Discord from "discord.js"
import { kebabCase } from "lodash-es"
import { dedent } from "ts-dedent"
import { db } from "../db.js"
import * as GameTables from "../game/tables.js"
import { Attributes } from "../game/tables.js"
import { join, recordFromEntries } from "../helpers/iterable.js"
import { clamp } from "../helpers/math.js"
import type { Nullish } from "../types.js"

export type CharacterModelData = Character & {
	player: { id: string } | null
}

export class CharacterModel {
	readonly data

	constructor(data: CharacterModelData) {
		this.data = data
	}

	static async create({
		playerId,
		guildId,
		...input
	}: Pick<Prisma.CharacterUncheckedCreateInput, Exclude<keyof Character, "id">> & {
		playerId?: string
	}) {
		const data = await db.character.create({
			data: {
				...input,
				id: kebabCase(input.name),
				guild: {
					connectOrCreate: {
						where: { id: guildId },
						create: { id: guildId },
					},
				},
				...(playerId && {
					player: {
						connectOrCreate: {
							where: { id: playerId },
							create: { id: playerId },
						},
					},
				}),
			},
			include: { player: true },
		})
		return new CharacterModel(data)
	}

	static async getById(id: string) {
		const data = await db.character.findUnique({
			where: { id },
			include: { player: true },
		})
		return data && new CharacterModel(data)
	}

	static async getByPlayer(args: { guildId: string; playerId?: Nullish<string> }) {
		console.log("getByPlayer", args)
		const data = await db.character.findFirst({
			where:
				args.playerId ?
					{
						AND: { guildId: args.guildId, player: { id: args.playerId } },
					}
				:	{
						guildId: args.guildId,
					},
			include: { player: true },
		})
		return data && new CharacterModel(data)
	}

	get race() {
		return GameTables.Races.getValue(this.data.raceId)
	}

	get aspect() {
		return GameTables.Aspects.getValue(this.data.aspectId)
	}

	get health() {
		return clamp(this.data.health ?? this.maxHealth, 0, this.maxHealth)
	}

	get attributes() {
		return recordFromEntries(this.#attributeEntries())
	}

	*#attributeEntries() {
		for (const id of Attributes.keys()) {
			if (id === this.data.primaryAttributeId) {
				yield [id, 12] as const
			} else if (id === this.data.secondaryAttributeId) {
				yield [id, 8] as const
			} else if (id === this.data.tertiaryAttributeId) {
				yield [id, 6] as const
			} else {
				yield [id, 4] as const
			}
		}
	}

	get maxHealth() {
		return this.attributes.Strength * 2
	}

	*issues() {
		// attributes must be unique
		if (
			new Set([
				this.data.primaryAttributeId,
				this.data.secondaryAttributeId,
				this.data.tertiaryAttributeId,
			]).size < 3
		) {
			yield "Attribute choices must be unique."
		}
	}

	async save() {
		const issues = [...this.issues()]
		if (issues.length > 0) {
			throw new CharacterValidationError(issues)
		}

		const input = {
			...this.data,
			health: this.health,
			player:
				this.data.player ?
					{
						connectOrCreate: {
							where: { id: this.data.player.id },
							create: { id: this.data.player.id },
						},
					}
				:	undefined,
		} satisfies Omit<Prisma.CharacterUncheckedCreateInput, "id">

		const data = await db.character.upsert({
			where: { id: this.data.id },
			create: { ...input, id: this.data.id },
			update: input,
			include: { player: true },
		})

		return new CharacterModel(data)
	}

	async update(newData: Partial<CharacterModelData>) {
		const newModel = new CharacterModel({ ...this.data, ...newData })
		return await newModel.save()
	}

	async delete() {
		await db.character.delete({ where: { id: this.data.id } })
	}

	format() {
		return dedent`
			## ${this.data.name}

			${this.race.emoji} ${Discord.bold(this.data.raceId)}
			${this.aspect.emoji} ${Discord.bold(this.data.aspectId)}

			❤️‍🩹 ${Discord.bold(`${this.health}/${this.maxHealth}`)} Health
			💤 ${Discord.bold(String(this.data.fatigue))} Fatigue
			🪙 ${Discord.bold(String(this.data.currency))} Notes

			${join(this.formatAttributes(), "\n")}

			${this.data.player ? `👤 ${Discord.userMention(this.data.player.id)}` : ""}
		`
	}

	*formatAttributes() {
		for (const [id, die] of this.#attributeEntries()) {
			yield `${Attributes.getValue(id).emoji} ${id} ⇒ ${Discord.bold(`d${die}`)}`
		}
	}
}

export class CharacterValidationError extends Error {
	constructor(public issues: readonly string[]) {
		super("Character validation failed.")
	}
}
