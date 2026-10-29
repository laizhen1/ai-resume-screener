import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api";
import { verifyReceipt, type AnalysisSnapshot } from "@/lib/analysis-receipt";
import { getRepository } from "@/lib/repository";
import { correctionsSchema, validateCorrections } from "@/lib/review";

const schema = z.object({
  snapshot: z.object({ analysis: z.record(z.string(), z.unknown()), jobDescription: z.string().min(40).max(30_000), resumeText: z.string().min(80).max(200_000), fileName: z.string().min(1).max(255) }),
  receipt: z.object({ id: z.string(), signature: z.string(), expiresAt: z.number() }),
  title: z.string().trim().min(2).max(120), retentionDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  corrections: correctionsSchema.default([])
}).strict();
type SaveState = { expiresAt: number; jobId?: string; candidateId?: string; done?: boolean; actor: string; pending?: Promise<{ jobId: string; candidateId: string }> };
const globalSaves = globalThis as typeof globalThis & { __resumeReviewSaves?: Map<string, SaveState> };
const saves = globalSaves.__resumeReviewSaves ??= new Map<string, SaveState>();

export async function POST(request: Request) {
  const auth = authorize(request, "review.save", 20);
  if (auth.response) return auth.response;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2_000_000) return NextResponse.json({ error: "Review is too large to save." }, { status: 413 });
    const input = schema.parse(JSON.parse(raw));
    // Authenticate the original server result before using any client-supplied score or source.
    const snapshot = input.snapshot as AnalysisSnapshot;
    verifyReceipt(snapshot, input.receipt);
    const corrections = validateCorrections(snapshot.analysis, input.corrections, auth.session.username);
    for (const [id, state] of saves) if (state.expiresAt <= Date.now() && !state.pending) saves.delete(id);
    let state = saves.get(input.receipt.id);
    if (state && state.actor !== auth.session.username) return NextResponse.json({ error: "This review was saved by another session owner." }, { status: 403 });
    if (!state) {
      if (saves.size >= 1000) return NextResponse.json({ error: "Review save capacity reached. Try again later." }, { status: 503 });
      state = { expiresAt: input.receipt.expiresAt, actor: auth.session.username };
      saves.set(input.receipt.id, state);
    }
    const saved = state;
    const repository = await getRepository();
    if (saved.done && saved.candidateId && !(await repository.getCandidate(saved.candidateId))) return NextResponse.json({ error: "The saved candidate was deleted. Analyse again to create a new review." }, { status: 410 });
    if (!saved.pending) saved.pending = (async () => {
      if (!saved.jobId) {
        const job = await repository.createJob({ title: input.title, description: snapshot.jobDescription,
          criteria: snapshot.analysis.criteria.map(item => ({ id: randomUUID(), name: item.criterion, weight: item.weight, required: item.criterion === "Relevant skills" })) });
        saved.jobId = job.id;
      }
      if (!saved.candidateId) {
        const candidate = await repository.createCandidate({ jobId: saved.jobId, displayName: snapshot.resumeText.split(/\r?\n/).find(line => line.trim())?.slice(0, 100) || "Reviewed candidate", fileName: snapshot.fileName,
          resumeText: snapshot.resumeText, retentionUntil: new Date(Date.now() + input.retentionDays * 86_400_000).toISOString(), analysis: { ...snapshot.analysis, reviewerCorrections: corrections } });
        saved.candidateId = candidate.id;
      }
      if (!saved.done) {
        await repository.addAudit({ actor: auth.session.username, action: "candidate.review-imported", entityType: "candidate", entityId: saved.candidateId, metadata: { jobId: saved.jobId, correctionCount: corrections.length } });
        saved.done = true;
      }
      return { jobId: saved.jobId, candidateId: saved.candidateId };
    })();
    try { return NextResponse.json({ ...await saved.pending, mode: process.env.DATA_MODE ?? "memory" }, { status: 201 }); }
    catch (error) { saved.pending = undefined; throw error; }
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save review." }, { status: 400 }); }
}
