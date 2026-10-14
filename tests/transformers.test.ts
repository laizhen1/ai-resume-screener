import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeWithTransformers, combineTransformerEvidence, passageChunks } from "@/lib/transformers";
import { analyzeResume, analyzeResumeHybrid } from "@/lib/analyzer";
import { runComparison } from "@/lib/experiments/runner";

export const metadata = { version: "transformer-evidence-v1", models: { embedding: "test-embedding", reranker: "test-reranker", nli: "test-nli", ner: null }, revisions: {}, packages: {}, device: "cpu", threshold: 0.8, margin: 0.15, topK: 8, rerankK: 3 };
const probabilities = { entailment: 0.96, neutral: 0.02, contradiction: 0.02 };
const job = "A software engineer with Python experience is required.";
const resume = "EXPERIENCE\r\n😀 Built Python services for a customer-facing platform and maintained reliable REST APIs.";
const requirements = analyzeResume(job, resume).requirementAssessments!;
const response = () => ({ baseline: [], reranked: [{ skill: "python", verdict: "supported", reason: "Evidence supports the hypothesis.", passageId: 1, candidates: [{ passageId: 1, similarity: 0.7, rerankScore: 4.2, nli: probabilities, learningNli: { entailment: 0.02, neutral: 0.96, contradiction: 0.02 } }] }], metadata, timings: { baselineMs: 2, rerankedMs: 3 }, entities: [], entityError: null });

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("transformer evidence integration", () => {
  it("validates trained classifier sources and abstention without changing the NLI result", async () => {
    const item = { skill: "python", passageId: 1, verdict: "unknown", abstained: true, probabilities: { supported: 0.4, partial: 0.3, contradicted: 0.1, unknown: 0.2 } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...response(), trainedEvidence: [item] })));
    const result = await analyzeWithTransformers(requirements, resume);
    expect(result.trainedEvidence?.[0].evidence.text).toContain("Built Python");
    expect(result.assessments[0].verdict).toBe("supported");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...response(), trainedEvidence: [{ ...item, passageId: 99 }] })));
    expect((await analyzeWithTransformers(requirements, resume)).status).toBe("unavailable");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...response(), trainedEvidence: [{ ...item, verdict: "supported" }] })));
    expect((await analyzeWithTransformers(requirements, resume)).status).toBe("unavailable");
  });
  it("preserves exact Unicode and CRLF source offsets, including long passages", () => {
    const text = resume + "\r\n" + "long document passage ".repeat(100);
    for (const passage of passageChunks(text)) {
      expect(text.slice(passage.start, passage.end)).toBe(passage.text);
      expect(passage.text.length).toBeLessThanOrEqual(600);
    }
  });
  it("accepts real source references and never sends expected labels", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(response())); vi.stubGlobal("fetch", fetch);
    const result = await analyzeWithTransformers(requirements, resume);
    expect(result.status).toBe("complete");
    const evidence = result.assessments[0].evidence!;
    expect(resume.slice(evidence.start, evidence.end)).toBe(evidence.text);
    const request = JSON.parse(fetch.mock.calls[0][1].body);
    expect(request.requirements).toEqual([{ skill: "python" }]);
    expect(JSON.stringify(request)).not.toContain("expectedVerdicts");
  });
  it("rejects hallucinated passage IDs and malformed model probabilities", async () => {
    const bad = response(); bad.reranked[0].candidates[0].passageId = 90;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(bad)));
    expect((await analyzeWithTransformers(requirements, resume)).status).toBe("unavailable");
    const invalid = response(); invalid.reranked[0].candidates[0].nli = { entailment: 0.9, neutral: 0.9, contradiction: 0.9 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(invalid)));
    expect((await analyzeWithTransformers(requirements, resume)).status).toBe("unavailable");
  });
  it("rejects incomplete requirement coverage and invalid extracted entity offsets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...response(), reranked: [] })));
    expect((await analyzeWithTransformers(requirements, resume)).status).toBe("unavailable");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...response(), entities: [{ passageId: 1, start: 0, end: 6, text: "Python", label: "SKILL", score: 0.9 }] })));
    expect((await analyzeWithTransformers(requirements, resume)).status).toBe("unavailable");
  });
  it("propagates cancellation instead of manufacturing unavailable predictions", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(analyzeWithTransformers(requirements, resume, { signal: controller.signal })).rejects.toThrow();
  });
  it("keeps transformer judgments advisory in the main analysis", async () => {
    vi.stubEnv("ENABLE_TRANSFORMER_ANALYSIS", "true"); vi.stubEnv("ENABLE_LOCAL_EMBEDDINGS", "false");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(response())));
    const base = analyzeResume(job, resume);
    const result = await analyzeResumeHybrid(job, resume);
    expect(result.overallScore).toBe(base.overallScore);
    expect(result.requirementAssessments).toEqual(base.requirementAssessments);
    expect(result.transformerEvidence?.status).toBe("complete");
  });
  it("retains partial rules and abstains on conflicting supported judgments", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(response())));
    const model = (await analyzeWithTransformers(requirements, resume)).assessments;
    expect(combineTransformerEvidence([{ ...requirements[0], verdict: "partial" }], model)[0].verdict).toBe("partial");
    expect(combineTransformerEvidence(requirements, [{ ...model[0], verdict: "contradicted" }])[0].verdict).toBe("unknown");
  });
  it("records unavailable transformers without counting them as abstention or rules fallback", async () => {
    const service = vi.fn().mockResolvedValue({ status: "unavailable", error: "offline", warnings: [], assessments: [], baseline: [], entities: [] });
    const report = await runComparison({ split: "development", includeModel: false, includeTransformers: true }, undefined, vi.fn(), service);
    expect(service).toHaveBeenCalledTimes(1);
    for (const summary of report.summaries.slice(3)) {
      expect(summary.status).toBe("unavailable"); expect(summary.accuracy).toBeNull(); expect(summary.abstentionRate).toBeNull(); expect(summary.fallbackCases).toBe(0);
    }
  });
  it("counts transformer measurements separately and records model provenance", async () => {
    const service: typeof analyzeWithTransformers = async rules => {
      const assessments = rules.map(rule => ({ ...rule, verdict: "unknown" as const, confidence: 0, reason: "Test neutral result", method: "transformer-nli-v1" as const, candidates: [] }));
      return { status: "complete", warnings: [], assessments, baseline: assessments, entities: [], metadata: { ...metadata, version: "transformer-evidence-v1" }, timings: { baselineMs: 10, rerankedMs: 20 } };
    };
    const report = await runComparison({ split: "development", includeModel: false, includeTransformers: true }, undefined, vi.fn(), service);
    for (const summary of report.summaries.slice(3)) { expect(summary.modelCases).toBe(10); expect(summary.status).toBe("complete"); }
    expect(report.results.find(row => row.pipeline === "dense-nli")?.transformerMetadata?.models.nli).toBe("test-nli");
    expect(report.summaries[1].status).toBe("not-run");
  });
});
