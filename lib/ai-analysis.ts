import { z } from "zod";
import type { ScoringWeights } from "./analyzer";

const numericField = (minimum: number, maximum: number, percentage = false) => z.preprocess(
  (value) => {
    if (typeof value !== "string" && typeof value !== "number") return value;
    const numeric = typeof value === "string" ? Number(value.replace(/[^0-9.-]/g, "")) : value;
    return percentage && numeric > 1 ? numeric / 100 : numeric;
  },
  z.number().min(minimum).max(maximum)
);

const requirementSchema = z.object({
  skill: z.string().trim().min(1).max(100),
  importance: z.enum(["required", "preferred", "unspecified"]),
  sourceText: z.string().trim().min(1).max(400),
  verdict: z.enum(["supported", "partial", "contradicted", "unknown"]),
  confidence: numericField(0, 1, true),
  reason: z.string().trim().min(1).max(500),
  evidenceText: z.string().trim().max(500).nullable().optional().default(null)
});

const criterionSchema = z.object({
  criterion: z.string().trim().min(1).max(100),
  score: numericField(0, 100),
  explanation: z.string().trim().min(1).max(500),
  evidence: z.array(z.string().trim().min(1).max(500)).max(6)
});

const analysisSchema = z.object({
  requirements: z.array(requirementSchema).max(50),
  criteria: z.array(criterionSchema).length(4),
  interviewQuestions: z.array(z.string().trim().min(1).max(300)).min(1).max(4),
  warnings: z.array(z.string().trim().min(1).max(400)).min(1).max(8)
});

const ollamaFormat = {
  type: "object",
  properties: {
    requirements: { type: "array", items: { type: "object", properties: { skill: { type: "string" }, importance: { type: "string", enum: ["required", "preferred", "unspecified"] }, sourceText: { type: "string" }, verdict: { type: "string", enum: ["supported", "partial", "contradicted", "unknown"] }, confidence: { type: "number" }, reason: { type: "string" }, evidenceText: { type: ["string", "null"] } }, required: ["skill", "importance", "sourceText", "verdict", "confidence", "reason", "evidenceText"] } },
    criteria: { type: "array", items: { type: "object", properties: { criterion: { type: "string" }, score: { type: "number" }, explanation: { type: "string" }, evidence: { type: "array", items: { type: "string" } } }, required: ["criterion", "score", "explanation", "evidence"] } },
    interviewQuestions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: ["requirements", "criteria", "interviewQuestions", "warnings"]
};

export type AiAnalysisDraft = z.infer<typeof analysisSchema>;

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!candidate.trim()) throw new Error("Ollama returned no JSON analysis.");
  return JSON.parse(candidate);
}

export async function analyzeWithOllama(jobDescription: string, resumeText: string, weights: ScoringWeights, options: { model?: string; seed?: number; temperature?: number; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<{ draft: AiAnalysisDraft; model: string } | null> {
  if (process.env.ENABLE_LOCAL_AI === "false" || process.env.ENABLE_LOCAL_AI_ANALYSIS === "false") return null;
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return null;

  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = options.model ?? process.env.OLLAMA_ANALYSIS_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen3:4b";
  const timeoutMs = options.timeoutMs ?? Number(process.env.OLLAMA_ANALYSIS_TIMEOUT_MS ?? 45_000);
  const prompt = `You are an evidence extraction assistant for a human reviewer. Analyze the job description and resume below.

Your output must be JSON only with exactly these keys:
requirements, criteria, interviewQuestions, warnings.

Requirements rules:
- Extract the actual skills, tools, methods, and competencies requested by this job. Do not limit yourself to a fixed catalog.
- For every requirement, cite the exact job-description sentence in sourceText.
- Classify resume evidence as supported, partial, contradicted, or unknown.
- supported requires explicit resume evidence of use, delivery, or professional experience.
- partial means learning, coursework, familiarity, or limited exposure.
- contradicted means the resume explicitly negates or limits the experience.
- unknown means no reliable evidence is present or the wording is ambiguous.
- evidenceText must be an exact contiguous quote from the resume, or null for unknown.
- Never infer evidence that is not written in the resume.

Criteria rules:
- Return exactly these four criterion names: Relevant skills, Demonstrated experience, Measurable impact, Document clarity.
- Score each criterion from 0 to 100 using the resume evidence, not generic assumptions.
- Use these rubric weights only as context: ${JSON.stringify(weights)}.
- Evidence strings must be exact contiguous quotes from the resume.

Safety rules:
- Do not recommend hiring, rejection, progression, or ranking.
- Do not infer protected traits, personality, health, age, gender, ethnicity, or other sensitive attributes.
- Interview questions must be neutral and job-related.
- Warnings must mention uncertainty, extraction limitations, or the need for human verification where relevant.

Job description:
${jobDescription.slice(0, 12_000)}

Resume:
${resumeText.slice(0, 20_000)}

Return JSON matching this shape:
{"requirements":[{"skill":"string","importance":"required|preferred|unspecified","sourceText":"exact job sentence","verdict":"supported|partial|contradicted|unknown","confidence":0.0,"reason":"string","evidenceText":"exact resume quote or null"}],"criteria":[{"criterion":"Relevant skills","score":0,"explanation":"string","evidence":["exact resume quote"]}],"interviewQuestions":["string"],"warnings":["string"]}`;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: ollamaFormat, think: false, options: { temperature: options.temperature ?? 0.1, seed: options.seed, num_predict: 1200 } }),
      signal: AbortSignal.any([AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45_000), ...(options.signal ? [options.signal] : [])])
    });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const payload = await response.json() as { response?: string; thinking?: string };
    return { draft: analysisSchema.parse(extractJson(payload.response || payload.thinking || "")), model };
  } catch (error) {
    console.warn("[ai-analysis] Ollama core analysis unavailable", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
