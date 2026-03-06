const jsFiles = ["**/*.js", "**/*.cjs", "**/*.mjs"];

const securityPlugin = require("./tools/eslint-plugin-security");
module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      // v2 is a Next.js app with its own eslint config (next lint).
      // Exclude it from the root vanilla-JS linter to avoid false positives
      // from .next build artifacts and ESM-only config files.
      "v2/**",
    ],
  },
  {
    files: jsFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    plugins: {
      security: securityPlugin,
    },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-function": "error",
    },
  },
];
