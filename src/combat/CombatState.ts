import {
	Attribute,
	Character,
	CombatMember,
	CombatState,
	Player,
	Race,
} from "@prisma/client"
import { db } from "../db.ts"

export type CombatStateData = CombatState & {
	initiativeAttribute: Attribute
	members: CombatMemberData[]
	currentParticipant: CombatMemberData | undefined
}

type CombatMemberData = CombatMember & {
	character: Character & {
		player: Player | null
		aspectAttribute: Attribute
		race: Race
	}
}

const queryInclude = {
	initiativeAttribute: true,
	members: {
		include: {
			character: {
				include: {
					player: true,
					aspectAttribute: true,
					race: true,
				},
			},
		},
	},
}

export async function getCombatState(guild: {
	id: string
}): Promise<CombatStateData | null> {
	const state = await db.combatState.findFirst({
		where: {
			discordGuildId: guild.id,
		},
		include: {
			initiativeAttribute: true,
			members: {
				include: {
					character: {
						include: {
							player: true,
							aspectAttribute: true,
							race: true,
						},
					},
				},
			},
		},
	})
	return (
		state && {
			...state,
			currentParticipant: state.members[state.participantIndex],
		}
	)
}

export async function startCombat({
	guild,
	initiativeAttributeId,
	...args
}: {
	guild: { id: string }
	members: { characterId: string; initiative: number }[]
	initiativeAttributeId: string
}): Promise<CombatStateData> {
	const state = await db.combatState.create({
		data: {
			discordGuildId: guild.id,
			initiativeAttributeId,
			participantIndex: 0,
			round: 1,
			members: {
				connectOrCreate: args.members.map((member) => ({
					where: {
						characterId_combatStateGuildId: {
							characterId: member.characterId,
							combatStateGuildId: guild.id,
						},
					},
					create: member,
				})),
			},
		},
		include: queryInclude,
	})

	return {
		...state,
		currentParticipant: state.members[state.participantIndex],
	}
}

export async function endCombat(guild: { id: string }) {
	await db.combatState.delete({
		where: {
			discordGuildId: guild.id,
		},
	})
}

export async function setParticipants(
	state: CombatStateData,
	participants: { characterId: string; initiative: number }[],
): Promise<CombatStateData> {
	const updated = await db.combatState.update({
		where: {
			discordGuildId: state.discordGuildId,
		},
		data: {
			members: {
				upsert: participants.map((participant) => ({
					where: {
						characterId_combatStateGuildId: {
							characterId: participant.characterId,
							combatStateGuildId: state.discordGuildId,
						},
					},
					update: {
						initiative: participant.initiative,
					},
					create: {
						...participant,
						combatStateGuildId: state.discordGuildId,
					},
				})),
			},
		},
		include: {
			members: queryInclude.members,
		},
	})
	return {
		...state,
		...updated,
		currentParticipant: updated.members[state.participantIndex],
	}
}

export async function addParticipant(
	state: CombatStateData,
	data: {
		characterId: string
		initiative: number
	},
): Promise<CombatStateData> {
	const updated = await db.combatState.update({
		where: {
			discordGuildId: state.discordGuildId,
		},
		data: {
			members: {
				connectOrCreate: {
					where: {
						characterId_combatStateGuildId: {
							characterId: data.characterId,
							combatStateGuildId: state.discordGuildId,
						},
					},
					create: data,
				},
			},
		},
		include: {
			members: queryInclude.members,
		},
	})
	return { ...state, ...updated }
}

export async function removeParticipant(
	state: CombatStateData,
	characterId: string,
): Promise<CombatStateData> {
	const updated = await db.combatState.update({
		where: {
			discordGuildId: state.discordGuildId,
		},
		data: {
			members: {
				delete: {
					characterId_combatStateGuildId: {
						characterId,
						combatStateGuildId: state.discordGuildId,
					},
				},
			},
		},
		include: {
			members: queryInclude.members,
		},
	})
	return { ...state, ...updated }
}

export async function setParticipantIndex(
	state: CombatStateData,
	participantIndex: number,
) {
	const updated = await db.combatState.update({
		where: {
			discordGuildId: state.discordGuildId,
		},
		data: {
			participantIndex,
		},
	})
	return {
		...state,
		...updated,
		currentParticipant: state.members[participantIndex],
	}
}

export async function setParticipantInitiative(
	state: CombatStateData,
	characterId: string,
	initiative: number,
) {
	const updated = await db.combatState.update({
		where: {
			discordGuildId: state.discordGuildId,
		},
		data: {
			members: {
				update: {
					where: {
						characterId_combatStateGuildId: {
							characterId,
							combatStateGuildId: state.discordGuildId,
						},
					},
					data: {
						initiative,
					},
				},
			},
		},
		include: {
			members: queryInclude.members,
		},
	})
	return { ...state, ...updated }
}

export async function advanceCombat(state: CombatStateData) {
	const nextIndex = (state.participantIndex + 1) % state.members.length

	const updated = await db.combatState.update({
		where: {
			discordGuildId: state.discordGuildId,
		},
		data: {
			participantIndex: nextIndex,
			round: state.round + (nextIndex === 0 ? 1 : 0),
		},
	})

	return { ...state, ...updated, currentParticipant: state.members[nextIndex] }
}

export async function rewindCombat(state: CombatStateData) {
	const nextIndex =
		(state.participantIndex - 1 + state.members.length) % state.members.length

	const updated = await db.combatState.update({
		where: {
			discordGuildId: state.discordGuildId,
		},
		data: {
			participantIndex: nextIndex,
			round: state.round - (nextIndex === state.members.length - 1 ? 1 : 0),
		},
	})

	return { ...state, ...updated, currentParticipant: state.members[nextIndex] }
}
