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
    // Outils et sorties natives générés localement par Gradle/Android.
    ".android-tools/**",
    ".gradle-user-home/**",
    ".gradle-beta-home/**",
    "android/**/build/**",
  ]),
]);

export default eslintConfig;
