import { loadGameData } from "./game-data.ts"
import { Logger } from "./logger.ts"
await Logger.async(`Loading game data`, loadGameData)

import * as Discord from "discord.js"
import { useCharacterCommands } from "./characters/useCharacterCommands.ts"
import { useCombatCommands } from "./combat/useCombatCommands.ts"
import { useRollCommands } from "./dice/useRollCommands.ts"
import { SlashCommandContext } from "./discord/commands/SlashCommandContext.ts"
import { MessageComponentContext } from "./discord/messageComponents/MessageComponentContext.ts"
import { env } from "./env.ts"

const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMembers,
	],
})

client.on("ready", (client) => {
	Logger.info((f) => `Logged in as ${f.highlight(client.user?.tag)}`)
})

using _slashCommands = SlashCommandContext.provide(client)
using _messageComponents = MessageComponentContext.provide(client)
useRollCommands()
await useCharacterCommands()
useCombatCommands()

await Logger.async("Logging in", () => client.login(env.DISCORD_BOT_TOKEN))
