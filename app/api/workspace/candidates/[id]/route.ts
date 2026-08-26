import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api";
import { getRepository } from "@/lib/repository";

const updateSchema = z.object({
  status: z.enum(["new", "reviewing", "interview", "hold", "closed"]).optional(),
  notes: z.string().max(5_000).optional()
}).refine((value) => value.status !== undefined || value.notes !== undefined);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = authorize(request, "candidate.review", 40);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await context.params;
    const update = updateSchema.parse(await request.json());
    const repository = await getRepository();
    const candidate = await repository.updateCandidate(id, update);
    if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    await repository.addAudit({ actor: auth.session.username, action: "candidate.reviewed", entityType: "candidate", entityId: id, metadata: update });
    return NextResponse.json({ candidate });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update candidate." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = authorize(request, "candidate.delete", 20, ["admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const repository = await getRepository();
  const deleted = await repository.deleteCandidate(id);
  if (!deleted) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  await repository.addAudit({ actor: auth.session.username, action: "candidate.deleted", entityType: "candidate", entityId: id, metadata: {} });
  return NextResponse.json({ deleted: true });
}
