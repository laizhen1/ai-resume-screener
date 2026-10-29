import { performance } from "node:perf_hooks";
import { generationSettings, localModel, localTimeout } from "../local-llm";
import { analyzeResume, composeAiAnalysis, DEFAULT_SCORING_WEIGHTS, ENGINE_VERSION } from "../analyzer";
import { analyzeWithOllama, ANALYSIS_PROMPT_VERSION, EVIDENCE_POLICY_VERSION } from "../ai-analysis";
import { TAXONOMY_VERSION } from "../skills";
import { ALIGNMENT_VERSION, canonicalRequirementName, consolidateRequirements } from "../requirement-identity";
import { getDataset } from "./dataset";
import { summarize } from "./metrics";
import { PIPELINES, type CaseResult, type Example, type ExperimentReport, type Prediction, type Split } from "./types";
import { analyzeWithTransformers, combineTransformerEvidence } from "../transformers";
import { EVIDENCE_VALIDATION_VERSION } from "../evidence-eligibility";

type ModelCall = typeof analyzeWithOllama;
export function align(example: Example, assessments: { skill: string; verdict: Prediction["actual"]; reason: string; quote: string | null }[]): Prediction[] {
  const normalized = consolidateRequirements(assessments, item => ({ ...item, quote: null }));
  return Object.entries(example.expectedVerdicts).map(([skill, expected]) => {
    const prediction = normalized.find(item => item.skill === canonicalRequirementName(skill));
    const quote = prediction?.quote ?? null;
    return {
      skill, expected, actual: prediction?.verdict ?? "unknown",
      reason: prediction?.reason ?? "No unambiguous canonical requirement name matched the model output.",
      quote, citationValid: Boolean(quote && example.resume.includes(quote)), missing: !prediction
    };
  });
}
const mapped = (result: ReturnType<typeof analyzeResume>) => (result.requirementAssessments ?? []).map(item => ({
  skill: item.skill, verdict: item.verdict, reason: item.reason, quote: item.evidence?.text ?? null
}));

export async function runComparison(
  options: { split: Split; includeModel: boolean; includeTransformers?: boolean; model?: string; temperature?: number; signal?: AbortSignal },
  onProgress?: (completed: number, total: number) => void,
  modelCall: ModelCall = analyzeWithOllama,
  transformerCall: typeof analyzeWithTransformers = analyzeWithTransformers
): Promise<ExperimentReport> {
  const { examples, metadata } = getDataset(options.split);
  const model = options.model ?? localModel("analysis");
  const temperature = options.temperature ?? generationSettings(model).options.temperature;
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) throw new Error("Temperature must be between 0 and 2.");
  const timeoutMs = localTimeout();
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
      let invalidOutput: unknown;
      let diagnostic = "not-run";
      if (!modelFailed) {
        try { ai = await modelCall(example.job, example.resume, DEFAULT_SCORING_WEIGHTS, { model, seed: 42, temperature, timeoutMs, signal: options.signal, onDiagnostic: status => { diagnostic = status; }, onInvalidOutput: output => { invalidOutput = output; } }); }
        catch { ai = null; }
      }
      options.signal?.throwIfAborted();
      const modelMs = performance.now() - started;
      if (!ai) {
        const error = modelFailed ? "Skipped after the model failed earlier in this run." : `Model request failed: ${diagnostic}.`;
        modelFailed = true;
        results.push({ ...base, pipeline: "llm", provider: "unavailable", latencyMs: modelMs, predictions: [], modelOutput: invalidOutput, error });
        results.push({ ...base, pipeline: "hybrid", provider: "fallback", latencyMs: rulesMs + modelMs, predictions: align(example, mapped(rules)), error });
      } else {
        results.push({ ...base, pipeline: "llm", provider: "ollama", latencyMs: modelMs, modelDraft: ai.draft, modelOutput: ai.wireOutput, requestMetadata: ai.requestMetadata, predictions: align(example, ai.draft.requirements.map(item => ({ ...item, quote: item.evidenceText }))) });
        const validationStarted = performance.now();
        try {
          const hybrid = composeAiAnalysis(example.job, example.resume, DEFAULT_SCORING_WEIGHTS, ai.draft, ai.model);
          results.push({ ...base, pipeline: "hybrid", provider: "ollama", latencyMs: rulesMs + modelMs + performance.now() - validationStarted,
            evidenceChecks: (hybrid.requirementAssessments ?? []).flatMap(item => item.evidenceValidation ? [{ skill: item.skill, ...item.evidenceValidation }] : []), predictions: align(example, mapped(hybrid)) });
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
    configuration: { includeModel: options.includeModel, includeTransformers: options.includeTransformers ?? false, model, promptVersion: ANALYSIS_PROMPT_VERSION, evidencePolicyVersion: EVIDENCE_POLICY_VERSION, evidenceValidationVersion: EVIDENCE_VALIDATION_VERSION, outputSemantics: "LLM rows map model categories to verdicts. Hybrid rows additionally check source identity and eligibility, restore bounded source context, and constrain explicit coursework and present-tense denial. Original model verdicts remain audited.", alignmentVersion: ALIGNMENT_VERSION, seed: 42, temperature, timeoutMs, node: process.version, platform: process.platform, generation: generationSettings(model, { temperature, seed: 42 }) },
    examples, results, summaries: PIPELINES.map(pipeline => summarize(pipeline, results))
  };
}
