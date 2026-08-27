import { findSkills, termsForSkill } from "./skills";
import { locateEvidence, parseResume } from "./parser";
import type { JobRequirement, RequirementAssessment, RequirementImportance, ReliabilitySummary } from "./types";

function sentences(text: string): string[] {
  return text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(text);
}

function importanceFor(sourceText: string, skill: string): RequirementImportance {
  const lower = sourceText.toLowerCase();
  const termIndex = Math.min(...termsForSkill(skill).map((term) => lower.indexOf(term)).filter((index) => index >= 0));
  const markers = [
    ...Array.from(lower.matchAll(/\b(preferred|ideally|desirable|bonus|nice[- ]to[- ]have)\b/g), (match) => ({ importance: "preferred" as const, index: match.index })),
    ...Array.from(lower.matchAll(/\b(required?|requires?|must|essential|need(?:s|ed)?|mandatory)\b/g), (match) => ({ importance: "required" as const, index: match.index }))
  ];
  return markers.sort((left, right) => Math.abs(left.index - termIndex) - Math.abs(right.index - termIndex))[0]?.importance ?? "unspecified";
}

export function extractJobRequirements(jobDescription: string): JobRequirement[] {
  const jobSentences = sentences(jobDescription);
  return findSkills(jobDescription).map((skill) => {
    const sourceText = jobSentences.find((sentence) => termsForSkill(skill).some((term) => containsTerm(sentence, term))) ?? jobDescription.trim();
    return { skill, importance: importanceFor(sourceText, skill), sourceText: sourceText.slice(0, 300) };
  });
}

function isAmbiguousUse(skill: string, sentence: string): boolean {
  const lower = sentence.toLowerCase();
  if (skill === "react" && /\breact(?:ed|ing)?\s+to\b/.test(lower)) return true;
  if (skill === "go" && /\bgo(?:ing)?\s+to\b|\bgo-to-market\b/.test(lower)) return true;
  return false;
}

function classifySentence(skill: string, sentence: string) {
  const lower = sentence.toLowerCase();
  const terms = termsForSkill(skill).filter((term) => containsTerm(sentence, term));
  if (!terms.length) return null;
  if (isAmbiguousUse(skill, sentence)) {
    return { verdict: "unknown" as const, confidence: 0.9, reason: "The term appears in a non-technical or ambiguous context." };
  }

  const termPattern = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const contradiction = new RegExp(`(?:no|without|lack(?:s|ing)?|never|not)\\b.{0,55}(?:${termPattern})|(?:${termPattern}).{0,35}\\b(?:not used|not experienced|only observed)`, "i");
  if (contradiction.test(lower)) {
    return { verdict: "contradicted" as const, confidence: 0.94, reason: "The résumé explicitly limits or negates this experience." };
  }

  if (/\b(currently learning|learning about|studying|coursework|introductory .{0,20}course|interested in|exploring|beginner|basic|familiar with|familiarity with|exposure to|training in)\b/i.test(lower)) {
    return { verdict: "partial" as const, confidence: 0.74, reason: "The résumé indicates learning, familiarity, or limited exposure rather than demonstrated delivery." };
  }

  const strongContext = /\b(built|created|delivered|designed|developed|implemented|led|maintained|migrated|operated|production|professional|shipped|used|worked)\b/i.test(lower);
  return {
    verdict: "supported" as const,
    confidence: strongContext ? 0.9 : 0.78,
    reason: strongContext ? "The résumé links this requirement to delivery or professional experience." : "The requirement is explicitly listed, but depth still requires human verification."
  };
}

export function assessRequirements(jobDescription: string, resumeText: string): RequirementAssessment[] {
  const requirements = extractJobRequirements(jobDescription);
  const resumeSentences = sentences(resumeText);
  const structured = parseResume(resumeText);

  return requirements.map((requirement) => {
    const candidates = resumeSentences
      .map((sentence) => ({ sentence, classification: classifySentence(requirement.skill, sentence) }))
      .filter((candidate): candidate is { sentence: string; classification: NonNullable<ReturnType<typeof classifySentence>> } => Boolean(candidate.classification));
    const priority = { contradicted: 4, supported: 3, partial: 2, unknown: 1 } as const;
    const best = candidates.sort((left, right) => priority[right.classification.verdict] - priority[left.classification.verdict])[0];

    if (!best) {
      return {
        ...requirement,
        verdict: "unknown",
        confidence: 0.96,
        reason: "No explicit supporting or contradicting evidence was found; the system abstained.",
        method: "contextual-rules-v1"
      };
    }

    return {
      ...requirement,
      ...best.classification,
      evidence: locateEvidence(resumeText, best.sentence, structured.sections),
      method: "contextual-rules-v1"
    };
  });
}

export function summarizeReliability(resumeText: string, assessments: RequirementAssessment[]): ReliabilitySummary {
  const structured = parseResume(resumeText);
  const extractionQuality = resumeText.length >= 500 && structured.sections.length >= 3
    ? "high"
    : resumeText.length >= 250 && structured.sections.length >= 2 ? "medium" : "low";
  const resolved = assessments.filter((assessment) => assessment.verdict !== "unknown");
  const evidenceCoverage = assessments.length ? resolved.length / assessments.length : 0;
  const averageConfidence = assessments.length
    ? assessments.reduce((sum, assessment) => sum + assessment.confidence, 0) / assessments.length
    : 0;
  const abstainedRequirements = assessments.filter((assessment) => assessment.verdict === "unknown").map((assessment) => assessment.skill);
  const needsVerification = extractionQuality === "low" || assessments.some((assessment) => assessment.verdict !== "supported");

  return {
    evidenceCoverage: Math.round(evidenceCoverage * 1000) / 1000,
    averageConfidence: Math.round(averageConfidence * 1000) / 1000,
    extractionQuality,
    status: needsVerification ? "needs-human-verification" : "review-ready",
    abstainedRequirements
  };
}
