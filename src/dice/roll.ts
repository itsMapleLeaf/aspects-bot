export function roll(faceCount: number): number {
	return Math.floor(Math.random() * faceCount) + 1
}
