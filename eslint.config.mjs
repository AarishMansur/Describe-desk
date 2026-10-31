import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  { ...js.configs.recommended, languageOptions: { globals: { process: 'readonly', console: 'readonly', fetch: 'readonly', Response: 'readonly', setInterval: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', window: 'readonly', document: 'readonly', EventSource: 'readonly', Option: 'readonly', SpeechSynthesisUtterance: 'readonly' } }, rules: { 'no-unused-vars': 'off' } },
  { files: ['**/*.ts'], languageOptions: { parser: tsparser }, plugins: { '@typescript-eslint': tseslint }, rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  { ignores: ['dist/**', 'node_modules/**'] }
];
