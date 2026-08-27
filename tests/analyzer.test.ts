import { describe, expect, it } from "vitest";
import { analyzeResume } from "@/lib/analyzer";

const job = "We need a TypeScript and React engineer with Next.js, PostgreSQL, Docker, testing, REST API and GitHub Actions experience.";
const strongResume = `SUMMARY\nSoftware Engineer\nSKILLS\nTypeScript, React, Next.js, Node.js, PostgreSQL, Docker, testing, REST APIs, GitHub Actions\nEXPERIENCE\nBuilt and shipped a customer platform for 2,000 users. Improved latency by 38%. Implemented CI/CD and led testing.\nEDUCATION\nBSc Computing`;

describe("analyzeResume", () => {
  it("returns an explainable high match for supported skills", () => {
    const result = analyzeResume(job, strongResume);
    expect(result.overallScore).toBeGreaterThan(70);
    expect(result.matchedSkills).toContain("typescript");
    expect(result.missingSkills).not.toContain("react");
    expect(result.criteria).toHaveLength(4);
  });

  it("does not invent evidence for missing skills", () => {
    const result = analyzeResume(job, "SUMMARY\nGraphic designer focused on Figma and accessibility.\nEXPERIENCE\nCreated brand systems.\nEDUCATION\nDesign degree.");
    expect(result.missingSkills).toContain("typescript");
    expect(result.criteria[0].evidence.every((line) => !line.toLowerCase().includes("typescript"))).toBe(true);
  });

  it("applies a valid job-specific scoring rubric", () => {
    const result = analyzeResume(job, strongResume, { skills: 40, experience: 30, impact: 20, clarity: 10 });
    expect(result.criteria.map((criterion) => criterion.weight)).toEqual([40, 30, 20, 10]);
    expect(result.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)).toBe(100);
  });

  it("separates demonstrated, learning-only, negated and missing evidence", () => {
    const result = analyzeResume(
      "TypeScript, Docker, React and Terraform are required.",
      "SUMMARY\nEngineer\nEXPERIENCE\nBuilt TypeScript services. Currently learning Docker. No professional experience with React.\nEDUCATION\nExample University"
    );
    const verdicts = Object.fromEntries(result.requirementAssessments?.map((assessment) => [assessment.skill, assessment.verdict]) ?? []);
    expect(verdicts).toEqual({ docker: "partial", react: "contradicted", terraform: "unknown", typescript: "supported" });
    expect(result.matchedSkills).toEqual(["typescript"]);
    expect(result.reliability?.status).toBe("needs-human-verification");
    expect(result.reliability?.abstainedRequirements).toContain("terraform");
  });

  it("keeps mixed required and preferred requirements distinct", () => {
    const result = analyzeResume(
      "AWS is required. GCP experience is preferred.",
      "SUMMARY\nCloud engineer\nEXPERIENCE\nUsed AWS to operate production services.\nEDUCATION\nExample University"
    );
    const importance = Object.fromEntries(result.requirementAssessments?.map((assessment) => [assessment.skill, assessment.importance]) ?? []);
    expect(importance).toEqual({ aws: "required", gcp: "preferred" });
  });
});
