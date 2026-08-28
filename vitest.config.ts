import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["runner/**/*.test.ts", "scripts/**/*.test.mjs"],
    exclude: [".agents/**", "node_modules/**", "dist/**"],
  },
});
