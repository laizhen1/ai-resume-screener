import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"], exclude: ["e2e/**"], coverage: { reporter: ["text", "html"] } },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } }
});
