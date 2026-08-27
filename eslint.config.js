// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // Scripts one-off (Node, hors app) — cf. scripts/generate-texture.js.
    ignores: ['dist/*', 'scripts/*'],
  },
]);
