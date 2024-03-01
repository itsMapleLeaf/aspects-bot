import { GameTable } from "./GameTable.ts"

export const ActionDice = new GameTable({
	d4: 4,
	d6: 6,
	d8: 8,
	d12: 12,
	d20: 20,
})

export const Dice = new GameTable({
	...ActionDice.items,
	d2: 2,
	d10: 10,
	d100: 100,
})

export const Races = new GameTable({
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
} satisfies Record<string, { emoji: string }>)

export const Aspects = new GameTable({
	Fire: { emoji: "🔥" },
	Water: { emoji: "💧" },
	Wind: { emoji: "🍃" },
	Light: { emoji: "☀️" },
	Darkness: { emoji: "🌑" },
} satisfies Record<string, { emoji: string }>)

export const Attributes = new GameTable({
	Strength: { emoji: "💪" },
	Sense: { emoji: "👁️" },
	Mobility: { emoji: "🏃" },
	Intellect: { emoji: "🧠" },
	Wit: { emoji: "✨" },
	Aspect: { emoji: "⚡" },
} satisfies Record<string, { emoji: string }>)
