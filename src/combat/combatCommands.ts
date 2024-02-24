import { ButtonStyle, PermissionFlagsBits } from "discord.js"
import { db } from "../db.ts"
import {
	button,
	buttonRow,
	createMessageComponentRenderer,
	stringSelectMenu,
} from "../discord/message-component-renderer.ts"
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
					...(await participantSelector.render()),
					ephemeral: true,
				})
			},
		}),
	]),
]

export const participantSelector = createMessageComponentRenderer(
	async (selected?: Set<string>) => {
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
				stringSelectMenu({
					customId: "select-participants",
					minValues: 1,
					maxValues: Math.min(characters.length, 25),
					options: options.slice(0, 25),
					onInteraction: async (interaction) => {
						await interaction.update(
							await participantSelector.render(new Set(interaction.values)),
						)
					},
				}),
				buttonRow([
					button({
						customId: "done",
						label: "Done",
						style: ButtonStyle.Primary,
						onInteraction: async (interaction) => {
							await interaction.update({
								content: "Combat started!",
								components: [],
							})
						},
					}),
				]),
			],
		}
	},
)
