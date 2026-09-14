import type { EvidenceVerdict } from "../types";

export const VERDICTS = ["supported", "partial", "contradicted", "unknown"] as const;
export const PIPELINES = ["rules", "llm", "hybrid"] as const;
export type Pipeline = typeof PIPELINES[number];
export type Split = "development" | "heldout";
export type Example = {
  id: string; job: string; resume: string; challenge: string;
  expectedVerdicts: Record<string, EvidenceVerdict>;
};
export type Prediction = {
  skill: string; expected: EvidenceVerdict; actual: EvidenceVerdict;
  reason: string; quote: string | null; citationValid: boolean; missing: boolean;
};
export type CaseResult = {
  caseId: string; pipeline: Pipeline; challenge: string;
  provider: "rules" | "ollama" | "fallback" | "unavailable" | "not-run";
  latencyMs: number; predictions: Prediction[]; error?: string;
};
export type PipelineMetrics = {
  pipeline: Pipeline; status: "complete" | "partial" | "not-run" | "unavailable";
  evaluatedCases: number; totalCases: number; modelCases: number; fallbackCases: number;
  accuracy: number | null; macroF1: number | null; supportPrecision: number | null; supportRecall: number | null;
  abstentionRate: number | null; unsupportedSupportRate: number | null; invalidCitationRate: number | null;
  missingRequirementRate: number | null; p50LatencyMs: number | null; p95LatencyMs: number | null;
  accuracyInterval: [number, number] | null;
  confusion: number[][]; slices: { challenge: string; correct: number; total: number }[];
};
export type ExperimentReport = {
  version: "comparison-v1"; createdAt: string; engineVersion: string; taxonomyVersion: string;
  dataset: { version: string; split: Split; hash: string; uniqueCases: number; executions: number; annotationStatus: string };
  configuration: { includeModel: boolean; model: string; promptVersion: string; seed: number; temperature: number; timeoutMs: number; node: string; platform: string };
  examples: Example[]; results: CaseResult[]; summaries: PipelineMetrics[];
};
export type Feedback = {
  id: string; runId: string; caseId: string; skill: string; pipeline: Pipeline;
  verdict: EvidenceVerdict; reason: string; actor: string; createdAt: string;
};
