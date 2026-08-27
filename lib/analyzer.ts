import type { AnalysisResult, Evidence } from "./types";
import { TAXONOMY_VERSION } from "./skills";
import { cosineSimilarity, embedTexts } from "./embeddings";
import { locateEvidence, parseResume } from "./parser";
import { assessRequirements, summarizeReliability } from "./evidence-intelligence";

export const ENGINE_VERSION = "3.0.0";

export type ScoringWeights = {
  skills: number;
  experience: number;
  impact: number;
  clarity: number;
};

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = { skills: 55, experience: 20, impact: 15, clarity: 10 };

export function weightsFromCriteria(criteria: Array<{ name: string; weight: number }>): ScoringWeights {
  const byName = new Map(criteria.map((item) => [item.name.toLowerCase(), item.weight]));
  const weights = {
    skills: byName.get("relevant skills") ?? DEFAULT_SCORING_WEIGHTS.skills,
    experience: byName.get("demonstrated experience") ?? DEFAULT_SCORING_WEIGHTS.experience,
    impact: byName.get("measurable impact") ?? DEFAULT_SCORING_WEIGHTS.impact,
    clarity: byName.get("document clarity") ?? DEFAULT_SCORING_WEIGHTS.clarity
  };
  return Object.values(weights).reduce((sum, value) => sum + value, 0) === 100 ? weights : DEFAULT_SCORING_WEIGHTS;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function evidenceLines(text: string, terms: string[], limit = 4): string[] {
  const lines = text.split(/\n|(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  return lines
    .filter((line) => terms.some((term) => line.toLowerCase().includes(term.toLowerCase())))
    .slice(0, limit)
    .map((line) => line.slice(0, 220));
}

export function analyzeResume(jobDescription: string, resumeText: string, weights = DEFAULT_SCORING_WEIGHTS): AnalysisResult {
  const structuredResume = parseResume(resumeText);
  const requirementAssessments = assessRequirements(jobDescription, resumeText);
  const jobSkills = requirementAssessments.map((assessment) => assessment.skill);
  const matchedSkills = requirementAssessments.filter((assessment) => assessment.verdict === "supported").map((assessment) => assessment.skill);
  const missingSkills = requirementAssessments.filter((assessment) => assessment.verdict !== "supported").map((assessment) => assessment.skill);
  const partial = requirementAssessments.filter((assessment) => assessment.verdict === "partial");
  const contradicted = requirementAssessments.filter((assessment) => assessment.verdict === "contradicted");
  const unknown = requirementAssessments.filter((assessment) => assessment.verdict === "unknown");
  const reliability = summarizeReliability(resumeText, requirementAssessments);

  const skillScore = jobSkills.length ? ((matchedSkills.length + partial.length * 0.4) / jobSkills.length) * 100 : 50;
  const quantified = (resumeText.match(/\b\d+(?:\.\d+)?%|\b\d+\+?\s*(?:users|customers|projects|teams|ms|seconds|hours|days)\b/gi) ?? []).length;
  const impactScore = clamp(35 + quantified * 15);
  const actionVerbs = ["built", "created", "delivered", "designed", "developed", "improved", "implemented", "led", "reduced", "shipped"];
  const actionHits = actionVerbs.filter((verb) => resumeText.toLowerCase().includes(verb));
  const experienceScore = clamp(35 + actionHits.length * 8);
  const structureSignals = ["experience", "education", "skills", "summary"].filter((section) => resumeText.toLowerCase().includes(section));
  const clarityScore = clamp(30 + structureSignals.length * 15 + (resumeText.length > 500 ? 10 : 0));

  const criteria: Evidence[] = [
    {
      criterion: "Relevant skills",
      weight: weights.skills,
      score: clamp(skillScore),
      explanation: jobSkills.length
        ? `${matchedSkills.length} supported, ${partial.length} partial, ${contradicted.length} contradicted and ${unknown.length} unknown across ${jobSkills.length} detected requirements.`
        : "Few explicit skills were detected in the job description.",
      evidence: requirementAssessments.flatMap((assessment) => assessment.evidence?.text ? [assessment.evidence.text] : []).slice(0, 6)
    },
    {
      criterion: "Demonstrated experience",
      weight: weights.experience,
      score: experienceScore,
      explanation: `${actionHits.length} distinct delivery-oriented action signals were found.`,
      evidence: evidenceLines(resumeText, actionHits)
    },
    {
      criterion: "Measurable impact",
      weight: weights.impact,
      score: impactScore,
      explanation: `${quantified} quantified outcome signal${quantified === 1 ? " was" : "s were"} found.`,
      evidence: evidenceLines(resumeText, ["%", "users", "customers", "projects", "ms", "seconds"])
    },
    {
      criterion: "Document clarity",
      weight: weights.clarity,
      score: clarityScore,
      explanation: `${structureSignals.length} expected resume sections were detected.`,
      evidence: structureSignals.map((section) => `${section[0].toUpperCase()}${section.slice(1)} section detected`)
    }
  ];
  criteria.forEach((item) => {
    item.provenance = item.evidence.map((snippet) => locateEvidence(resumeText, snippet, structuredResume.sections));
  });

  const overallScore = clamp(criteria.reduce((total, item) => total + item.score * (item.weight / 100), 0));
  const warnings = [
    ...(jobSkills.length < 3 ? ["The job description has few recognizable skills, so the score may be less informative."] : []),
    ...(resumeText.length < 350 ? ["The resume contains limited text; check that document extraction succeeded."] : []),
    ...(reliability.abstainedRequirements.length ? [`The analyzer abstained on ${reliability.abstainedRequirements.length} requirement(s) without explicit evidence.`] : []),
    "Contextual rules can miss transferable or equivalent experience. A person must review the original application."
  ];

  const interviewQuestions = missingSkills.slice(0, 3).map((skill) => `Can you describe any experience related to ${skill}, even if it is not listed on your resume?`);
  if (interviewQuestions.length < 3) {
    interviewQuestions.push("Which project best demonstrates the impact you could bring to this role?", "What trade-offs did you make in your most technically challenging project?");
  }

  return {
    overallScore,
    matchedSkills,
    missingSkills,
    criteria,
    interviewQuestions: interviewQuestions.slice(0, 4),
    warnings,
    disclaimer: "Decision-support only. Do not use this score as the sole basis for an employment decision.",
    engineVersion: ENGINE_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
    structuredResume,
    requirementAssessments,
    reliability
  };
}

export async function analyzeResumeHybrid(jobDescription: string, resumeText: string, weights = DEFAULT_SCORING_WEIGHTS): Promise<AnalysisResult> {
  const result = analyzeResume(jobDescription, resumeText, weights);
  const missing = result.requirementAssessments
    ?.filter((assessment) => assessment.verdict === "unknown")
    .map((assessment) => assessment.skill)
    .slice(0, 8) ?? [];
  if (!missing.length) return { ...result, semanticMatches: [] };
  if (process.env.ENABLE_LOCAL_EMBEDDINGS !== "true") return { ...result, semanticMatches: [] };

  const snippets = resumeText
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 20)
    .slice(0, 40);
  if (!snippets.length) return { ...result, semanticMatches: [] };

  const inputs = [...missing, ...snippets];
  const embedded = await embedTexts(inputs);
  if (embedded.source !== "ollama-embedding") {
    return { ...result, semanticMatches: [], warnings: [...result.warnings, "The local embedding model was unavailable, so semantic retrieval abstained."] };
  }
  const skillVectors = embedded.vectors.slice(0, missing.length);
  const snippetVectors = embedded.vectors.slice(missing.length);
  const threshold = 0.62;
  const semanticMatches = missing.flatMap((skill, skillIndex) => {
    let bestIndex = -1;
    let bestSimilarity = -1;
    snippetVectors.forEach((vector, snippetIndex) => {
      const similarity = cosineSimilarity(skillVectors[skillIndex], vector);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIndex = snippetIndex;
      }
    });
    if (bestIndex < 0 || bestSimilarity < threshold) return [];
    return [{
      skill,
      similarity: Math.round(bestSimilarity * 100) / 100,
      evidence: locateEvidence(resumeText, snippets[bestIndex], result.structuredResume?.sections),
      method: embedded.source
    }];
  });

  return {
    ...result,
    semanticMatches,
    warnings: semanticMatches.length
      ? [...result.warnings, "Semantic matches are advisory and do not change the deterministic overall score."]
      : result.warnings
  };
}
