// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Config files run in Node.
    files: ['app.config.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', process: 'readonly', require: 'readonly', module: 'writable', globalThis: 'readonly', console: 'readonly' },
    },
  },
]);
