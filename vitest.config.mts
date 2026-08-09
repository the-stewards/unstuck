import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": path.resolve(import.meta.dirname, "test/empty-module.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
