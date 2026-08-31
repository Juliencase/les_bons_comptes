// https://docs.expo.dev/guides/using-eslint/
//
// Config unique à la racine du monorepo : elle couvre `apps/mobile` et
// `packages/*`. `apps/api` est un module Go, il n'y a rien à y linter.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      '**/dist/*',
      // Scripts one-off (Node, hors app) — cf. apps/mobile/scripts/generate-texture.js.
      'apps/mobile/scripts/*',
      // Module Go.
      'apps/api/**',
      // Types générés depuis les structs Go — ne pas éditer, donc ne pas linter.
      'packages/shared/src/generated/**',
    ],
  },
]);
