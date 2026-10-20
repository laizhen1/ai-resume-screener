import { describe, expect, it } from "vitest";
import { runComparison } from "@/lib/experiments/runner";
import { verifyReport } from "@/lib/verify-report";
import { buildAnalysisContract } from "@/lib/ai-analysis";

describe("saved experiment evidence", () => {
  it("checks saved categories against decoded drafts and reported verdicts", async () => {
    const report = await runComparison({ split: "development", includeModel: true }, undefined, async (job, resume) => {
      const contract = buildAnalysisContract(job, resume);
      const wireOutput = {
        requirementJudgments: Object.fromEntries(contract.known.map(item => [item.id, { evidenceId: null, reason: "Fixture abstention", category: "missing_or_ambiguous", confidence: 0 }])),
        additionalRequirements: [],
        criteria: Object.fromEntries(["Relevant skills", "Demonstrated experience", "Measurable impact", "Document clarity"].map(name => [name, { score: 0, explanation: "Fixture", evidenceIds: [] }])),
        interviewQuestions: ["Describe the work."], warnings: ["Fixture only."]
      };
      return { draft: contract.decode(wireOutput), model: "fixture", wireOutput };
    });
    expect(() => verifyReport(report)).not.toThrow();
    const draft = structuredClone(report);
    draft.results.find(row => row.pipeline === "llm")!.modelDraft!.requirements[0].reason = "Edited";
    expect(() => verifyReport(draft)).toThrow("decoded draft mismatch");
    const guarded = structuredClone(report);
    guarded.results.find(row => row.pipeline === "hybrid")!.predictions[0].actual = "supported";
    expect(() => verifyReport(guarded)).toThrow("hybrid verdict mismatch");
    const prediction = report.results.find(row => row.pipeline === "llm")!.predictions[0];
    prediction.actual = "supported";
    expect(() => verifyReport(report)).toThrow("reported verdict mismatch");
  });
  it("accepts a complete offline report, including explicitly not-run models", async () => {
    const report = await runComparison({ split: "development", includeModel: false });
    expect(() => verifyReport(report)).not.toThrow();
  });
  it("rejects edited input data, inflated metrics, lost cases and copied reference labels", async () => {
    const original = await runComparison({ split: "development", includeModel: false });
    const changedInput = structuredClone(original); changedInput.examples[0].resume += " modified";
    expect(() => verifyReport(changedInput)).toThrow("hash mismatch");
    const changedMetric = structuredClone(original); changedMetric.summaries[0].accuracy = 0.123;
    expect(() => verifyReport(changedMetric)).toThrow("Metrics mismatch");
    const lostCase = structuredClone(original); lostCase.results.shift();
    expect(() => verifyReport(lostCase)).toThrow("Incomplete case coverage");
    const changedLabel = structuredClone(original); changedLabel.results[0].predictions[0].expected = "unknown";
    expect(() => verifyReport(changedLabel)).toThrow("Reference verdict mismatch");
  });
  it("rejects duplicates and false citation-validity flags", async () => {
    const report = await runComparison({ split: "development", includeModel: false });
    const duplicate = structuredClone(report); duplicate.results.push(duplicate.results[0]);
    expect(() => verifyReport(duplicate)).toThrow("Duplicate case/pipeline");
    report.results[0].predictions[0].citationValid = !report.results[0].predictions[0].citationValid;
    expect(() => verifyReport(report)).toThrow("Citation validity mismatch");
  });
});
