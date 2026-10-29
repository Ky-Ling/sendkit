import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
	{
		ignores: ['**/node_modules/', '**/dist/'],
	},
	js.configs.recommended,
	tseslint.configs.recommended,
	{
		languageOptions: {
			globals: globals.node,
		},
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			'@stylistic/semi': ['error', 'never'],
		},
	},
)
