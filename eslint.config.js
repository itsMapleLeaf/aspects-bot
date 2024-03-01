// @ts-check
import tseslint from "typescript-eslint"

export default tseslint.config({
	files: ["**/*.{ts,tsx,js,jsx}"],
	ignores: ["node_modules", "dist"],
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
		"prefer-const": "error",
		"object-shorthand": "error",
		"@typescript-eslint/no-floating-promises": "error",
		"@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
		"@typescript-eslint/restrict-template-expressions": "error",
		"@typescript-eslint/no-unnecessary-type-assertion": "error",
		"@typescript-eslint/no-inferrable-types": "error",
		"@typescript-eslint/no-redundant-type-constituents": "error",
		"@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
		"@typescript-eslint/no-import-type-side-effects": "error",
	},
})
