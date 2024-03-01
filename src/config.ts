import { type GuildMember, PermissionFlagsBits } from "discord.js"

export function isGameMaster(member: GuildMember) {
	return (
		member.permissions.has(PermissionFlagsBits.ManageGuild) ||
		member.roles.cache.some((role) => role.name.toLocaleLowerCase() === "game master")
	)
}
