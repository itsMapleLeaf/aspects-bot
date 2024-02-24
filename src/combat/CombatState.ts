import { and, eq, notInArray } from "drizzle-orm"
import { db } from "../db.ts"
import { expect } from "../helpers/expect.ts"
import {
	charactersTable,
	combatParticipantsTable,
	combatStatesTable,
} from "../schema.ts"

export type CombatState = typeof combatStatesTable.$inferSelect & {
	participants: CombatParticipant[]
	currentParticipant: CombatParticipant | undefined
}

type CombatParticipant = typeof combatParticipantsTable.$inferSelect & {
	character: typeof charactersTable.$inferSelect
}

export async function getCombatState(guild: {
	id: string
}): Promise<CombatState | undefined> {
	const state = await db.query.combatStatesTable.findFirst({
		where: (fields, ops) => ops.eq(fields.discordGuildId, guild.id),
		with: {
			participants: {
				with: {
					character: true,
				},
			},
		},
	})
	return (
		state && {
			...state,
			currentParticipant: state.participants[state.participantIndex],
		}
	)
}

export async function startCombat(guild: { id: string }): Promise<CombatState> {
	const state = db
		.insert(combatStatesTable)
		.values({ discordGuildId: guild.id })
		.onConflictDoNothing()
		.returning()
		.get()

	const { participants } = expect(
		await db.query.combatStatesTable.findFirst({
			where: (fields, ops) => ops.eq(fields.discordGuildId, guild.id),
			columns: {},
			with: {
				participants: {
					with: {
						character: true,
					},
				},
			},
		}),
	)

	return { ...state, participants, currentParticipant: participants[0] }
}

export async function endCombat(guild: { id: string }) {
	await db
		.delete(combatStatesTable)
		.where(eq(combatStatesTable.discordGuildId, guild.id))
}

export async function setParticipants(
	state: CombatState,
	participants: { characterId: string; initiative: number }[],
) {
	await db.transaction(async (db) => {
		await db
			.insert(combatParticipantsTable)
			.values(
				participants.map((participant) => ({
					...participant,
					combatStateGuildId: state.discordGuildId,
				})),
			)
			.onConflictDoNothing()

		await db.delete(combatParticipantsTable).where(
			and(
				eq(combatParticipantsTable.combatStateGuildId, state.discordGuildId),
				notInArray(
					combatParticipantsTable.characterId,
					participants.map((p) => p.characterId),
				),
			),
		)
	})
	return getCombatState({ id: state.discordGuildId })
}

export async function addParticipant(
	state: CombatState,
	participant: {
		characterId: string
		initiative: number
	},
) {
	await db
		.insert(combatParticipantsTable)
		.values({
			...participant,
			combatStateGuildId: state.discordGuildId,
		})
		.onConflictDoNothing()
	return getCombatState({ id: state.discordGuildId })
}

export async function removeParticipant(
	state: CombatState,
	characterId: string,
) {
	await db
		.delete(combatParticipantsTable)
		.where(
			and(
				eq(combatParticipantsTable.combatStateGuildId, state.discordGuildId),
				eq(combatParticipantsTable.characterId, characterId),
			),
		)
	return {
		...state,
		participants: state.participants.filter(
			(p) => p.characterId !== characterId,
		),
	}
}

export async function setParticipantIndex(
	state: CombatState,
	participantIndex: number,
) {
	const updated = db
		.update(combatStatesTable)
		.set({ participantIndex })
		.where(eq(combatStatesTable.discordGuildId, state.discordGuildId))
		.returning()
		.get()
	return { ...state, ...updated }
}

export async function setParticipantInitiative(
	state: CombatState,
	characterId: string,
	initiative: number,
) {
	await db
		.update(combatParticipantsTable)
		.set({ initiative })
		.where(
			and(
				eq(combatParticipantsTable.combatStateGuildId, state.discordGuildId),
				eq(combatParticipantsTable.characterId, characterId),
			),
		)
	return getCombatState({ id: state.discordGuildId })
}

export async function advanceCombat(state: CombatState) {
	const nextIndex = (state.participantIndex + 1) % state.participants.length

	const updated = db
		.update(combatStatesTable)
		.set({
			participantIndex: nextIndex,
			round: state.round + (nextIndex === 0 ? 1 : 0),
		})
		.where(eq(combatStatesTable.discordGuildId, state.discordGuildId))
		.returning()
		.get()

	return { ...state, ...updated }
}

export async function rewindCombat(state: CombatState) {
	const nextIndex =
		(state.participantIndex - 1 + state.participants.length) %
		state.participants.length

	const updated = db
		.update(combatStatesTable)
		.set({
			participantIndex: nextIndex,
			round:
				state.round - (nextIndex === state.participants.length - 1 ? 1 : 0),
		})
		.where(eq(combatStatesTable.discordGuildId, state.discordGuildId))
		.returning()
		.get()

	return { ...state, ...updated }
}
