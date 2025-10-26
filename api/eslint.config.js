// api/eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Minimal, fast, and flat for ESLint v9.
 * - Auto-discovers the api/tsconfig.json via projectService
 * - Has Vitest globals so tests lint cleanly
 * - Relaxes strict rules that would block your guardrail
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**"
    ],
    languageOptions: {
      parserOptions: {
        // Let typescript-eslint find tsconfig.json automatically in api/
        projectService: true
      },
      globals: {
        // Vitest & Node globals so test files don’t fail lint
        console: "readonly",
        process: "readonly",
        module: "readonly",
        __dirname: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly"
      }
    },
    rules: {
      // keep lint pragmatic for now
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "off"
    }
  }
);
