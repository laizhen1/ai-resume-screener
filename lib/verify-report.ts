import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { summarize } from "./experiments/metrics";
import { PIPELINES, VERDICTS, type ExperimentReport } from "./experiments/types";
import { buildAnalysisContract, EVIDENCE_POLICY_VERSION, ANALYSIS_PROMPT_VERSION } from "./ai-analysis";
import { align } from "./experiments/runner";
import { composeAiAnalysis, DEFAULT_SCORING_WEIGHTS } from "./analyzer";
import { EVIDENCE_VALIDATION_VERSION } from "./evidence-eligibility";

/** Checks internal consistency, not label quality, model authenticity or hiring validity. */
export function verifyReport(report: ExperimentReport): void {
  const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
  check(report.version === "comparison-v1", "Unsupported report version.");
  check(report.examples.length > 0, "Empty dataset.");
  const examples = new Map(report.examples.map(example => [example.id, example]));
  check(examples.size === report.examples.length, "Duplicate example IDs.");
  check(report.dataset.uniqueCases === examples.size && report.dataset.executions === examples.size, "Dataset count mismatch.");
  check(createHash("sha256").update(JSON.stringify(report.examples)).digest("hex") === report.dataset.hash, "Dataset hash mismatch.");
  const pipelines = report.summaries.map(summary => summary.pipeline);
  check(pipelines.includes("rules") && pipelines.length === new Set(pipelines).size && pipelines.every(pipeline => PIPELINES.includes(pipeline)), "Invalid pipeline summaries.");
  check(["rules", "llm", "hybrid"].every(pipeline => pipelines.some(item => item === pipeline)), "Missing baseline or LLM pipeline summary.");
  if (report.configuration.includeTransformers) check(["dense-nli", "reranked-nli", "rules-transformer"].every(pipeline => pipelines.some(item => item === pipeline)), "Missing requested transformer pipeline summary.");
  const keys = new Set<string>();
  for (const row of report.results) {
    const example = examples.get(row.caseId);
    check(Boolean(example) && pipelines.includes(row.pipeline), "Unknown example or pipeline.");
    const key = JSON.stringify([row.caseId, row.pipeline]);
    check(!keys.has(key), "Duplicate case/pipeline result."); keys.add(key);
    check(row.challenge === example!.challenge, "Challenge mismatch.");
    check(Number.isFinite(row.latencyMs) && row.latencyMs >= 0, "Invalid latency.");
    const providers = { rules: ["rules"], llm: ["ollama", "unavailable", "not-run"], hybrid: ["ollama", "fallback", "not-run"], "dense-nli": ["transformers", "unavailable", "not-run"], "reranked-nli": ["transformers", "unavailable", "not-run"], "rules-transformer": ["transformers", "unavailable", "not-run"] };
    check(providers[row.pipeline].includes(row.provider), "Invalid pipeline provider.");
    if (["not-run", "unavailable"].includes(row.provider)) {
      check(row.predictions.length === 0, "Unavailable pipeline contains predictions.");
      continue;
    }
    check(isDeepStrictEqual(row.predictions.map(p => p.skill).sort(), Object.keys(example!.expectedVerdicts).sort()), "Missing or duplicate requirement prediction.");
    for (const prediction of row.predictions) {
      check(prediction.expected === example!.expectedVerdicts[prediction.skill] && VERDICTS.includes(prediction.actual), "Reference verdict mismatch or invalid prediction.");
      check(prediction.citationValid === Boolean(prediction.quote && example!.resume.includes(prediction.quote)), "Citation validity mismatch.");
    }
    if (row.pipeline === "llm" && row.modelOutput !== undefined && report.configuration.evidencePolicyVersion === EVIDENCE_POLICY_VERSION && report.configuration.promptVersion === ANALYSIS_PROMPT_VERSION) {
      const decoded = buildAnalysisContract(example!.job.slice(0, 12_000), example!.resume.slice(0, 20_000)).decode(row.modelOutput);
      check(isDeepStrictEqual(decoded, row.modelDraft), "Model category output and decoded draft mismatch.");
      const predictions = align(example!, decoded.requirements.map(item => ({ ...item, quote: item.evidenceText })));
      check(isDeepStrictEqual(predictions, row.predictions), "Model category output and reported verdict mismatch.");
    }
    if (row.pipeline === "hybrid" && row.provider === "ollama" && report.configuration.evidenceValidationVersion === EVIDENCE_VALIDATION_VERSION) {
      const original = report.results.find(item => item.caseId === row.caseId && item.pipeline === "llm");
      check(Boolean(original?.modelDraft), "Missing original model draft for evidence checks.");
      const validated = composeAiAnalysis(example!.job, example!.resume, DEFAULT_SCORING_WEIGHTS, original!.modelDraft!, report.configuration.model);
      const assessments = validated.requirementAssessments ?? [];
      check(isDeepStrictEqual(align(example!, assessments.map(item => ({ ...item, quote: item.evidence?.text ?? null }))), row.predictions), "Evidence checks and hybrid verdict mismatch.");
      const checks = assessments.flatMap(item => item.evidenceValidation ? [{ skill: item.skill, ...item.evidenceValidation }] : []);
      check(isDeepStrictEqual(checks, row.evidenceChecks), "Evidence check audit mismatch.");
    }
  }
  for (const summary of report.summaries) {
    check(report.results.filter(row => row.pipeline === summary.pipeline).length === examples.size, "Incomplete case coverage.");
    check(isDeepStrictEqual(summary, summarize(summary.pipeline, report.results)), `Metrics mismatch: ${summary.pipeline}.`);
  }
}
