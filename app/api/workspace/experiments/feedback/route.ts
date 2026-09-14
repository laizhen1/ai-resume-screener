import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api";
import { getRepository } from "@/lib/repository";
import { VERDICTS, PIPELINES } from "@/lib/experiments/types";

const schema = z.object({
  runId: z.uuid(), caseId: z.string().max(100), skill: z.string().max(100),
  pipeline: z.enum(PIPELINES), verdict: z.enum(VERDICTS), reason: z.string().trim().min(10).max(1500)
}).strict();

export async function GET(request: Request) {
  const auth = authorize(request, "experiments.feedback.list");
  if ("response" in auth) return auth.response!;
  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId || !z.uuid().safeParse(runId).success) return NextResponse.json({ error: "A valid run ID is required." }, { status: 400 });
  const events = await (await getRepository()).listAudit(runId);
  return NextResponse.json({ feedback: events.filter(event => event.action === "experiment.feedback").map(event => ({ ...event.metadata, id: event.id, actor: event.actor, createdAt: event.createdAt })) });
}

export async function POST(request: Request) {
  const auth = authorize(request, "experiments.feedback.save", 30);
  if ("response" in auth) return auth.response!;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a verdict and give a reason of at least 10 characters." }, { status: 400 });
  const data = parsed.data;
  const repository = await getRepository();
  const run = (await repository.listEvaluations()).find(item => item.id === data.runId);
  const prediction = run?.report?.results.find(row => row.caseId === data.caseId && row.pipeline === data.pipeline)?.predictions.find(item => item.skill === data.skill);
  if (!prediction) return NextResponse.json({ error: "This prediction does not belong to the selected run." }, { status: 404 });
  const event = await repository.addAudit({
    actor: auth.session.username, action: "experiment.feedback", entityType: "evaluation", entityId: data.runId,
    metadata: { ...data, originalVerdict: prediction.actual, originalExpected: prediction.expected, datasetHash: run!.report!.dataset.hash, destination: "development-candidate", approvedForTraining: false }
  });
  return NextResponse.json({ feedback: { ...event.metadata, id: event.id, actor: event.actor, createdAt: event.createdAt } }, { status: 201 });
}
