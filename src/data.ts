export const ActionDiceTypes = [4, 6, 8, 12, 20]
export const DiceTypes = [...ActionDiceTypes, 2, 10, 100]

export type Race = {
	emoji: string
}

export const Races: Record<string, Race> = {
	Aquilian: { emoji: "🕊️" },
	Cetacian: { emoji: "🐳" },
	Felirian: { emoji: "🐈" },
	Lagorei: { emoji: "🐇" },
	Marenti: { emoji: "🐁" },
	Myrmadon: { emoji: "🦔" },
	Pyra: { emoji: "🐉" },
	Renari: { emoji: "🦊" },
	Sylvanix: { emoji: "🦌" },
	Umbraleth: { emoji: "😈" },
}

export type Aspect = {
	emoji: string
}

export const Aspects: Record<string, Aspect> = {
	Fire: { emoji: "🔥" },
	Water: { emoji: "💧" },
	Wind: { emoji: "🍃" },
	Light: { emoji: "☀️" },
	Darkness: { emoji: "🌑" },
}

export type Attribute = {
	emoji: string
}

export const Attributes: Record<string, Attribute> = {
	Strength: { emoji: "💪" },
	Sense: { emoji: "👁️" },
	Mobility: { emoji: "🏃" },
	Intellect: { emoji: "🧠" },
	Wit: { emoji: "✨" },
	Aspect: { emoji: "⚡" },
}
