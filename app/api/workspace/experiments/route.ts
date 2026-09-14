import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/api";
import { getRepository } from "@/lib/repository";
import { runComparison } from "@/lib/experiments/runner";

export const runtime = "nodejs";
const input = z.object({
  split: z.enum(["development", "heldout"]),
  includeModel: z.boolean(),
  model: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9_.:/-]+$/).optional()
}).strict();

export async function GET(request: Request) {
  const auth = authorize(request, "experiments.list");
  if ("response" in auth) return auth.response!;
  const runs = await (await getRepository()).listEvaluations();
  return NextResponse.json({ runs: runs.filter(run => run.report) });
}

export async function POST(request: Request) {
  const auth = authorize(request, "experiments.run", 5);
  if ("response" in auth) return auth.response!;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid split, model setting, and model name." }, { status: 400 });
  const encoder = new TextEncoder();
  const cancellation = new AbortController();
  const signal = AbortSignal.any([request.signal, cancellation.signal]);
  const stream = new ReadableStream({
    async start(controller) {
      const send = (message: unknown) => { if (!signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(message) + "\n")); };
      try {
        send({ type: "progress", completed: 0, total: parsed.data.split === "heldout" ? 24 : 10 });
        const report = await runComparison({ ...parsed.data, signal }, (completed, total) => send({ type: "progress", completed, total }));
        signal.throwIfAborted();
        const repository = await getRepository();
        const run = await repository.saveEvaluation({ engineVersion: report.engineVersion, datasetSize: report.dataset.uniqueCases, metrics: {}, report });
        await repository.addAudit({ actor: auth.session.username, action: "experiment.completed", entityType: "evaluation", entityId: run.id, metadata: { datasetHash: report.dataset.hash, split: report.dataset.split, model: report.configuration.model } });
        send({ type: "complete", run });
      } catch {
        send({ type: "error", error: "Comparison could not finish. Check the database migration and server logs, then retry." });
      } finally { if (!cancellation.signal.aborted) controller.close(); }
    },
    cancel() { cancellation.abort(); }
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
