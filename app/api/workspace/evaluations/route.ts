import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { runEvaluation } from "@/lib/evaluation";
import { getRepository } from "@/lib/repository";
import { traced } from "@/lib/telemetry";

export async function GET(request: Request) {
  const auth = authorize(request, "evaluations.list");
  if ("response" in auth) return auth.response;
  return NextResponse.json({ evaluations: await (await getRepository()).listEvaluations() });
}

export async function POST(request: Request) {
  const auth = authorize(request, "evaluations.run", 5,);
  if ("response" in auth) return auth.response;
  return traced("evaluation.run", async () => {
    const payload = await request.json().catch(() => ({})) as { size?: number };
    const size = Math.min(500, Math.max(20, Number(payload.size ?? 120)));
    const result = runEvaluation(size);
    const repository = await getRepository();
    const run = await repository.saveEvaluation(result);
    await repository.addAudit({ actor: auth.session.username, action: "evaluation.completed", entityType: "evaluation", entityId: run.id, metadata: run.metrics });
    return NextResponse.json({ evaluation: run }, { status: 201 });
  });
}
