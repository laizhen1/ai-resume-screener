import { describe, expect, it } from "vitest";
import { buildAnalysisContract, EVIDENCE_VERDICTS } from "@/lib/ai-analysis";
import { composeAiAnalysis, DEFAULT_SCORING_WEIGHTS } from "@/lib/analyzer";

const job = "Python and React experience is required.";
const resume = "SUMMARY\nI have never used React.\nBuilt Python services.";
const contract = buildAnalysisContract(job, resume);
const wire = () => ({
  requirementJudgments: Object.fromEntries(contract.known.map(item => [item.id, { category: "applicant_explicitly_denies_skill", confidence: 0.75, reason: "Negated in selected source", evidenceId: "s0" as string | null }])),
  additionalRequirements: [],
  criteria: Object.fromEntries(["Relevant skills", "Demonstrated experience", "Measurable impact", "Document clarity"].map(name => [name, { score: 0, explanation: "Test rubric", evidenceIds: ["s1"] }])),
  interviewQuestions: ["Describe the work."], warnings: ["Review source."]
});

describe("grounded generation contract", () => {
  it("reconstructs names and exact sources while exposing the fixed decision policy", () => {
    const result = contract.decode(wire());
    expect(result.requirements.map(item => item.skill)).toEqual(["python", "react"]);
    expect(result.requirements.every(item => item.sourceText === job && item.evidenceText === "I have never used React." && item.verdict === "contradicted")).toBe(true);
    // A wrong model category remains wrong; no expected labels or rule-engine verdicts enter decoding.
    expect(result.requirements[0].reason).toContain("evidence-category-v1: applicant_explicitly_denies_skill");
  });
  it("rejects missing/extra requirement IDs and invented evidence pointers", () => {
    const missing = wire(); delete missing.requirementJudgments.python;
    expect(() => contract.decode(missing)).toThrow();
    const extra = wire(); extra.requirementJudgments.r99 = extra.requirementJudgments.python;
    expect(() => contract.decode(extra)).toThrow();
    const invalid = wire(); invalid.requirementJudgments.python.evidenceId = "s999";
    expect(() => contract.decode(invalid)).toThrow();
  });
  it("uses the same evidence policy for requirements outside the skill catalog", () => {
    const other = buildAnalysisContract("Grant writing is required.", "Wrote grant applications.");
    const value = { ...wire(), criteria: Object.fromEntries(Object.entries(wire().criteria).map(([name, item]) => [name, { ...item, evidenceIds: ["s0"] }])), requirementJudgments: {}, additionalRequirements: [{ skill: "grant writing", sourceText: "Grant writing is required.", importance: "required", category: "applicant_used_skill", confidence: 0.75, reason: "Explicit work", evidenceId: "s0" }] };
    expect(other.decode(value).requirements[0]).toMatchObject({ skill: "grant writing", verdict: "supported", evidenceText: "Wrote grant applications." });
  });
  it("abstains when a positive or negative category has no source", () => {
    const value = wire(); value.requirementJudgments.python.evidenceId = null;
    expect(contract.decode(value).requirements[0]).toMatchObject({ verdict: "unknown", confidence: 0, evidenceText: null });
  });
  it("restores criterion quotes that survive production validation", () => {
    const draft = contract.decode(wire());
    expect(draft.criteria[0].evidence).toEqual(["Built Python services."]);
    const result = composeAiAnalysis(job, resume, DEFAULT_SCORING_WEIGHTS, draft, "fixture");
    expect(result.criteria[0].evidence).toEqual(["Built Python services."]);
    const invalid = wire(); invalid.criteria["Relevant skills"].evidenceIds = ["s999"];
    expect(() => contract.decode(invalid)).toThrow();
    const missing = wire(); delete missing.criteria["Document clarity"];
    expect(() => contract.decode(missing)).toThrow();
  });
  it.each(Object.entries(EVIDENCE_VERDICTS))("maps model category %s to %s consistently", (category, verdict) => {
    const value = wire(); value.requirementJudgments.python.category = category;
    expect(contract.decode(value).requirements[0].verdict).toBe(verdict);
  });
  it("keeps passage spans exact for CRLF, whitespace and long source lines", () => {
    const source = "  " + "x".repeat(1100) + "\r\n  Used Python.  ";
    const bounded = buildAnalysisContract("Python required.", source);
    expect(bounded.passages.every(item => source.includes(item.text) && item.text.length <= 500)).toBe(true);
    expect(bounded.passages.some(item => item.text === "Used Python.")).toBe(true);
  });
  it("uses meaningful keys and excludes headings without dropping short evidence sentences", () => {
    const value = buildAnalysisContract("Python required.", "SUMMARY\nI used Python.\nWork Experience:\nBuilt APIs.");
    expect(value.known[0].id).toBe("python");
    expect(value.passages.map(item => item.text)).toEqual(["I used Python.", "Built APIs."]);
  });
  it("supports an empty resume without inventing passages", () => {
    const empty = buildAnalysisContract(job, "");
    const value = wire();
    for (const item of Object.values(value.requirementJudgments)) { item.evidenceId = null; item.category = "missing_or_ambiguous"; }
    for (const item of Object.values(value.criteria)) item.evidenceIds = [];
    expect(empty.decode(value).requirements.every(item => item.verdict === "unknown")).toBe(true);
  });
  it("uses numeric enums in the generation schema instead of relying on range enforcement", () => {
    const schema = contract.format as { properties: Record<string, { properties: Record<string, { properties: Record<string, { enum: number[] }> }> }> };
    expect(schema.properties.requirementJudgments.properties.python.properties.confidence.enum).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(schema.properties.criteria.properties["Relevant skills"].properties.score.enum).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const value = wire(); value.requirementJudgments.python.confidence = 80;
    expect(() => contract.decode(value)).toThrow();
  });
});
