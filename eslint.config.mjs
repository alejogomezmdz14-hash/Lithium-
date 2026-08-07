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
    // Skills de diseño instaladas con `npx skills add` / `npx impeccable install`.
    // Son herramientas de terceros, están gitignoreadas y metían 300 warnings que
    // tapaban los del código nuestro.
    ".claude/skills/**",
    ".agents/**",
    ".codex/**",
  ]),
]);

export default eslintConfig;
