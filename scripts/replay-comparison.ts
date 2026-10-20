import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { runComparison } from "../lib/experiments/runner";
import { summarize } from "../lib/experiments/metrics";
import { verifyReport } from "../lib/verify-report";
import { PIPELINES, type ExperimentReport } from "../lib/experiments/types";

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || input === output) throw new Error("Usage: replay-comparison.ts <source.json> <different-output.json>");
  const bytes = await readFile(input);
  const source: ExperimentReport = JSON.parse(bytes.toString("utf8"));
  verifyReport(source);
  const drafts = new Map(source.examples.map(example => {
    const row = source.results.find(item => item.caseId === example.id && item.pipeline === "llm");
    if (!row?.modelDraft) throw new Error(`Missing raw model draft: ${example.id}`);
    return [JSON.stringify([example.job, example.resume]), { draft: row.modelDraft, wireOutput: row.modelOutput }];
  }));
  const report = await runComparison({ split: source.dataset.split, includeModel: true, model: source.configuration.model, temperature: source.configuration.temperature }, undefined,
    async (job, resume) => {
      const saved = drafts.get(JSON.stringify([job, resume]));
      if (!saved) throw new Error("Input mismatch; replay must use identical documents.");
      return { model: source.configuration.model, ...saved };
    });
  if (report.dataset.hash !== source.dataset.hash) throw new Error("Dataset changed; refusing replay.");
  // No live inference occurred. Do not present replay duration as model latency.
  report.results.forEach(row => { row.latencyMs = 0; });
  report.summaries = PIPELINES.map(pipeline => summarize(pipeline, report.results));
  report.configuration.promptVersion = source.configuration.promptVersion;
  report.configuration.evidencePolicyVersion = source.configuration.evidencePolicyVersion;
  report.configuration.outputSemantics = source.configuration.outputSemantics;
  const artifact = { ...report, replay: { kind: "saved-drafts-current-postprocessing", source: input, sourceSha256: createHash("sha256").update(bytes).digest("hex"), sourceCreatedAt: source.createdAt, liveModelCalls: 0, timing: "All latency values are zero placeholders; no inference timing measured." } };
  verifyReport(artifact);
  await writeFile(output, JSON.stringify(artifact, null, 2) + "\n");
  console.log(JSON.stringify({ replay: artifact.replay, summaries: artifact.summaries.slice(0, 3) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
