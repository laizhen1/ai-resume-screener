import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { extractDocumentDetailed } from "@/lib/documents";
import { enqueueAnalysis } from "@/lib/queue";
import { getRepository } from "@/lib/repository";
import { traced } from "@/lib/telemetry";
import { weightsFromCriteria } from "@/lib/analyzer";

function displayName(text: string, fileName: string) {
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return firstLine?.slice(0, 100) || fileName.replace(/\.[^.]+$/, "");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = authorize(request, "candidates.upload", 10);
  if ("response" in auth) return auth.response;
  return traced("candidate.batch-upload", async (traceId) => {
    try {
      const { id: jobId } = await context.params;
      const repository = await getRepository();
      const job = await repository.getJob(jobId);
      if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
      const form = await request.formData();
      const files = form.getAll("resumeFiles").filter((value): value is File => value instanceof File && value.size > 0);
      if (!files.length || files.length > 10) throw new Error("Upload between 1 and 10 resumes per batch.");
      const retentionDays = Math.min(365, Math.max(1, Number(form.get("retentionDays") ?? 30)));
      const retentionUntil = new Date(Date.now() + retentionDays * 86_400_000).toISOString();
      const created = [];
      for (const file of files) {
        const extracted = await extractDocumentDetailed(file);
        if (extracted.text.trim().length < 80) throw new Error(`${file.name} contains too little text to analyse.`);
        const candidate = await repository.createCandidate({
          jobId, displayName: displayName(extracted.text, file.name), fileName: file.name,
          resumeText: extracted.text, retentionUntil
        });
        const queueStatus = await enqueueAnalysis({ candidateId: candidate.id, jobDescription: job.description, resumeText: extracted.text, actor: auth.session.username, weights: weightsFromCriteria(job.criteria) });
        await repository.addAudit({ actor: auth.session.username, action: "candidate.uploaded", entityType: "candidate", entityId: candidate.id, metadata: { jobId, extractionMethod: extracted.method, warnings: extracted.warnings, traceId } });
        created.push({ ...(await repository.getCandidate(candidate.id) ?? candidate), queueStatus });
      }
      return NextResponse.json({ candidates: created }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Candidate upload failed." }, { status: 400 });
    }
  });
}
