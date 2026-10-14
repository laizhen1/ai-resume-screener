// Verify the actual Promptfoo CLI/provider/assertion wiring against a local HTTP fixture.
// This is deliberately separate from the real-model quality gate.
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const draft = {
  requirements: [{ skill: "python", importance: "required", sourceText: "Python experience is required.", verdict: "supported", confidence: 0.9, reason: "Explicit work", evidenceText: "Built Python services for shipment tracking." }],
  criteria: ["Relevant skills", "Demonstrated experience", "Measurable impact", "Document clarity"].map(criterion => ({ criterion, score: 50, explanation: "Source evidence", evidence: ["Built Python services for shipment tracking."] })),
  interviewQuestions: ["Describe the services."], warnings: ["Human review required."]
};
const server = createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  const payload = JSON.parse(body);
  if (request.url !== "/api/generate" || !payload.prompt.includes("Built Python services for shipment tracking.")) {
    response.writeHead(400).end(); return;
  }
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ response: JSON.stringify(draft) }));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const child = spawn(process.execPath, ["scripts/eval-prompts.mjs", "--filter-first-n", "1"], {
  stdio: "inherit", env: { ...process.env, OLLAMA_BASE_URL: `http://127.0.0.1:${server.address().port}`, ENABLE_LOCAL_AI: "true", ENABLE_LOCAL_AI_ANALYSIS: "true", NODE_ENV: "development", VITEST: "", PROMPTFOO_OUTPUT: "tmp/promptfoo-smoke.json" }
});
child.on("error", error => { console.error(error); server.close(); process.exitCode = 1; });
child.on("exit", code => { server.close(); process.exitCode = code ?? 1; });
