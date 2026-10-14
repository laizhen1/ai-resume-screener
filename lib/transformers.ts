import { z } from "zod";
import type { EvidenceProvenance, JobRequirement, RequirementAssessment } from "./types";
import { parseSections } from "./parser";

const probabilities = z.object({ entailment: z.number().min(0).max(1), neutral: z.number().min(0).max(1), contradiction: z.number().min(0).max(1) })
  .refine(value => Math.abs(value.entailment + value.neutral + value.contradiction - 1) < 0.01);
const candidateSchema = z.object({ passageId: z.number().int().nonnegative(), similarity: z.number().min(-1).max(1), rerankScore: z.number().finite(), nli: probabilities, learningNli: probabilities, mentionsRequirement: z.boolean().optional() });
const assessmentSchema = z.object({
  skill: z.string(), verdict: z.enum(["supported", "partial", "contradicted", "unknown"]), reason: z.string().min(1).max(1000),
  passageId: z.number().int().nonnegative().nullable(), candidates: z.array(candidateSchema).max(3)
});
const metadataSchema = z.object({
  version: z.enum(["transformer-evidence-v1", "transformer-evidence-v2"]),
  models: z.object({ embedding: z.string(), reranker: z.string(), nli: z.string(), ner: z.string().nullable(), evidence: z.string().nullable().optional() }),
  revisions: z.record(z.string(), z.string().nullable()), packages: z.record(z.string(), z.string()),
  device: z.string(), threshold: z.number().min(0).max(1), margin: z.number().min(0).max(1), topK: z.number().int().positive(), rerankK: z.number().int().positive()
});
const trainedEvidenceSchema = z.object({
  skill: z.string(), passageId: z.number().int().nonnegative(), verdict: z.enum(["supported", "partial", "contradicted", "unknown"]), abstained: z.boolean(),
  probabilities: z.object({ supported: z.number().min(0).max(1), partial: z.number().min(0).max(1), contradicted: z.number().min(0).max(1), unknown: z.number().min(0).max(1) })
    .refine(p => Math.abs(Object.values(p).reduce((a, b) => a + b, 0) - 1) < 0.001)
});
const responseSchema = z.object({
  baseline: z.array(assessmentSchema).max(40), reranked: z.array(assessmentSchema).max(40),
  metadata: metadataSchema,
  timings: z.object({ baselineMs: z.number().finite().nonnegative(), rerankedMs: z.number().finite().nonnegative() }),
  entities: z.array(z.object({ passageId: z.number().int().nonnegative(), start: z.number().int().nonnegative(), end: z.number().int().positive(), text: z.string().min(1), label: z.string().min(1), score: z.number().min(0).max(1) })).max(300),
  entityError: z.string().nullable(),
  trainedEvidence: z.array(trainedEvidenceSchema).max(120).optional().default([]),
  trainedEvidenceError: z.string().nullable().optional()
});
export type TransformerMetadata = z.infer<typeof metadataSchema>;
export type TransformerAssessment = RequirementAssessment & { candidates: Array<z.infer<typeof candidateSchema> & { evidence: EvidenceProvenance }> };
export type TransformerEvidence = {
  status: "complete" | "unavailable"; error?: string; warnings: string[];
  assessments: TransformerAssessment[]; baseline: TransformerAssessment[];
  entities: Array<{ label: string; score: number; evidence: EvidenceProvenance }>;
  trainedEvidence?: Array<z.infer<typeof trainedEvidenceSchema> & { evidence: EvidenceProvenance }>;
  metadata?: TransformerMetadata; timings?: { baselineMs: number; rerankedMs: number };
};

export function passageChunks(text: string): Array<EvidenceProvenance & { id: number }> {
  const sections = parseSections(text);
  const passages: Array<EvidenceProvenance & { id: number }> = [];
  // Small exact spans stay within encoder context windows; keep offsets in the original document.
  for (const match of text.matchAll(/[^\r\n]+/g)) {
    const line = match[0];
    let cursor = 0;
    while (cursor < line.length) {
      let end = Math.min(cursor + 600, line.length);
      if (end < line.length) {
        const space = line.lastIndexOf(" ", end);
        if (space > cursor + 300) end = space;
      }
      const raw = line.slice(cursor, end);
      const trimmed = raw.trim();
      if (trimmed) {
        const start = match.index + cursor + raw.indexOf(trimmed);
        passages.push({ id: passages.length, text: trimmed, start, end: start + trimmed.length,
          section: sections.find(section => start >= section.start && start < section.end)?.name ?? "document" });
      }
      cursor = end;
    }
  }
  return passages;
}

export async function modelServiceRequest(path: "/analyze" | "/retrieve", body: unknown, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const base = process.env.MODEL_SERVICE_URL ?? "http://127.0.0.1:8000";
  const configured = Number(process.env.MODEL_SERVICE_TIMEOUT_MS ?? 120_000);
  const timeout = Number.isFinite(configured) && configured > 0 ? Math.min(configured, 300_000) : 120_000;
  const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(process.env.MODEL_SERVICE_TOKEN ? { Authorization: `Bearer ${process.env.MODEL_SERVICE_TOKEN}` } : {}) },
    body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.any([AbortSignal.timeout(timeout), ...(signal ? [signal] : [])])
  });
  if (!response.ok) throw new Error(`Model service returned HTTP ${response.status}.`);
  return response.json() as Promise<unknown>;
}

export async function analyzeWithTransformers(requirements: JobRequirement[], resumeText: string, options: { includeBaseline?: boolean; includeEntities?: boolean; signal?: AbortSignal } = {}): Promise<TransformerEvidence> {
  const allPassages = passageChunks(resumeText);
  const passages = allPassages.slice(0, 160);
  const warnings = allPassages.length > 160 ? ["Transformer review covers only the first 160 passages; review the rest of the document manually."] : [];
  if (requirements.length > 40) return { status: "unavailable", error: "Transformer review supports at most 40 requirements.", warnings, assessments: [], baseline: [], entities: [] };
  try {
    const response = responseSchema.parse(await modelServiceRequest("/analyze", {
      requirements: requirements.map(({ skill }) => ({ skill })), passages: passages.map(({ id, text }) => ({ id, text })),
      includeBaseline: options.includeBaseline ?? false, includeEntities: options.includeEntities ?? false
    }, options.signal));
    const convert = (rows: z.infer<typeof assessmentSchema>[]): TransformerAssessment[] => {
      if (rows.length !== requirements.length || new Set(rows.map(row => row.skill)).size !== rows.length) throw new Error("Incomplete transformer coverage.");
      return requirements.map(requirement => {
        const row = rows.find(item => item.skill === requirement.skill);
        if (!row) throw new Error("Transformer requirement mismatch.");
        const candidates = row.candidates.map(candidate => {
          const evidence = passages[candidate.passageId];
          if (!evidence) throw new Error("Invalid transformer passage reference.");
          return { ...candidate, evidence };
        });
        const chosen = candidates.find(candidate => candidate.passageId === row.passageId);
        if (row.passageId !== null && !chosen) throw new Error("Selected passage is missing from candidates.");
        if (row.verdict !== "unknown" && !chosen) throw new Error("A resolved verdict requires source evidence.");
        const confidence = !chosen ? 0 : row.verdict === "partial" ? chosen.learningNli.entailment : row.verdict === "supported" ? chosen.nli.entailment : row.verdict === "contradicted" ? chosen.nli.contradiction : chosen.nli.neutral;
        return { ...requirement, verdict: row.verdict, reason: row.reason, confidence, evidence: chosen?.evidence, method: response.metadata.version === "transformer-evidence-v2" ? "transformer-nli-v2" : "transformer-nli-v1", candidates };
      });
    };
    const entities = response.entities.map(entity => {
      const passage = passages[entity.passageId];
      if (!passage || entity.end > passage.text.length || entity.start >= entity.end || passage.text.slice(entity.start, entity.end) !== entity.text) throw new Error("Invalid entity source span.");
      return { label: entity.label, score: entity.score, evidence: { text: entity.text, start: passage.start + entity.start, end: passage.start + entity.end, section: passage.section } };
    });
    const trainedEvidence = response.trainedEvidence.map(item => {
      const evidence = passages[item.passageId];
      if (!evidence || !requirements.some(r => r.skill === item.skill)) throw new Error("Invalid trained evidence source reference.");
      if (item.abstained && item.verdict !== "unknown") throw new Error("Abstained classifier must return unknown.");
      return { ...item, evidence };
    });
    return { status: "complete", warnings: [...warnings, ...(response.entityError ? [response.entityError] : []), ...(response.trainedEvidenceError ? [response.trainedEvidenceError] : [])], trainedEvidence,
      assessments: convert(response.reranked), baseline: options.includeBaseline ? convert(response.baseline) : [],
      metadata: response.metadata, timings: response.timings, entities };
  } catch (error) {
    options.signal?.throwIfAborted();
    return { status: "unavailable", error: error instanceof Error ? error.message : "Transformer service unavailable.", warnings, assessments: [], baseline: [], entities: [] };
  }
}

export function combineTransformerEvidence(rules: RequirementAssessment[], model: TransformerAssessment[]): RequirementAssessment[] {
  return rules.map(rule => {
    const learned = model.find(item => item.skill === rule.skill);
    if (!learned || learned.verdict === "unknown") return rule;
    if (rule.verdict === "partial" || rule.verdict === "contradicted") return rule;
    if (rule.verdict === "supported" && learned.verdict !== "supported") return { ...rule, verdict: "unknown", confidence: 0, reason: "Rules and transformer judgments disagree; human review is required." };
    return learned;
  });
}

export async function retrievePassages(query: string, resumeText: string, signal?: AbortSignal) {
  const all = passageChunks(resumeText);
  const passages = all.slice(0, 160);
  const response = z.object({ passageIds: z.array(z.number().int().nonnegative()).max(3), metadata: metadataSchema }).parse(
    await modelServiceRequest("/retrieve", { query, passages: passages.map(({ id, text }) => ({ id, text })) }, signal));
  if (new Set(response.passageIds).size !== response.passageIds.length) throw new Error("Duplicate retrieved passages.");
  return { metadata: response.metadata, truncated: all.length > 160, passages: response.passageIds.map(id => {
    if (!passages[id]) throw new Error("Invalid retrieved source reference.");
    return passages[id];
  }) };
}
