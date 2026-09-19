import { performance } from "node:perf_hooks";
import { analyzeResume, composeAiAnalysis, DEFAULT_SCORING_WEIGHTS, ENGINE_VERSION } from "../analyzer";
import { analyzeWithOllama } from "../ai-analysis";
import { SKILL_ALIASES, TAXONOMY_VERSION } from "../skills";
import { getDataset } from "./dataset";
import { summarize } from "./metrics";
import { PIPELINES, type CaseResult, type Example, type ExperimentReport, type Prediction, type Split } from "./types";
import { analyzeWithTransformers, combineTransformerEvidence } from "../transformers";

type ModelCall = typeof analyzeWithOllama;
function align(example: Example, assessments: { skill: string; verdict: Prediction["actual"]; reason: string; quote: string | null }[]): Prediction[] {
  return Object.entries(example.expectedVerdicts).map(([skill, expected]) => {
    const names = [skill, ...(SKILL_ALIASES[skill] ?? [])];
    const prediction = assessments.find(item => names.includes(item.skill.trim().toLowerCase()));
    const quote = prediction?.quote ?? null;
    return {
      skill, expected, actual: prediction?.verdict ?? "unknown",
      reason: prediction?.reason ?? "The pipeline did not extract this requirement.",
      quote, citationValid: Boolean(quote && example.resume.includes(quote)), missing: !prediction
    };
  });
}
const mapped = (result: ReturnType<typeof analyzeResume>) => (result.requirementAssessments ?? []).map(item => ({
  skill: item.skill, verdict: item.verdict, reason: item.reason, quote: item.evidence?.text ?? null
}));

export async function runComparison(
  options: { split: Split; includeModel: boolean; includeTransformers?: boolean; model?: string; signal?: AbortSignal },
  onProgress?: (completed: number, total: number) => void,
  modelCall: ModelCall = analyzeWithOllama,
  transformerCall: typeof analyzeWithTransformers = analyzeWithTransformers
): Promise<ExperimentReport> {
  const { examples, metadata } = getDataset(options.split);
  const model = options.model ?? process.env.OLLAMA_ANALYSIS_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen3:4b";
  const configuredTimeout = Number(process.env.OLLAMA_ANALYSIS_TIMEOUT_MS ?? 45_000);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? Math.min(configuredTimeout, 120_000) : 45_000;
  const results: CaseResult[] = [];
  let modelFailed = false;
  let transformerFailed = false;
  for (const [index, example] of examples.entries()) {
    options.signal?.throwIfAborted();
    const start = performance.now();
    const rules = analyzeResume(example.job, example.resume);
    const rulesMs = performance.now() - start;
    const base = { caseId: example.id, challenge: example.challenge };
    results.push({ ...base, pipeline: "rules", provider: "rules", latencyMs: rulesMs, predictions: align(example, mapped(rules)) });
    if (!options.includeModel) {
      for (const pipeline of ["llm", "hybrid"] as const) results.push({ ...base, pipeline, provider: "not-run", latencyMs: 0, predictions: [] });
    } else {
      const started = performance.now();
      let ai: Awaited<ReturnType<ModelCall>> = null;
      if (!modelFailed) {
        try { ai = await modelCall(example.job, example.resume, DEFAULT_SCORING_WEIGHTS, { model, seed: 42, temperature: 0, timeoutMs, signal: options.signal }); }
        catch { ai = null; }
      }
      options.signal?.throwIfAborted();
      const modelMs = performance.now() - started;
      if (!ai) {
        const error = modelFailed ? "Skipped after the model failed earlier in this run." : "Model disabled, unavailable, timed out, or returned invalid structured output.";
        modelFailed = true;
        results.push({ ...base, pipeline: "llm", provider: "unavailable", latencyMs: modelMs, predictions: [], error });
        results.push({ ...base, pipeline: "hybrid", provider: "fallback", latencyMs: rulesMs + modelMs, predictions: align(example, mapped(rules)), error });
      } else {
        results.push({ ...base, pipeline: "llm", provider: "ollama", latencyMs: modelMs, predictions: align(example, ai.draft.requirements.map(item => ({ ...item, quote: item.evidenceText }))) });
        const validationStarted = performance.now();
        try {
          const hybrid = composeAiAnalysis(example.job, example.resume, DEFAULT_SCORING_WEIGHTS, ai.draft, ai.model);
          results.push({ ...base, pipeline: "hybrid", provider: "ollama", latencyMs: rulesMs + modelMs + performance.now() - validationStarted, predictions: align(example, mapped(hybrid)) });
        } catch {
          results.push({ ...base, pipeline: "hybrid", provider: "fallback", latencyMs: rulesMs + modelMs + performance.now() - validationStarted, predictions: align(example, mapped(rules)), error: "Model scoring rubric failed validation." });
        }
      }
    }
    const transformerPipelines = ["dense-nli", "reranked-nli", "rules-transformer"] as const;
    if (!options.includeTransformers) {
      for (const pipeline of transformerPipelines) results.push({ ...base, pipeline, provider: "not-run", latencyMs: 0, predictions: [] });
    } else {
      const transformerStart = performance.now();
      const output = transformerFailed ? null : await transformerCall(rules.requirementAssessments ?? [], example.resume, { includeBaseline: true, signal: options.signal });
      options.signal?.throwIfAborted();
      if (!output || output.status !== "complete") {
        transformerFailed = true;
        for (const pipeline of transformerPipelines) results.push({ ...base, pipeline, provider: "unavailable", latencyMs: performance.now() - transformerStart, predictions: [], error: output?.error ?? "Skipped after the transformer service failed earlier in this run." });
      } else {
        const hybridStart = performance.now();
        const combined = combineTransformerEvidence(rules.requirementAssessments ?? [], output.assessments);
        const hybridMs = performance.now() - hybridStart;
        for (const pipeline of transformerPipelines) {
          const assessments = pipeline === "dense-nli" ? output.baseline : pipeline === "reranked-nli" ? output.assessments : combined;
          results.push({ ...base, pipeline, provider: "transformers", transformerMetadata: output.metadata,
            transformerEvidence: pipeline === "dense-nli" ? output.baseline : output.assessments,
            latencyMs: rulesMs + (pipeline === "dense-nli" ? output.timings?.baselineMs ?? 0 : output.timings?.rerankedMs ?? 0) + (pipeline === "rules-transformer" ? hybridMs : 0),
            predictions: align(example, assessments.map(item => ({ ...item, quote: item.evidence?.text ?? null }))) });
        }
      }
    }
    onProgress?.(index + 1, examples.length);
  }
  return {
    version: "comparison-v1", createdAt: new Date().toISOString(), engineVersion: ENGINE_VERSION, taxonomyVersion: TAXONOMY_VERSION,
    dataset: metadata,
    configuration: { includeModel: options.includeModel, includeTransformers: options.includeTransformers ?? false, model, promptVersion: "core-analysis-v1", seed: 42, temperature: 0, timeoutMs, node: process.version, platform: process.platform },
    examples, results, summaries: PIPELINES.map(pipeline => summarize(pipeline, results))
  };
}
