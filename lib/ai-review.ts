import { z } from "zod";
import type { AiReviewSummary, RequirementAssessment } from "./types";

const reviewSchema = z.object({
  summary: z.string().trim().min(1).max(700),
  demonstratedStrengths: z.array(z.string().trim().min(1).max(240)).max(4),
  verificationPoints: z.array(z.string().trim().min(1).max(240)).max(4),
  suggestedQuestions: z.array(z.string().trim().min(1).max(240)).max(3)
});

type ReviewInput = {
  jobDescription: string;
  resumeText: string;
  assessments: RequirementAssessment[];
};

function evidenceContext(assessments: RequirementAssessment[]) {
  return assessments.map((assessment) => ({
    skill: assessment.skill,
    importance: assessment.importance,
    verdict: assessment.verdict,
    reason: assessment.reason,
    evidence: assessment.evidence?.text ?? null
  }));
}

export async function createAiReview(input: ReviewInput): Promise<AiReviewSummary | null> {
  if (process.env.ENABLE_LOCAL_AI_REVIEW === "false") return null;
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return null;

  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_REVIEW_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen3:4b";
  const prompt = `You are a resume-evidence review assistant. Produce a concise, neutral reviewer aid from the supplied material.

Safety rules:
- Do not recommend hiring, rejecting, ranking, or progressing the person.
- Do not infer protected traits, personality, age, gender, ethnicity, health, location suitability, or qualification.
- Treat the deterministic requirement assessments as the only evidence judgments. Do not overturn them.
- Mention only demonstrated evidence and specific points a human reviewer should verify.
- Suggested questions must be neutral and job-related.

Job description:\n${input.jobDescription.slice(0, 12_000)}

Resume:\n${input.resumeText.slice(0, 20_000)}

Deterministic evidence assessments:\n${JSON.stringify(evidenceContext(input.assessments))}

Return JSON only with this exact shape:
{"summary":"string","demonstratedStrengths":["string"],"verificationPoints":["string"],"suggestedQuestions":["string"]}`;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: "json", think: false, options: { temperature: 0.1 } }),
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const payload = await response.json() as { response?: string; thinking?: string };
    // Some reasoning-capable Ollama models return the structured answer in `thinking`
    // when their completion body is empty. Both fields stay local to the same request.
    const review = reviewSchema.parse(JSON.parse(payload.response || payload.thinking || ""));
    return { ...review, source: "ollama", model };
  } catch {
    // Local AI is optional. Deterministic analysis remains available when Ollama is unavailable or returns invalid data.
    return null;
  }
}
