import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Materiały, research i lokalne sprawy ZUS to nie kod aplikacji:
    "materialy/**",
    "research/**",
    "docs/**",
    "sprawy/**",
    // Robocze kopie repozytorium agentów Claude Code (git worktree):
    ".claude/**",
  ]),
]);

export default eslintConfig;
