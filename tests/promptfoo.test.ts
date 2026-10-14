import { describe, expect, it } from "vitest";
import { schema, citations, verdict } from "../evaluations/assertions";

const output = {
  requirements: [{ skill: "python", importance: "required", sourceText: "Python required.", verdict: "supported", confidence: 0.9, reason: "Explicit use", evidenceText: "Built Python APIs." }],
  criteria: ["Relevant skills", "Demonstrated experience", "Measurable impact", "Document clarity"].map(criterion => ({ criterion, score: 50, explanation: "Review source", evidence: ["Built Python APIs."] })),
  interviewQuestions: ["Describe the API work."], warnings: ["Human review required."]
};
const context = { vars: { job: "Python required.", resume: "Built Python APIs.", skill: "python", expected: "supported" } };
describe("Promptfoo application assertions", () => {
  it("accepts a valid cited result", () => {
    expect(schema(output).pass).toBe(true);
    expect(citations(output, context).pass).toBe(true);
    expect(verdict(output, context).pass).toBe(true);
  });
  it("rejects fabricated quotes and invalid JSON", () => {
    expect(schema("invalid").pass).toBe(false);
    expect(citations(output, { vars: { ...context.vars, resume: "Office work only." } }).pass).toBe(false);
  });
  it("does not equate a valid citation with a correct judgment", () => {
    expect(citations(output, context).pass).toBe(true);
    expect(verdict(output, { vars: { ...context.vars, expected: "partial" } }).pass).toBe(false);
  });
});
