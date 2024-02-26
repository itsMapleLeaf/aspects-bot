import * as Discord from "discord.js"
import { characterCommands } from "./characters/characterCommands.ts"
import { combatSetup } from "./combat/CombatSetup.ts"
import { combatTracker } from "./combat/CombatTracker.ts"
import { combatCommands } from "./combat/combatCommands.ts"
import { useRollCommands } from "./dice/useRollCommands.ts"
import { useCommands } from "./discord/command-handler.ts"
import { SlashCommandContext } from "./discord/commands/SlashCommandContext.ts"
import { useInteractionHandlers } from "./discord/interactions/InteractionHandler.ts"
import { env } from "./env.ts"
import { Logger } from "./logger.ts"

const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMembers,
	],
})

client.on("ready", (client) => {
	Logger.info((f) => `Logged in as ${f.highlight(client.user?.tag)}`)
})

SlashCommandContext.provide(client, () => {
	useRollCommands()
})

useCommands(client, [...characterCommands, ...combatCommands])
useInteractionHandlers(client, [combatSetup, combatTracker])

await Logger.async("Logging in", () => client.login(env.DISCORD_BOT_TOKEN))
