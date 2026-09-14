import { describe, expect, it, vi } from "vitest";
import { getDataset } from "@/lib/experiments/dataset";
import { runComparison } from "@/lib/experiments/runner";
import { summarize } from "@/lib/experiments/metrics";
import type { CaseResult } from "@/lib/experiments/types";
import type { AiAnalysisDraft } from "@/lib/ai-analysis";

const draft = (evidenceText: string): AiAnalysisDraft => ({
  requirements: [{ skill: "python", sourceText: "Python experience is required.", importance: "required", verdict: "supported", confidence: 0.9, reason: "Test judgment.", evidenceText }],
  criteria: ["Relevant skills", "Demonstrated experience", "Measurable impact", "Document clarity"].map(criterion => ({ criterion, score: 50, explanation: "Test rubric.", evidence: [] })),
  interviewQuestions: ["Describe the work."], warnings: ["Human verification required."]
});
describe("comparison experiments", () => {
  it("freezes separate unique datasets with content-addressed provenance", () => {
    const heldout = getDataset("heldout"), dev = getDataset("development");
    expect(heldout.examples).toHaveLength(24);
    expect(new Set(heldout.examples.map(item => item.resume)).size).toBe(24);
    expect(new Set(heldout.examples.map(item => item.id)).size).toBe(24);
    expect(heldout.examples.every(item => !dev.examples.some(d => d.resume === item.resume))).toBe(true);
    expect(heldout.metadata.hash).toBe("53503a523ab8481874057868653fdb8f77a1901b52f026aba028686624ba6274");
    heldout.examples[0].resume = "changed";
    expect(getDataset("heldout").examples[0].resume).not.toBe("changed");
  });
  it("runs offline without invoking a model or fabricating AI measurements", async () => {
    const model = vi.fn();
    const report = await runComparison({ split: "development", includeModel: false }, undefined, model);
    expect(model).not.toHaveBeenCalled();
    expect(report.summaries[0].evaluatedCases).toBe(10);
    expect(report.summaries[1].accuracy).toBeNull();
    expect(report.summaries[2].status).toBe("not-run");
  });
  it("distinguishes an unavailable model from actual hybrid model performance", async () => {
    const model = vi.fn().mockResolvedValue(null);
    const report = await runComparison({ split: "development", includeModel: true }, undefined, model);
    expect(model).toHaveBeenCalledTimes(1);
    expect(report.summaries[1].evaluatedCases).toBe(0);
    expect(report.summaries[1].accuracy).toBeNull();
    expect(report.summaries[2].fallbackCases).toBe(10);
    expect(report.summaries[2].modelCases).toBe(0);
    expect(report.summaries[2].status).toBe("partial");
  });
  it("uses one generation for paired raw and verified judgments; keeps hallucinated quotes inspectable", async () => {
    const model = vi.fn().mockResolvedValue({ model: "test-model", draft: draft("An invented quote that is absent.") });
    const report = await runComparison({ split: "heldout", includeModel: true }, undefined, model);
    expect(model).toHaveBeenCalledTimes(24);
    expect(model.mock.calls[0][0]).toBe(getDataset("heldout").examples[0].job);
    expect(model.mock.calls[0][1]).toBe(getDataset("heldout").examples[0].resume);
    const raw = report.results.find(row => row.caseId === "holdout-01" && row.pipeline === "llm")!;
    const hybrid = report.results.find(row => row.caseId === "holdout-01" && row.pipeline === "hybrid")!;
    expect(raw.predictions[0].actual).toBe("supported");
    expect(raw.predictions[0].citationValid).toBe(false);
    expect(hybrid.predictions[0].actual).toBe("unknown");
  });
  it("honors cancellation before evaluating or calling the model", async () => {
    const controller = new AbortController(); controller.abort();
    const model = vi.fn();
    await expect(runComparison({ split: "heldout", includeModel: true, signal: controller.signal }, undefined, model)).rejects.toThrow();
    expect(model).not.toHaveBeenCalled();
  });
  it("computes confusion, error denominators, F1 and nearest-rank latency without counting failures as abstentions", () => {
    const row = (expected: "supported" | "partial", actual: "supported" | "unknown", latencyMs: number): CaseResult => ({
      caseId: String(latencyMs), pipeline: "llm", provider: "ollama", challenge: "test", latencyMs,
      predictions: [{ skill: "python", expected, actual, quote: null, citationValid: false, reason: "", missing: false }]
    });
    const result = summarize("llm", [row("supported", "supported", 10), row("partial", "supported", 30), row("supported", "unknown", 20), { caseId: "failed", pipeline: "llm", challenge: "test", provider: "unavailable", latencyMs: 1000, predictions: [] }]);
    expect(result.accuracy).toBeCloseTo(1 / 3);
    expect(result.supportPrecision).toBe(0.5);
    expect(result.supportRecall).toBe(0.5);
    expect(result.macroF1).toBe(0.125);
    expect(result.unsupportedSupportRate).toBe(0.5);
    expect(result.invalidCitationRate).toBe(1);
    expect(result.abstentionRate).toBeCloseTo(1 / 3);
    expect(result.p50LatencyMs).toBe(20);
    expect(result.p95LatencyMs).toBe(30);
    expect(result.confusion[0]).toEqual([1, 0, 0, 1]);
    expect(result.status).toBe("partial");
    expect(result.accuracyInterval![0]).toBeLessThan(result.accuracy!);
    expect(result.accuracyInterval![1]).toBeGreaterThan(result.accuracy!);
  });
});
