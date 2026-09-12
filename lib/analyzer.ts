import type { AnalysisResult, Evidence } from "./types";
import { TAXONOMY_VERSION } from "./skills";
import { cosineSimilarity, embedTexts } from "./embeddings";
import { locateEvidence, parseResume } from "./parser";
import { assessRequirements, summarizeReliability } from "./evidence-intelligence";
import { createAiReview } from "./ai-review";
import { analyzeWithOllama, type AiAnalysisDraft } from "./ai-analysis";

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

function verifiedEvidence(resumeText: string, snippet: string | null, sections: ReturnType<typeof parseResume>["sections"]) {
  if (!snippet) return undefined;
  const start = resumeText.toLowerCase().indexOf(snippet.toLowerCase());
  return start >= 0 ? locateEvidence(resumeText, resumeText.slice(start, start + snippet.length), sections) : undefined;
}

function composeAiAnalysis(jobDescription: string, resumeText: string, weights: ScoringWeights, draft: AiAnalysisDraft, model: string): AnalysisResult {
  const expectedCriteria = new Set(["relevant skills", "demonstrated experience", "measurable impact", "document clarity"]);
  if (new Set(draft.criteria.map((item) => item.criterion.toLowerCase())).size !== expectedCriteria.size || draft.criteria.some((item) => !expectedCriteria.has(item.criterion.toLowerCase()))) {
    throw new Error("The AI returned an invalid scoring rubric.");
  }
  const structuredResume = parseResume(resumeText);
  const assessments = draft.requirements
    .map((item) => {
      const evidence = verifiedEvidence(resumeText, item.evidenceText, structuredResume.sections);
      const verdict = item.verdict !== "unknown" && !evidence ? "unknown" as const : item.verdict;
      return {
        skill: item.skill.trim().toLowerCase(),
        importance: item.importance,
        sourceText: jobDescription.toLowerCase().includes(item.sourceText.toLowerCase()) ? item.sourceText : jobDescription.slice(0, 300),
        verdict,
        confidence: verdict === "unknown" && item.verdict !== "unknown" ? Math.min(item.confidence, 0.5) : item.confidence,
        reason: verdict === "unknown" && item.verdict !== "unknown"
          ? "The AI analysis did not provide an exact resume quote, so the system abstained."
          : item.reason,
        evidence,
        method: "ollama-structured-v1" as const
      };
    })
    .filter((item, index, all) => all.findIndex((candidate) => candidate.skill === item.skill) === index);
  const criteria = draft.criteria.map((item) => {
    const evidence = item.evidence.filter((snippet) => Boolean(verifiedEvidence(resumeText, snippet, structuredResume.sections)));
    return {
      criterion: item.criterion,
      weight: weights[item.criterion.toLowerCase() === "relevant skills" ? "skills" : item.criterion.toLowerCase() === "demonstrated experience" ? "experience" : item.criterion.toLowerCase() === "measurable impact" ? "impact" : "clarity"],
      score: clamp(item.score),
      explanation: item.explanation,
      evidence,
      provenance: evidence.map((snippet) => locateEvidence(resumeText, snippet, structuredResume.sections))
    };
  });
  const overallScore = clamp(criteria.reduce((total, item) => total + item.score * (item.weight / 100), 0));
  const matchedSkills = assessments.filter((item) => item.verdict === "supported").map((item) => item.skill);
  const missingSkills = assessments.filter((item) => item.verdict !== "supported").map((item) => item.skill);
  return {
    overallScore,
    matchedSkills,
    missingSkills,
    criteria,
    interviewQuestions: draft.interviewQuestions,
    warnings: [...draft.warnings, "AI-generated analysis is advisory. Review the original resume before making any decision."],
    disclaimer: "Decision-support only. Do not use this score as the sole basis for an employment decision.",
    engineVersion: ENGINE_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
    structuredResume,
    requirementAssessments: assessments,
    reliability: summarizeReliability(resumeText, assessments),
    analysisProvider: "ollama",
    analysisModel: model
  };
}

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
    reliability,
    analysisProvider: "deterministic-fallback"
  };
}

export async function analyzeResumeHybrid(jobDescription: string, resumeText: string, weights = DEFAULT_SCORING_WEIGHTS): Promise<AnalysisResult> {
  const deterministicResult = analyzeResume(jobDescription, resumeText, weights);
  const aiResult = await analyzeWithOllama(jobDescription, resumeText, weights);
  let result: AnalysisResult;
  try {
    result = aiResult
      ? composeAiAnalysis(jobDescription, resumeText, weights, aiResult.draft, aiResult.model)
      : {
      ...deterministicResult,
      warnings: [...deterministicResult.warnings, "Ollama was unavailable, so this result used the deterministic offline fallback."]
      };
  } catch {
    result = {
      ...deterministicResult,
      warnings: [...deterministicResult.warnings, "The AI response could not be verified, so this result used the deterministic offline fallback."]
    };
  }
  const addAiReview = async (analysis: AnalysisResult) => {
    if (analysis.analysisProvider === "ollama") return analysis;
    const aiReview = await createAiReview({
      jobDescription,
      resumeText,
      assessments: analysis.requirementAssessments ?? []
    });
    return aiReview ? { ...analysis, aiReview } : analysis;
  };
  const missing = result.requirementAssessments
    ?.filter((assessment) => assessment.verdict === "unknown")
    .map((assessment) => assessment.skill)
    .slice(0, 8) ?? [];
  if (!missing.length) return addAiReview({ ...result, semanticMatches: [] });
  if (process.env.ENABLE_LOCAL_EMBEDDINGS !== "true") return addAiReview({ ...result, semanticMatches: [] });

  const snippets = resumeText
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 20)
    .slice(0, 40);
  if (!snippets.length) return addAiReview({ ...result, semanticMatches: [] });

  const inputs = [...missing, ...snippets];
  const embedded = await embedTexts(inputs);
  if (embedded.source !== "ollama-embedding") {
    return addAiReview({ ...result, semanticMatches: [], warnings: [...result.warnings, "The local embedding model was unavailable, so semantic retrieval abstained."] });
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

  return addAiReview({
    ...result,
    semanticMatches,
    warnings: semanticMatches.length
      ? [...result.warnings, "Semantic matches are advisory and do not change the deterministic overall score."]
      : result.warnings
  });
}
