export function code(text: string | number | bigint) {
	return `\`\`\`\n${text}\n\`\`\``
}

export function bold(text: string | number | bigint) {
	return `**${text}**`
}

export function italic(text: string | number | bigint) {
	return `*${text}*`
}

export function underline(text: string | number | bigint) {
	return `__${text}__`
}

export function strikethrough(text: string | number | bigint) {
	return `~~${text}~~`
}

export function mention(userId: string | number | bigint) {
	return `<@${userId}>`
}
