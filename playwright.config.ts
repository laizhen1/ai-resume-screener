import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: `npm run dev -- --port ${port}`, url: `http://localhost:${port}`, reuseExistingServer: false, timeout: 120_000,
    env: { ENABLE_LOCAL_AI: "false", ENABLE_LOCAL_AI_ANALYSIS: "false", ENABLE_LOCAL_AI_REVIEW: "false", ENABLE_TRANSFORMER_ANALYSIS: "false", ENABLE_LOCAL_EMBEDDINGS: "false", DATA_MODE: "memory", QUEUE_MODE: "inline", AUTH_DISABLED: "true" } }
});
