import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The engine source lives at mobile/src/engine — one copy, the one the app
// bundles. This package is its test suite, not a second copy of it.
export default defineConfig({
  resolve: {
    alias: {
      "buyout-engine": fileURLToPath(
        new URL("../mobile/src/engine/index.ts", import.meta.url),
      ),
    },
  },
  // Pin the transform settings. Without this, esbuild walks up from
  // mobile/src/engine, finds mobile/tsconfig.json, and fails to resolve its
  // `extends: expo/tsconfig.base` — which would make this suite depend on the
  // Expo app's node_modules being installed. The engine is plain TypeScript;
  // these are the only options esbuild reads.
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        verbatimModuleSyntax: false,
      },
    },
  },
});
