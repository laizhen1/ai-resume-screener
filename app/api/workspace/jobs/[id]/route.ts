import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { getRepository } from "@/lib/repository";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = authorize(request, "jobs.detail");
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const repository = await getRepository();
  const job = await repository.getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const [candidates, audit] = await Promise.all([repository.listCandidates(id), repository.listAudit(id)]);
  return NextResponse.json({ job, candidates, audit });
}
