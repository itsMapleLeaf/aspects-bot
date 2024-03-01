import type { CombatMember, CombatState, Prisma } from "@prisma/client"
import { CharacterModel, type CharacterModelData } from "../characters/CharacterModel.js"
import { db } from "../db.js"
import { roll } from "../dice/roll.js"
import { Attributes } from "../game/tables.js"

type AttributeId = keyof (typeof Attributes)["items"]

export type CombatStateModelData = CombatState & {
	initiativeAttributeId: string
	members: (CombatMember & { character: CharacterModelData })[]
}

const queryInclude = {
	members: {
		include: {
			character: {
				include: {
					player: true,
				},
			},
		},
		orderBy: {
			initiative: "desc" as const,
		},
	},
}

export class CombatStateModel {
	readonly data

	constructor(data: Readonly<CombatStateModelData>) {
		this.data = data
	}

	static async create({
		guildId,
		initiativeAttributeId,
		memberCharacters,
	}: {
		guildId: string
		initiativeAttributeId: AttributeId
		memberCharacters: CharacterModel[]
	}): Promise<CombatStateModel> {
		const data = await db.combatState.create({
			data: {
				guildId,
				initiativeAttributeId,
				members: {
					connectOrCreate: memberCharacters.map((character) => ({
						where: {
							characterId_combatStateId: {
								characterId: character.data.id,
								combatStateId: guildId,
							},
						},
						create: {
							characterId: character.data.id,
							initiative: roll(character.attributes[initiativeAttributeId]),
						},
					})),
				},
			},
			include: queryInclude,
		})
		return new CombatStateModel(data)
	}

	static async get(guildId: string) {
		const data = await db.combatState.findUnique({
			where: { guildId },
			include: queryInclude,
		})
		return data && new CombatStateModel(data)
	}

	get initiativeAttributeId() {
		return Attributes.hasKey(this.data.initiativeAttributeId)
			? this.data.initiativeAttributeId
			: "Mobility"
	}

	get members() {
		return this.data.members.map((member) => ({
			...member,
			character: new CharacterModel(member.character),
		}))
	}

	get currentMember() {
		return this.members[this.data.participantIndex]
	}

	async #update(input: Prisma.CombatStateUncheckedUpdateInput) {
		const data = await db.combatState.update({
			where: { guildId: this.data.guildId },
			data: input,
			include: queryInclude,
		})
		return new CombatStateModel(data)
	}

	static async delete(guildId: string) {
		await db.combatState.deleteMany({
			where: { guildId },
		})
	}

	async advance() {
		const nextIndex = (this.data.participantIndex + 1) % this.data.members.length
		return this.#update({
			participantIndex: nextIndex,
			round: this.data.round + (nextIndex === 0 ? 1 : 0),
		})
	}

	async rewind() {
		const nextIndex =
			(this.data.participantIndex - 1 + this.data.members.length) % this.data.members.length
		return this.#update({
			participantIndex: nextIndex,
			round: this.data.round - (nextIndex === this.data.members.length - 1 ? 1 : 0),
		})
	}

	async addMember(character: CharacterModel) {
		return this.#update({
			members: {
				connectOrCreate: {
					where: {
						characterId_combatStateId: {
							characterId: character.data.id,
							combatStateId: this.data.guildId,
						},
					},
					create: {
						characterId: character.data.id,
						initiative: roll(character.attributes[this.initiativeAttributeId]),
					},
				},
			},
		})
	}

	async removeMember(characterId: string) {
		return this.#update({
			members: {
				delete: {
					characterId_combatStateId: {
						characterId,
						combatStateId: this.data.guildId,
					},
				},
			},
		})
	}
}
