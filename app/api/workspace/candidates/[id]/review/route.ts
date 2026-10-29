import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api";
import { getRepository } from "@/lib/repository";
import { correctionsSchema, validateCorrections } from "@/lib/review";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = authorize(request, "candidate.evidence-review", 40);
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const { corrections } = z.object({ corrections: correctionsSchema }).strict().parse(await request.json());
    const repository = await getRepository();
    const candidate = await repository.getCandidate(id);
    if (!candidate?.analysis) return NextResponse.json({ error: "Analysed candidate not found." }, { status: 404 });
    const reviewerCorrections = validateCorrections(candidate.analysis, corrections, auth.session.username);
    const previousCorrections = candidate.analysis.reviewerCorrections?.map(({ skill, verdict }) => ({ skill, verdict })) ?? [];
    const updated = await repository.updateCandidate(id, { analysis: { ...candidate.analysis, reviewerCorrections } });
    await repository.addAudit({ actor: auth.session.username, action: "candidate.evidence-reviewed", entityType: "candidate", entityId: id,
      metadata: { jobId: candidate.jobId, previousCorrections, corrections: reviewerCorrections.map(({ skill, verdict }) => ({ skill, verdict })) } });
    return NextResponse.json({ candidate: updated });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record review." }, { status: 400 }); }
}
