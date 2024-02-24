import {
	ButtonStyle,
	ComponentType,
	MessageComponentInteraction,
	PermissionFlagsBits,
} from "discord.js"
import { db } from "../db.ts"
import {
	defineSlashCommand,
	defineSlashCommandGroup,
} from "../discord/slash-command.ts"

export const combatCommands = [
	defineSlashCommandGroup("combat", "Manage combat", [
		defineSlashCommand({
			name: "start",
			description: "Start combat",
			options: {},
			data: {
				defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
			},
			async run(interaction, options) {
				await interaction.reply({
					...(await renderParticipantSelector()),
					ephemeral: true,
				})
			},
		}),
	]),
]

async function renderParticipantSelector(selected?: Set<string>) {
	const characters = await db.query.charactersTable.findMany({
		with: {
			player: true,
		},
	})

	selected ??= new Set(characters.filter((c) => c.player).map((c) => c.id))

	const options = characters.map((c) => ({
		label: c.name,
		value: c.id,
		default: selected.has(c.id),
	}))

	return {
		content: "Select combat participants.",
		components: [
			{
				type: ComponentType.ActionRow as const,
				components: [
					{
						type: ComponentType.StringSelect as const,
						customId: "select-participants",
						minValues: 1,
						maxValues: Math.min(characters.length, 25),
						options: options.slice(0, 25),
					},
				],
			},
			{
				type: ComponentType.ActionRow as const,
				components: [
					{
						type: ComponentType.Button as const,
						customId: "done",
						label: "Done",
						style: ButtonStyle.Primary as const,
					},
				],
			},
		],
	}
}

export async function handleParticipantSelectorInteraction(
	interaction: MessageComponentInteraction,
) {
	if (
		interaction.isStringSelectMenu() &&
		interaction.customId === "select-participants"
	) {
		await interaction.update(
			await renderParticipantSelector(new Set(interaction.values)),
		)
	}

	if (interaction.isButton() && interaction.customId === "done") {
		await interaction.update({
			content: "Combat started!",
			components: [],
		})
	}
}
