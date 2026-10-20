import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { analyzeWithOllama, ANALYSIS_PROMPT_VERSION, EVIDENCE_POLICY_VERSION } from "../lib/ai-analysis";
import { composeAiAnalysis, DEFAULT_SCORING_WEIGHTS } from "../lib/analyzer";
import { EVIDENCE_DEMO } from "../lib/demo";
import { generationSettings, localModel } from "../lib/local-llm";
import { EVIDENCE_VALIDATION_VERSION } from "../lib/evidence-eligibility";

async function main() {
  const require = createRequire(import.meta.url);
  createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true);
  const { values } = parseArgs({ options: { output: { type: "string" } } });
  const model = localModel("analysis");
  const base = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const response = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Ollama is unavailable.");
  const tags = await response.json() as { models: Array<{ name: string; digest: string; details: unknown }> };
  const metadata = tags.models.find(item => item.name === model);
  if (!metadata) throw new Error("Configured model is not installed. Run npm run llm:pull.");
  const started = performance.now();
  const draft = await analyzeWithOllama(EVIDENCE_DEMO.job, EVIDENCE_DEMO.resume, DEFAULT_SCORING_WEIGHTS);
  if (!draft) throw new Error("Live model output failed: disabled, unavailable, incomplete, or invalid schema. No fallback counted as success.");
  const analysis = composeAiAnalysis(EVIDENCE_DEMO.job, EVIDENCE_DEMO.resume, DEFAULT_SCORING_WEIGHTS, draft.draft, model);
  const expected = { python: "supported", docker: "partial", kubernetes: "contradicted", terraform: "unknown" };
  const observed = Object.fromEntries((analysis.requirementAssessments ?? []).map(item => [item.skill.toLowerCase(), item.verdict]));
  const report = { scope: "One public fictional walkthrough; integration check, not a held-out quality benchmark.", createdAt: new Date().toISOString(), model, digest: metadata.digest, details: metadata.details,
    promptVersion: ANALYSIS_PROMPT_VERSION, evidencePolicyVersion: EVIDENCE_POLICY_VERSION, evidenceValidationVersion: EVIDENCE_VALIDATION_VERSION, outputSemantics: "Model categories plus fixed policy and source-evidence checks; not a direct model verdict.", modelOutput: draft.wireOutput, generation: generationSettings(model), elapsedMs: performance.now() - started, expected, observed,
    correct: Object.entries(expected).filter(([skill, verdict]) => observed[skill] === verdict).length,
    total: Object.keys(expected).length, inputs: EVIDENCE_DEMO, analysis };
  if (values.output) { const path = resolve(values.output); await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(report, null, 2) + "\n"); }
  console.log(JSON.stringify(report, null, 2));
  if (report.correct !== report.total) process.exitCode = 2;
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
