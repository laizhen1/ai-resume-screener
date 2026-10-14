import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

await mkdir("reports", { recursive: true });
const child = spawn(process.execPath, ["node_modules/promptfoo/dist/src/entrypoint.js", "eval", "--config", "evaluations/promptfooconfig.yaml", "--output", process.env.PROMPTFOO_OUTPUT ?? "reports/promptfoo.json", "--no-cache", "--no-write", ...process.argv.slice(2)], {
  stdio: "inherit", env: { ...process.env, PROMPTFOO_DISABLE_TELEMETRY: "1", PROMPTFOO_CONFIG_DIR: path.resolve("tmp/promptfoo"), PROMPTFOO_DISABLE_UPDATE: "1" }
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
