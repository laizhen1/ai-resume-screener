import { describe, expect, it } from "vitest";
import { locateEvidence, parseResume } from "@/lib/parser";

const resume = `Example Person

SKILLS
TypeScript, React, PostgreSQL

EXPERIENCE
- Built a platform for 1,000 users.

EDUCATION
Example University`;

describe("structured resume parser", () => {
  it("normalizes sections and canonical skills", () => {
    const parsed = parseResume(resume);
    expect(parsed.skills).toEqual(expect.arrayContaining(["typescript", "react", "postgresql"]));
    expect(parsed.experience).toContain("Built a platform for 1,000 users.");
    expect(parsed.education).toContain("Example University");
  });

  it("attaches exact source provenance", () => {
    const evidence = locateEvidence(resume, "Built a platform for 1,000 users.");
    expect(evidence.section).toBe("experience");
    expect(resume.slice(evidence.start, evidence.end)).toBe(evidence.text);
  });
});
