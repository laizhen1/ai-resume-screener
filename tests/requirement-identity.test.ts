import { describe, expect, it } from "vitest";
import { canonicalRequirementName, consolidateRequirements } from "@/lib/requirement-identity";
import { align } from "@/lib/experiments/runner";
import { composeAiAnalysis, DEFAULT_SCORING_WEIGHTS } from "@/lib/analyzer";
import type { AiAnalysisDraft } from "@/lib/ai-analysis";

const requirement = (skill: string, verdict: "supported" | "partial" = "supported") => ({ skill, verdict, reason: "Source evidence", quote: "Implemented services." });
const example = { id: "identity", job: "Python experience is required.", resume: "Implemented services.", challenge: "identity", expectedVerdicts: { python: "supported" as const } };
const draft = (): AiAnalysisDraft => ({
  requirements: [{ skill: "Python experience", verdict: "supported", reason: "Explicit work", evidenceText: example.resume, sourceText: example.job, confidence: 0.9, importance: "required" }],
  criteria: ["Relevant skills", "Demonstrated experience", "Measurable impact", "Document clarity"].map(criterion => ({ criterion, score: 50, explanation: "Test rubric", evidence: [] })),
  interviewQuestions: ["Describe the work."], warnings: ["Review the source."]
});

describe("shared requirement identity", () => {
  it("normalizes bounded wrappers, spacing, case and existing aliases", () => {
    for (const name of ["Python experience", "Experience in PYTHON", "  Python   skills required ", "Professional experience with python"]) expect(canonicalRequirementName(name)).toBe("python");
    expect(canonicalRequirementName("K8s experience")).toBe("kubernetes");
    expect(canonicalRequirementName("Postgres proficiency")).toBe("postgresql");
  });
  it("does not use substring matches, merge multiple skills or rename unknown competencies", () => {
    for (const name of ["java", "javascript", "c#", "c++", "python and java", "customer experience", "governance", "reactive systems"]) expect(canonicalRequirementName(name)).toBe(name);
  });
  it("aligns a wrapped requirement without consulting the expected verdict", () => {
    const matched = align(example, [requirement("Python experience", "partial")])[0];
    expect(matched).toMatchObject({ actual: "partial", expected: "supported", missing: false, citationValid: true });
  });
  it("keeps genuinely unmatched names missing", () => {
    expect(align(example, [requirement("Python and Java")])[0]).toMatchObject({ actual: "unknown", missing: true });
  });
  it("abstains on conflicting duplicates in either order and clears their quote", () => {
    const items = [requirement("Python experience"), requirement("python", "partial")];
    for (const values of [items, [...items].reverse()]) {
      expect(align(example, values)[0]).toMatchObject({ actual: "unknown", missing: false, quote: null });
      expect(consolidateRequirements(values, item => ({ ...item, quote: "" }))).toHaveLength(1);
    }
  });
  it("uses the same names and conflict policy in displayed analysis", () => {
    const modelDraft = draft();
    expect(composeAiAnalysis(example.job, example.resume, DEFAULT_SCORING_WEIGHTS, modelDraft, "test").matchedSkills).toEqual(["python"]);
    modelDraft.requirements.push({ ...modelDraft.requirements[0], skill: "python", verdict: "partial" });
    const result = composeAiAnalysis(example.job, example.resume, DEFAULT_SCORING_WEIGHTS, modelDraft, "test");
    expect(result.requirementAssessments).toHaveLength(1);
    expect(result.requirementAssessments![0]).toMatchObject({ skill: "python", verdict: "unknown", confidence: 0 });
    expect(result.requirementAssessments![0].evidence).toBeUndefined();
  });
  it("abstains when a requirement invents its job source", () => {
    const modelDraft = draft(); modelDraft.requirements[0].sourceText = "An invented requirement.";
    const result = composeAiAnalysis(example.job, example.resume, DEFAULT_SCORING_WEIGHTS, modelDraft, "test");
    expect(result.requirementAssessments![0].verdict).toBe("unknown");
    expect(result.requirementAssessments![0].reason).toContain("job description");
  });
  it("requires verbatim resume evidence rather than case-insensitive approximations", () => {
    const modelDraft = draft(); modelDraft.requirements[0].evidenceText = example.resume.toUpperCase();
    expect(composeAiAnalysis(example.job, example.resume, DEFAULT_SCORING_WEIGHTS, modelDraft, "test").requirementAssessments![0].verdict).toBe("unknown");
  });
});
