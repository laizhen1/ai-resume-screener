import { z } from "zod";
import type { AnalysisResult, EvidenceProvenance, ReviewerCorrection } from "./types";

export const correctionSchema = z.object({
  skill: z.string().trim().min(1).max(160),
  verdict: z.enum(["supported", "partial", "contradicted", "unknown"]),
  reason: z.string().trim().min(5).max(2000)
}).strict();
export const correctionsSchema = z.array(correctionSchema).max(200);

export function validateCorrections(result: AnalysisResult, input: unknown, actor: string): ReviewerCorrection[] {
  const corrections = correctionsSchema.parse(input);
  const known = new Set(result.requirementAssessments?.map(item => item.skill));
  const seen = new Set<string>();
  return corrections.map(item => {
    if (!known.has(item.skill) || seen.has(item.skill)) throw new Error("Review must reference each existing requirement at most once.");
    seen.add(item.skill);
    return { ...item, actor, reviewedAt: new Date().toISOString() };
  });
}

export function exactEvidence(source: string, evidence?: EvidenceProvenance) {
  return Boolean(evidence && Number.isInteger(evidence.start) && Number.isInteger(evidence.end) && evidence.start >= 0 && evidence.end > evidence.start && evidence.end <= source.length && source.slice(evidence.start, evidence.end) === evidence.text);
}

export function reviewReport(result: AnalysisResult, source: string, job: string) {
  return {
    format: "resume-lab-review-v1", exportedAt: new Date().toISOString(),
    purpose: "Human evidence review; not an employment recommendation or independent evaluation label.",
    jobDescription: job, resumeText: source,
    originalAnalysis: { ...result, reviewerCorrections: undefined },
    reviewerCorrections: result.reviewerCorrections ?? [],
    scoreNote: "Reviewer corrections do not overwrite the original automated verdicts or advisory score."
  };
}

export function reviewText(result: AnalysisResult, source: string, job: string) {
  const rows = (result.requirementAssessments ?? []).map(item => {
    const review = result.reviewerCorrections?.find(value => value.skill === item.skill);
    return [item.skill, `Automated: ${item.verdict} — ${item.reason}`,
      item.evidence ? `Source: ${item.evidence.text}\nCharacters: ${item.evidence.start}–${item.evidence.end}; exact source match: ${exactEvidence(source, item.evidence)}` : "Source: no evidence selected",
      review ? `Reviewer: ${review.verdict} — ${review.reason}` : "Reviewer: not reviewed"].join("\n");
  });
  return ["OPEN RESUME LAB — EVIDENCE REVIEW", `Provider: ${result.analysisProvider ?? "unspecified"} ${result.analysisModel ?? ""}`,
    `Original advisory score: ${result.overallScore}/100. Reviewer corrections do not change this score.`,
    result.disclaimer, "ROLE", job, "REQUIREMENTS", ...rows].join("\n\n");
}
