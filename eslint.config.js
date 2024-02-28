// @ts-check
import tseslint from "typescript-eslint"

export default tseslint.config({
	files: ["**/*.{ts,tsx,js,jsx}"],
	ignores: ["node_modules"],
	plugins: {
		"@typescript-eslint": tseslint.plugin,
	},
	languageOptions: {
		parser: tseslint.parser,
		parserOptions: {
			project: true,
		},
	},
	rules: {
		"@typescript-eslint/no-floating-promises": "warn",
		"@typescript-eslint/restrict-template-expressions": "error",
	},
})
