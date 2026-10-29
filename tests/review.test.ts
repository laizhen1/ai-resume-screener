import { describe, it, expect } from "vitest";
import { analyzeResume } from "@/lib/analyzer";
import { issueReceipt, verifyReceipt } from "@/lib/analysis-receipt";
import { exactEvidence, validateCorrections, reviewReport, reviewText } from "@/lib/review";

const resume = "SUMMARY\r\nBuilt Python services for 200 users.\r\nSKILLS\r\nPython and SQL for fictional customer records.";
const job = "We need an engineer with Python delivery experience building reliable services.";
const analysis = analyzeResume(job, resume);
const snapshot = { analysis, jobDescription: job, resumeText: resume, fileName: "fictional.txt" };

describe("review provenance and receipts", () => {
  it("authenticates the exact serialized result without a second model call", () => {
    const receipt = issueReceipt(snapshot);
    expect(() => verifyReceipt(JSON.parse(JSON.stringify(snapshot)), receipt)).not.toThrow();
  });
  it.each(["source", "score", "job", "filename"])("rejects a changed %s", field => {
    const receipt = issueReceipt(snapshot);
    const changed = structuredClone(snapshot);
    if (field === "source") changed.resumeText += " Extra";
    if (field === "score") changed.analysis.overallScore = 100;
    if (field === "job") changed.jobDescription += " Extra";
    if (field === "filename") changed.fileName = "different.txt";
    expect(() => verifyReceipt(changed, receipt)).toThrow("changed");
  });
  it("rejects expired and malformed receipts", () => {
    const receipt = issueReceipt(snapshot, 1000);
    expect(() => verifyReceipt(snapshot, receipt, receipt.expiresAt)).toThrow("expired");
    expect(() => verifyReceipt(snapshot, { ...receipt, signature: "fake" }, 1001)).toThrow();
  });
  it("checks offsets against the exact source including CRLF and repeated strings", () => {
    const source = "Python\r\nPython";
    const evidence = { text: "Python", start: 8, end: 14, section: "skills" };
    expect(exactEvidence(source, evidence)).toBe(true);
    expect(exactEvidence(source, { ...evidence, start: 7 })).toBe(false);
    expect(exactEvidence(source, { ...evidence, text: "python" })).toBe(false);
    expect(exactEvidence(source, { ...evidence, end: 999 })).toBe(false);
  });
  it("requires a reason and existing, nonduplicated requirement identifiers", () => {
    const input = { skill: "python", verdict: "partial", reason: "Needs delivery verification" };
    expect(validateCorrections(analysis, [input], "reviewer")[0]).toMatchObject({ ...input, actor: "reviewer" });
    expect(() => validateCorrections(analysis, [input, input], "reviewer")).toThrow();
    expect(() => validateCorrections(analysis, [{ ...input, skill: "invented" }], "reviewer")).toThrow();
    expect(() => validateCorrections(analysis, [{ ...input, reason: "" }], "reviewer")).toThrow();
  });
  it("exports human judgments separately without mutating automated results", () => {
    const original = structuredClone(analysis);
    const reviewed = { ...analysis, reviewerCorrections: validateCorrections(analysis, [{ skill: "python", verdict: "unknown", reason: "Clarify the scope of personal contribution" }], "reviewer") };
    const report = reviewReport(reviewed, resume, job);
    expect(report.originalAnalysis.reviewerCorrections).toBeUndefined();
    expect(report.originalAnalysis.overallScore).toBe(original.overallScore);
    expect(report.reviewerCorrections[0].verdict).toBe("unknown");
    expect(reviewText(reviewed, resume, job)).toContain("Reviewer: unknown");
    expect(analysis).toEqual(original);
  });
});
